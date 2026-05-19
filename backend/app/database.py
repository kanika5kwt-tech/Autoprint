"""
database.py - Production ready with connection pooling for concurrent requests.
"""
 
import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
 
load_dotenv()
 
logger = logging.getLogger(__name__)
 
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/autoprint_db")
 
# ── Connection Pool Settings ──────────────────────────────────────────────────
# pool_size      : number of permanent connections kept open
# max_overflow   : extra connections allowed beyond pool_size under heavy load
# pool_timeout   : seconds to wait for a connection before raising error
# pool_recycle   : recycle connections after this many seconds (prevents stale connections)
# pool_pre_ping  : test connection before using (auto-reconnect on dropped connections)
 
engine = create_engine(
    DATABASE_URL,
    pool_size=10,           # 10 concurrent DB connections
    max_overflow=20,        # up to 30 total under spike
    pool_timeout=30,        # wait max 30s for a connection
    pool_recycle=1800,      # recycle connections every 30 min
    pool_pre_ping=True,     # auto-reconnect if connection dropped
    echo=False,             # set True to log all SQL (dev only)
)
 
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
 
Base = declarative_base()
 
 
def get_db():
    """
    FastAPI dependency — yields a DB session and ensures it's closed after request.
    Use with: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        logger.error(f"DB session error — rolled back: {e}")
        raise
    finally:
        db.close()
 