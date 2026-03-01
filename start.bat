@echo off
echo Starting CB-MOPA System...
cd /d "%~dp0"

echo Starting FastAPI backend at http://localhost:8000
start "CB-MOPA API" cmd /c "uvicorn api.main:app --port 8000 --log-level info"
timeout /t 3 /nobreak >nul

echo Starting Streamlit dashboard at http://localhost:8501
streamlit run dashboard/app.py
