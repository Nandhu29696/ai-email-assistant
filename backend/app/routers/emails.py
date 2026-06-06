"""
Emails router — CRUD operations and analysis trigger.
"""
from __future__ import annotations
import time
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from loguru import logger

from app.database import get_db, SessionLocal
from app.models.email import Email, EmailAnalysis, Notification
from app.schemas.email import EmailCreate, EmailOut, EmailListOut, EmailUpdateRequest
from app.services import (
    preprocess_email, analyze_sentiment, detect_emotions, classify_email,
    assign_priority, generate_summary, generate_reply, route_email,
    notification_manager,
)
from app.config import settings

router = APIRouter()


# ── Full AI analysis pipeline ─────────────────────────────────
async def _run_analysis_pipeline(email_id: int, db: Session | None = None):
    """Run complete AI pipeline for a given email.

    Accepts an existing *db* session for backward compatibility (router usage),
    but creates its own short-lived sessions internally so the pool connection
    is never held open across long-running async AI calls.
    """
    start = time.time()

    # ── Phase 1: load email fields then release the connection ────────────────
    _own_db = db is None
    _db = db if db is not None else SessionLocal()
    try:
        email_obj = _db.query(Email).filter(Email.id == email_id).first()
        if not email_obj:
            return
        # Snapshot the fields we need; close session before AI calls
        subject    = email_obj.subject
        body_plain = email_obj.body_plain
        body_html  = email_obj.body_html
        sender_email = email_obj.sender_email
    finally:
        if _own_db:
            _db.close()

    try:
        # ── Phase 2: all AI work — NO database connection held ────────────────
        clean = preprocess_email(body_plain, body_html)

        sentiment      = analyze_sentiment(clean)
        emotions       = detect_emotions(clean)
        classification = await classify_email(clean)
        priority       = assign_priority(
            sentiment.label,
            float(sentiment.score),
            emotions.primary_emotion,
            classification.category,
        )
        summary = await generate_summary(subject, clean)
        reply   = await generate_reply(
            subject, clean,
            classification.category, sentiment.label,
        )
        routing = route_email(
            classification.category, sentiment.label, priority.priority
        )
        elapsed = int((time.time() - start) * 1000)

        # ── Phase 3: persist results in a fresh short-lived session ───────────
        write_db = SessionLocal()
        try:
            email_obj2 = write_db.query(Email).filter(Email.id == email_id).first()
            if not email_obj2:
                return

            email_obj2.body_clean   = clean
            email_obj2.processed_at = datetime.now(timezone.utc)

            analysis = write_db.query(EmailAnalysis).filter(EmailAnalysis.email_id == email_id).first()
            if not analysis:
                analysis = EmailAnalysis(email_id=email_id)
                write_db.add(analysis)

            analysis.sentiment           = sentiment.label
            analysis.sentiment_score     = sentiment.score
            analysis.primary_emotion     = emotions.primary_emotion
            analysis.emotions_json       = [{"emotion": e.emotion, "score": e.score} for e in emotions.emotions]
            analysis.category            = classification.category
            analysis.category_confidence = classification.confidence
            analysis.priority            = priority.priority
            analysis.priority_score      = priority.score
            analysis.ai_summary          = summary
            analysis.suggested_reply     = reply
            analysis.routed_to           = routing.team
            analysis.routing_reason      = routing.reason
            analysis.model_version       = settings.OPENAI_MODEL
            analysis.processing_time_ms  = elapsed

            write_db.commit()

            # ── Phase 4: create notifications ─────────────────────────────────
            # 4a. Always create a "new_email" notification (if not already present)
            existing_new = (
                write_db.query(Notification)
                .filter(
                    Notification.email_id == email_id,
                    Notification.type == "new_email",
                )
                .first()
            )
            if not existing_new:
                new_notif = Notification(
                    email_id=email_id,
                    type="new_email",
                    title=f"📧 New email: {subject[:60]}",
                    message=f"From: {sender_email} | {sentiment.label.capitalize()} | {classification.category.capitalize()}",
                )
                write_db.add(new_notif)
                write_db.commit()
                write_db.refresh(new_notif)
                await notification_manager.broadcast_notification({
                    "id": new_notif.id,
                    "email_id": new_notif.email_id,
                    "type": new_notif.type,
                    "title": new_notif.title,
                    "message": new_notif.message or "",
                    "is_read": new_notif.is_read,
                    "created_at": new_notif.created_at.isoformat(),
                })

            # 4b. Extra alert notification for urgent/negative
            should_alert = (
                (priority.priority in ("critical", "high") and settings.NOTIFY_ON_CRITICAL) or
                (sentiment.label == "negative" and settings.NOTIFY_ON_NEGATIVE)
            )
            if should_alert:
                alert_type = "urgent" if priority.priority == "critical" else "negative_sentiment"
                alert = Notification(
                    email_id=email_id,
                    type=alert_type,
                    title=f"⚠️ {priority.priority.upper()}: {subject[:60]}",
                    message=f"From: {sender_email} | Sentiment: {sentiment.label} | Category: {classification.category}",
                )
                write_db.add(alert)
                write_db.commit()
                write_db.refresh(alert)
                await notification_manager.broadcast_notification({
                    "id": alert.id,
                    "email_id": alert.email_id,
                    "type": alert.type,
                    "title": alert.title,
                    "message": alert.message or "",
                    "is_read": alert.is_read,
                    "created_at": alert.created_at.isoformat(),
                })

            logger.info(f"Analysis complete for email {email_id} ({elapsed}ms)")

        except Exception as exc:
            logger.error(f"Analysis write failed for {email_id}: {exc}")
            write_db.rollback()
        finally:
            write_db.close()

    except Exception as exc:
        logger.error(f"Analysis pipeline failed for {email_id}: {exc}")


# ── Routes ────────────────────────────────────────────────────
@router.get("", response_model=EmailListOut)
def list_emails(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sentiment: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Email)

    if is_read is not None:
        query = query.filter(Email.is_read == is_read)
    if search:
        query = query.filter(
            Email.subject.ilike(f"%{search}%") |
            Email.sender_email.ilike(f"%{search}%") |
            Email.body_clean.ilike(f"%{search}%")
        )
    if sentiment:
        query = query.join(EmailAnalysis).filter(EmailAnalysis.sentiment == sentiment)
    if priority:
        query = query.join(EmailAnalysis).filter(EmailAnalysis.priority == priority)
    if category:
        query = query.join(EmailAnalysis).filter(EmailAnalysis.category == category)

    total = query.count()
    items = (
        query.order_by(Email.received_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return EmailListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/{email_id}", response_model=EmailOut)
def get_email(email_id: int, db: Session = Depends(get_db)):
    email_obj = db.query(Email).filter(Email.id == email_id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")
    return email_obj


@router.post("/{email_id}/analyze")
async def analyze_email(
    email_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Trigger full AI analysis pipeline for an email."""
    email_obj = db.query(Email).filter(Email.id == email_id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")

    # Pipeline manages its own DB sessions to avoid holding a connection
    # across long-running async AI calls.
    background_tasks.add_task(_run_analysis_pipeline, email_id)
    return {"message": "Analysis started", "email_id": email_id}


@router.patch("/{email_id}", response_model=EmailOut)
def update_email(
    email_id: int,
    payload: EmailUpdateRequest,
    db: Session = Depends(get_db),
):
    email_obj = db.query(Email).filter(Email.id == email_id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")

    if payload.is_read is not None:
        email_obj.is_read = payload.is_read
    if payload.is_archived is not None:
        email_obj.is_archived = payload.is_archived

    db.commit()
    db.refresh(email_obj)
    return email_obj


@router.post("/ingest", response_model=EmailOut, status_code=201)
async def ingest_email(
    payload: EmailCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Ingest a new email and trigger analysis."""
    existing = db.query(Email).filter(Email.message_id == payload.message_id).first()
    if existing:
        return existing

    email_obj = Email(**payload.model_dump())
    db.add(email_obj)
    db.commit()
    db.refresh(email_obj)

    background_tasks.add_task(_run_analysis_pipeline, email_obj.id)
    return email_obj
