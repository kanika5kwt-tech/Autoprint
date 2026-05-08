"""
daemon.py - Windows-compatible AutoPrint background daemon
Polls Redis queue every 5s, picks IN_QUEUE jobs, sends to printer, marks READY.
 
Changes from Linux version:
- Uses pathlib.Path for cross-platform file paths
- Replaces lp/lpstat shell commands with printer_service.py (win32 or simulation)
- Uses os.path.join style replaced with Path() throughout
- Signal handling updated for Windows (no SIGTERM in the same way)
"""
 
import os
import sys
import time
import signal
import logging
import json
from pathlib import Path
from datetime import datetime
 
# ── Make sure backend app is importable ──────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_PATH = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
 
# ── Logging setup ─────────────────────────────────────────────────────────────
LOG_DIR = PROJECT_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
 
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / "daemon.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("autoprint.daemon")
 
# ── Imports (after path setup) ────────────────────────────────────────────────
try:
    import redis
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from dotenv import load_dotenv
 
    env_path = BACKEND_PATH / ".env"
    load_dotenv(dotenv_path=env_path)
    logger.info(f"Loaded .env from {env_path}")
 
except ImportError as e:
    logger.critical(f"Missing dependency: {e}\nRun: pip install -r backend/requirements.txt")
    sys.exit(1)
 
# ── Import app modules ────────────────────────────────────────────────────────
try:
    from app.database import Base
    from app.models.print_job import PrintJob
    from app.services.printer_service import send_to_printer, get_printer_status
except ImportError as e:
    logger.critical(f"Cannot import app modules: {e}")
    logger.critical("Make sure you're running from the project root directory.")
    sys.exit(1)
 
# ── Configuration ─────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/autoprint_db")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
POLL_INTERVAL = int(os.getenv("DAEMON_POLL_INTERVAL", "5"))
QUEUE_KEY = "autoprint:print_queue"
 
# ── Database + Redis setup ────────────────────────────────────────────────────
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
 
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    logger.info(f"Connected to Redis at {REDIS_URL}")
except redis.ConnectionError:
    logger.critical(
        f"Cannot connect to Redis at {REDIS_URL}\n"
        "Windows fix: Install Memurai (https://www.memurai.com) or Redis for Windows."
    )
    sys.exit(1)
 
# ── Graceful shutdown ──────────────────────────────────────────────────────────
_running = True
 
def _shutdown(signum, frame):
    global _running
    logger.info(f"Received signal {signum} — shutting down gracefully...")
    _running = False
 
signal.signal(signal.SIGINT, _shutdown)
if sys.platform != "win32":
    signal.signal(signal.SIGTERM, _shutdown)
else:
    try:
        signal.signal(signal.SIGBREAK, _shutdown)
    except (AttributeError, OSError):
        pass
 
 
# ── Core processing ────────────────────────────────────────────────────────────
def process_job(job_id: str, db_session) -> bool:
    """
    Fetch a single print job from DB, send to printer, update status.
    job_id is a UUID string.
    """
    job: PrintJob = db_session.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        logger.warning(f"Job {job_id} not found in database — skipping.")
        return False
 
    # Double-check status (race condition guard)
    if str(job.status).upper() not in ("IN_QUEUE", "JOBSTATUS.IN_QUEUE"):
        logger.info(f"Job {job_id} status is '{job.status}' — skipping.")
        return False
 
    logger.info(
        f"Processing job {job_id} | {job.file_name} | "
        f"copies={job.copies} | colour={job.colour_mode} | sides={job.sides}"
    )
 
    # Mark as PRINTING
    job.status = "PRINTING"
    db_session.commit()
 
    # Resolve file path (cross-platform)
    file_path = Path(job.file_path)
    if not file_path.is_absolute():
        file_path = BACKEND_PATH / file_path
 
    # Send to printer (win32 or simulation)
    result = send_to_printer(
        file_path=str(file_path),
        copies=job.copies,
        colour_mode=job.colour_mode,
        sides=job.sides,
        paper_size=getattr(job, "paper_size", "A4"),
    )
 
    if result["success"]:
        job.status = "READY"
        job.queue_position = 0
        logger.info(f"Job {job_id} → READY ✓ (printer_job_id={result['job_id']})")
    else:
        job.status = "IN_QUEUE"
        logger.error(f"Job {job_id} failed: {result['message']} — re-queued.")
 
    db_session.commit()
    return result["success"]
 
 
def update_queue_positions(db_session):
    """Recalculate queue positions for all IN_QUEUE jobs."""
    try:
        waiting_jobs = (
            db_session.query(PrintJob)
            .filter(PrintJob.status == "IN_QUEUE")
            .order_by(PrintJob.id)
            .all()
        )
        for position, job in enumerate(waiting_jobs, start=1):
            job.queue_position = position
        db_session.commit()
    except Exception:
        db_session.rollback()
 
 
def run_daemon():
    """Main daemon loop — polls queue every POLL_INTERVAL seconds."""
    logger.info("=" * 60)
    logger.info("AutoPrint Daemon starting...")
    logger.info(f"Platform     : {sys.platform}")
    logger.info(f"Project root : {PROJECT_ROOT}")
    logger.info(f"Poll interval: {POLL_INTERVAL}s")
    logger.info(f"Queue key    : {QUEUE_KEY}")
    printer_info = get_printer_status()
    logger.info(f"Printer      : {printer_info['name']} ({printer_info['status']})")
    logger.info("=" * 60)
 
    while _running:
        try:
            db = SessionLocal()
            try:
                # Pop next job from Redis queue (blocking pop with timeout)
                result = redis_client.blpop(QUEUE_KEY, timeout=POLL_INTERVAL)
 
                if result:
                    _, job_id_str = result
                    job_id_str = job_id_str.strip()
                    logger.info(f"Picked job from queue: {job_id_str}")
                    # UUID string directly — no int() conversion
                    process_job(job_id_str, db)
                    update_queue_positions(db)
 
                else:
                    update_queue_positions(db)
                    logger.debug("Queue empty — waiting...")
 
            finally:
                db.close()
 
        except redis.ConnectionError as e:
            logger.error(f"Redis connection lost: {e} — retrying in {POLL_INTERVAL}s")
            time.sleep(POLL_INTERVAL)
        except Exception as e:
            logger.exception(f"Unexpected daemon error: {e}")
            time.sleep(POLL_INTERVAL)
 
    logger.info("AutoPrint Daemon stopped.")
 
 
# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    run_daemon()