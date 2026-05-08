from sqlalchemy import Column, String, Boolean, Integer, DECIMAL, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(100), nullable=False)
    phone_number = Column(String(15), unique=True, nullable=False)
    college_id = Column(String(50), nullable=False)
    email = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    total_prints = Column(Integer, default=0)
    wallet_balance = Column(DECIMAL(10, 2), default=0.00)