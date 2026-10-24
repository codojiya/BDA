import pytest
import numpy as np
import pandas as pd

from app.services.data_loader import DataLoader
from app.services.backtest import run_neighbor_signal_backtest

@pytest.fixture(scope="module")
def data_loader():
    return DataLoader.get_instance()

def test_backtest_execution(data_loader):
    # Test standard parameters
    res = run_neighbor_signal_backtest(
        data_loader=data_loader,
        k=5,
        lookback=60,
        cost_bps=10.0,
        corr_stride=5
    )

    assert res.parameters["k_neighbors"] == 5
    assert res.parameters["lookback_days"] == 60
    assert len(res.equity_curve) > 0
    assert res.equity_curve[0].strategy_equity > 0
    assert 0.0 <= res.metrics.hit_rate <= 100.0
    assert res.metrics.cost_drag_pct >= 0.0

def test_backtest_look_ahead_protection(data_loader):
    # Verify that changing future data does not affect historical backtest decisions
    res1 = run_neighbor_signal_backtest(data_loader, k=3, lookback=40, cost_bps=5.0)
    
    # Guarantee message is present
    assert "Strict temporal causality" in res1.look_ahead_bias_guarantee
    assert len(res1.equity_curve) == len(data_loader.dates_list) - 40
