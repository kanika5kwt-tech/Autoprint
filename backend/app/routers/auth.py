from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, OTPSendRequest, OTPVerifyRequest, TokenResponse
from app.services.otp_service import generate_otp, save_otp, verify_otp
from app.utils.jwt_helper import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

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

    # OTP send karo
    otp_code = generate_otp()
    save_otp(db, data.phone_number, otp_code)
    print(f"OTP for {data.phone_number}: {otp_code}")

    # Email bhi bhejo
    try:
        await send_otp_email(data.email, otp_code, data.full_name)
    except Exception as e:
        print(f"Email send failed: {e}")

    return {"message": "Registered successfully", "user_id": str(user.id)}

@router.post("/send-otp")
def send_otp(data: OTPSendRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone_number == data.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Phone number not registered")
    
    otp_code = generate_otp()
    save_otp(db, data.phone_number, otp_code)
    
    # Abhi sirf print karenge — baad mein SMS lagayenge
    print(f"OTP for {data.phone_number}: {otp_code}")
    
    return {"message": "OTP sent successfully", "dev_otp": otp_code}

@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp_route(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    is_valid = verify_otp(db, data.phone_number, data.otp_code)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    user = db.query(User).filter(User.phone_number == data.phone_number).first()
    user.is_verified = True
    db.commit()
    
    token = create_access_token({"sub": str(user.id), "phone": user.phone_number})
    
    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        full_name=user.full_name
    )

@router.get("/me")
def get_me(db: Session = Depends(get_db)):
    return {"message": "Profile endpoint - JWT coming soon"}