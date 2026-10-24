from typing import Dict, Any, List
import numpy as np
import pandas as pd

from app.schemas import (
    BacktestResponse,
    BacktestMetrics,
    BenchmarkMetrics,
    EquityCurvePoint
)
from app.services.data_loader import DataLoader
from app.services.analytics import (
    calculate_annualized_volatility,
    calculate_sharpe_ratio,
    calculate_drawdown_series
)

def run_neighbor_signal_backtest(
    data_loader: DataLoader,
    k: int = 5,
    lookback: int = 60,
    cost_bps: float = 10.0,
    corr_stride: int = 5
) -> BacktestResponse:
    returns_df = data_loader.returns_wide
    dates = returns_df.index.tolist()
    ret_mat = returns_df.values # (T, N)
    T, N = ret_mat.shape

    if lookback >= T:
        raise ValueError(f"Lookback window ({lookback}) cannot exceed total trading days ({T}).")

    k = max(1, min(k, N - 1))
    cost_rate = (cost_bps / 10000.0)

    portfolio_returns: List[float] = []
    benchmark_returns: List[float] = []
    out_dates: List[str] = []
    turnover_list: List[float] = []
    gross_returns: List[float] = []

    prev_weights = np.zeros(N)
    top_k_indices = None

    # Step through time strictly forward: no look-ahead bias
    for t in range(lookback, T):
        # Update correlation matrix every `corr_stride` days using strictly past data [t-lookback : t]
        if (t - lookback) % corr_stride == 0 or top_k_indices is None:
            hist_window = ret_mat[t - lookback : t] # strictly past returns
            # Fast normalized cross-correlation
            mean_centered = hist_window - hist_window.mean(axis=0)
            stds = hist_window.std(axis=0)
            stds[stds == 0] = 1.0
            norm_window = mean_centered / stds
            corr_mat = (norm_window.T @ norm_window) / (lookback - 1)
            np.fill_diagonal(corr_mat, -999.0) # do not pick self
            top_k_indices = np.argpartition(corr_mat, -k, axis=1)[:, -k:]

        # At close of day t-1, calculate signal for each stock:
        # Signal is the average return of its top-k historical neighbors on day t-1
        prev_day_ret = ret_mat[t - 1]
        neighbor_signals = np.mean(prev_day_ret[top_k_indices], axis=1)

        # Quintile ranking (top 20% long, bottom 20% short)
        q80 = np.percentile(neighbor_signals, 80)
        q20 = np.percentile(neighbor_signals, 20)

        long_mask = neighbor_signals >= q80
        short_mask = neighbor_signals <= q20

        n_long = int(np.sum(long_mask))
        n_short = int(np.sum(short_mask))

        weights = np.zeros(N)
        if n_long > 0:
            weights[long_mask] = 1.0 / n_long
        if n_short > 0:
            weights[short_mask] = -1.0 / n_short

        # Turnover and transaction costs
        turnover = float(np.sum(np.abs(weights - prev_weights)))
        cost = turnover * cost_rate
        turnover_list.append(turnover)

        # Realize returns on day t
        gross_ret = float(np.sum(weights * ret_mat[t]))
        net_ret = gross_ret - cost

        gross_returns.append(gross_ret)
        portfolio_returns.append(net_ret)
        benchmark_returns.append(float(np.mean(ret_mat[t])))
        out_dates.append(dates[t])

        prev_weights = weights

    port_arr = np.array(portfolio_returns)
    bench_arr = np.array(benchmark_returns)
    n_days = len(port_arr)

    # Equity curves (start at 100.0)
    strat_equity = np.cumprod(1.0 + port_arr) * 100.0
    bench_equity = np.cumprod(1.0 + bench_arr) * 100.0

    # Drawdowns
    strat_series = pd.Series(strat_equity, index=out_dates)
    bench_series = pd.Series(bench_equity, index=out_dates)
    strat_max_dd, strat_dd_series = calculate_drawdown_series(strat_series)
    bench_max_dd, bench_dd_series = calculate_drawdown_series(bench_series)

    # Strategy Metrics
    strat_total_return = float(strat_equity[-1] / 100.0 - 1.0)
    strat_cagr = float((strat_equity[-1] / 100.0) ** (252.0 / n_days) - 1.0) if strat_equity[-1] > 0 else -0.99
    strat_vol = calculate_annualized_volatility(pd.Series(port_arr))
    strat_sharpe = calculate_sharpe_ratio(strat_cagr, strat_vol)
    hit_rate = float(np.mean(port_arr > 0.0))

    # Benchmark Metrics
    bench_total_return = float(bench_equity[-1] / 100.0 - 1.0)
    bench_cagr = float((bench_equity[-1] / 100.0) ** (252.0 / n_days) - 1.0) if bench_equity[-1] > 0 else -0.99
    bench_vol = calculate_annualized_volatility(pd.Series(bench_arr))
    bench_sharpe = calculate_sharpe_ratio(bench_cagr, bench_vol)

    total_turnover = float(np.sum(turnover_list))
    total_cost_drag = float(np.sum(gross_returns) - np.sum(portfolio_returns))

    equity_curve: List[EquityCurvePoint] = []
    for i in range(n_days):
        equity_curve.append(
            EquityCurvePoint(
                date=out_dates[i],
                strategy_equity=round(float(strat_equity[i]), 2),
                benchmark_equity=round(float(bench_equity[i]), 2),
                strategy_drawdown=round(float(strat_dd_series.iloc[i]) * 100.0, 2),
                benchmark_drawdown=round(float(bench_dd_series.iloc[i]) * 100.0, 2),
                daily_net_return=round(float(port_arr[i]) * 100.0, 4)
            )
        )

    return BacktestResponse(
        parameters={
            "k_neighbors": k,
            "lookback_days": lookback,
            "cost_bps": cost_bps,
            "rebalance_stride_days": corr_stride,
            "total_trading_days": n_days,
            "start_date": out_dates[0],
            "end_date": out_dates[-1]
        },
        metrics=BacktestMetrics(
            annualized_return=round(strat_cagr * 100.0, 2),
            annualized_volatility=round(strat_vol * 100.0, 2),
            sharpe_ratio=round(strat_sharpe, 3),
            max_drawdown=round(strat_max_dd * 100.0, 2),
            hit_rate=round(hit_rate * 100.0, 2),
            total_return=round(strat_total_return * 100.0, 2),
            total_trades=n_days,
            total_turnover=round(total_turnover, 2),
            cost_drag_pct=round(total_cost_drag * 100.0, 2)
        ),
        benchmark_metrics=BenchmarkMetrics(
            annualized_return=round(bench_cagr * 100.0, 2),
            annualized_volatility=round(bench_vol * 100.0, 2),
            sharpe_ratio=round(bench_sharpe, 3),
            max_drawdown=round(bench_max_dd * 100.0, 2),
            total_return=round(bench_total_return * 100.0, 2)
        ),
        equity_curve=equity_curve,
        look_ahead_bias_guarantee="Strict temporal causality: correlations and neighbor selection at day t use only data in [t-lookback, t-1]. Signals are generated strictly at t-1 close, and executed for day t returns."
    )
