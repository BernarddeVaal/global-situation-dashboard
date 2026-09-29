@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules (
  echo Run SETUP-WINDOWS.cmd first.
  pause
  exit /b 1
)
start "Local AI backend - port 5050" cmd /k "npm run server"
start "Local dashboard - port 5173" cmd /k "npm run dev"
echo Open http://127.0.0.1:5173 when Vite reports ready.
echo Leave both windows open. Close both windows to stop.
pause
