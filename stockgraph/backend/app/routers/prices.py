from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
import pandas as pd
import numpy as np

from app.schemas import PricesResponse, OHLCVRecord, PriceComparisonSeries
from app.dependencies import get_loader
from app.services.data_loader import DataLoader

router = APIRouter(prefix="", tags=["Prices"])

PERIOD_MAP = {
    "1M": 21,
    "3M": 63,
    "6M": 126,
    "1Y": 252,
    "3Y": 756,
    "ALL": None
}

@router.get("/prices/{ticker}", response_model=PricesResponse)
def get_stock_prices(
    ticker: str,
    period: str = Query("1Y", pattern="^(1M|3M|6M|1Y|3Y|All|all)$"),
    compare: Optional[str] = Query(None, description="Comma-separated list of up to 4 tickers to compare, rebased to 100"),
    loader: DataLoader = Depends(get_loader)
):
    try:
        valid_ticker = loader.validate_ticker(ticker)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Stock ticker '{ticker}' not found.")

    meta = loader.get_meta_for_ticker(valid_ticker)
    df_ohlcv = loader.ohlcv_by_ticker.get(valid_ticker)

    if df_ohlcv is None or df_ohlcv.empty:
        raise HTTPException(status_code=404, detail=f"No price history found for ticker '{ticker}'.")

    # Slice by period
    period_key = period.upper()
    n_days = PERIOD_MAP.get(period_key)

    if n_days and n_days < len(df_ohlcv):
        df_slice = df_ohlcv.iloc[-n_days:].copy()
    else:
        df_slice = df_ohlcv.copy()

    records = [
        OHLCVRecord(
            date=row["date"],
            open=round(float(row["open"]), 2),
            high=round(float(row["high"]), 2),
            low=round(float(row["low"]), 2),
            close=round(float(row["close"]), 2),
            volume=int(row["volume"])
        )
        for _, row in df_slice.iterrows()
    ]

    # Handle compare tickers
    comparison_obj = None
    if compare:
        comp_raw_list = [t.strip().upper() for t in compare.split(",") if t.strip()]
        if len(comp_raw_list) > 4:
            raise HTTPException(status_code=400, detail="Cannot compare more than 4 tickers simultaneously.")

        comp_tickers = []
        for ct in comp_raw_list:
            try:
                valid_ct = loader.validate_ticker(ct)
                comp_tickers.append(valid_ct)
            except KeyError:
                raise HTTPException(status_code=404, detail=f"Comparison ticker '{ct}' not found.")

        dates_slice = df_slice["date"].tolist()
        series_dict = {}

        # Rebase target ticker
        target_prices = df_slice["close"].values
        p0 = target_prices[0] if target_prices[0] > 0 else 1.0
        series_dict[valid_ticker] = [round(float((p / p0) * 100.0), 2) for p in target_prices]

        # Rebase comparison tickers
        for ct in comp_tickers:
            ct_prices = loader.prices_wide.loc[dates_slice, ct].values
            ct_p0 = ct_prices[0] if ct_prices[0] > 0 else 1.0
            series_dict[ct] = [round(float((p / ct_p0) * 100.0), 2) for p in ct_prices]

        comparison_obj = PriceComparisonSeries(
            dates=dates_slice,
            target_ticker=valid_ticker,
            series=series_dict
        )

    return PricesResponse(
        ticker=valid_ticker,
        period=period_key,
        name=meta["name"],
        sector=meta["sector"],
        records=records,
        comparison=comparison_obj
    )
