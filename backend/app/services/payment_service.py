import razorpay
import os
import uuid
import qrcode
import base64
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()

def get_razorpay_client():
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    return razorpay.Client(auth=(key_id, key_secret))

def create_payment_order(amount: float, job_code: str) -> dict:
    key_id = os.getenv("RAZORPAY_KEY_ID", "")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")

    # Mock mode - jab real secret nahi hai
    if not key_secret or key_secret == "YOUR_SECRET":
        return {
            "order_id": f"order_mock_{uuid.uuid4().hex[:16]}",
            "amount": amount,
            "amount_paise": int(amount * 100),
            "currency": "INR",
            "key_id": "rzp_test_mock"
        }

    # Real Razorpay
    client = razorpay.Client(auth=(key_id, key_secret))
    amount_paise = int(amount * 100)
    order = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": job_code,
        "notes": {
            "job_code": job_code
        }
    })
    return {
        "order_id": order["id"],
        "amount": amount,
        "amount_paise": amount_paise,
        "currency": "INR",
        "key_id": key_id
    }

def verify_payment(order_id: str, payment_id: str, signature: str) -> bool:
    # Mock orders automatically pass
    if "mock" in order_id:
        return True

    # TEST MODE
    if order_id.startswith("order_") and payment_id.startswith("pay_test_"):
        return True

    client = get_razorpay_client()
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature
        })
        return True
    except Exception:
        return False

def generate_qr_code(job_code: str, amount: float) -> str:
    qr_data = f"AutoPrint|{job_code}|Rs.{amount}|PAID"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4
    )
    qr.add_data(qr_data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode()

    return f"data:image/png;base64,{img_base64}"