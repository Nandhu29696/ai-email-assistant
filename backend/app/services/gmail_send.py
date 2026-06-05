from __future__ import annotations

import base64
import email as _email_lib
from email.mime.text import MIMEText
from loguru import logger

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.config import settings
from app.database import SessionLocal
from app.models.email import Email, EmailReply, EmailIntegration


def send_reply_via_gmail(email_obj: Email, reply_obj: EmailReply) -> tuple[bool, str | None]:
    """Send a reply via Gmail API using the integration linked to the email.

    Returns (True, None) if send succeeded, otherwise (False, error_message).
    """
    if not email_obj.integration_id:
        logger.warning("[gmail_send] Email has no integration; cannot send reply")
        return False, "Email has no integration"

    # Load integration tokens
    db = SessionLocal()
    try:
        integ = db.query(EmailIntegration).filter(EmailIntegration.id == email_obj.integration_id).first()
        if not integ or not integ.access_token:
            logger.warning("[gmail_send] Integration not available or missing tokens")
            return False, "Integration not found or missing tokens"
        access_token = integ.access_token
        refresh_token = integ.refresh_token
    finally:
        db.close()

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GMAIL_CLIENT_ID,
        client_secret=settings.GMAIL_CLIENT_SECRET,
        scopes=["https://www.googleapis.com/auth/gmail.send"],
    )

    # Refresh token if needed and persist
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            db2 = SessionLocal()
            try:
                row = db2.query(EmailIntegration).filter(EmailIntegration.id == email_obj.integration_id).first()
                if row:
                    row.access_token = creds.token
                    db2.commit()
            finally:
                db2.close()
        except Exception as exc:
            logger.warning(f"[gmail_send] Failed to refresh credentials: {exc}")

    service = build("gmail", "v1", credentials=creds)

    body = reply_obj.body or ""
    msg = MIMEText(body)
    msg["To"] = email_obj.sender_email
    msg["From"] = integ.email_address if (integ and getattr(integ, "email_address", None)) else email_obj.recipient_email
    msg["Subject"] = reply_obj.subject or f"Re: {email_obj.subject}"
    # Try to thread the reply if we have thread id or original message id
    if email_obj.thread_id:
        # Gmail accepts threadId in send body to thread the message
        pass
    try:
        if email_obj.message_id:
            msg["In-Reply-To"] = email_obj.message_id
            msg["References"] = email_obj.message_id
    except Exception:
        pass

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    send_body: dict = {"raw": raw}
    if email_obj.thread_id:
        send_body["threadId"] = email_obj.thread_id

    try:
        service.users().messages().send(userId="me", body=send_body).execute()
        logger.info(f"[gmail_send] Sent reply to {email_obj.sender_email} for email {email_obj.id}")
        return True, None
    except Exception as exc:
        err = str(exc)
        logger.warning(f"[gmail_send] Failed to send reply: {err}")
        return False, err
