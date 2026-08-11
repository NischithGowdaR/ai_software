@echo off
title AI Software Engineering Platform launcher
echo ==================================================
echo AI Software Engineering Platform Launcher
echo ==================================================
echo.
echo [1/2] Starting FastAPI Backend on http://localhost:8000...
start "FastAPI Backend Server" cmd /k "cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
echo.
echo [2/2] Starting React Frontend on http://localhost:5173...
start "React Dev Server" cmd /k "cd frontend && npm run dev"
echo.
echo ==================================================
echo BOTH SERVERS RUNNING!
echo Open http://localhost:5173 in your web browser.
echo ==================================================
echo.
pause
