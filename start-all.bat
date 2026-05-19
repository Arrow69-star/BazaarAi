@echo off
title BazaarAI - Full Stack Launcher
color 0A
echo.
echo  ================================================
echo   BazaarAI - Autonomous Service Orchestrator
echo   Starting all services...
echo  ================================================
echo.

:: Kill any existing servers
taskkill /f /im python.exe 2>nul
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak > nul

:: Start Python FastAPI backend (port 8000)
echo [1/3] Starting Python FastAPI (port 8000)...
start "BazaarAI Python API" cmd /k "cd /d %~dp0 && python python-agents\main.py"
timeout /t 3 /nobreak > nul

:: Start Node.js backend (port 3000)
echo [2/3] Starting Node.js Backend (port 3000)...
start "BazaarAI Node API" cmd /k "cd /d %~dp0\backend && npm start"
timeout /t 3 /nobreak > nul

:: Start Expo mobile app
echo [3/3] Starting Expo Mobile App...
start "BazaarAI Mobile" cmd /k "cd /d %~dp0\mobile-app && npx expo start --clear"

echo.
echo  ================================================
echo   All services started!
echo.
echo   Python API:  http://localhost:8000
echo   Node API:    http://localhost:3000
echo   Mobile App:  Scan QR with Expo Go app
echo.
echo   API Docs:    http://localhost:8000/docs
echo   Health:      http://localhost:8000/health
echo  ================================================
echo.
pause
