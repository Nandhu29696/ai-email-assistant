"""
Gmail sync service.
Polls all active Gmail integrations every FETCH_INTERVAL_SECONDS,
saves new emails to the DB, and triggers the AI analysis pipeline.
"""
from __future__ import annotations

import asyncio
import base64
import email as email_lib
import email.utils
from datetime import datetime

from loguru import logger
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.database import SessionLocal
from app.models.email import Email, EmailIntegration, AllowedDomain

# Cap concurrent AI-pipeline tasks so we never hold more than this
# many DB connections simultaneously for analysis work.
_analysis_semaphore = asyncio.Semaphore(3)


# ── Body extraction ───────────────────────────────────────────

def _extract_gmail_body(payload: dict) -> tuple[str, str]:
    """Recursively extract plain-text and HTML body from a Gmail API payload."""
    plain, html = "", ""
    mime_type = payload.get("mimeType", "")

    if mime_type == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            plain = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
    elif mime_type == "text/html":
        data = payload.get("body", {}).get("data", "")
        if data:
            html = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
    elif "parts" in payload:
        for part in payload["parts"]:
            p, h = _extract_gmail_body(part)
            plain = plain or p
            html = html or h

    return plain, html


# ── Per-integration sync ──────────────────────────────────────

async def sync_gmail_integration(integration_id: int) -> int:
    """
    Fetch unread emails for one Gmail integration.
    Saves new ones to the DB and queues AI analysis.
    Returns the number of new emails stored.
    """
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    # ── Phase 1: load integration credentials (short DB open) ──────────
    db = SessionLocal()
    try:
        integration = (
            db.query(EmailIntegration)
            .filter(
                EmailIntegration.id == integration_id,
                EmailIntegration.is_active == True,
                EmailIntegration.provider == "gmail",
            )
            .first()
        )
        if not integration or not integration.access_token:
            return 0

        access_token   = integration.access_token
        refresh_token  = integration.refresh_token
        recipient_addr = integration.email_address
        int_uuid       = integration.id
    finally:
        db.close()

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GMAIL_CLIENT_ID,
        client_secret=settings.GMAIL_CLIENT_SECRET,
        scopes=[
            "openid",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
        ],
    )

    # Refresh token if expired; persist new token with a short DB open
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        db2 = SessionLocal()
        try:
            row = db2.query(EmailIntegration).filter(EmailIntegration.id == int_uuid).first()
            if row:
                row.access_token = creds.token
                db2.commit()
        finally:
            db2.close()

    service = build("gmail", "v1", credentials=creds)

    # ── Phase 2: fetch message list from Gmail API (no DB held) ──────────
    result = (
        service.users()
        .messages()
        .list(userId="me", q="is:unread", maxResults=50)
        .execute()
    )
    messages = result.get("messages", [])
    if not messages:
        return 0

    # ── Phase 3: for each message, check DB and insert if new ────────────
    new_count = 0
    new_email_ids = []

    for msg_meta in messages:
        msg_id = msg_meta["id"]

        # Short DB open: check for duplicate
        db3 = SessionLocal()
        try:
            if db3.query(Email).filter(Email.message_id == msg_id).first():
                continue
        finally:
            db3.close()

        # Fetch full message from Gmail API (network, no DB held)
        try:
            msg = (
                service.users()
                .messages()
                .get(userId="me", id=msg_id, format="full")
                .execute()
            )
        except Exception as exc:
            logger.warning(f"[gmail_sync] Could not fetch message {msg_id}: {exc}")
            continue

        headers = {
            h["name"]: h["value"]
            for h in msg.get("payload", {}).get("headers", [])
        }
        subject     = headers.get("Subject", "(no subject)")
        from_raw    = headers.get("From", "")
        date_str    = headers.get("Date", "")
        thread_id   = msg.get("threadId")

        sender_name, sender_email_addr = email_lib.utils.parseaddr(from_raw)

        # ── Domain whitelist check ────────────────────────────────────
        sender_domain = sender_email_addr.split("@")[-1].lower() if "@" in sender_email_addr else ""
        db_dom = SessionLocal()
        try:
            active_domain_count = (
                db_dom.query(AllowedDomain)
                .filter(AllowedDomain.is_active == True)
                .count()
            )
            is_allowed = (
                db_dom.query(AllowedDomain)
                .filter(
                    AllowedDomain.domain == sender_domain,
                    AllowedDomain.is_active == True,
                )
                .first()
                is not None
            )
        finally:
            db_dom.close()

        if active_domain_count > 0 and not is_allowed:
            logger.info(
                f"[gmail_sync] Blocked email from {sender_email_addr} (domain not in whitelist)"
            )
            _send_domain_rejection(service, msg_id, sender_email_addr, recipient_addr, subject, thread_id)
            continue
        # ─────────────────────────────────────────────────────────────

        try:
            received_at = email_lib.utils.parsedate_to_datetime(date_str)
        except Exception:
            received_at = datetime.utcnow()

        plain, html = _extract_gmail_body(msg.get("payload", {}))

        # Short DB open: insert the new email row
        db4 = SessionLocal()
        try:
            # Guard against race condition: check again inside the same session
            if db4.query(Email).filter(Email.message_id == msg_id).first():
                continue
            email_obj = Email(
                message_id=msg_id,
                integration_id=int_uuid,
                subject=subject,
                sender_name=sender_name,
                sender_email=sender_email_addr,
                recipient_email=recipient_addr,
                body_plain=plain,
                body_html=html,
                received_at=received_at,
                thread_id=thread_id,
            )
            db4.add(email_obj)
            db4.commit()
            db4.refresh(email_obj)
            new_email_ids.append(email_obj.id)
            new_count += 1
            logger.info(
                f"[gmail_sync] New email saved: '{subject[:60]}' from {sender_email_addr}"
            )
        except IntegrityError:
            # Another concurrent sync inserted the same message first.
            db4.rollback()
            continue
        except Exception as exc:
            logger.error(f"[gmail_sync] Failed to insert email {msg_id}: {exc}")
            db4.rollback()
        finally:
            db4.close()

    # ── Phase 4: schedule analysis AFTER all DB sessions are closed ──────
    for eid in new_email_ids:
        _schedule_analysis(eid)

    return new_count


def _send_domain_rejection(service, msg_id: str, sender_addr: str, my_addr: str, subject: str, thread_id: str | None):
    """Send an auto-reply via Gmail API telling the sender they are not allowed."""
    import email as _email_lib
    from email.mime.text import MIMEText

    body = (
        f"Hello,\n\n"
        f"Thank you for your email. Unfortunately your domain is not authorised to "
        f"send messages to this mailbox, so your message could not be delivered.\n\n"
        f"If you believe this is an error, please contact the mailbox administrator.\n\n"
        f"This is an automated response — please do not reply to this message."
    )
    msg = MIMEText(body)
    msg["To"]      = sender_addr
    msg["From"]    = my_addr
    msg["Subject"] = f"Re: {subject}"
    if thread_id:
        msg["In-Reply-To"] = msg_id
        msg["References"]  = msg_id

    import base64 as _b64
    raw = _b64.urlsafe_b64encode(msg.as_bytes()).decode()
    send_body: dict = {"raw": raw}
    if thread_id:
        send_body["threadId"] = thread_id

    try:
        service.users().messages().send(userId="me", body=send_body).execute()
        logger.info(f"[gmail_sync] Domain rejection auto-reply sent to {sender_addr}")
    except Exception as exc:
        logger.warning(f"[gmail_sync] Failed to send domain rejection reply: {exc}")


def _schedule_analysis(email_id):
    """Fire-and-forget: queue the AI analysis pipeline for a newly saved email.

    The semaphore ensures at most 3 pipelines run concurrently, keeping
    DB connection usage well within pool limits.
    The pipeline itself manages its own short-lived DB sessions.
    """
    from app.routers.emails import _run_analysis_pipeline

    async def _run():
        async with _analysis_semaphore:
            try:
                await _run_analysis_pipeline(email_id)
            except Exception as exc:
                logger.error(f"[gmail_sync] Analysis failed for email {email_id}: {exc}")

    asyncio.create_task(_run())


# ── Sync all integrations ─────────────────────────────────────

async def sync_all_gmail():
    """Sync every active Gmail integration."""
    db = SessionLocal()
    try:
        integration_ids = [
            row.id
            for row in db.query(EmailIntegration).filter(
                EmailIntegration.is_active == True,
                EmailIntegration.provider == "gmail",
            )
        ]
    finally:
        db.close()

    total = 0
    for iid in integration_ids:
        total += await sync_gmail_integration(iid)

    if total:
        logger.info(f"[gmail_sync] Fetched {total} new email(s) across all integrations")


# ── Background poller ─────────────────────────────────────────

async def start_email_poller():
    """
    Long-running asyncio task started at server startup.
    Polls Gmail every FETCH_INTERVAL_SECONDS (default 300 s / 5 min).
    """
    logger.info(
        f"[gmail_sync] Email poller started — interval={settings.FETCH_INTERVAL_SECONDS}s"
    )
    # Initial sync immediately on startup
    try:
        await sync_all_gmail()
    except Exception as exc:
        logger.error(f"[gmail_sync] Initial sync error: {exc}")
    while True:
        await asyncio.sleep(settings.FETCH_INTERVAL_SECONDS)
        try:
            await sync_all_gmail()
        except Exception as exc:
            logger.error(f"[gmail_sync] Poller error: {exc}")
