import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_api_meta():
    response = client.get("/api/meta")
    assert response.status_code == 200
    data = response.json()
    assert data["source_badge"] == "real"
    assert data["ticker_count"] > 400
    assert "date_range" in data

def test_api_prices():
    response = client.get("/api/prices/AAPL?period=1M")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "AAPL"
    assert len(data["records"]) > 0

    # Test compare parameter
    comp_res = client.get("/api/prices/AAPL?period=1M&compare=MSFT,AMZN")
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert comp_data["comparison"] is not None
    assert "MSFT" in comp_data["comparison"]["series"]

    # Test unknown ticker 404
    bad_res = client.get("/api/prices/NONEXISTENT_TICKER")
    assert bad_res.status_code == 404

def test_api_stock_analytics():
    response = client.get("/api/stocks/AAPL/analytics?risk_free_rate=0.02")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "AAPL"
    assert "sharpe_ratio" in data
    assert "beta" in data
    assert "rsi" in data
    assert "moving_averages" in data

def test_api_correlation():
    response = client.get("/api/correlation?tickers=AAPL,MSFT,GOOGL&window=60")
    assert response.status_code == 200
    data = response.json()
    assert len(data["matrix"]) == 3
    assert data["rolling_pair"] is not None

def test_api_network():
    response = client.get("/api/network?threshold=0.6&sector=All&limit=30")
    assert response.status_code == 200
    data = response.json()
    assert len(data["nodes"]) > 0
    assert "stats" in data
    assert "num_communities" in data["stats"]

def test_api_simulate_contagion():
    payload = {
        "seed_ticker": "AAPL",
        "shock": -0.05,
        "hops": 2,
        "threshold": 0.4,
        "damping": 0.7
    }
    response = client.post("/api/simulate/contagion", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["seed_ticker"] == "AAPL"
    assert len(data["ranked_impact"]) > 0

def test_api_sectors():
    response = client.get("/api/sectors?window=1Y")
    assert response.status_code == 200
    data = response.json()
    assert len(data["sectors"]) > 0
    assert len(data["sector_metrics"]) > 0

def test_api_regimes():
    response = client.get("/api/regimes")
    assert response.status_code == 200
    data = response.json()
    assert data["current_regime"] in ["Calm", "Normal", "Stressed"]
    assert len(data["timeline"]) > 0

def test_api_anomalies():
    response = client.get("/api/anomalies?limit=25")
    assert response.status_code == 200
    data = response.json()
    assert len(data["records"]) <= 25
