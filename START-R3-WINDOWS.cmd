@echo off
setlocal
cd /d "%~dp0"
.venv\Scripts\python.exe server\r3_service.py
pause
