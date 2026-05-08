from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import user, otp, print_job
from app.routers import auth, jobs, payments

app = FastAPI(title="AutoPrint API", version="1.0")

# CORS fix
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(payments.router)

@app.get("/")
def root():
    return {"status": "AutoPrint is running!", "message": "Welcome to AutoPrint API"}