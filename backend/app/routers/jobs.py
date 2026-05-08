from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.pdf_service import save_pdf, analyze_pdf
from app.services.pricing_service import calculate_cost
from app.services.queue_service import get_queue_status
from app.models.print_job import PrintJob, JobStatus
from app.schemas.auth import CreateJobRequest
from datetime import datetime
import random
import string
import os

router = APIRouter(prefix="/jobs", tags=["Print Jobs"])

def generate_job_code():
    year = datetime.now().year
    number = ''.join(random.choices(string.digits, k=5))
    return f"PRN-{year}-{number}"

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size cannot exceed 20MB")

    saved = save_pdf(file_bytes, file.filename)
    analysis = analyze_pdf(saved["file_path"])

    return {
        "file_id": saved["file_id"],
        "original_filename": file.filename,
        "total_pages": analysis["total_pages"],
        "has_colour_pages": analysis["has_colour_pages"],
        "colour_page_numbers": analysis["colour_page_numbers"],
        "preview_images": analysis["preview_images"]
    }

@router.post("/create")
def create_job(
    data: CreateJobRequest,
    db: Session = Depends(get_db)
):
    # Check if file exists
    file_path = os.path.join("uploads", f"{data.file_id}.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found. Please upload first.")

    # Calculate pages to print
    end_page = data.page_range_end or data.total_pages
    pages_to_print = end_page - data.page_range_start + 1

    if pages_to_print <= 0:
        raise HTTPException(status_code=400, detail="Invalid page range")

    # Calculate cost
    cost = calculate_cost(
        pages_to_print=pages_to_print,
        copies=data.copies,
        colour_mode=data.colour_mode,
        sides=data.sides,
        paper_size=data.paper_size,
        stapling=data.stapling
    )

    # Get queue status
    queue = get_queue_status(db)

    # Create job in DRAFT status
    job = PrintJob(
        job_code=generate_job_code(),
        user_id="00000000-0000-0000-0000-000000000000",
        file_name=data.file_name,
        file_path=file_path,
        total_pages=data.total_pages,
        pages_to_print=pages_to_print,
        colour_mode=data.colour_mode,
        sides=data.sides,
        page_range_start=data.page_range_start,
        page_range_end=end_page,
        copies=data.copies,
        paper_size=data.paper_size,
        stapling=data.stapling,
        cost_per_page=cost["cost_per_page"],
        total_amount=cost["total_amount"],
        status=JobStatus.DRAFT
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return {
        "job_id": str(job.id),
        "job_code": job.job_code,
        "status": job.status,
        "cost_breakdown": cost,
        "queue_info": queue,
        "message": "Job created. Review cost and queue info, then confirm."
    }

@router.post("/{job_id}/confirm")
def confirm_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only DRAFT jobs can be confirmed")

    job.status = JobStatus.CONFIRMED
    job.confirmed_at = datetime.utcnow()
    db.commit()

    return {
        "job_id": str(job.id),
        "job_code": job.job_code,
        "status": job.status,
        "total_amount": float(job.total_amount),
        "message": f"Job confirmed! Please pay Rs.{job.total_amount} to proceed."
    }

@router.delete("/{job_id}")
def cancel_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status not in [JobStatus.DRAFT, JobStatus.CONFIRMED]:
        raise HTTPException(status_code=400, detail="Cannot cancel a paid job")

    db.delete(job)
    db.commit()

    return {"message": "Job cancelled successfully"}