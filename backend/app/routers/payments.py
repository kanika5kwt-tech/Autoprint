from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.print_job import PrintJob, JobStatus
from app.services.payment_service import create_payment_order, verify_payment, generate_qr_code
from app.services.queue_service import get_queue_status
from datetime import datetime

router = APIRouter(prefix="/payments", tags=["Payments"])

class PaymentVerifyRequest(BaseModel):
    job_id: str
    order_id: str
    payment_id: str
    signature: str

@router.post("/create-order/{job_id}")
def create_order(job_id: str, db: Session = Depends(get_db)):
    # Job find karo
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Only CONFIRMED jobs can be paid")

    # Razorpay order banao
    order = create_payment_order(
        amount=float(job.total_amount),
        job_code=job.job_code
    )

    return {
        "job_id": str(job.id),
        "job_code": job.job_code,
        "payment_order": order,
        "message": "Payment order created. Complete payment to proceed."
    }

@router.post("/verify")
def verify_payment_route(data: PaymentVerifyRequest, db: Session = Depends(get_db)):
    # Job find karo
    job = db.query(PrintJob).filter(PrintJob.id == data.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Payment verify karo
    is_valid = verify_payment(data.order_id, data.payment_id, data.signature)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    # Queue position calculate karo
    queue = get_queue_status(db)
    queue_position = queue["jobs_in_queue"] + 1

    # Job status update karo
    job.status = JobStatus.IN_QUEUE
    job.paid_at = datetime.utcnow()
    job.queue_position = queue_position
    db.commit()

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