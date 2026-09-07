@echo off
setlocal
echo.
echo ==========================================================
echo   Khidmat AI - Deploy PYTHON backend to Google Cloud Run
echo ==========================================================
echo.

:: ---- CONFIG ---------------------------------------------------------------
set PROJECT_ID=ai-hackathon-496717
set REGION=asia-south1
set SERVICE_NAME=khidmat-python-api
:: ---------------------------------------------------------------------------

:: The Gemini key is read from backend\.env and passed as a Cloud Run env var.
:: It is deliberately NOT baked into the image (see .dockerignore).
for /f "tokens=1,* delims==" %%a in ('findstr /b "GEMINI_API_KEY=" backend\.env') do set GEMINI_API_KEY=%%b

if "%GEMINI_API_KEY%"=="" (
  echo ERROR: GEMINI_API_KEY not found in backend\.env
  exit /b 1
)

where gcloud >nul 2>nul
if errorlevel 1 (
  echo ERROR: gcloud CLI not installed.
  echo Install it from https://cloud.google.com/sdk/docs/install then re-run this script.
  exit /b 1
)

echo [1/4] Setting project...
call gcloud config set project %PROJECT_ID% || exit /b 1

echo [2/4] Enabling required APIs...
call gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com || exit /b 1

echo [3/4] Building image with Cloud Build (no local Docker needed)...
call gcloud builds submit --tag gcr.io/%PROJECT_ID%/%SERVICE_NAME% --file Dockerfile.python . || exit /b 1

echo [4/4] Deploying to Cloud Run...
call gcloud run deploy %SERVICE_NAME% ^
  --image gcr.io/%PROJECT_ID%/%SERVICE_NAME% ^
  --region %REGION% ^
  --platform managed ^
  --allow-unauthenticated ^
  --memory 512Mi ^
  --timeout 120 ^
  --set-env-vars GEMINI_API_KEY=%GEMINI_API_KEY% || exit /b 1

echo.
echo Done. Service URL:
call gcloud run services describe %SERVICE_NAME% --region %REGION% --format "value(status.url)"
echo.
echo Next: put that URL into mobile-app\.env and eas.json as EXPO_PUBLIC_PYTHON_API_URL
echo.
endlocal
