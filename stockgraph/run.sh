#!/usr/bin/env bash
set -e

# StockGraph: Market Contagion Explorer - Unix Launch Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================================"
echo "  StockGraph: Market Contagion Explorer - Local Runner"
echo "============================================================"

# 1. Virtual Environment Setup
if [ ! -d ".venv" ]; then
    echo "[*] Creating virtual environment .venv..."
    python3 -m venv .venv
fi

echo "[*] Activating virtual environment..."
source .venv/bin/activate

echo "[*] Installing backend dependencies..."
pip install -q -r backend/requirements.txt

# 2. Check and run pipeline if needed
if [ ! -f "data/processed/pipeline_report.json" ]; then
    echo "[*] Processed data not found. Running data ingestion pipeline..."
    cd backend
    python3 -m pipeline.ingest
    cd ..
else
    echo "[+] Processed dataset verified."
fi

# 3. Start Backend in Background
echo "[*] Launching FastAPI backend server on http://127.0.0.1:8000..."
cd backend
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# 4. Install Frontend & Start Vite
echo "[*] Checking frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "[*] Installing npm packages..."
    npm install
fi

echo "[*] Launching Vite development server on http://localhost:5173..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo "============================================================"
echo "  StockGraph is running locally!"
echo "  Frontend UI:  http://localhost:5173"
echo "  Backend API: http://127.0.0.1:8000/docs"
echo "  Press Ctrl+C to terminate both servers."
echo "============================================================"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
