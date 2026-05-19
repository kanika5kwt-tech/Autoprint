from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.pdf_service import save_pdf, analyze_pdf, convert_image_to_pdf, convert_docx_to_pdf
from app.services.pricing_service import calculate_cost
from app.services.queue_service import get_queue_status
from app.models.print_job import PrintJob, JobStatus
from app.schemas.auth import CreateJobRequest
from app.utils.jwt_helper import verify_token
from datetime import datetime
import random
import string
import os
import time
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["Print Jobs"])

# ── Supported formats ─────────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {
    ".pdf",
    ".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif", ".bmp",
    ".docx", ".doc"
}
IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif", ".bmp"
}
WORD_EXTENSIONS = {
    ".docx", ".doc"
}
MAX_FILE_SIZE_MB = 20

# ── Rate limiting ─────────────────────────────────────────────────────────────
_rate_limit_store: dict = {}
MAX_REQUESTS = 10
RATE_WINDOW_SECONDS = 60

def check_rate_limit(request: Request):
    ip = request.client.host
    now = time.time()
    if ip not in _rate_limit_store:
        _rate_limit_store[ip] = []
    _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if now - t < RATE_WINDOW_SECONDS]
    if len(_rate_limit_store[ip]) >= MAX_REQUESTS:
        raise HTTPException(status_code=429, detail=f"Too many requests. Max {MAX_REQUESTS}/minute allowed.")
    _rate_limit_store[ip].append(now)

# ── JWT Auth ──────────────────────────────────────────────────────────────────
security = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization token required. Please login first.")
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token. Please login again.")
    return payload

# ── File validation ───────────────────────────────────────────────────────────
def validate_file(file: UploadFile, file_bytes: bytes) -> str:
    """
    Validate uploaded file.
    Returns file type: 'pdf', 'image', or 'word'
    """
    filename = file.filename.lower()
    ext = os.path.splitext(filename)[1]

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not supported. Allowed: PDF, JPG, PNG, WEBP, TIFF, BMP, DOCX"
        )

    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f}MB). Max allowed: {MAX_FILE_SIZE_MB}MB."
        )

    if len(file_bytes) < 10:
        raise HTTPException(status_code=400, detail="File appears to be empty or corrupted.")

    # Word file
    if ext in WORD_EXTENSIONS:
        return "word"

    # PDF magic bytes check
    if ext == ".pdf":
        if file_bytes[:4] != b'%PDF':
            raise HTTPException(status_code=400, detail="Invalid PDF file. File appears corrupted.")
        return "pdf"

    # Image check
    if ext in IMAGE_EXTENSIONS:
        return "image"

    raise HTTPException(status_code=400, detail="Could not verify file type.")


def generate_job_code():
    year = datetime.now().year
    number = ''.join(random.choices(string.digits, k=5))
    return f"PRN-{year}-{number}"


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    check_rate_limit(request)
    file_bytes = await file.read()

    # Validate file
    file_type = validate_file(file, file_bytes)

    logger.info(
        f"File upload: {file.filename} | type={file_type} | "
        f"size={len(file_bytes)/1024:.1f}KB | user={current_user.get('sub')}"
    )

    try:
        if file_type == "image":
            logger.info(f"Converting image {file.filename} to PDF...")
            saved = convert_image_to_pdf(file_bytes, file.filename)
        elif file_type == "word":
            logger.info(f"Converting Word file {file.filename} to PDF...")
            saved = convert_docx_to_pdf(file_bytes, file.filename)
        else:
            saved = save_pdf(file_bytes, file.filename)

        analysis = analyze_pdf(saved["file_path"])

    except Exception as e:
        logger.error(f"File processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

    return {
        "file_id": saved["file_id"],
        "original_filename": file.filename,
        "file_type": file_type,
        "converted_to_pdf": file_type in ["image", "word"],
        "total_pages": analysis["total_pages"],
        "has_colour_pages": analysis["has_colour_pages"],
        "colour_page_numbers": analysis["colour_page_numbers"],
        "preview_images": analysis["preview_images"]
    }


@router.post("/create")
def create_job(
    request: Request,
    data: CreateJobRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    check_rate_limit(request)
    user_id = current_user.get("sub", "00000000-0000-0000-0000-000000000000")

    file_path = os.path.join("uploads", f"{data.file_id}.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found. Please upload first.")

    end_page = data.page_range_end or data.total_pages
    pages_to_print = end_page - data.page_range_start + 1

    if pages_to_print <= 0:
        raise HTTPException(status_code=400, detail="Invalid page range")
    if pages_to_print > data.total_pages:
        raise HTTPException(status_code=400, detail="Page range exceeds total pages")
    if data.copies < 1 or data.copies > 100:
        raise HTTPException(status_code=400, detail="Copies must be between 1 and 100")

    cost = calculate_cost(
        pages_to_print=pages_to_print,
        copies=data.copies,
        colour_mode=data.colour_mode,
        sides=data.sides,
        paper_size=data.paper_size,
        stapling=data.stapling
    )

    queue = get_queue_status(db)

    job = PrintJob(
        job_code=generate_job_code(),
        user_id=user_id,
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

    logger.info(f"Job created: {job.job_code} | user={user_id} | amount={cost['total_amount']}")

    return {
        "job_id": str(job.id),
        "job_code": job.job_code,
        "status": job.status,
        "cost_breakdown": cost,
        "queue_info": queue,
        "message": "Job created. Review cost and queue info, then confirm."
    }


@router.post("/{job_id}/confirm")
def confirm_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("sub", "")
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if str(job.user_id) != user_id and user_id != "00000000-0000-0000-0000-000000000000":
        raise HTTPException(status_code=403, detail="You can only confirm your own jobs")
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
def cancel_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("sub", "")
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if str(job.user_id) != user_id and user_id != "00000000-0000-0000-0000-000000000000":
        raise HTTPException(status_code=403, detail="You can only cancel your own jobs")
    if job.status not in [JobStatus.DRAFT, JobStatus.CONFIRMED]:
        raise HTTPException(status_code=400, detail="Cannot cancel a paid or processing job")

    db.delete(job)
    db.commit()
    return {"message": "Job cancelled successfully"}