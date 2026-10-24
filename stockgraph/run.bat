@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   StockGraph: Market Contagion Explorer - Local Runner
echo ============================================================

cd /d "%~dp0"

:: 1. Python environment setup
echo [*] Checking Python environment...
if not exist ".venv" (
    echo [*] Creating virtual environment .venv...
    python -m venv .venv
)

echo [*] Activating virtual environment...
call .venv\Scripts\activate.bat

echo [*] Installing backend dependencies...
python -m pip install -q -r backend\requirements.txt

:: 2. Check and run pipeline if needed
if not exist "data\processed\pipeline_report.json" (
    echo [*] Processed data not found. Running data ingestion pipeline...
    cd backend
    python -m pipeline.ingest
    cd ..
) else (
    echo [+] Processed dataset verified.
)

:: 3. Start Backend FastAPI on port 8000
echo [*] Launching FastAPI backend server on http://127.0.0.1:8000...
start "StockGraph Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && ..\.venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: 4. Frontend setup and launch on port 5173
echo [*] Checking frontend dependencies...
cd frontend
if not exist "node_modules" (
    echo [*] Installing npm packages...
    call npm install
)

echo [*] Launching Vite development server on http://localhost:5173...
start "StockGraph Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo ============================================================
echo   StockGraph is running locally!
echo   Frontend UI:  http://localhost:5173
echo   Backend API: http://127.0.0.1:8000/docs
echo ============================================================
cd ..
pause
