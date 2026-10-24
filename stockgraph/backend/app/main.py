import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.services.data_loader import DataLoader
from app.services.live_feed import get_live_feed
from app.routers import (
    meta,
    prices,
    stocks,
    correlation,
    network,
    contagion,
    backtest,
    sectors,
    regimes,
    anomalies,
    live,
    indicators,
    ai
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load dataset and precompute indexes once into memory
    print("=" * 60)
    print("Starting StockGraph Backend Engine...")
    loader = DataLoader.get_instance()
    print(f"Data ready: {len(loader.ticker_set)} stocks, {len(loader.dates_list)} trading days.")
    
    # Start live market feed service in background
    feed = get_live_feed()
    await feed.start()
    print("=" * 60)
    yield
    print("Shutting down StockGraph Backend Engine...")
    await feed.stop()

app = FastAPI(
    title="StockGraph: Market Contagion Explorer",
    description="High-performance quantitative network analytics and market contagion simulation engine.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers under /api prefix
api_routers = [
    meta.router,
    prices.router,
    stocks.router,
    correlation.router,
    network.router,
    contagion.router,
    backtest.router,
    sectors.router,
    regimes.router,
    anomalies.router,
    live.router,
    indicators.router,
    ai.router
]

for r in api_routers:
    app.include_router(r, prefix="/api")

@app.get("/")
def root():
    return {
        "app": "StockGraph: Market Contagion Explorer",
        "status": "online",
        "docs_url": "/docs",
        "api_prefix": "/api"
    }

@app.exception_handler(KeyError)
async def key_error_handler(request: Request, exc: KeyError):
    return JSONResponse(
        status_code=404,
        content={"error": "Not Found", "detail": str(exc).strip("'")}
    )

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"error": "Bad Request", "detail": str(exc)}
    )
