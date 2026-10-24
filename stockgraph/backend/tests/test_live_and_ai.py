import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.live_feed import LiveMarketFeed
from app.services.ai import AIService

client = TestClient(app)

def test_live_candle_aggregation():
    feed = LiveMarketFeed()
    # Ingest 4 trades within the same minute: 19:30:00 to 19:30:50
    feed._ingest_trade("TEST", 150.0, 100, "2026-10-14T19:30:00Z")
    feed._ingest_trade("TEST", 155.0, 50, "2026-10-14T19:30:10Z")
    feed._ingest_trade("TEST", 148.0, 75, "2026-10-14T19:30:20Z")
    feed._ingest_trade("TEST", 152.0, 200, "2026-10-14T19:30:50Z")

    curr = feed.current_minute_candle.get("TEST")
    assert curr is not None
    assert curr["open"] == 150.0
    assert curr["high"] == 155.0
    assert curr["low"] == 148.0
    assert curr["close"] == 152.0
    assert curr["volume"] == 425

def test_5m_candle_aggregation():
    feed = LiveMarketFeed()
    candles_1m = [
        {"time": "2026-10-14 19:30:00", "open": 100.0, "high": 102.0, "low": 99.0, "close": 101.0, "volume": 1000},
        {"time": "2026-10-14 19:31:00", "open": 101.0, "high": 103.0, "low": 100.5, "close": 102.5, "volume": 1200},
        {"time": "2026-10-14 19:32:00", "open": 102.5, "high": 104.0, "low": 102.0, "close": 103.5, "volume": 800},
        {"time": "2026-10-14 19:33:00", "open": 103.5, "high": 103.8, "low": 101.5, "close": 102.0, "volume": 500},
        {"time": "2026-10-14 19:34:00", "open": 102.0, "high": 102.5, "low": 98.5, "close": 99.5, "volume": 1500},
    ]
    agg_5m = feed._aggregate_5m(candles_1m)
    assert len(agg_5m) == 1
    c5 = agg_5m[0]
    assert c5["open"] == 100.0
    assert c5["high"] == 104.0
    assert c5["low"] == 98.5
    assert c5["close"] == 99.5
    assert c5["volume"] == 5000

def test_ai_tool_dispatcher():
    ai = AIService()
    # Test dispatching get_analytics
    res_analytics = ai.execute_tool("get_analytics", {"ticker": "AAPL"})
    assert res_analytics["tool"] == "get_analytics"
    assert "sharpe_ratio" in res_analytics

    # Test dispatching get_network
    res_net = ai.execute_tool("get_network", {"threshold": 0.6})
    assert res_net["tool"] == "get_network"
    assert "density" in res_net

    # Test dispatching get_live_status
    res_live = ai.execute_tool("get_live_status", {})
    assert res_live["tool"] == "get_live_status"
    assert "status" in res_live

def test_indicators_and_candles_endpoints():
    # Test GET /api/candles/AAPL
    r_candles = client.get("/api/candles/AAPL?timeframe=1D&period=1Y")
    assert r_candles.status_code == 200
    data_c = r_candles.json()
    assert data_c["ticker"] == "AAPL"
    assert len(data_c["candles"]) > 0
    assert "open" in data_c["candles"][0]

    # Test GET /api/indicators/AAPL
    r_ind = client.get("/api/indicators/AAPL?names=ma20,ma50,bb,rsi,macd&period=1Y")
    assert r_ind.status_code == 200
    data_i = r_ind.json()
    assert "bb" in data_i["indicators"]
    assert "macd" in data_i["indicators"]
    assert "rsi" in data_i["indicators"]
    assert "ma20" in data_i["indicators"]

def test_live_status_endpoint():
    r = client.get("/api/live/status")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data
    assert "market_status" in data

def test_ai_brief_and_explain_endpoints():
    # Test GET /api/ai/brief
    r_brief = client.get("/api/ai/brief")
    assert r_brief.status_code == 200
    data_b = r_brief.json()
    assert "current_regime" in data_b
    assert "brief" in data_b

    # Test POST /api/ai/explain
    r_exp = client.post("/api/ai/explain", json={
        "chart_type": "candlestick",
        "data_summary": {"ticker": "AAPL", "last_price": 175.0, "rsi": 65.4}
    })
    assert r_exp.status_code == 200
    data_e = r_exp.json()
    assert "explanation" in data_e
