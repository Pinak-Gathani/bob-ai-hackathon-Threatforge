@echo off
cd /d "%~dp0src\backend"
if not exist .venv\Scripts\python.exe (
  echo Creating Python virtual environment...
  py -m venv .venv
  call .venv\Scripts\activate.bat
  python -m pip install --upgrade pip
  python -m pip install -r requirements.txt
) else (
  call .venv\Scripts\activate.bat
)
echo Starting ThreatForge backend on http://127.0.0.1:8000 ...
python -m uvicorn app.main:app --reload --port 8000
