"""
Dashboard router — statistics, trends, and category breakdowns.
"""
from __future__ import annotations
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.database import get_db
from app.models.email import Email, EmailAnalysis
from app.schemas.dashboard import (
    DashboardStats, TrendsResponse, TrendPoint,
    SentimentBreakdown, PriorityBreakdown, CategoryBreakdown,
)

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    """Return aggregate dashboard statistics."""
    total       = db.query(func.count(Email.id)).scalar() or 0
    unread      = db.query(func.count(Email.id)).filter(Email.is_read == False).scalar() or 0
    processed   = db.query(func.count(Email.id)).filter(Email.processed_at.isnot(None)).scalar() or 0

    # Sentiment breakdown
    sentiment_rows = (
        db.query(EmailAnalysis.sentiment, func.count(EmailAnalysis.id))
        .filter(EmailAnalysis.sentiment.isnot(None))
        .group_by(EmailAnalysis.sentiment)
        .all()
    )
    sentiment_map = {row[0]: row[1] for row in sentiment_rows}

    # Priority breakdown
    priority_rows = (
        db.query(EmailAnalysis.priority, func.count(EmailAnalysis.id))
        .filter(EmailAnalysis.priority.isnot(None))
        .group_by(EmailAnalysis.priority)
        .all()
    )
    priority_map = {row[0]: row[1] for row in priority_rows}

    # Category breakdown
    category_rows = (
        db.query(EmailAnalysis.category, func.count(EmailAnalysis.id))
        .filter(EmailAnalysis.category.isnot(None))
        .group_by(EmailAnalysis.category)
        .all()
    )
    category_map = {row[0]: row[1] for row in category_rows}

    # Average sentiment score
    avg_score = (
        db.query(func.avg(EmailAnalysis.sentiment_score))
        .filter(EmailAnalysis.sentiment_score.isnot(None))
        .scalar()
    ) or 0.0

    critical = priority_map.get("critical", 0)

    return DashboardStats(
        total_emails=total,
        unread_emails=unread,
        processed_emails=processed,
        critical_emails=critical,
        avg_sentiment_score=round(float(avg_score), 4),
        sentiment=SentimentBreakdown(
            positive=sentiment_map.get("positive", 0),
            neutral=sentiment_map.get("neutral", 0),
            negative=sentiment_map.get("negative", 0),
        ),
        priority=PriorityBreakdown(
            critical=priority_map.get("critical", 0),
            high=priority_map.get("high", 0),
            medium=priority_map.get("medium", 0),
            low=priority_map.get("low", 0),
        ),
        category=CategoryBreakdown(
            complaint=category_map.get("complaint", 0),
            support=category_map.get("support", 0),
            sales=category_map.get("sales", 0),
            refund=category_map.get("refund", 0),
            invoice=category_map.get("invoice", 0),
            feedback=category_map.get("feedback", 0),
            general=category_map.get("general", 0),
        ),
    )


@router.get("/trends", response_model=TrendsResponse)
def get_trends(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
):
    """Return daily sentiment trend data for the last N days."""
    since = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.query(
            func.date(Email.received_at).label("date"),
            EmailAnalysis.sentiment,
            func.count(Email.id).label("count"),
        )
        .join(EmailAnalysis, Email.id == EmailAnalysis.email_id)
        .filter(Email.received_at >= since)
        .group_by(func.date(Email.received_at), EmailAnalysis.sentiment)
        .order_by(func.date(Email.received_at))
        .all()
    )

    # Aggregate by date
    date_map: dict[str, dict] = {}
    for row in rows:
        d = str(row.date)
        if d not in date_map:
            date_map[d] = {"positive": 0, "neutral": 0, "negative": 0}
        date_map[d][row.sentiment] = row.count

    trends = [
        TrendPoint(
            date=d,
            positive=v["positive"],
            neutral=v["neutral"],
            negative=v["negative"],
            total=v["positive"] + v["neutral"] + v["negative"],
        )
        for d, v in sorted(date_map.items())
    ]

    return TrendsResponse(trends=trends, period_days=days)
