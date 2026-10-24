from typing import List, Optional
import numpy as np
import pandas as pd

from app.schemas import AnomaliesResponse, AnomalyRecord
from app.services.data_loader import DataLoader

_cached_anomalies: Optional[List[AnomalyRecord]] = None

def compute_market_anomalies(data_loader: DataLoader, limit: int = 50) -> AnomaliesResponse:
    global _cached_anomalies

    if _cached_anomalies is None:
        print("[*] Precomputing market anomaly feed (3-sigma returns & 3x volume spikes)...")
        returns_df = data_loader.returns_wide
        volume_df = data_loader.volume_wide
        tickers = returns_df.columns.tolist()

        # Rolling 60-day returns mean and std
        ret_mean_60 = returns_df.rolling(60, min_periods=30).mean()
        ret_std_60 = returns_df.rolling(60, min_periods=30).std()

        # Rolling 20-day volume mean
        vol_mean_20 = volume_df.rolling(20, min_periods=10).mean()

        anomalies_list = []

        # Iterate over tickers
        for t in tickers:
            meta = data_loader.get_meta_for_ticker(t)
            r_series = returns_df[t]
            v_series = volume_df[t]
            m_ret = ret_mean_60[t]
            s_ret = ret_std_60[t]
            m_vol = vol_mean_20[t]

            # Price shock mask: abs(r - mean) > 3 * std
            z_scores = (np.abs(r_series - m_ret) / (s_ret + 1e-8)).fillna(0.0)
            price_mask = z_scores > 3.0

            # Volume spike mask: volume > 3 * mean_vol
            vol_ratios = (v_series / (m_vol + 1.0)).fillna(0.0)
            vol_mask = vol_ratios > 3.0

            combined_mask = price_mask | vol_mask
            if not combined_mask.any():
                continue

            flagged_indices = combined_mask[combined_mask].index

            for d in flagged_indices:
                is_price = bool(price_mask.loc[d])
                is_vol = bool(vol_mask.loc[d])
                z_val = float(z_scores.loc[d])
                v_ratio = float(vol_ratios.loc[d])

                if is_price and is_vol:
                    atype = "Dual Shock"
                elif is_price:
                    atype = "Price Shock"
                else:
                    atype = "Volume Spike"

                severity = max(z_val / 3.0, v_ratio / 3.0)

                anomalies_list.append(
                    AnomalyRecord(
                        date=str(d),
                        ticker=t,
                        name=meta["name"],
                        sector=meta["sector"],
                        return_pct=round(float(r_series.loc[d]) * 100.0, 2),
                        z_score=round(z_val, 2),
                        volume=int(v_series.loc[d]),
                        volume_ratio=round(v_ratio, 2),
                        anomaly_type=atype,
                        severity=round(severity, 2)
                    )
                )

        # Sort descending by date, then by severity
        anomalies_list.sort(key=lambda a: (a.date, a.severity), reverse=True)
        _cached_anomalies = anomalies_list
        print(f"[+] Identified {len(_cached_anomalies)} total anomaly events.")

    return AnomaliesResponse(
        total_anomalies_found=len(_cached_anomalies),
        limit=limit,
        records=_cached_anomalies[:limit]
    )
