from fastapi import APIRouter, Depends, Query, HTTPException
from app.schemas import BacktestResponse
from app.dependencies import get_loader
from app.services.data_loader import DataLoader
from app.services.backtest import run_neighbor_signal_backtest

router = APIRouter(prefix="", tags=["Strategy Backtester"])

@router.get("/backtest/neighbor-signal", response_model=BacktestResponse)
def get_backtest_neighbor_signal(
    k: int = Query(5, ge=1, le=50, description="Number of top correlated neighbors to form signal"),
    lookback: int = Query(60, ge=20, le=252, description="Rolling lookback window in days for historical correlation"),
    cost_bps: float = Query(10.0, ge=0.0, le=100.0, description="Transaction cost per 100% turnover in basis points (10 bps = 0.10%)"),
    loader: DataLoader = Depends(get_loader)
):
    try:
        return run_neighbor_signal_backtest(
            data_loader=loader,
            k=k,
            lookback=lookback,
            cost_bps=cost_bps
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
