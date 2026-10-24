import pytest
import numpy as np
import pandas as pd

from app.services.analytics import (
    calculate_cagr,
    calculate_annualized_volatility,
    calculate_sharpe_ratio,
    calculate_drawdown_series,
    calculate_beta_and_alpha,
    calculate_rsi,
    calculate_moving_averages
)

def test_calculate_cagr():
    # 252 days, price doubles from 100 to 200 -> CAGR should be 1.0 (100%)
    prices = pd.Series(np.linspace(100, 200, 252))
    cagr = calculate_cagr(prices, periods_per_year=252)
    assert np.isclose(cagr, 1.0, atol=1e-2)

    # Flat prices -> CAGR should be 0.0
    flat_prices = pd.Series([100.0] * 100)
    assert np.isclose(calculate_cagr(flat_prices), 0.0)

def test_calculate_annualized_volatility():
    # Constant daily returns -> volatility = 0
    returns = pd.Series([0.01] * 100)
    vol = calculate_annualized_volatility(returns)
    assert np.isclose(vol, 0.0, atol=1e-5)

    # Random returns with known std
    np.random.seed(42)
    simulated_returns = pd.Series(np.random.normal(0, 0.01, 1000))
    vol = calculate_annualized_volatility(simulated_returns)
    assert 0.14 < vol < 0.18 # ~ 0.01 * sqrt(252) ~ 0.158

def test_calculate_sharpe_ratio():
    # Excess return 10%, vol 20% -> Sharpe = 0.5
    sharpe = calculate_sharpe_ratio(annualized_return=0.12, annualized_vol=0.20, risk_free_rate=0.02)
    assert np.isclose(sharpe, 0.5)

    # Zero volatility edge case
    assert calculate_sharpe_ratio(0.05, 0.0) == 0.0

def test_calculate_drawdown():
    # Peak at 100, drops to 80, recovers to 90 -> Max DD = -20% (-0.20)
    prices = pd.Series([100.0, 95.0, 80.0, 90.0, 85.0])
    max_dd, dd_series = calculate_drawdown_series(prices)
    assert np.isclose(max_dd, -0.20)
    assert np.isclose(dd_series.iloc[2], -0.20)
    assert np.isclose(dd_series.iloc[0], 0.0)

def test_calculate_beta_and_alpha():
    # Stock moves exactly 1.5x the market
    np.random.seed(42)
    market_ret = pd.Series(np.random.normal(0.0005, 0.01, 500))
    stock_ret = 1.5 * market_ret + np.random.normal(0, 0.002, 500)

    stock_cagr = 0.15
    market_cagr = 0.10
    beta, alpha = calculate_beta_and_alpha(stock_ret, market_ret, stock_cagr, market_cagr, risk_free_rate=0.02)
    assert np.isclose(beta, 1.5, atol=0.1)

def test_calculate_rsi():
    # Strictly monotonically increasing prices -> RSI should approach 100
    prices_up = pd.Series([float(i) for i in range(1, 100)])
    current_rsi, rsi_series = calculate_rsi(prices_up, window=14)
    assert current_rsi > 90.0
    assert (rsi_series >= 0.0).all() and (rsi_series <= 100.0).all()

    # Strictly monotonically decreasing prices -> RSI should approach 0
    prices_down = pd.Series([float(100 - i) for i in range(1, 100)])
    current_rsi_down, _ = calculate_rsi(prices_down, window=14)
    assert current_rsi_down < 10.0

def test_calculate_moving_averages():
    prices = pd.Series(range(1, 100), dtype=float)
    ma = calculate_moving_averages(prices)
    assert ma["ma20"] is not None
    assert ma["ma50"] is not None
    assert ma["above_ma20"] is True
    assert ma["above_ma50"] is True
