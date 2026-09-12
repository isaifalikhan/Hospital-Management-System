@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Hospital Management System

echo.
echo  ==================================================
echo    Hospital Management System
echo  ==================================================
echo.

rem ------------------------------------------------------------------
rem  Node.js is the only thing anyone has to install by hand. Everything
rem  else below is done automatically, once, on the first run.
rem ------------------------------------------------------------------
where node >nul 2>nul
if errorlevel 1 goto :no_node

rem ------------------------------------------------------------------
rem  Is anything missing? If not, skip straight to starting the app so
rem  day-to-day startup takes seconds, not minutes.
rem ------------------------------------------------------------------
set "FIRSTRUN="
if not exist "backend\.env"             set "FIRSTRUN=1"
if not exist "backend\node_modules"     set "FIRSTRUN=1"
if not exist "frontend\node_modules"    set "FIRSTRUN=1"
if not exist "frontend\dist\index.html" set "FIRSTRUN=1"
if not exist "backend\data\hms.sqlite"  set "FIRSTRUN=1"
if not defined FIRSTRUN goto :start_app

echo  Setting up. This happens only the first time and takes a few
echo  minutes. You need an internet connection for this part.
echo  Please leave this window open.
echo.

:setup_env
if exist "backend\.env" goto :setup_backend
echo  - creating the settings file...
node -e "const fs=require('fs'),c=require('crypto');let t=fs.readFileSync('backend/.env.example','utf8');t=t.replace(/^JWT_SECRET=.*$/m,'JWT_SECRET='+c.randomBytes(32).toString('hex'));fs.writeFileSync('backend/.env',t)"
if errorlevel 1 goto :error

:setup_backend
if exist "backend\node_modules" goto :setup_frontend
echo  - installing the server...
cd backend
call npm install --no-audit --no-fund
if errorlevel 1 goto :error
cd ..

:setup_frontend
if exist "frontend\node_modules" goto :setup_build
echo  - installing the screens...
cd frontend
call npm install --no-audit --no-fund
if errorlevel 1 goto :error
cd ..

:setup_build
if exist "frontend\dist\index.html" goto :setup_database
echo  - building the app...
cd frontend
call npm run build
if errorlevel 1 goto :error
cd ..

:setup_database
if exist "backend\data\hms.sqlite" goto :setup_done
echo  - creating the database with sample data...
cd backend
call npm run seed
if errorlevel 1 goto :error
cd ..

:setup_done
echo.
echo  Setup finished.
echo.

rem ------------------------------------------------------------------
rem  This computer's address on the local network, so staff on other
rem  PCs and phones know what to type. Loopback/self-assigned skipped.
rem ------------------------------------------------------------------
:start_app
set "LANIP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4"') do (
  set "IP=%%a"
  set "IP=!IP: =!"
  if not defined LANIP if not "!IP:~0,4!"=="127." if not "!IP:~0,8!"=="169.254." set "LANIP=!IP!"
)

rem Already running? Say so plainly instead of crashing on a busy port.
netstat -ano | findstr /C:":5000 " | findstr /C:"LISTENING" >nul 2>nul
if not errorlevel 1 goto :already_running

echo  ==================================================
echo    Starting the app...
echo  ==================================================
echo.
echo    On this computer:       http://localhost:5000
if defined LANIP echo    On other PCs/phones:    http://!LANIP!:5000
echo.
echo    Log in with:  admin  /  password123
echo.
echo    Your browser will open on its own in a few seconds.
echo    KEEP THIS WINDOW OPEN while staff are using the app.
echo    Closing this window stops the app for everyone.
echo.

rem Give the server a moment to bind the port, then open the browser.
start "" /min cmd /c "ping -n 5 127.0.0.1 >nul & start http://localhost:5000"

cd backend
node server.js

echo.
echo  The app has stopped.
pause
exit /b 0

:already_running
echo  The app is already running on this computer, so there is
echo  nothing to start.
echo.
echo    On this computer:       http://localhost:5000
if defined LANIP echo    On other PCs/phones:    http://!LANIP!:5000
echo.
echo  Opening it in your browser now. You can close this window.
start http://localhost:5000
ping -n 7 127.0.0.1 >nul
exit /b 0

:no_node
echo  Node.js is not installed on this computer, and the app needs it.
echo.
echo    1. The download page is opening in your browser now.
echo    2. Download the "LTS" version and click Next through the installer.
echo    3. Then double-click this file again.
echo.
start https://nodejs.org/en/download
pause
exit /b 1

:error
echo.
echo  ==================================================
echo    Setup could not finish - the app did NOT start
echo  ==================================================
echo.
echo  Something above went wrong. The usual causes are:
echo    - no internet connection (needed for the first run only)
echo    - Node.js needs to be installed or updated
echo.
echo  Try running this file again. If it keeps failing, show the
echo  message above to whoever set this up for you.
echo.
pause
exit /b 1
