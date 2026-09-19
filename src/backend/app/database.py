from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from .config import settings
from .models import Base

# SQLite — enable WAL mode for better concurrent reads
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=False,
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    # Lightweight SQLite migration for existing demo databases.
    # create_all() does not add columns to an already-created table.
    inspector = inspect(engine)
    if "alerts" in inspector.get_table_names():
        existing = {c["name"] for c in inspector.get_columns("alerts")}
        additions = {
            "ml_model": "VARCHAR DEFAULT 'XGBClassifier'",
            "ml_threat_probability": "INTEGER DEFAULT 0",
            "ml_classification": "VARCHAR DEFAULT 'INVESTIGATING'",
            "ml_priority": "VARCHAR DEFAULT 'MEDIUM'",
            "correlation_evidence": "JSON DEFAULT '[]'",
            "evidence_edges": "JSON DEFAULT '[]'",
        }
        with engine.begin() as conn:
            for name, ddl in additions.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE alerts ADD COLUMN {name} {ddl}"))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
