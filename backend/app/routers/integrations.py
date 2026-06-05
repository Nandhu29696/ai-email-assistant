"""
Integrations router — Gmail and Outlook OAuth2 flows.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.email import EmailIntegration
from app.schemas.email import IntegrationOut
from app.config import settings

router = APIRouter()


# ── List active integrations ──────────────────────────────────
@router.get("", response_model=list[IntegrationOut])
def list_integrations(db: Session = Depends(get_db)):
    return db.query(EmailIntegration).filter(EmailIntegration.is_active == True).all()


# ── Gmail ─────────────────────────────────────────────────────
@router.get("/gmail/auth-url")
def gmail_auth_url():
    """Return the Google OAuth2 authorization URL."""
    if not settings.GMAIL_CLIENT_ID or not settings.GMAIL_CLIENT_SECRET:
        raise HTTPException(
            status_code=501,
            detail="Gmail OAuth is not configured. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in backend/.env",
        )
    from google_auth_oauthlib.flow import Flow

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GMAIL_REDIRECT_URI],
            }
        },
        scopes=[
            "openid",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/gmail.send",
        ],
    )
    flow.redirect_uri = settings.GMAIL_REDIRECT_URI
    auth_url, _ = flow.authorization_url(
        prompt="consent",
        access_type="offline",
        include_granted_scopes=False,
    )
    return {"auth_url": auth_url}


@router.get("/gmail/callback")
def gmail_callback(
    code: str = Query(None),
    error: str = Query(None),
    db: Session = Depends(get_db),
):
    """Handle Gmail OAuth callback."""
    if error:
        return RedirectResponse(
            url=f"http://localhost:3000/integrations?error={error}"
        )
    if not code:
        return RedirectResponse(
            url="http://localhost:3000/integrations?error=missing_code"
        )
    if not settings.GMAIL_CLIENT_ID or not settings.GMAIL_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Gmail OAuth is not configured.")
    try:
        from google_auth_oauthlib.flow import Flow
        from googleapiclient.discovery import build

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GMAIL_CLIENT_ID,
                    "client_secret": settings.GMAIL_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GMAIL_REDIRECT_URI],
                }
            },
            scopes=[
                "openid",
                "https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/gmail.send",
            ],
        )
        flow.redirect_uri = settings.GMAIL_REDIRECT_URI
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Ensure the returned credentials include the gmail.send scope we requested.
        returned_scopes = getattr(credentials, "scopes", None) or []
        if "https://www.googleapis.com/auth/gmail.send" not in returned_scopes:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Gmail OAuth failed: missing gmail.send scope. "
                    "Please re-authorize and grant the Send permission (try an incognito window)."
                ),
            )

        # Get user email
        service = build("oauth2", "v2", credentials=credentials)
        user_info = service.userinfo().get().execute()
        email_address = user_info["email"]

        # Save or update integration
        integration = (
            db.query(EmailIntegration)
            .filter(EmailIntegration.email_address == email_address)
            .first()
        )
        if not integration:
            integration = EmailIntegration(
                provider="gmail",
                email_address=email_address,
            )
            db.add(integration)

        integration.access_token  = credentials.token
        integration.refresh_token = credentials.refresh_token
        integration.is_active     = True
        db.commit()

        return RedirectResponse(url="http://localhost:3000/settings?connected=gmail")

    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Gmail OAuth failed: {exc}")


# ── Outlook ───────────────────────────────────────────────────
@router.get("/outlook/auth-url")
def outlook_auth_url():
    """Return the Microsoft OAuth2 authorization URL."""
    if not settings.OUTLOOK_CLIENT_ID or not settings.OUTLOOK_CLIENT_SECRET:
        raise HTTPException(
            status_code=501,
            detail="Outlook OAuth is not configured. Set OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET in backend/.env",
        )
    import msal

    authority = f"https://login.microsoftonline.com/{settings.OUTLOOK_TENANT_ID}"
    app = msal.ConfidentialClientApplication(
        settings.OUTLOOK_CLIENT_ID,
        authority=authority,
        client_credential=settings.OUTLOOK_CLIENT_SECRET,
    )
    auth_url = app.get_authorization_request_url(
        scopes=["Mail.Read", "User.Read"],
        redirect_uri=settings.OUTLOOK_REDIRECT_URI,
    )
    return {"auth_url": auth_url}


@router.get("/outlook/callback")
def outlook_callback(
    code: str = Query(...),
    db: Session = Depends(get_db),
):
    """Handle Outlook OAuth callback."""
    try:
        import msal

        authority = f"https://login.microsoftonline.com/{settings.OUTLOOK_TENANT_ID}"
        app = msal.ConfidentialClientApplication(
            settings.OUTLOOK_CLIENT_ID,
            authority=authority,
            client_credential=settings.OUTLOOK_CLIENT_SECRET,
        )
        result = app.acquire_token_by_authorization_code(
            code,
            scopes=["Mail.Read", "User.Read"],
            redirect_uri=settings.OUTLOOK_REDIRECT_URI,
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result.get("error_description", "OAuth failed"))

        import httpx
        headers = {"Authorization": f"Bearer {result['access_token']}"}
        me = httpx.get("https://graph.microsoft.com/v1.0/me", headers=headers).json()
        email_address = me.get("mail") or me.get("userPrincipalName")

        integration = (
            db.query(EmailIntegration)
            .filter(EmailIntegration.email_address == email_address)
            .first()
        )
        if not integration:
            integration = EmailIntegration(provider="outlook", email_address=email_address)
            db.add(integration)

        integration.access_token  = result["access_token"]
        integration.refresh_token = result.get("refresh_token")
        integration.is_active     = True
        db.commit()

        return RedirectResponse(url="http://localhost:3000/settings?connected=outlook")

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Outlook OAuth failed: {exc}")


@router.delete("/{integration_id}")
def disconnect_integration(
    integration_id: str,
    db: Session = Depends(get_db),
):
    integration = db.query(EmailIntegration).filter(
        EmailIntegration.id == integration_id
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    integration.is_active     = False
    integration.access_token  = None
    integration.refresh_token = None
    db.commit()
    return {"message": "Integration disconnected"}
