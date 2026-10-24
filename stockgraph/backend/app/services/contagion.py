from typing import Dict, Any, List
import numpy as np
import pandas as pd

from app.schemas import (
    ContagionRequest,
    ContagionResponse,
    ImpactedStock,
    HopImpactDetail
)
from app.services.data_loader import DataLoader

def run_contagion_simulation(
    data_loader: DataLoader,
    req: ContagionRequest
) -> ContagionResponse:
    seed = data_loader.validate_ticker(req.seed_ticker)
    seed_meta = data_loader.get_meta_for_ticker(seed)

    # Use trailing 252 days (1 trading year) of returns
    recent_returns = data_loader.returns_wide.iloc[-252:]
    all_tickers = recent_returns.columns.tolist()

    # Precalculate correlation and covariance
    corr_mat = recent_returns.corr()
    cov_mat = recent_returns.cov()
    var_vec = recent_returns.var()

    total_impacts: Dict[str, float] = {t: 0.0 for t in all_tickers}
    total_impacts[seed] = req.shock
    hop_reached: Dict[str, int] = {seed: 0}

    hop_details: List[HopImpactDetail] = []
    current_frontier: Dict[str, float] = {seed: req.shock}
    visited = {seed}

    for h in range(1, req.hops + 1):
        next_frontier: Dict[str, float] = {}
        for src, src_shock in current_frontier.items():
            src_var = var_vec[src]
            if src_var <= 1e-12:
                continue

            for dst in all_tickers:
                if dst == seed or dst == src:
                    continue

                c = float(corr_mat.loc[src, dst])
                if c >= req.threshold:
                    cov_sd = float(cov_mat.loc[src, dst])
                    beta = float(np.clip(cov_sd / src_var, 0.1, 3.0))
                    
                    # Transmitted impact
                    delta = src_shock * c * beta * (req.damping ** h)
                    next_frontier[dst] = next_frontier.get(dst, 0.0) + delta

        # Filter out minor noise shocks < 0.0001 (0.01%)
        next_frontier = {k: v for k, v in next_frontier.items() if abs(v) >= 0.0001}

        new_nodes_count = 0
        top_hop_nodes = []
        for dst, delta in next_frontier.items():
            total_impacts[dst] = float(np.clip(total_impacts[dst] + delta, -0.99, 1.0))
            if dst not in visited:
                visited.add(dst)
                hop_reached[dst] = h
                new_nodes_count += 1
            meta = data_loader.get_meta_for_ticker(dst)
            top_hop_nodes.append({
                "ticker": dst,
                "name": meta["name"],
                "sector": meta["sector"],
                "hop_delta": round(delta, 5)
            })

        top_hop_nodes.sort(key=lambda x: abs(x["hop_delta"]), reverse=True)

        hop_details.append(
            HopImpactDetail(
                hop=h,
                newly_affected_count=new_nodes_count,
                total_cumulative_impact=round(float(sum(total_impacts.values())), 4),
                top_stocks=top_hop_nodes[:6]
            )
        )

        current_frontier = next_frontier
        if not current_frontier:
            break

    # Build ranked impact list
    ranked_list: List[ImpactedStock] = []
    seed_var = var_vec[seed]

    for ticker, impact in total_impacts.items():
        if abs(impact) >= 0.0001:
            meta = data_loader.get_meta_for_ticker(ticker)
            c_seed = float(corr_mat.loc[seed, ticker]) if ticker in corr_mat.columns else 0.0
            cov_val = float(cov_mat.loc[seed, ticker]) if ticker in cov_mat.columns else 0.0
            b_seed = float(cov_val / (seed_var + 1e-12))
            
            ranked_list.append(
                ImpactedStock(
                    ticker=ticker,
                    name=meta["name"],
                    sector=meta["sector"],
                    total_impact_pct=round(impact * 100.0, 3), # percentage e.g. -5.2%
                    hop_reached=hop_reached.get(ticker, req.hops),
                    correlation_to_seed=round(c_seed, 4),
                    beta_to_seed=round(b_seed, 4)
                )
            )

    ranked_list.sort(key=lambda x: abs(x.total_impact_pct), reverse=True)

    # Sector summary
    sector_groups: Dict[str, List[float]] = {}
    for item in ranked_list:
        sec = item.sector
        sector_groups.setdefault(sec, []).append(item.total_impact_pct)

    sector_summary = []
    for sec, imps in sector_groups.items():
        sector_summary.append({
            "sector": sec,
            "affected_count": len(imps),
            "average_impact_pct": round(float(np.mean(imps)), 3),
            "max_impact_pct": round(float(np.min(imps) if req.shock < 0 else np.max(imps)), 3)
        })
    sector_summary.sort(key=lambda x: abs(x["average_impact_pct"]), reverse=True)

    return ContagionResponse(
        seed_ticker=seed,
        seed_name=seed_meta["name"],
        seed_sector=seed_meta["sector"],
        initial_shock=round(req.shock * 100.0, 2),
        parameters={
            "hops": req.hops,
            "threshold": req.threshold,
            "damping": req.damping,
            "total_stocks_impacted": len(ranked_list)
        },
        hop_details=hop_details,
        ranked_impact=ranked_list,
        sector_impact_summary=sector_summary
    )
