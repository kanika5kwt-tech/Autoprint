from sqlalchemy.orm import Session
from app.models.print_job import PrintJob, JobStatus
from datetime import datetime, timedelta

SECONDS_PER_PAGE = 8  # Ek page print hone mein ~8 seconds

def get_queue_status(db: Session) -> dict:
    # Active jobs count karo (PAID + IN_QUEUE + PRINTING)
    active_jobs = db.query(PrintJob).filter(
        PrintJob.status.in_([
            JobStatus.PAID,
            JobStatus.IN_QUEUE,
            JobStatus.PRINTING
        ])
    ).all()

    total_pages_ahead = sum(
        job.pages_to_print * job.copies for job in active_jobs
    )

    estimated_seconds = total_pages_ahead * SECONDS_PER_PAGE
    estimated_minutes = estimated_seconds // 60
    estimated_ready = datetime.utcnow() + timedelta(seconds=estimated_seconds)

    return {
        "jobs_in_queue": len(active_jobs),
        "estimated_wait_minutes": estimated_minutes,
        "estimated_ready_at": estimated_ready.strftime("%I:%M %p"),
        "message": f"{len(active_jobs)} jobs currently in queue. Estimated wait: ~{estimated_minutes} minutes"
    }