@echo off
setlocal
cd /d "%~dp0"
py -3.12 -m venv .venv
if errorlevel 1 goto failed
.venv\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cpu
if errorlevel 1 goto failed
.venv\Scripts\python.exe -m pip install -r assessment\r3-requirements.txt
if errorlevel 1 goto failed
.venv\Scripts\python.exe scripts\download_r3.py
if errorlevel 1 goto failed
echo Tencent weights downloaded. Run START-R3-WINDOWS.cmd.
pause
exit /b 0
:failed
echo Tencent setup failed. Keep this error for diagnosis.
pause
exit /b 1
