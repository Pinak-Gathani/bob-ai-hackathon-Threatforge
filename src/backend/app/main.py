"""
ThreatForge — FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import create_tables, SessionLocal
from .routes import router
from .seed import seed_database

app = FastAPI(
    title="ThreatForge",
    description="Threat Intelligence Correlation & Alert Prioritisation API — IBM Bob Hackathon D2",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(router, prefix="/api/v1")


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    create_tables()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
