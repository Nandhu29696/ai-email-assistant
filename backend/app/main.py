from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocket, WebSocketDisconnect
from loguru import logger
import asyncio

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.routers import emails, analysis, dashboard, integrations
from app.routers import lookups, replies, domains
from app.services.notification_service import notification_manager
from app.services.gmail_sync import start_email_poller

# ── Create tables ────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered email management system with sentiment analysis and NLP",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(emails.router,       prefix="/api/emails",       tags=["Emails"])
app.include_router(analysis.router,     prefix="/api/analysis",     tags=["Analysis"])
app.include_router(dashboard.router,    prefix="/api/dashboard",    tags=["Dashboard"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["Integrations"])
app.include_router(lookups.router,      prefix="/api/lookups",      tags=["Lookups"])
app.include_router(replies.router,      prefix="/api/emails",       tags=["Replies"])
app.include_router(domains.router,      prefix="/api/domains",      tags=["Domains"])


# ── WebSocket – Real-time notifications ──────────────────────
@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    await notification_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; notifications are pushed server-side
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        notification_manager.disconnect(websocket)
    except Exception as exc:
        logger.error(f"WebSocket error: {exc}")
        notification_manager.disconnect(websocket)


# ── Health check ─────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}


# ── Seed lookup tables ────────────────────────────────────────
def _seed_lookups():
    """Populate sentiment, priority, category and allowed domain tables if empty."""
    from app.models.email import SentimentOption, PriorityOption, CategoryOption, AllowedDomain

    db = SessionLocal()
    try:
        if db.query(SentimentOption).count() == 0:
            db.bulk_insert_mappings(SentimentOption, [
                {"value": "positive", "label": "Positive", "color": "green",  "sort_order": 1},
                {"value": "neutral",  "label": "Neutral",  "color": "gray",   "sort_order": 2},
                {"value": "negative", "label": "Negative", "color": "red",    "sort_order": 3},
            ])

        if db.query(PriorityOption).count() == 0:
            db.bulk_insert_mappings(PriorityOption, [
                {"value": "critical", "label": "Critical", "color": "red",    "score": 4, "sort_order": 1},
                {"value": "high",     "label": "High",     "color": "orange", "score": 3, "sort_order": 2},
                {"value": "medium",   "label": "Medium",   "color": "yellow", "score": 2, "sort_order": 3},
                {"value": "low",      "label": "Low",      "color": "blue",   "score": 1, "sort_order": 4},
            ])

        if db.query(CategoryOption).count() == 0:
            db.bulk_insert_mappings(CategoryOption, [
                {"value": "complaint", "label": "Complaint", "description": "Customer complaints and issues",           "sort_order": 1},
                {"value": "support",   "label": "Support",   "description": "Technical support requests",              "sort_order": 2},
                {"value": "sales",     "label": "Sales",     "description": "Sales inquiries and leads",               "sort_order": 3},
                {"value": "refund",    "label": "Refund",    "description": "Refund and cancellation requests",        "sort_order": 4},
                {"value": "invoice",   "label": "Invoice",   "description": "Billing and invoice queries",             "sort_order": 5},
                {"value": "feedback",  "label": "Feedback",  "description": "Product or service feedback",            "sort_order": 6},
                {"value": "general",   "label": "General",   "description": "General enquiries and miscellaneous",     "sort_order": 7},
            ])

        if db.query(AllowedDomain).count() == 0:
            db.bulk_insert_mappings(AllowedDomain, [
                {"domain": "gmail.com",     "is_active": True, "notes": "Google Gmail"},
                {"domain": "outlook.com",   "is_active": True, "notes": "Microsoft Outlook"},
                {"domain": "hotmail.com",   "is_active": True, "notes": "Microsoft Hotmail"},
                {"domain": "yahoo.com",     "is_active": True, "notes": "Yahoo Mail"},
                {"domain": "icloud.com",    "is_active": True, "notes": "Apple iCloud Mail"},
                {"domain": "protonmail.com","is_active": True, "notes": "ProtonMail"},
            ])

        db.commit()
        logger.info("Lookup tables seeded.")
    except Exception as exc:
        logger.error(f"Lookup seeding failed: {exc}")
        db.rollback()
    finally:
        db.close()


@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} started")
    _seed_lookups()
    asyncio.create_task(start_email_poller())


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Server shutting down")
