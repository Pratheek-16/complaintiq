@echo off
echo ========================================================
echo    Launching ComplaintIQ Full-Stack Analytical Platform
echo ========================================================
echo Starting Backend Server in new window...
start cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo Starting Frontend Dev Server in new window...
start cmd /k "cd frontend && npm run dev"

echo.
echo ComplaintIQ is running!
echo Backend API Docs:  http://127.0.0.1:8000/api/docs
echo Frontend Web App:  http://localhost:5173
echo ========================================================
