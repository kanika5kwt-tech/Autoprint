from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, OTPSendRequest, OTPVerifyRequest, TokenResponse
from app.services.otp_service import generate_otp, save_otp, verify_otp, send_sms_otp
from app.utils.jwt_helper import create_access_token, verify_token
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


@router.post("/register")
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.phone_number == data.phone_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    user = User(
        full_name=data.full_name,
        phone_number=data.phone_number,
        college_id=data.college_id,
        email=data.email
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate and send OTP
    otp_code = generate_otp()
    save_otp(db, data.phone_number, otp_code)

    # Send SMS
    sms_sent = send_sms_otp(data.phone_number, otp_code)
    if not sms_sent:
        logger.warning(f"SMS failed for {data.phone_number} — OTP: {otp_code}")

    return {
        "message": "Registered successfully. OTP sent to your mobile.",
        "user_id": str(user.id),
        "sms_sent": sms_sent
    }


@router.post("/send-otp")
def send_otp(data: OTPSendRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone_number == data.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Phone number not registered")

    otp_code = generate_otp()
    save_otp(db, data.phone_number, otp_code)

    # Send SMS
    sms_sent = send_sms_otp(data.phone_number, otp_code)

    if sms_sent:
        logger.info(f"OTP sent to {data.phone_number}")
        return {"message": "OTP sent to your mobile number successfully"}
    else:
        # SMS failed — still return OTP in dev mode
        logger.warning(f"SMS failed — dev OTP: {otp_code}")
        return {
            "message": "OTP sent (check terminal if SMS failed)",
            "dev_otp": otp_code
        }


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp_route(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    is_valid = verify_otp(db, data.phone_number, data.otp_code)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user = db.query(User).filter(User.phone_number == data.phone_number).first()
    user.is_verified = True
    db.commit()

    token = create_access_token({
        "sub": str(user.id),
        "phone": user.phone_number,
        "name": user.full_name
    })

    logger.info(f"User logged in: {user.phone_number}")

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        full_name=user.full_name
    )


@router.get("/me")
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Token required")

    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": str(user.id),
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "college_id": user.college_id,
        "is_verified": user.is_verified
    }