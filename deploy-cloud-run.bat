@echo off
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║   BazaarAI — Deploy to Google Cloud Run                 ║
echo ║   Uses your $5 Google Cloud credits efficiently         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: ── CONFIG — EDIT THESE ────────────────────────────────────────────
set PROJECT_ID=your-project-id
set REGION=asia-south1
set SERVICE_NAME=bazaarai-backend
set IMAGE=gcr.io/%PROJECT_ID%/%SERVICE_NAME%
:: ───────────────────────────────────────────────────────────────────

if "%PROJECT_ID%"=="your-project-id" (
  echo ERROR: Set your PROJECT_ID at the top of this file first!
  echo Get it from: console.cloud.google.com
  pause
  exit /b 1
)

echo [1/5] Logging into Google Cloud...
gcloud auth login
gcloud config set project %PROJECT_ID%

echo.
echo [2/5] Enabling required APIs...
gcloud services enable run.googleapis.com containerregistry.googleapis.com

echo.
echo [3/5] Building Docker image...
gcloud builds submit --tag %IMAGE% .

echo.
echo [4/5] Deploying to Cloud Run...
gcloud run deploy %SERVICE_NAME% ^
  --image %IMAGE% ^
  --platform managed ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --memory 512Mi ^
  --cpu 1 ^
  --min-instances 0 ^
  --max-instances 3 ^
  --set-env-vars "NODE_ENV=production,GEMINI_API_KEY=%GEMINI_API_KEY%"

echo.
echo [5/5] Getting service URL...
gcloud run services describe %SERVICE_NAME% --region %REGION% --format "value(status.url)"

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  ✅ Deployed! Update mobile-app/src/services/api.js     ║
echo ║  Set EXPO_PUBLIC_API_URL=https://your-url.run.app       ║
echo ╚══════════════════════════════════════════════════════════╝
pause
