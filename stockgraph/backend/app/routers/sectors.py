from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
import pandas as pd
import numpy as np

from app.schemas import SectorsResponse, SectorMetric
from app.dependencies import get_loader
from app.services.data_loader import DataLoader
from app.services.analytics import calculate_annualized_volatility, calculate_sharpe_ratio

router = APIRouter(prefix="", tags=["Sectors & Regimes"])

WINDOW_DAYS_MAP = {
    "1M": 21,
    "3M": 63,
    "6M": 126,
    "1Y": 252,
    "3Y": 756,
    "ALL": None
}

@router.get("/sectors", response_model=SectorsResponse)
def get_sectors(
    window: str = Query("1Y", pattern="^(1M|3M|6M|1Y|3Y|All|all)$"),
    loader: DataLoader = Depends(get_loader)
):
    win_key = window.upper()
    n_days = WINDOW_DAYS_MAP.get(win_key)

    returns_df = loader.returns_wide
    if n_days and n_days < len(returns_df):
        returns_slice = returns_df.iloc[-n_days:].copy()
    else:
        returns_slice = returns_df.copy()

    dates_slice = returns_slice.index.tolist()
    meta_df = loader.metadata
    sectors = sorted([s for s in meta_df["sector"].unique().tolist() if s])

    # Compute daily average return per sector
    sector_daily_returns: Dict[str, pd.Series] = {}
    sector_metrics: List[SectorMetric] = []

    for sec in sectors:
        sec_tickers = meta_df[meta_df["sector"] == sec]["ticker"].tolist()
        valid_tickers = [t for t in sec_tickers if t in returns_slice.columns]
        if not valid_tickers:
            continue

        sec_ret = returns_slice[valid_tickers].mean(axis=1)
        sector_daily_returns[sec] = sec_ret

        # Performance metrics
        cum_ret = float(np.prod(1.0 + sec_ret.values) - 1.0)
        n = len(sec_ret)
        ann_ret = float((1.0 + cum_ret) ** (252.0 / n) - 1.0) if cum_ret > -1.0 else -0.99
        ann_vol = calculate_annualized_volatility(sec_ret)
        sharpe = calculate_sharpe_ratio(ann_ret, ann_vol)

        sector_metrics.append(
            SectorMetric(
                sector=sec,
                ticker_count=len(valid_tickers),
                cumulative_return=round(cum_ret * 100.0, 2),
                annualized_return=round(ann_ret * 100.0, 2),
                annualized_volatility=round(ann_vol * 100.0, 2),
                sharpe_ratio=round(sharpe, 3)
            )
        )

    # Sector correlation matrix
    sec_df = pd.DataFrame(sector_daily_returns)
    sec_corr = sec_df.corr()
    corr_matrix = [
        [round(float(sec_corr.loc[s1, s2]), 4) if (s1 in sec_corr and s2 in sec_corr) else 0.0 for s2 in sectors]
        for s1 in sectors
    ]

    # Sector rotation timeline (cumulative returns rebased to 100)
    timeline: List[Dict[str, Any]] = []
    sec_cum_df = (1.0 + sec_df).cumprod() * 100.0

    for d in dates_slice:
        point = {"date": d}
        for sec in sectors:
            if sec in sec_cum_df.columns:
                point[sec] = round(float(sec_cum_df.loc[d, sec]), 2)
        timeline.append(point)

    return SectorsResponse(
        window=win_key,
        sectors=sectors,
        sector_metrics=sector_metrics,
        correlation_matrix=corr_matrix,
        timeline=timeline
    )
