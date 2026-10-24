from typing import Dict, Any, List
import numpy as np
import pandas as pd
from sklearn.mixture import GaussianMixture

from app.schemas import RegimesResponse, RegimePoint, RegimeStats
from app.services.data_loader import DataLoader

def compute_market_regimes(data_loader: DataLoader) -> RegimesResponse:
    returns_df = data_loader.returns_wide
    market_ret = data_loader.market_returns
    market_idx = data_loader.market_index
    dates = data_loader.dates_list

    # 1. Rolling 20-day market volatility (annualized)
    roll_vol = market_ret.rolling(20).std() * np.sqrt(252)

    # 2. Rolling 20-day average pairwise correlation using top 40 liquid tickers
    top_tickers = data_loader.metadata.sort_values("market_cap", ascending=False)["ticker"].head(40).tolist()
    top_ret = returns_df[top_tickers]
    
    # Efficient pairwise correlation average per rolling 20-day window
    # roll_corr shape: (T * 40, 40)
    roll_corr = top_ret.rolling(20).corr()
    
    # Extract upper triangle mean for each date
    triu_idx = np.triu_indices(len(top_tickers), k=1)
    avg_corr_list = []
    
    for d in dates:
        try:
            mat = roll_corr.loc[d].values
            if np.isnan(mat).any():
                avg_corr_list.append(np.nan)
            else:
                avg_corr_list.append(float(mat[triu_idx].mean()))
        except Exception:
            avg_corr_list.append(np.nan)

    avg_corr_series = pd.Series(avg_corr_list, index=dates)

    # Combine features and drop initial 20 days with NaN
    df_feat = pd.DataFrame({
        "vol": roll_vol,
        "corr": avg_corr_series,
        "market_price": market_idx,
        "market_return": market_ret
    }).dropna()

    X = df_feat[["vol", "corr"]].values

    # Fit Gaussian Mixture Model (3 components)
    gmm = GaussianMixture(n_components=3, covariance_type="full", random_state=42, n_init=5)
    labels = gmm.fit_predict(X)
    df_feat["cluster"] = labels

    # Order clusters by stress score = normalized vol + normalized corr
    cluster_stats = []
    vol_mean = df_feat["vol"].mean()
    vol_std = df_feat["vol"].std() + 1e-9
    corr_mean = df_feat["corr"].mean()
    corr_std = df_feat["corr"].std() + 1e-9

    for c in range(3):
        subset = df_feat[df_feat["cluster"] == c]
        mean_v = subset["vol"].mean()
        mean_c = subset["corr"].mean()
        stress_score = ((mean_v - vol_mean) / vol_std) + ((mean_c - corr_mean) / corr_std)
        cluster_stats.append({
            "cluster": c,
            "mean_vol": mean_v,
            "mean_corr": mean_c,
            "mean_ret": subset["market_return"].mean(),
            "count": len(subset),
            "stress": stress_score
        })

    # Sort ascending: lowest stress -> Calm (0), middle -> Normal (1), highest -> Stressed (2)
    cluster_stats.sort(key=lambda x: x["stress"])
    mapping = {
        cluster_stats[0]["cluster"]: ("Calm", 0),
        cluster_stats[1]["cluster"]: ("Normal", 1),
        cluster_stats[2]["cluster"]: ("Stressed", 2)
    }

    df_feat["regime_name"] = df_feat["cluster"].map(lambda c: mapping[c][0])
    df_feat["regime_id"] = df_feat["cluster"].map(lambda c: mapping[c][1])

    # Build timeline
    timeline: List[RegimePoint] = []
    for d, row in df_feat.iterrows():
        timeline.append(
            RegimePoint(
                date=str(d),
                market_price=round(float(row["market_price"]), 2),
                market_return=round(float(row["market_return"]) * 100.0, 3),
                rolling_vol=round(float(row["vol"]) * 100.0, 2),
                rolling_corr=round(float(row["corr"]), 4),
                regime=str(row["regime_name"]),
                regime_id=int(row["regime_id"])
            )
        )

    # Build summary statistics
    total_days = len(df_feat)
    regime_stats: List[RegimeStats] = []
    for s in cluster_stats:
        reg_name, reg_id = mapping[s["cluster"]]
        regime_stats.append(
            RegimeStats(
                regime=reg_name,
                days_count=s["count"],
                percentage=round((s["count"] / total_days) * 100.0, 2),
                avg_volatility=round(float(s["mean_vol"]) * 100.0, 2),
                avg_correlation=round(float(s["mean_corr"]), 4),
                avg_daily_return=round(float(s["mean_ret"]) * 100.0, 3)
            )
        )

    # Sort summary by regime ID (Calm -> Normal -> Stressed)
    regime_stats.sort(key=lambda r: 0 if r.regime == "Calm" else 1 if r.regime == "Normal" else 2)
    current_regime = timeline[-1].regime if timeline else "Normal"

    return RegimesResponse(
        current_regime=current_regime,
        regime_stats=regime_stats,
        timeline=timeline
    )
