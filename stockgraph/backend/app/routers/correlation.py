from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
import pandas as pd
import numpy as np

from app.schemas import CorrelationResponse
from app.dependencies import get_loader
from app.services.data_loader import DataLoader

router = APIRouter(prefix="", tags=["Correlation"])

@router.get("/correlation", response_model=CorrelationResponse)
def get_correlation(
    tickers: Optional[str] = Query(None, description="Comma-separated list of tickers. Defaults to top 15 stocks."),
    window: int = Query(60, ge=10, le=252, description="Window in trading days for correlation (default 60)"),
    pair: Optional[str] = Query(None, description="Specific pair e.g. AAPL,MSFT to compute rolling correlation timeline"),
    loader: DataLoader = Depends(get_loader)
):
    if tickers:
        raw_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
        valid_tickers = []
        for t in raw_list:
            try:
                valid_tickers.append(loader.validate_ticker(t))
            except KeyError:
                raise HTTPException(status_code=404, detail=f"Ticker '{t}' not found.")
    else:
        # Default to top 15 market cap stocks
        valid_tickers = loader.metadata.sort_values("market_cap", ascending=False)["ticker"].head(15).tolist()

    if len(valid_tickers) < 2:
        raise HTTPException(status_code=400, detail="At least 2 tickers are required to compute correlation.")

    # Slice returns for trailing `window` days
    returns_slice = loader.returns_wide[valid_tickers].iloc[-window:]
    corr_df = returns_slice.corr()

    matrix = [
        [round(float(corr_df.iloc[i, j]), 4) for j in range(len(valid_tickers))]
        for i in range(len(valid_tickers))
    ]

    # Rolling pair calculation
    rolling_pair_data = None
    target_pair = None

    if pair:
        pair_parts = [p.strip().upper() for p in pair.split(",") if p.strip()]
        if len(pair_parts) == 2:
            try:
                p1 = loader.validate_ticker(pair_parts[0])
                p2 = loader.validate_ticker(pair_parts[1])
                target_pair = (p1, p2)
            except KeyError as e:
                raise HTTPException(status_code=404, detail=str(e))
    elif len(valid_tickers) == 2:
        target_pair = (valid_tickers[0], valid_tickers[1])
    else:
        # Default rolling pair to the first two
        target_pair = (valid_tickers[0], valid_tickers[1])

    if target_pair:
        t1, t2 = target_pair
        r1 = loader.returns_wide[t1]
        r2 = loader.returns_wide[t2]
        rolling_series = r1.rolling(window).corr(r2).dropna()

        rolling_pair_data = {
            "ticker1": t1,
            "ticker2": t2,
            "window": window,
            "series": [
                {"date": str(d), "correlation": round(float(v), 4)}
                for d, v in rolling_series.items()
            ]
        }

    return CorrelationResponse(
        tickers=valid_tickers,
        window=window,
        matrix=matrix,
        rolling_pair=rolling_pair_data
    )
