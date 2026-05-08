from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
import os
from dotenv import load_dotenv

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

async def send_otp_email(email: str, otp: str, name: str):
    message = MessageSchema(
        subject="AutoPrint — Your OTP Code",
        recipients=[email],
        body=f"""
        <html>
        <body style="font-family: Arial, sans-serif; background: #0F0F1A; color: #EAEAEA; padding: 40px;">
            <div style="max-width: 480px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 40px;">
                <h1 style="color: #6C63FF;">🖨️ AutoPrint</h1>
                <h2>Hello, {name}!</h2>
                <p>Your OTP code is:</p>
                <div style="background: #6C63FF; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 12px; letter-spacing: 8px;">
                    {otp}
                </div>
                <p style="color: #888; margin-top: 20px;">This OTP is valid for 5 minutes.</p>
            </div>
        </body>
        </html>
        """,
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)

async def send_queue_alert_email(email: str, name: str, job_code: str, minutes_left: int):
    message = MessageSchema(
        subject=f"AutoPrint — Your print is ready in {minutes_left} minutes!",
        recipients=[email],
        body=f"""
        <html>
        <body style="font-family: Arial, sans-serif; background: #0F0F1A; color: #EAEAEA; padding: 40px;">
            <div style="max-width: 480px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 40px;">
                <h1 style="color: #6C63FF;">🖨️ AutoPrint</h1>
                <h2>Hello, {name}!</h2>
                <div style="background: #F8B500; color: #0F0F1A; padding: 20px; border-radius: 12px; text-align: center;">
                    <h2 style="margin: 0;">⏰ {minutes_left} Minutes Left!</h2>
                    <p style="margin: 8px 0 0 0;">Your print job is almost ready</p>
                </div>
                <div style="margin-top: 24px;">
                    <p><strong>Job Code:</strong> {job_code}</p>
                    <p>Please make your way to the print counter.</p>
                    <p>Your document will be ready for collection in approximately <strong>{minutes_left} minutes</strong>.</p>
                </div>
                <div style="background: #43E97B22; border: 1px solid #43E97B; padding: 16px; border-radius: 12px; margin-top: 24px;">
                    <p style="margin: 0; color: #43E97B;">✅ Payment confirmed • Job in queue</p>
                </div>
            </div>
        </body>
        </html>
        """,
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)

async def send_ready_email(email: str, name: str, job_code: str):
    message = MessageSchema(
        subject="AutoPrint — Your print is READY! 🎉",
        recipients=[email],
        body=f"""
        <html>
        <body style="font-family: Arial, sans-serif; background: #0F0F1A; color: #EAEAEA; padding: 40px;">
            <div style="max-width: 480px; margin: 0 auto; background: #1A1A2E; border-radius: 16px; padding: 40px;">
                <h1 style="color: #6C63FF;">🖨️ AutoPrint</h1>
                <h2>Hello, {name}!</h2>
                <div style="background: #43E97B; color: #0F0F1A; padding: 20px; border-radius: 12px; text-align: center;">
                    <h2 style="margin: 0;">✅ Your Print is READY!</h2>
                    <p style="margin: 8px 0 0 0;">Please collect from the counter</p>
                </div>
                <div style="margin-top: 24px;">
                    <p><strong>Job Code:</strong> {job_code}</p>
                    <p>Show your QR code or job code at the counter to collect your document.</p>
                </div>
            </div>
        </body>
        </html>
        """,
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)