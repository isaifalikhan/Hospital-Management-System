@echo off
rem Launched by the "HMS Server" Scheduled Task at every system startup.
rem Assumes start.bat has already been run at least once (deps installed,
rem frontend built) -- this just starts the already-built server, so it
rem does not need internet access or npm on every boot.
cd /d "%~dp0backend"
node server.js
