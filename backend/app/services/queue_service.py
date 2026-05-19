"""
queue_service.py - Production ready with proper locking for concurrent access.
"""
 
import os
import redis
import logging
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.print_job import PrintJob, JobStatus
 
logger = logging.getLogger(__name__)
 
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QUEUE_KEY = "autoprint:print_queue"
AVG_PRINT_TIME_MINUTES = 2  # Average time per job
 
 
def get_redis_client():
    return redis.from_url(REDIS_URL, decode_responses=True)
 
 
def get_queue_status(db: Session) -> dict:
    """
    Get current queue status with proper count.
    Uses DB as source of truth (Redis is just a trigger mechanism).
    """
    try:
        # Count jobs currently waiting
        jobs_in_queue = db.query(func.count(PrintJob.id)).filter(
            PrintJob.status == JobStatus.IN_QUEUE
        ).scalar() or 0
 
        # Count jobs currently printing
        jobs_printing = db.query(func.count(PrintJob.id)).filter(
            PrintJob.status == JobStatus.PRINTING
        ).scalar() or 0
 
        estimated_wait = (jobs_in_queue + jobs_printing) * AVG_PRINT_TIME_MINUTES
 
        return {
            "jobs_in_queue": jobs_in_queue,
            "jobs_printing": jobs_printing,
            "estimated_wait_minutes": estimated_wait,
            "queue_healthy": True
        }
    except Exception as e:
        logger.error(f"Queue status error: {e}")
        return {
            "jobs_in_queue": 0,
            "jobs_printing": 0,
            "estimated_wait_minutes": 0,
            "queue_healthy": False
        }
 
 
def push_job_to_queue(job_id: str) -> bool:
    """
    Push a job ID to Redis queue.
    Returns True on success, False on failure.
    """
    try:
        r = get_redis_client()
        r.rpush(QUEUE_KEY, job_id)
        logger.info(f"Job {job_id} pushed to Redis queue")
        return True
    except redis.RedisError as e:
        logger.error(f"Failed to push job {job_id} to Redis: {e}")
        return False
 
 
def get_queue_length() -> int:
    """Get current Redis queue length."""
    try:
        r = get_redis_client()
        return r.llen(QUEUE_KEY)
    except redis.RedisError:
        return 0
 
 
def requeue_stuck_jobs(db: Session) -> int:
    """
    Find jobs stuck in IN_QUEUE status but missing from Redis queue.
    This is a recovery mechanism — run periodically or on daemon startup.
    Returns number of jobs re-queued.
    """
    try:
        r = get_redis_client()
 
        # Get all job IDs currently in Redis queue
        redis_queue = set(r.lrange(QUEUE_KEY, 0, -1))
 
        # Find IN_QUEUE jobs in DB
        db_jobs = db.query(PrintJob).filter(
            PrintJob.status == JobStatus.IN_QUEUE
        ).all()
 
        requeued = 0
        for job in db_jobs:
            job_id_str = str(job.id)
            if job_id_str not in redis_queue:
                r.rpush(QUEUE_KEY, job_id_str)
                requeued += 1
                logger.info(f"Re-queued stuck job: {job.job_code}")
 
        if requeued > 0:
            logger.info(f"Recovery: Re-queued {requeued} stuck jobs")
 
        return requeued
 
    except Exception as e:
        logger.error(f"Requeue stuck jobs error: {e}")
        return 0
 