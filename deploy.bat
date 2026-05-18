@echo off
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║        BazaarAI — One-Click Deploy to Vercel            ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

echo [1/3] Logging in to Vercel...
vercel login

echo.
echo [2/3] Deploying Backend API...
vercel deploy --prod --yes --name bazaarai-backend

echo.
echo [3/3] Backend deployed!
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  Next: Deploy Mobile App Web                            ║
echo ║  cd mobile-app                                          ║
echo ║  npm run build                                          ║  
echo ║  vercel deploy --prod --yes --name bazaarai-app         ║
echo ╚══════════════════════════════════════════════════════════╝
pause
