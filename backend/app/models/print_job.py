from sqlalchemy import Column, String, Boolean, Integer, DECIMAL, TIMESTAMP, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime
import enum

class ColourMode(str, enum.Enum):
    bw = "bw"
    colour = "colour"

class SidesMode(str, enum.Enum):
    single = "single"
    double = "double"

class PaperSize(str, enum.Enum):
    A4 = "A4"
    A3 = "A3"
    Letter = "Letter"

class JobStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    PAID = "PAID"
    IN_QUEUE = "IN_QUEUE"
    PRINTING = "PRINTING"
    READY = "READY"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class PrintJob(Base):
    __tablename__ = "print_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_code = Column(String(20), unique=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    total_pages = Column(Integer, nullable=False)
    pages_to_print = Column(Integer, nullable=False)
    colour_mode = Column(Enum(ColourMode), default=ColourMode.bw)
    sides = Column(Enum(SidesMode), default=SidesMode.single)
    page_range_start = Column(Integer, default=1)
    page_range_end = Column(Integer, nullable=True)
    copies = Column(Integer, default=1)
    paper_size = Column(Enum(PaperSize), default=PaperSize.A4)
    stapling = Column(Boolean, default=False)
    cost_per_page = Column(DECIMAL(5, 2), default=0)
    total_amount = Column(DECIMAL(10, 2), default=0)
    status = Column(Enum(JobStatus), default=JobStatus.DRAFT)
    queue_position = Column(Integer, nullable=True)
    estimated_ready_at = Column(TIMESTAMP, nullable=True)
    confirmed_at = Column(TIMESTAMP, nullable=True)
    paid_at = Column(TIMESTAMP, nullable=True)
    printed_at = Column(TIMESTAMP, nullable=True)
    collected_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)