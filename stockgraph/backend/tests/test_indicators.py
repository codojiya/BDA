import pytest
import numpy as np
import pandas as pd

from app.services.analytics import (
    calculate_bollinger_bands,
    calculate_macd,
    calculate_rsi
)

def test_bollinger_bands_calculation():
    # 25 constant prices of 100.0 -> std is 0, middle = 100, upper = 100, lower = 100
    flat_prices = pd.Series([100.0] * 25)
    bb_flat = calculate_bollinger_bands(flat_prices, window=20, num_std=2.0)
    assert np.isclose(bb_flat["middle"].iloc[-1], 100.0)
    assert np.isclose(bb_flat["upper"].iloc[-1], 100.0)
    assert np.isclose(bb_flat["lower"].iloc[-1], 100.0)
    assert np.isclose(bb_flat["bandwidth"].iloc[-1], 0.0)

    # Hand-calculated known test series of 20 prices: 1.0 to 20.0
    known_prices = pd.Series(list(range(1, 21)), dtype=float)
    bb = calculate_bollinger_bands(known_prices, window=20, num_std=2.0)
    
    # Mean of 1..20 = 210 / 20 = 10.5
    expected_mean = 10.5
    # Sample standard deviation (ddof=1) of 1..20
    expected_std = float(known_prices.std(ddof=1)) # ~ 5.916
    expected_upper = expected_mean + 2.0 * expected_std
    expected_lower = expected_mean - 2.0 * expected_std

    assert np.isclose(bb["middle"].iloc[-1], expected_mean)
    assert np.isclose(bb["upper"].iloc[-1], expected_upper)
    assert np.isclose(bb["lower"].iloc[-1], expected_lower)
    
    # %B for the last price (20.0): (20 - lower) / (upper - lower)
    expected_pct_b = (20.0 - expected_lower) / (expected_upper - expected_lower)
    assert np.isclose(bb["percent_b"].iloc[-1], expected_pct_b)

def test_macd_calculation():
    # Constant prices -> EMA fast = EMA slow -> MACD line = 0, signal = 0, hist = 0
    flat_prices = pd.Series([50.0] * 40)
    macd_res = calculate_macd(flat_prices, fast=12, slow=26, signal=9)
    assert np.isclose(macd_res["macd"].iloc[-1], 0.0, atol=1e-5)
    assert np.isclose(macd_res["signal"].iloc[-1], 0.0, atol=1e-5)
    assert np.isclose(macd_res["histogram"].iloc[-1], 0.0, atol=1e-5)

    # Uptrend prices -> fast EMA responds faster than slow EMA -> MACD > 0
    uptrend_prices = pd.Series([float(i) for i in range(1, 60)])
    macd_up = calculate_macd(uptrend_prices, fast=12, slow=26, signal=9)
    assert macd_up["macd"].iloc[-1] > 0
    # Histogram = macd - signal
    assert np.isclose(macd_up["histogram"].iloc[-1], macd_up["macd"].iloc[-1] - macd_up["signal"].iloc[-1])

def test_rsi_wilder_bounds():
    # Monotonically increasing sequence -> RSI approaches 100
    prices_up = pd.Series([float(i) for i in range(1, 50)])
    curr_rsi, rsi_series = calculate_rsi(prices_up, window=14)
    assert curr_rsi > 95.0
    assert (rsi_series >= 0.0).all() and (rsi_series <= 100.0).all()

    # Monotonically decreasing sequence -> RSI approaches 0
    prices_down = pd.Series([float(100 - i) for i in range(1, 50)])
    curr_rsi_down, _ = calculate_rsi(prices_down, window=14)
    assert curr_rsi_down < 5.0
