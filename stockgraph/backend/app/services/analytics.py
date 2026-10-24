from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd

def calculate_cagr(prices: pd.Series, periods_per_year: int = 252) -> float:
    """Calculate Compound Annual Growth Rate (CAGR) from a price series."""
    valid_prices = prices.dropna()
    if len(valid_prices) < 2:
        return 0.0
    p_first = float(valid_prices.iloc[0])
    p_last = float(valid_prices.iloc[-1])
    n_days = len(valid_prices)
    if p_first <= 0 or p_last <= 0 or n_days <= 1:
        return 0.0
    return float((p_last / p_first) ** (periods_per_year / n_days) - 1.0)

def calculate_annualized_volatility(returns: pd.Series, periods_per_year: int = 252) -> float:
    """Calculate annualized volatility from daily return series."""
    clean = returns.dropna()
    if len(clean) < 2:
        return 0.0
    return float(clean.std(ddof=1) * np.sqrt(periods_per_year))

def calculate_sharpe_ratio(annualized_return: float, annualized_vol: float, risk_free_rate: float = 0.02) -> float:
    """Calculate Sharpe Ratio given annualized return, volatility and risk-free rate."""
    if annualized_vol <= 1e-9:
        return 0.0
    return float((annualized_return - risk_free_rate) / annualized_vol)

def calculate_drawdown_series(prices: pd.Series) -> Tuple[float, pd.Series]:
    """Calculate max drawdown and drawdown series from price series."""
    valid_prices = prices.dropna()
    if len(valid_prices) < 2:
        return 0.0, pd.Series(0.0, index=prices.index)
    running_max = valid_prices.cummax()
    drawdown = (valid_prices - running_max) / running_max
    max_dd = float(drawdown.min())
    return max_dd, drawdown

def calculate_beta_and_alpha(stock_returns: pd.Series, market_returns: pd.Series,
                            stock_cagr: float, market_cagr: float,
                            risk_free_rate: float = 0.02) -> Tuple[float, float]:
    """Calculate CAPM Beta and annualized Jensen's Alpha against market index."""
    df = pd.DataFrame({"stock": stock_returns, "market": market_returns}).dropna()
    if len(df) < 5:
        return 1.0, 0.0
    
    var_m = df["market"].var(ddof=1)
    if var_m <= 1e-12:
        return 1.0, 0.0
    
    cov_sm = df["stock"].cov(df["market"])
    beta = float(cov_sm / var_m)
    # Jensen's alpha annualized
    expected_return = risk_free_rate + beta * (market_cagr - risk_free_rate)
    alpha = float(stock_cagr - expected_return)
    return beta, alpha

def calculate_rsi(prices: pd.Series, window: int = 14) -> Tuple[float, pd.Series]:
    """
    Calculate Wilder's Relative Strength Index (RSI).
    Returns (current_rsi, rsi_series).
    """
    delta = prices.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)

    avg_gain = gain.ewm(alpha=1.0 / window, min_periods=window, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / window, min_periods=window, adjust=False).mean()

    rs = avg_gain / (avg_loss + 1e-12)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    
    # Fill leading NaNs with 50.0
    rsi = rsi.fillna(50.0)
    current_rsi = float(rsi.iloc[-1]) if len(rsi) > 0 else 50.0
    return current_rsi, rsi

def calculate_moving_averages(prices: pd.Series) -> Dict[str, Any]:
    """Calculate 20-day and 50-day moving averages."""
    ma20 = prices.rolling(20).mean()
    ma50 = prices.rolling(50).mean()

    curr_p = float(prices.iloc[-1])
    curr_ma20 = float(ma20.iloc[-1]) if pd.notna(ma20.iloc[-1]) else None
    curr_ma50 = float(ma50.iloc[-1]) if pd.notna(ma50.iloc[-1]) else None

    return {
        "ma20": round(curr_ma20, 2) if curr_ma20 is not None else None,
        "ma50": round(curr_ma50, 2) if curr_ma50 is not None else None,
        "above_ma20": bool(curr_p > curr_ma20) if curr_ma20 is not None else None,
        "above_ma50": bool(curr_p > curr_ma50) if curr_ma50 is not None else None,
        "ma20_series": ma20,
        "ma50_series": ma50
    }

def calculate_bollinger_bands(prices: pd.Series, window: int = 20, num_std: float = 2.0) -> Dict[str, pd.Series]:
    """
    Calculate Bollinger Bands (20, 2σ).
    Returns middle band, upper band, lower band, bandwidth, and %B series.
    """
    middle = prices.rolling(window=window).mean()
    std = prices.rolling(window=window).std(ddof=1)
    upper = middle + (num_std * std)
    lower = middle - (num_std * std)
    bandwidth = (upper - lower) / (middle + 1e-12)
    percent_b = (prices - lower) / ((upper - lower) + 1e-12)

    return {
        "middle": middle,
        "upper": upper,
        "lower": lower,
        "bandwidth": bandwidth,
        "percent_b": percent_b
    }

def calculate_macd(prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, pd.Series]:
    """
    Calculate Moving Average Convergence Divergence (MACD 12, 26, 9).
    Returns MACD line, signal line, and histogram series.
    """
    ema_fast = prices.ewm(span=fast, adjust=False).mean()
    ema_slow = prices.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line

    return {
        "macd": macd_line,
        "signal": signal_line,
        "histogram": histogram
    }

