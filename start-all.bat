@echo off
title Khidmat AI — Full Stack Launcher
color 0B
echo.
echo  ========================================================
echo    Khidmat AI — Autonomous Service Orchestrator
echo    Starting all services...
echo  ========================================================
echo.

:: Kill any existing servers on our ports
echo [0/3] Clearing previous instances...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /f /pid %%a 2>nul
timeout /t 2 /nobreak > nul

:: ─── 1. Python FastAPI backend (port 8000) ─────────────────────────────
echo [1/3] Starting Python AI Backend (port 8000)...
start "Khidmat AI - Python API" cmd /k "cd /d %~dp0 && echo. && echo  [Python] Starting Khidmat AI Orchestrator... && echo. && python python-agents\main.py"
timeout /t 4 /nobreak > nul

:: ─── 2. Node.js backend (port 3000) ────────────────────────────────────
echo [2/3] Starting Node.js Backend (port 3000)...
start "Khidmat AI - Node API" cmd /k "cd /d %~dp0\backend && echo. && echo  [Node] Starting Khidmat AI Backend... && echo. && npm start"
timeout /t 4 /nobreak > nul

:: ─── 3. Expo mobile app ────────────────────────────────────────────────
echo [3/3] Starting Expo Mobile App...
start "Khidmat AI - Mobile App" cmd /k "cd /d %~dp0\mobile-app && echo. && echo  [Expo] Starting Khidmat AI Mobile App... && echo. && npx expo start --clear"

echo.
echo  ========================================================
echo    All services started! 
echo.
echo    Python AI API:  http://localhost:8000
echo    Python API Docs: http://localhost:8000/docs
echo    Node.js API:    http://localhost:3000
echo    Health Check:   http://localhost:8000/health
echo.
echo    Mobile App: Scan the QR code with Expo Go
echo    (Make sure your phone is on the SAME WiFi)
echo.
echo    Your WiFi IP is in: mobile-app\.env
echo  ========================================================
echo.
pause
