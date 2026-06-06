from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, ForeignKey,
    Numeric, SmallInteger, Integer, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# ── Static lookup tables ──────────────────────────────────────

class SentimentOption(Base):
    __tablename__ = "sentiment_options"

    id         = Column(SmallInteger, primary_key=True, autoincrement=True)
    value      = Column(String(20), unique=True, nullable=False)   # positive | neutral | negative
    label      = Column(String(50), nullable=False)
    color      = Column(String(30))                                 # tailwind color token for UI
    sort_order = Column(SmallInteger, default=0)


class PriorityOption(Base):
    __tablename__ = "priority_options"

    id         = Column(SmallInteger, primary_key=True, autoincrement=True)
    value      = Column(String(20), unique=True, nullable=False)   # critical | high | medium | low
    label      = Column(String(50), nullable=False)
    color      = Column(String(30))
    score      = Column(SmallInteger)                               # 4=critical … 1=low
    sort_order = Column(SmallInteger, default=0)


class CategoryOption(Base):
    __tablename__ = "category_options"

    id          = Column(SmallInteger, primary_key=True, autoincrement=True)
    value       = Column(String(50), unique=True, nullable=False)
    label       = Column(String(50), nullable=False)
    description = Column(Text)
    sort_order  = Column(SmallInteger, default=0)


class EmailIntegration(Base):
    __tablename__ = "email_integrations"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    provider      = Column(String(20), nullable=False)      # gmail | outlook
    email_address = Column(String(255), nullable=False, unique=True)
    access_token  = Column(Text)
    refresh_token = Column(Text)
    token_expiry  = Column(DateTime(timezone=True))
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    emails = relationship("Email", back_populates="integration")


class Email(Base):
    __tablename__ = "emails"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    message_id      = Column(String(512), unique=True, nullable=False)
    integration_id  = Column(Integer, ForeignKey("email_integrations.id"), nullable=True)
    subject         = Column(Text, nullable=False, default="(no subject)")
    sender_name     = Column(String(255))
    sender_email    = Column(String(255), nullable=False)
    recipient_email = Column(String(255))
    body_plain      = Column(Text)
    body_html       = Column(Text)
    body_clean      = Column(Text)          # preprocessed, HTML-stripped
    received_at     = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    processed_at    = Column(DateTime(timezone=True))
    is_read         = Column(Boolean, default=False)
    is_archived     = Column(Boolean, default=False)
    thread_id       = Column(String(512))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    integration = relationship("EmailIntegration", back_populates="emails")
    analysis    = relationship("EmailAnalysis", back_populates="email", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="email", cascade="all, delete-orphan")
    replies     = relationship("EmailReply", back_populates="email", cascade="all, delete-orphan")


class EmailAnalysis(Base):
    __tablename__ = "email_analyses"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    email_id            = Column(Integer, ForeignKey("emails.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Sentiment
    sentiment           = Column(String(20))        # positive | neutral | negative
    sentiment_score     = Column(Numeric(5, 4))     # -1.0 to 1.0

    # Emotions
    primary_emotion     = Column(String(50))
    emotions_json       = Column(JSON, default=list)

    # Category
    category            = Column(String(50))        # complaint | support | sales …
    category_confidence = Column(Numeric(4, 3))

    # Priority
    priority            = Column(String(20))        # critical | high | medium | low
    priority_score      = Column(SmallInteger)      # 1=low … 4=critical

    # AI outputs
    ai_summary          = Column(Text)
    suggested_reply     = Column(Text)

    # Routing
    routed_to           = Column(String(100))
    routing_reason      = Column(Text)

    # Meta
    model_version       = Column(String(50))
    processing_time_ms  = Column(Integer)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())

    email = relationship("Email", back_populates="analysis")


class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    email_id   = Column(Integer, ForeignKey("emails.id", ondelete="CASCADE"))
    type       = Column(String(50), nullable=False)   # urgent | negative_sentiment | new_email
    title      = Column(String(255), nullable=False)
    message    = Column(Text)
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    email = relationship("Email", back_populates="notifications")


class EmailReply(Base):
    __tablename__ = "email_replies"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    email_id         = Column(Integer, ForeignKey("emails.id", ondelete="CASCADE"), nullable=False)
    subject          = Column(Text)
    body             = Column(Text, nullable=False)
    attachments_json = Column(JSON, default=list)   # [{"filename": "...", "size": 0}]
    is_draft         = Column(Boolean, default=True)
    sent_at          = Column(DateTime(timezone=True))
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    email = relationship("Email", back_populates="replies")


# ── Domain whitelist ──────────────────────────────────────────

class AllowedDomain(Base):
    __tablename__ = "allowed_domains"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    domain     = Column(String(255), unique=True, nullable=False)  # e.g. "gmail.com"
    is_active  = Column(Boolean, default=True, nullable=False)
    notes      = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
