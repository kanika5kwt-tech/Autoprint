@echo off
REM ============================================================
REM  AutoPrint - Windows Demo Startup Script
REM  Run this from the project root: autoprint\
REM  Opens 3 terminal windows: Backend, Daemon, Frontend
REM ============================================================
 
SET PROJECT_ROOT=%~dp0
echo.
echo  ========================================
echo   AutoPrint - Windows Demo Launcher
echo  ========================================
echo.
echo  Project root: %PROJECT_ROOT%
echo.
 
REM ── Check Python ─────────────────────────────────────────────
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Python not found. Install from https://python.org
    pause
    exit /b 1
)
 
REM ── Check Node / npm ─────────────────────────────────────────
npm --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] npm not found. Install Node.js from https://nodejs.org
    pause
    exit /b 1
)
 
REM ── Check Redis / Memurai ─────────────────────────────────────
redis-cli ping >nul 2>&1
IF ERRORLEVEL 1 (
    echo [WARNING] Redis not responding on localhost:6379
    echo           Install Memurai from https://www.memurai.com
    echo           or Redis for Windows from GitHub.
    echo           Continuing anyway — daemon will retry...
    echo.
)
 
REM ── Install backend dependencies ──────────────────────────────
echo [1/4] Installing backend Python dependencies...
cd "%PROJECT_ROOT%backend"
pip install -r requirements.txt --quiet
echo       Done.
 
REM ── Install pywin32 for printer support ───────────────────────
echo [2/4] Installing pywin32 for Windows printer support...
pip install pywin32 --quiet
echo       Done.
 
REM ── Install frontend dependencies ─────────────────────────────
echo [3/4] Installing frontend npm packages...
cd "%PROJECT_ROOT%frontend"
call npm install --silent
echo       Done.
 
echo.
echo [4/4] Starting all services...
echo.
 
REM ── Start Backend (new window) ────────────────────────────────
start "AutoPrint Backend" cmd /k "cd /d %PROJECT_ROOT%backend && echo Starting FastAPI backend... && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
 
REM Wait 3s for backend to start
timeout /t 3 /nobreak >nul
 
REM ── Start Print Daemon (new window) ──────────────────────────
start "AutoPrint Daemon" cmd /k "cd /d %PROJECT_ROOT% && echo Starting Print Daemon... && python print_daemon/daemon.py"
 
REM Wait 2s
timeout /t 2 /nobreak >nul
 
REM ── Start Frontend (new window) ──────────────────────────────
start "AutoPrint Frontend" cmd /k "cd /d %PROJECT_ROOT%frontend && echo Starting React frontend... && npm start"
 
echo.
echo  ========================================
echo   All services launched!
echo.
echo   Backend  → http://localhost:8000
echo   API Docs → http://localhost:8000/docs
echo   Frontend → http://localhost:3000
echo  ========================================
echo.
echo  Press any key to exit this launcher.
echo  (The 3 service windows will keep running)
echo.
pause
 