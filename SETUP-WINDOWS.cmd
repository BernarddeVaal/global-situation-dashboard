@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.12 or newer, reopen this folder and try again.
  pause
  exit /b 1
)
call npm ci
if errorlevel 1 goto failed
call npm run test:edge
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo.
echo A and B are ready. Run START-DASHBOARD.cmd.
echo Read ASSESSMENT.md for Tencent model C installation.
pause
exit /b 0
:failed
echo Setup failed. Read the error above before continuing.
pause
exit /b 1
