"""
daemon.py - Production ready Windows-compatible AutoPrint background daemon.
 
Improvements:
- Auto-recovers stuck IN_QUEUE jobs on startup
- UUID job IDs (no int conversion)
- Proper status enum handling
- Better error recovery
"""
 
import os
import sys
import time
import signal
import logging
from pathlib import Path
from datetime import datetime
 
# ── Path setup ────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_PATH = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
 
# ── Logging ───────────────────────────────────────────────────────────────────
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
 
# ── Imports ───────────────────────────────────────────────────────────────────
try:
    import redis
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from dotenv import load_dotenv
 
    env_path = BACKEND_PATH / ".env"
    load_dotenv(dotenv_path=env_path)
    logger.info(f"Loaded .env from {env_path}")
 
except ImportError as e:
    logger.critical(f"Missing dependency: {e}")
    sys.exit(1)
 
try:
    from app.models.print_job import PrintJob, JobStatus
    from app.services.printer_service import send_to_printer, get_printer_status
    from app.services.queue_service import requeue_stuck_jobs
except ImportError as e:
    logger.critical(f"Cannot import app modules: {e}")
    sys.exit(1)
 
# ── Config ────────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/autoprint_db")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
POLL_INTERVAL = int(os.getenv("DAEMON_POLL_INTERVAL", "5"))
QUEUE_KEY = "autoprint:print_queue"
 
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
 
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    logger.info(f"Connected to Redis at {REDIS_URL}")
except redis.ConnectionError:
    logger.critical(f"Cannot connect to Redis at {REDIS_URL}")
    sys.exit(1)
 
# ── Graceful shutdown ─────────────────────────────────────────────────────────
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
 
 
# ── Job processing ────────────────────────────────────────────────────────────
def process_job(job_id: str, db_session) -> bool:
    """Process a single print job by UUID string."""
 
    # Lock the row while processing
    job = db_session.query(PrintJob).filter(
        PrintJob.id == job_id
    ).with_for_update().first()
 
    if not job:
        logger.warning(f"Job {job_id} not found in DB — skipping.")
        return False
 
    # Only process IN_QUEUE jobs
    job_status_str = str(job.status).upper()
    if "IN_QUEUE" not in job_status_str:
        logger.info(f"Job {job_id} status is '{job.status}' — skipping.")
        return False
 
    logger.info(
        f"Processing job {job.job_code} | {job.file_name} | "
        f"copies={job.copies} | colour={job.colour_mode} | sides={job.sides}"
    )
 
    # Mark as PRINTING
    job.status = JobStatus.PRINTING
    db_session.commit()
 
    # Resolve file path
    file_path = Path(job.file_path)
    if not file_path.is_absolute():
        file_path = BACKEND_PATH / file_path
 
    # Send to printer
    result = send_to_printer(
        file_path=str(file_path),
        copies=job.copies,
        colour_mode=job.colour_mode,
        sides=job.sides,
        paper_size=getattr(job, "paper_size", "A4"),
    )
 
    if result["success"]:
        job.status = JobStatus.READY
        job.queue_position = 0
        logger.info(f"Job {job.job_code} → READY ✓")
    else:
        job.status = JobStatus.IN_QUEUE  # Re-queue on failure
        logger.error(f"Job {job.job_code} failed: {result['message']} — re-queued.")
        # Push back to Redis
        redis_client.rpush(QUEUE_KEY, job_id)
 
    db_session.commit()
    return result["success"]
 
 
def update_queue_positions(db_session):
    """Recalculate queue positions for all IN_QUEUE jobs."""
    try:
        waiting_jobs = (
            db_session.query(PrintJob)
            .filter(PrintJob.status == JobStatus.IN_QUEUE)
            .order_by(PrintJob.id)
            .all()
        )
        for position, job in enumerate(waiting_jobs, start=1):
            job.queue_position = position
        db_session.commit()
    except Exception as e:
        db_session.rollback()
        logger.error(f"Queue position update failed: {e}")
 
 
# ── Main loop ─────────────────────────────────────────────────────────────────
def run_daemon():
    logger.info("=" * 60)
    logger.info("AutoPrint Daemon starting...")
    logger.info(f"Platform     : {sys.platform}")
    logger.info(f"Project root : {PROJECT_ROOT}")
    logger.info(f"Poll interval: {POLL_INTERVAL}s")
    printer_info = get_printer_status()
    logger.info(f"Printer      : {printer_info['name']} ({printer_info['status']})")
    logger.info("=" * 60)
 
    # ── Startup recovery — re-queue any stuck IN_QUEUE jobs ──────────────────
    db = SessionLocal()
    try:
        recovered = requeue_stuck_jobs(db)
        if recovered:
            logger.info(f"Startup recovery: {recovered} stuck jobs re-queued")
    finally:
        db.close()
 
    # ── Main polling loop ─────────────────────────────────────────────────────
    while _running:
        try:
            db = SessionLocal()
            try:
                result = redis_client.blpop(QUEUE_KEY, timeout=POLL_INTERVAL)
 
                if result:
                    _, job_id_str = result
                    job_id_str = job_id_str.strip()
                    logger.info(f"Picked job from queue: {job_id_str}")
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
            logger.exception(f"Daemon error: {e}")
            time.sleep(POLL_INTERVAL)
 
    logger.info("AutoPrint Daemon stopped.")
 
 
if __name__ == "__main__":
    run_daemon()
 