@echo off
echo.
echo ============================================
echo   MedCDS - Clinical Decision Support
echo   Automated Setup for Windows
echo ============================================
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo Download from: https://nodejs.org ^(LTS version^)
    pause & exit /b 1
)
echo [OK] Node.js detected: 
node --version

:: Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found. Reinstall Node.js.
    pause & exit /b 1
)
echo [OK] npm detected

echo.
echo [INFO] Installing backend dependencies...
cd backend
call npm install --legacy-peer-deps
if errorlevel 1 ( echo [ERROR] Backend install failed & pause & exit /b 1 )
echo [OK] Backend dependencies installed

:: Create required directories
if not exist reports mkdir reports
if not exist logs mkdir logs
echo [OK] Created reports\ and logs\ directories

echo.
echo [INFO] Seeding clinical guidelines...
node src\utils\seedData.js
if errorlevel 1 (
    echo [WARN] Seeding failed - MongoDB may not be running.
    echo        Start MongoDB and run: cd backend ^&^& npm run seed
) else (
    echo [OK] Clinical guidelines seeded
)

cd ..

echo.
echo [INFO] Installing frontend dependencies...
cd frontend
call npm install --legacy-peer-deps
if errorlevel 1 ( echo [ERROR] Frontend install failed & pause & exit /b 1 )
echo [OK] Frontend dependencies installed
cd ..

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo To start the application, open TWO terminals:
echo.
echo   Terminal 1 - Backend:
echo     cd backend
echo     npm run dev
echo.
echo   Terminal 2 - Frontend:
echo     cd frontend
echo     npm start
echo.
echo Then open: http://localhost:3000
echo.
echo WARNING: MedCDS is a clinical decision support tool.
echo Always consult a doctor before any medical decision.
echo.
pause
