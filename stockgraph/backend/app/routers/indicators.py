from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
import pandas as pd
import numpy as np

from app.dependencies import get_loader
from app.services.data_loader import DataLoader
from app.services.analytics import (
    calculate_bollinger_bands,
    calculate_macd,
    calculate_rsi
)

router = APIRouter(prefix="", tags=["Indicators & Candles"])

PERIOD_MAP = {
    "1M": 21,
    "3M": 63,
    "6M": 126,
    "1Y": 252,
    "3Y": 756,
    "ALL": None
}

@router.get("/candles/{ticker}")
def get_historical_candles(
    ticker: str,
    timeframe: str = Query("1D", pattern="^(1D|1d)$"),
    period: str = Query("1Y", pattern="^(1M|3M|6M|1Y|3Y|All|all)$"),
    loader: DataLoader = Depends(get_loader)
):
    """
    Returns historical OHLCV records formatted for Lightweight Charts candlestick displays.
    """
    try:
        valid_ticker = loader.validate_ticker(ticker)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Stock ticker '{ticker}' not found.")

    df_ohlcv = loader.ohlcv_by_ticker.get(valid_ticker)
    if df_ohlcv is None or df_ohlcv.empty:
        raise HTTPException(status_code=404, detail=f"No price history found for ticker '{ticker}'.")

    period_key = period.upper()
    n_days = PERIOD_MAP.get(period_key)

    if n_days and n_days < len(df_ohlcv):
        df_slice = df_ohlcv.iloc[-n_days:].copy()
    else:
        df_slice = df_ohlcv.copy()

    # Lightweight Charts expects time as "YYYY-MM-DD"
    candles = [
        {
            "time": str(row["date"]),
            "open": round(float(row["open"]), 2),
            "high": round(float(row["high"]), 2),
            "low": round(float(row["low"]), 2),
            "close": round(float(row["close"]), 2),
            "volume": int(row["volume"])
        }
        for _, row in df_slice.iterrows()
    ]

    meta = loader.get_meta_for_ticker(valid_ticker)

    return {
        "ticker": valid_ticker,
        "name": meta["name"],
        "sector": meta["sector"],
        "timeframe": timeframe,
        "period": period_key,
        "count": len(candles),
        "candles": candles
    }

@router.get("/indicators/{ticker}")
def get_technical_indicators(
    ticker: str,
    names: str = Query("ma20,ma50,bb,rsi,macd", description="Comma-separated indicator names"),
    period: str = Query("1Y", pattern="^(1M|3M|6M|1Y|3Y|All|all)$"),
    loader: DataLoader = Depends(get_loader)
):
    """
    Server-side calculation of Bollinger Bands (20, 2σ), MACD (12, 26, 9),
    Wilder's RSI (14), and Moving Averages (20, 50).
    """
    try:
        valid_ticker = loader.validate_ticker(ticker)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Stock ticker '{ticker}' not found.")

    df_ohlcv = loader.ohlcv_by_ticker.get(valid_ticker)
    if df_ohlcv is None or df_ohlcv.empty:
        raise HTTPException(status_code=404, detail=f"No price history found for ticker '{ticker}'.")

    period_key = period.upper()
    n_days = PERIOD_MAP.get(period_key)

    # Use entire history for warmup to avoid edge effects, then slice
    full_closes = df_ohlcv.set_index("date")["close"]
    requested = [n.strip().lower() for n in names.split(",") if n.strip()]

    dates_slice = df_ohlcv["date"].iloc[-n_days:].tolist() if (n_days and n_days < len(df_ohlcv)) else df_ohlcv["date"].tolist()
    result: Dict[str, Any] = {
        "ticker": valid_ticker,
        "period": period_key,
        "dates": dates_slice,
        "indicators": {}
    }

    # Helper function to serialize series to float or None
    def to_list(series: pd.Series) -> List[Optional[float]]:
        sliced = series.reindex(dates_slice)
        return [round(float(v), 2) if pd.notna(v) else None for v in sliced]

    # Moving averages
    if "ma20" in requested or "ma50" in requested:
        if "ma20" in requested:
            ma20 = full_closes.rolling(20).mean()
            result["indicators"]["ma20"] = to_list(ma20)
        if "ma50" in requested:
            ma50 = full_closes.rolling(50).mean()
            result["indicators"]["ma50"] = to_list(ma50)

    # Bollinger Bands
    if "bb" in requested:
        bb_dict = calculate_bollinger_bands(full_closes, window=20, num_std=2.0)
        result["indicators"]["bb"] = {
            "middle": to_list(bb_dict["middle"]),
            "upper": to_list(bb_dict["upper"]),
            "lower": to_list(bb_dict["lower"]),
            "bandwidth": to_list(bb_dict["bandwidth"]),
            "percent_b": to_list(bb_dict["percent_b"])
        }

    # MACD
    if "macd" in requested:
        macd_dict = calculate_macd(full_closes, fast=12, slow=26, signal=9)
        result["indicators"]["macd"] = {
            "macd": to_list(macd_dict["macd"]),
            "signal": to_list(macd_dict["signal"]),
            "histogram": to_list(macd_dict["histogram"])
        }

    # RSI
    if "rsi" in requested:
        _, rsi_series = calculate_rsi(full_closes, window=14)
        result["indicators"]["rsi"] = to_list(rsi_series)

    return result
