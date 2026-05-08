import random
import string
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.otp import OTPVerification

def generate_otp() -> str:
    otp = ''.join(random.choices(string.digits, k=6))
    print(f"[OTP DEBUG] Generated OTP: {otp}")  # ← yeh line add karo
    return otp

def save_otp(db: Session, phone_number: str, otp_code: str):
    # Purane OTP delete karo
    db.query(OTPVerification).filter(
        OTPVerification.phone_number == phone_number
    ).delete()
    
    otp = OTPVerification(
        phone_number=phone_number,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=5)
    )
    db.add(otp)
    db.commit()
    return otp

def verify_otp(db: Session, phone_number: str, otp_code: str) -> bool:
    otp = db.query(OTPVerification).filter(
        OTPVerification.phone_number == phone_number,
        OTPVerification.otp_code == otp_code,
        OTPVerification.is_used == False,
        OTPVerification.expires_at > datetime.utcnow()
    ).first()
    
    if not otp:
        return False
    
    otp.is_used = True
    db.commit()
    return True