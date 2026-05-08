from pydantic import BaseModel
from typing import Optional

class RegisterRequest(BaseModel):
    full_name: str
    college_id: str
    phone_number: Optional[str] = None
    email: Optional[str] = None 

class OTPSendRequest(BaseModel):
    phone_number: str

class OTPVerifyRequest(BaseModel):
    phone_number: str
    otp_code: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: str
class CreateJobRequest(BaseModel):
    file_id: str
    file_name: str
    total_pages: int
    colour_mode: str = "bw"
    sides: str = "single"
    page_range_start: int = 1
    page_range_end: Optional[int] = None
    copies: int = 1
    paper_size: str = "A4"
    stapling: bool = False