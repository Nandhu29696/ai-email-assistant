-- AI Email Assistant - Database Initialization

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- Email Integrations (OAuth tokens for Gmail / Outlook)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_integrations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider        VARCHAR(20) NOT NULL CHECK (provider IN ('gmail', 'outlook')),
    email_address   VARCHAR(255) NOT NULL UNIQUE,
    access_token    TEXT,
    refresh_token   TEXT,
    token_expiry    TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Emails
-- ============================================================
CREATE TABLE IF NOT EXISTS emails (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id      VARCHAR(512) UNIQUE NOT NULL,
    integration_id  UUID REFERENCES email_integrations(id) ON DELETE SET NULL,
    subject         TEXT NOT NULL DEFAULT '(no subject)',
    sender_name     VARCHAR(255),
    sender_email    VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255),
    body_plain      TEXT,
    body_html       TEXT,
    body_clean      TEXT,             -- preprocessed version
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    is_read         BOOLEAN DEFAULT FALSE,
    is_archived     BOOLEAN DEFAULT FALSE,
    thread_id       VARCHAR(512),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emails_received_at  ON emails (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_sender       ON emails (sender_email);
CREATE INDEX IF NOT EXISTS idx_emails_is_read      ON emails (is_read);
CREATE INDEX IF NOT EXISTS idx_emails_body_trgm    ON emails USING gin (body_clean gin_trgm_ops);

-- ============================================================
-- Email Analyses (AI Results)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_analyses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id            UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    -- Sentiment
    sentiment           VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    sentiment_score     NUMERIC(5,4),          -- -1.0 to 1.0
    -- Emotions
    primary_emotion     VARCHAR(50),            -- anger, frustration, satisfaction …
    emotions_json       JSONB DEFAULT '[]',     -- [{emotion, score}, …]
    -- Classification
    category            VARCHAR(50),            -- complaint, support, sales …
    category_confidence NUMERIC(4,3),
    -- Priority
    priority            VARCHAR(20) CHECK (priority IN ('critical','high','medium','low')),
    priority_score      SMALLINT,               -- 1=low … 4=critical
    -- AI outputs
    ai_summary          TEXT,
    suggested_reply     TEXT,
    -- Routing
    routed_to           VARCHAR(100),           -- support, finance, hr, sales
    routing_reason      TEXT,
    -- Meta
    model_version       VARCHAR(50),
    processing_time_ms  INTEGER,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (email_id)
);

CREATE INDEX IF NOT EXISTS idx_analyses_sentiment ON email_analyses (sentiment);
CREATE INDEX IF NOT EXISTS idx_analyses_priority  ON email_analyses (priority);
CREATE INDEX IF NOT EXISTS idx_analyses_category  ON email_analyses (category);

-- ============================================================
-- Notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id    UUID REFERENCES emails(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,   -- urgent, negative_sentiment, new_email
    title       VARCHAR(255) NOT NULL,
    message     TEXT,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);

-- ============================================================
-- Seed: Demo integration placeholder
-- ============================================================
INSERT INTO email_integrations (provider, email_address, is_active)
VALUES ('gmail', 'demo@example.com', FALSE)
ON CONFLICT DO NOTHING;
