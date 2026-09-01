@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  Hospital Management System - Starting Up
echo ============================================
echo.
echo Step 1/3: Installing/updating frontend dependencies...
call pnpm -C frontend install
if errorlevel 1 goto :error

echo.
echo Step 2/3: Building the frontend...
call pnpm -C frontend run build
if errorlevel 1 goto :error

echo.
echo Step 3/3: Installing/updating backend dependencies...
call pnpm -C backend install
if errorlevel 1 goto :error

echo.
echo ============================================
echo  Starting server...
echo ============================================
echo.
echo On THIS computer, open:            http://localhost:5000
echo From OTHER computers on the same network/WiFi, use this computer's
echo IP address instead of "localhost" (for example http://192.168.1.23:5000).
echo This computer's IP address(es):
echo.
ipconfig | findstr /R /C:"IPv4"
echo.
echo Keep this window open while people are using the app.
echo Closing this window stops the server.
echo.

cd backend
node server.js
goto :eof

:error
echo.
echo Something went wrong during setup (see the error above).
echo The server did NOT start.
pause
