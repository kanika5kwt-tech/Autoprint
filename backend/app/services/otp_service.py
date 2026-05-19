import random
import string
import requests
import os
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.otp import OTPVerification

logger = logging.getLogger(__name__)

FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY")


def generate_otp() -> str:
    otp = ''.join(random.choices(string.digits, k=6))
    print(f"[OTP DEBUG] Generated OTP: {otp}")
    return otp


def send_sms_otp(phone_number: str, otp_code: str) -> bool:
    """Send OTP via Fast2SMS. Returns True on success, False on failure."""
    try:
        url = "https://www.fast2sms.com/dev/bulkV2"
        payload = {
            "route": "otp",
            "variables_values": otp_code,
            "numbers": phone_number,
        }
        headers = {
            "authorization": FAST2SMS_API_KEY,
            "Content-Type": "application/json"
        }
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        result = response.json()

        if result.get("return") == True:
            logger.info(f"SMS OTP sent successfully to {phone_number}")
            return True
        else:
            logger.error(f"Fast2SMS error: {result}")
            return False

    except Exception as e:
        logger.error(f"SMS send failed: {e}")
        return False


def save_otp(db: Session, phone_number: str, otp_code: str):
    # Delete old OTPs
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