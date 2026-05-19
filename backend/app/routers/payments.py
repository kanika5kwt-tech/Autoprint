from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_db
from app.models.print_job import PrintJob, JobStatus
from app.services.payment_service import create_payment_order, verify_payment, generate_qr_code
from app.services.queue_service import get_queue_status
from datetime import datetime
import redis
import os
import logging
 
logger = logging.getLogger(__name__)
 
router = APIRouter(prefix="/payments", tags=["Payments"])
 
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QUEUE_KEY = "autoprint:print_queue"
 
def get_redis():
    """Redis client - reused across requests."""
    return redis.from_url(REDIS_URL, decode_responses=True)
 
 
class PaymentVerifyRequest(BaseModel):
    job_id: str
    order_id: str
    payment_id: str
    signature: str
 
 
@router.post("/create-order/{job_id}")
def create_order(job_id: str, db: Session = Depends(get_db)):
    # Row-level lock — prevents duplicate orders for same job
    job = db.query(PrintJob).filter(
        PrintJob.id == job_id
    ).with_for_update().first()
 
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
 
    if job.status != JobStatus.CONFIRMED:
        raise HTTPException(
            status_code=400,
            detail=f"Only CONFIRMED jobs can be paid. Current status: {job.status}"
        )
 
    try:
        order = create_payment_order(
            amount=float(job.total_amount),
            job_code=job.job_code
        )
    except Exception as e:
        logger.error(f"Payment order creation failed for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail="Payment service unavailable")
 
    return {
        "job_id": str(job.id),
        "job_code": job.job_code,
        "payment_order": order,
        "message": "Payment order created. Complete payment to proceed."
    }
 
 
@router.post("/verify")
def verify_payment_route(data: PaymentVerifyRequest, db: Session = Depends(get_db)):
    # Row-level lock — prevents double payment processing
    job = db.query(PrintJob).filter(
        PrintJob.id == data.job_id
    ).with_for_update().first()
 
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
 
    # Idempotency check — agar already paid hai toh same response do
    if job.status == JobStatus.IN_QUEUE or job.status == JobStatus.PRINTING or \
       job.status == JobStatus.READY or job.status == JobStatus.COMPLETED:
        logger.warning(f"Job {data.job_id} already processed — status: {job.status}")
        qr_code = generate_qr_code(job.job_code, float(job.total_amount))
        return {
            "job_id": str(job.id),
            "job_code": job.job_code,
            "status": job.status,
            "queue_position": job.queue_position,
            "estimated_wait": 0,
            "qr_code": qr_code,
            "message": "Job already in queue."
        }
 
    # Payment verify karo
    is_valid = verify_payment(data.order_id, data.payment_id, data.signature)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Payment verification failed")
 
    # Queue position — locked query to avoid race condition
    queue = get_queue_status(db)
    queue_position = queue["jobs_in_queue"] + 1
 
    # Job status update
    job.status = JobStatus.IN_QUEUE
    job.paid_at = datetime.utcnow()
    job.queue_position = queue_position
 
    try:
        db.commit()
        db.refresh(job)
        logger.info(f"Job {job.job_code} marked IN_QUEUE at position {queue_position}")
    except Exception as e:
        db.rollback()
        logger.error(f"DB commit failed for job {data.job_id}: {e}")
        raise HTTPException(status_code=500, detail="Database error — please retry")
 
    # ── Auto push to Redis queue ──────────────────────────────────────────────
    try:
        r = get_redis()
        r.rpush(QUEUE_KEY, str(job.id))
        logger.info(f"Job {job.job_code} pushed to Redis queue automatically")
    except redis.RedisError as e:
        # Redis fail hone pe bhi payment successful — daemon DB poll karega
        logger.error(f"Redis push failed for job {data.job_id}: {e} — daemon will pick it up")
 
    # QR code generate karo
    qr_code = generate_qr_code(job.job_code, float(job.total_amount))
 
    return {
        "job_id": str(job.id),
        "job_code": job.job_code,
        "status": job.status,
        "queue_position": queue_position,
        "estimated_wait": queue["estimated_wait_minutes"],
        "qr_code": qr_code,
        "message": f"Payment successful! Your job is #{queue_position} in queue."
    }
 
 
@router.get("/status/{job_id}")
def get_payment_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
 
    return {
        "job_id": str(job.id),
        "job_code": job.job_code,
        "status": job.status,
        "total_amount": float(job.total_amount),
        "paid_at": job.paid_at,
        "queue_position": job.queue_position
    }
 