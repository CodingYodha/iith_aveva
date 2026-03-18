#!/bin/bash
echo "Starting CB-MOPA System..."
cd "$(dirname "$0")"

# Start FastAPI backend in background
uvicorn api.main:app --port 8000 --log-level info &
API_PID=$!
echo "API started (PID: $API_PID) at http://localhost:8000"
sleep 2

# Start Streamlit dashboard
echo "Starting Streamlit dashboard at http://localhost:8501"
streamlit run dashboard/app.py

# Kill API on exit
trap "kill $API_PID" EXIT
