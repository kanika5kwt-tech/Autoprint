from sqlalchemy import Column, String, Boolean, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime

class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_number = Column(String(15), nullable=False)
    otp_code = Column(String(6), nullable=False)
    expires_at = Column(TIMESTAMP, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)