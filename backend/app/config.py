from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional
from urllib.parse import quote_plus


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

    # ── Database – individual fields (read from .env) ─────────
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "ai_email_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "1234"
    DB_TYPE: str = "postgresql"   # postgresql | mysql

    # Computed at startup – do not set manually; use DB_* fields instead
    DATABASE_URL: str = ""

    @model_validator(mode="after")
    def build_database_url(self) -> "Settings":
        """Build DATABASE_URL from individual DB_* env vars if not already set."""
        if not self.DATABASE_URL:
            pwd = quote_plus(self.DB_PASSWORD)
            if self.DB_TYPE.lower() == "mysql":
                self.DATABASE_URL = (
                    f"mysql+pymysql://{self.DB_USER}:{pwd}"
                    f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
                )
            else:
                self.DATABASE_URL = (
                    f"postgresql+psycopg2://{self.DB_USER}:{pwd}"
                    f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
                )
        return self

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
