from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
import pandas as pd
import numpy as np

from app.schemas import (
    StockAnalyticsResponse,
    RSIData,
    MovingAverages,
    DateRange
)
from app.dependencies import get_loader
from app.services.data_loader import DataLoader
from app.services.analytics import (
    calculate_cagr,
    calculate_annualized_volatility,
    calculate_sharpe_ratio,
    calculate_drawdown_series,
    calculate_beta_and_alpha,
    calculate_rsi,
    calculate_moving_averages
)

router = APIRouter(prefix="", tags=["Stocks & Analytics"])

@router.get("/stocks")
def list_stocks(
    sector: Optional[str] = Query(None, description="Optional sector filter"),
    loader: DataLoader = Depends(get_loader)
):
    """Returns watchlist summary of all stocks for frontend search and filtering."""
    meta_df = loader.metadata.copy()
    if sector and sector.lower() != "all":
        meta_df = meta_df[meta_df["sector"].str.lower() == sector.lower()]

    latest_date = loader.dates_list[-1]
    prev_date = loader.dates_list[-2] if len(loader.dates_list) > 1 else latest_date

    results = []
    for _, row in meta_df.iterrows():
        t = row["ticker"]
        if t not in loader.ticker_set:
            continue
        p_latest = float(loader.prices_wide.loc[latest_date, t])
        p_prev = float(loader.prices_wide.loc[prev_date, t])
        pct_change = float((p_latest - p_prev) / p_prev * 100.0) if p_prev > 0 else 0.0

        results.append({
            "ticker": t,
            "name": row["name"],
            "sector": row["sector"],
            "industry": row["industry"],
            "market_cap": float(row["market_cap"]),
            "latest_price": round(p_latest, 2),
            "change_pct_1d": round(pct_change, 2)
        })

    results.sort(key=lambda x: x["market_cap"], reverse=True)
    return results

@router.get("/stocks/{ticker}/analytics", response_model=StockAnalyticsResponse)
def get_stock_analytics(
    ticker: str,
    risk_free_rate: float = Query(0.02, description="Annualized risk-free rate, default 0.02 (2%)"),
    loader: DataLoader = Depends(get_loader)
):
    try:
        valid_ticker = loader.validate_ticker(ticker)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Stock ticker '{ticker}' not found.")

    meta = loader.get_meta_for_ticker(valid_ticker)
    prices = loader.prices_wide[valid_ticker]
    returns = loader.returns_wide[valid_ticker]
    market_ret = loader.market_returns
    market_idx = loader.market_index

    # 1. Annualized return (CAGR)
    cagr = calculate_cagr(prices)
    market_cagr = calculate_cagr(market_idx)

    # 2. Annualized volatility
    vol = calculate_annualized_volatility(returns)

    # 3. Sharpe ratio
    sharpe = calculate_sharpe_ratio(cagr, vol, risk_free_rate)

    # 4. Max drawdown
    max_dd, _ = calculate_drawdown_series(prices)

    # 5. Beta and Alpha against market index
    beta, alpha = calculate_beta_and_alpha(returns, market_ret, cagr, market_cagr, risk_free_rate)

    # 6. 14-day RSI
    current_rsi, rsi_series = calculate_rsi(prices, window=14)
    if current_rsi >= 70:
        rsi_status = "Overbought"
    elif current_rsi <= 30:
        rsi_status = "Oversold"
    else:
        rsi_status = "Neutral"

    rsi_history = [
        {"date": d, "rsi": round(float(v), 2)}
        for d, v in rsi_series.iloc[-60:].items()
    ]

    # 7. Moving averages
    ma_dict = calculate_moving_averages(prices)

    dates = loader.dates_list

    return StockAnalyticsResponse(
        ticker=valid_ticker,
        name=meta["name"],
        sector=meta["sector"],
        industry=meta["industry"],
        market_cap=meta["market_cap"],
        current_price=round(float(prices.iloc[-1]), 2),
        annualized_return=round(cagr * 100.0, 2),
        annualized_volatility=round(vol * 100.0, 2),
        sharpe_ratio=round(sharpe, 3),
        risk_free_rate=risk_free_rate,
        max_drawdown=round(max_dd * 100.0, 2),
        beta=round(beta, 3),
        alpha=round(alpha * 100.0, 2),
        rsi=RSIData(
            current_rsi=round(current_rsi, 2),
            status=rsi_status,
            history=rsi_history
        ),
        moving_averages=MovingAverages(
            ma20=ma_dict["ma20"],
            ma50=ma_dict["ma50"],
            above_ma20=ma_dict["above_ma20"],
            above_ma50=ma_dict["above_ma50"]
        ),
        total_trading_days=len(dates),
        date_range=DateRange(
            start=dates[0],
            end=dates[-1],
            total_trading_days=len(dates)
        )
    )
