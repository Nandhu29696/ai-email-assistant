"""
Replies router — create, list, and send email replies.
"""
from __future__ import annotations
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.email import Email, EmailReply
from app.schemas.email import ReplyCreate, ReplyOut

router = APIRouter()


@router.get("/{email_id}/replies", response_model=list[ReplyOut])
def list_replies(email_id: UUID, db: Session = Depends(get_db)):
    """Return all drafts and sent replies for an email, newest first."""
    email_obj = db.query(Email).filter(Email.id == email_id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")
    return (
        db.query(EmailReply)
        .filter(EmailReply.email_id == email_id)
        .order_by(EmailReply.created_at.desc())
        .all()
    )


@router.post("/{email_id}/replies", response_model=ReplyOut, status_code=201)
def create_reply(
    email_id: UUID,
    payload: ReplyCreate,
    db: Session = Depends(get_db),
):
    """Save a reply draft or mark it as sent immediately (payload.send=True)."""
    email_obj = db.query(Email).filter(Email.id == email_id).first()
    if not email_obj:
        raise HTTPException(status_code=404, detail="Email not found")

    reply = EmailReply(
        email_id=email_id,
        subject=payload.subject or f"Re: {email_obj.subject}",
        body=payload.body,
        attachments_json=payload.attachments or [],
        is_draft=not payload.send,
        sent_at=datetime.now(timezone.utc) if payload.send else None,
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return reply


@router.patch("/{email_id}/replies/{reply_id}", response_model=ReplyOut)
def update_reply(
    email_id: UUID,
    reply_id: UUID,
    payload: ReplyCreate,
    db: Session = Depends(get_db),
):
    """Edit an existing draft reply."""
    reply = (
        db.query(EmailReply)
        .filter(EmailReply.id == reply_id, EmailReply.email_id == email_id)
        .first()
    )
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    if not reply.is_draft:
        raise HTTPException(status_code=400, detail="Cannot edit a sent reply")

    if payload.subject is not None:
        reply.subject = payload.subject
    reply.body = payload.body
    reply.attachments_json = payload.attachments or reply.attachments_json
    if payload.send:
        reply.is_draft = False
        reply.sent_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(reply)
    return reply


@router.post("/{email_id}/replies/{reply_id}/send", response_model=ReplyOut)
def send_reply(
    email_id: UUID,
    reply_id: UUID,
    db: Session = Depends(get_db),
):
    """Mark a draft reply as sent."""
    reply = (
        db.query(EmailReply)
        .filter(EmailReply.id == reply_id, EmailReply.email_id == email_id)
        .first()
    )
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    if not reply.is_draft:
        raise HTTPException(status_code=400, detail="Reply already sent")

    reply.is_draft = False
    reply.sent_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(reply)
    return reply
