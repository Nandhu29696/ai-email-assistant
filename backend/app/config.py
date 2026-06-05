from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────
    APP_NAME: str = "AI Email Assistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:1234@localhost:5432/job_agent"

    # ── Security ──────────────────────────────────────────────
    SECRET_KEY: str = "change-me-to-a-secure-random-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Ollama (local LLM) ────────────────────────────────────
    OLLAMA_BASE_URL: str = ""
    OLLAMA_MODEL: str = "llama3.2"

    # ── OpenAI (used only when OLLAMA_BASE_URL is empty) ──────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # ── Redis ─────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"

    # ── Gmail OAuth ───────────────────────────────────────────
    GMAIL_CLIENT_ID: str = ""
    GMAIL_CLIENT_SECRET: str = ""
    GMAIL_REDIRECT_URI: str = "http://localhost:8000/api/integrations/gmail/callback"

    # ── Outlook OAuth ─────────────────────────────────────────
    OUTLOOK_CLIENT_ID: str = ""
    OUTLOOK_CLIENT_SECRET: str = ""
    OUTLOOK_TENANT_ID: str = "common"
    OUTLOOK_REDIRECT_URI: str = "http://localhost:8000/api/integrations/outlook/callback"

    # ── IMAP ──────────────────────────────────────────────────
    IMAP_HOST: str = "imap.gmail.com"
    IMAP_PORT: int = 993

    # ── Email Processing ──────────────────────────────────────
    FETCH_INTERVAL_SECONDS: int = 300
    NOTIFY_ON_NEGATIVE: bool = True
    NOTIFY_ON_CRITICAL: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
