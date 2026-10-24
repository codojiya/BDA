# 📈 BDA — StockGraph: Market Contagion Explorer
> **A Full-Stack Quantitative Financial Analytics & Network Contagion Platform for Big Data Analysis**

[![Python Version](https://img.shields.io/badge/Python-3.10+-3776ab?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_18-Vite_TypeScript-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TradingView Canvas](https://img.shields.io/badge/TradingView-Lightweight_Charts_v5-2962ff?style=for-the-badge)](https://tradingview.github.io/lightweight-charts/)
[![NetworkX](https://img.shields.io/badge/NetworkX-Graph_Theory-blue?style=for-the-badge)](https://networkx.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 📸 Application Screenshots

### 1. Market Overview & Real-Time Macroeconomic Regime Analytics
*Cross-sectional market topology, 3-component Gaussian Mixture Model (GMM) regime timeline, and real-time streaming ticker tape.*

![Market Overview](docs/screenshots/market_overview.png)

### 2. High-Frequency Candlestick Terminal & Quantitative Risk Profile
*TradingView Canvas-powered 1m/5m/1D Candlestick charts with technical overlays (MA20, MA50, Bollinger Bands, RSI), real-time trade updates, and interactive price-line annotations.*

![Stock Explorer Terminal](docs/screenshots/stock_terminal.png)

---

## 🌟 Executive Summary & Motivation

Modern equity markets exhibit deep interconnectedness where idiosyncratic shocks rapidly cascade across sectors. **StockGraph** is an enterprise-grade quantitative platform built to study and simulate these dynamics across **500+ S&P 500 equities** spanning 5 years of daily market data (2013–2018) combined with **real-time live streaming feeds**.

The application combines **Big Data columnar storage (Apache Parquet)**, **Graph Theory (NetworkX)**, **Unsupervised Machine Learning (GMM)**, and **HTML5 Hardware-Accelerated Canvas (TradingView)** to explore financial contagion, community clustering, and market lead-lag inefficiencies on localhost with zero cloud overhead.

---

## ⚡ Core Features

### 1. 📡 Live Market Streaming Engine
- Direct connection to **Alpaca Market Data WebSocket stream** (`wss://stream.data.alpaca.markets/v2/iex`).
- Builds in-memory 1-minute and 5-minute OHLCV candles from incoming trade ticks with bounded memory buffers (`deque(maxlen=2000)`).
- Asynchronous thread-safe queue broadcasting with **250ms batch throttling** to maintain 60 FPS client rendering.
- Seamless toggle between historical offline data and live market streaming.

### 2. 🕯️ Pro Candlestick Terminal (Canvas Powered)
- Built on **TradingView Lightweight Charts v5**.
- Supports timeframe switching across **1m** (Live), **5m** (Live), and **1D** (Historical).
- Server-side computation of technical indicators:
  - **Bollinger Bands** (20-day, $2\sigma$)
  - **MACD** (12, 26, 9)
  - **Wilder's RSI** (14-day smoothing)
  - **20-day & 50-day Simple Moving Averages**
- Real-time magnet crosshair readout showing OHLCV and percentage change.
- Interactive support/resistance line annotations (left-click to place, right-click to remove).

### 3. 🕸️ Correlation Network & Community Detection
- Computes pairwise Pearson correlation matrices across user-selected thresholds ($\theta \in [0.3, 0.9]$).
- Computes **Betweenness Centrality** to identify systemically critical financial hubs.
- Partitions the market into modular clusters using **Clauset-Newman-Moore Greedy Modularity**.
- Reports global network density, average clustering coefficient, and community metrics.

### 4. 💥 Multi-Hop Financial Contagion Shock Simulator
- Inoculates an exogenous percentage shock into a seed equity (e.g. $-5\%$ shock on AAPL or JPM).
- Simulates shock transmission across the network up to 3 hops using correlation, beta, and damping factor:
  $$\Delta_j^{(h)} = \Delta_i^{(h-1)} \cdot \rho_{ij} \cdot \beta_{ij} \cdot \gamma^h$$
- Displays ranked lists of impacted equities and cumulative systemic losses per hop.

### 5. 📉 Macroeconomic Regime Detection (Gaussian Mixture Model)
- Fits a 3-component **Gaussian Mixture Model (GMM)** on rolling 20-day market volatility and mean pairwise correlation.
- Classifies every trading day into macro regimes: **Calm**, **Normal**, or **Stressed** (e.g., Flash Crashes, market drawdowns).
- Interactive timeline showing regime transitions over 1,259 trading days.

### 6. 🧪 Walk-Forward Strategy Backtester (Zero Look-Ahead Bias)
- Quantitative lead-lag momentum strategy: trades stocks based on the prior day's average return of their top-$k$ correlated neighbors.
- Constructs market-neutral long/short portfolios (long top quintile, short bottom quintile).
- Rigorously computes correlation using strictly past data $[t-\text{lookback} : t]$ to guarantee **zero look-ahead bias**.
- Factors in realistic turnover transaction costs ($\text{cost\_bps}$).

### 7. 🤖 Agentic AI Market Analyst (Groq / OpenAI SDK)
- Interactive AI financial analyst powered by Groq (`qwen/qwen3.8-27b`) or OpenAI-compatible endpoints.
- Uses **JSON Tool Calling** to dispatch internal quantitative endpoints (`get_analytics`, `get_network`, `run_contagion_simulation`, `run_backtest`, `get_regimes`).
- Enforces strict data grounding (zero hallucination).
- Includes an automated daily market brief cached for 6 hours.

---

## 🛠️ Complete Technology Stack

| Domain | Technology | Purpose & Architecture |
| :--- | :--- | :--- |
| **Data Ingestion** | **Python, Pandas, PyArrow** | Chunked CSV ingestion (200,000 rows/chunk), coverage filtering, Parquet storage |
| **Backend Framework** | **FastAPI, Uvicorn, Pydantic v2** | High-throughput asynchronous ASGI web server with strictly typed schemas |
| **Streaming Engine** | **WebSockets, Asyncio Queues, Alpaca IEX** | Low-latency live trade ingestion with 250ms batched browser dispatch |
| **Graph Modeling** | **NetworkX, SciPy** | Betweenness centrality, degree distributions, greedy modularity clustering |
| **Machine Learning** | **Scikit-Learn, NumPy** | Bivariate Gaussian Mixture Models (GMM) for market regime classification |
| **AI Layer** | **Groq SDK / OpenAI SDK** | Agentic tool-calling analyst grounded in live application APIs |
| **Frontend Framework** | **React 18, TypeScript, Vite** | Single-page application with strict type safety and sub-second HMR |
| **UI Components** | **Material UI (MUI v5), Lucide React** | Zerodha/Groww-inspired high-density dark/light responsive interface |
| **Canvas Charts** | **TradingView Lightweight Charts v5** | Hardware-accelerated Canvas candlesticks with in-place zero-recreation updates |
| **Statistical Visuals** | **Recharts, D3-Force Engine** | SVG equity curves, multi-asset comparison lines, RSI oscillator panes |
| **List Virtualization** | **TanStack Virtual** | 60 FPS scrolling across 500+ S&P 500 equities |

---

## 🚀 Quick Start Guide (Localhost Only)

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**

---

### Method A: 1-Click Launch (Recommended)

#### On Windows:
Double-click `stockgraph/run.bat` or run:
```cmd
cd stockgraph
run.bat
```

#### On Linux / macOS:
```bash
cd stockgraph
chmod +x run.sh
./run.sh
```

---

### Method B: Manual Execution

#### Step 1: Start Backend
```bash
cd stockgraph/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- **Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### Step 2: Start Frontend
In a second terminal:
```bash
cd stockgraph/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
- **Frontend Application:** [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file in `stockgraph/backend/` (a template is provided in `stockgraph/backend/.env.example`):

```ini
# Alpaca Market Data (Free Paper-Trading Keys)
ALPACA_API_KEY=your_alpaca_api_key_here
ALPACA_API_SECRET=your_alpaca_api_secret_here
ALPACA_FEED=iex
LIVE_PROVIDER=alpaca

# Optional: Groq AI Assistant (Free API key from console.groq.com)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b
```
*(If keys are omitted, the app runs offline on historical S&P 500 data with synthetic live buffers; AI features show a clean "Not Configured" badge).*

---

## 📡 REST API Reference

| Endpoint | Method | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/meta` | `GET` | — | Dataset statistics, date range, ticker count, pipeline summary |
| `/api/prices/{ticker}` | `GET` | `period`, `compare` | OHLCV history with optional rebased multi-ticker comparison |
| `/api/stocks/{ticker}/analytics` | `GET` | `rf_rate` | Annualized return, volatility, Sharpe, Max Drawdown, Beta, RSI |
| `/api/correlation` | `GET` | `tickers`, `window` | Pearson correlation matrix and rolling correlation series |
| `/api/network` | `GET` | `threshold`, `sector`, `limit` | Network nodes, edges, centrality, and community partition IDs |
| `/api/simulate/contagion` | `POST` | `seed_ticker`, `shock`, `hops` | Multi-hop systemic risk shock propagation cascade |
| `/api/backtest/neighbor-signal` | `GET` | `k`, `lookback`, `cost_bps` | Look-ahead-bias-free quintile lead-lag backtest equity curve |
| `/api/sectors` | `GET` | `window` | Sector returns, market share, and sector-to-sector correlation |
| `/api/regimes` | `GET` | — | GMM macroeconomic regime classification timeline (Calm, Normal, Stressed) |
| `/api/anomalies` | `GET` | `limit` | Statistical return ($>3\sigma$) and volume spike ($>3\times$) anomaly feed |
| `/api/candles/{ticker}` | `GET` | `timeframe`, `period` | Historical OHLCV candles formatted for TradingView charts |
| `/api/indicators/{ticker}` | `GET` | `names`, `period` | Technical indicators (Bollinger Bands, MACD, RSI, Moving Averages) |
| `/api/live/status` | `GET` | — | WebSocket connectivity, throughput rate, and market open/closed status |
| `/api/live/candles/{ticker}` | `GET` | `timeframe` | In-memory live 1m/5m candles aggregated from trades |
| `/api/live/stream` | `WS` | — | WebSocket streaming live trade updates batched at $\le 250\text{ ms}$ |
| `/api/ai/chat` | `POST` | `messages` | Agentic AI market chat with automated quantitative tool dispatch |
| `/api/ai/brief` | `GET` | — | Daily market brief grounded in regimes, centrality, and anomalies |

---

## 🧪 Unit Testing & Verification

The backend includes a comprehensive pytest test suite covering all mathematical calculations, technical indicators, and API endpoints:

```bash
cd stockgraph/backend
python -m pytest tests -v
```

**Results:**
```text
tests/test_analytics.py::test_calculate_cagr PASSED
tests/test_analytics.py::test_calculate_annualized_volatility PASSED
tests/test_analytics.py::test_calculate_sharpe_ratio PASSED
tests/test_analytics.py::test_calculate_drawdown PASSED
tests/test_analytics.py::test_calculate_beta_and_alpha PASSED
tests/test_analytics.py::test_calculate_rsi PASSED
tests/test_analytics.py::test_calculate_moving_averages PASSED
tests/test_api.py::test_api_meta PASSED
tests/test_api.py::test_api_prices PASSED
tests/test_api.py::test_api_stock_analytics PASSED
tests/test_api.py::test_api_correlation PASSED
tests/test_api.py::test_api_network PASSED
tests/test_api.py::test_api_simulate_contagion PASSED
tests/test_api.py::test_api_sectors PASSED
tests/test_api.py::test_api_regimes PASSED
tests/test_api.py::test_api_anomalies PASSED
tests/test_backtest.py::test_backtest_execution PASSED
tests/test_backtest.py::test_backtest_look_ahead_protection PASSED
tests/test_contagion.py::test_contagion_simulation PASSED
tests/test_indicators.py::test_bollinger_bands_calculation PASSED
tests/test_indicators.py::test_macd_calculation PASSED
tests/test_indicators.py::test_rsi_wilder_bounds PASSED
tests/test_live_and_ai.py::test_live_candle_aggregation PASSED
tests/test_live_and_ai.py::test_5m_candle_aggregation PASSED
tests/test_live_and_ai.py::test_ai_tool_dispatcher PASSED
tests/test_live_and_ai.py::test_indicators_and_candles_endpoints PASSED
tests/test_live_and_ai.py::test_live_status_endpoint PASSED
tests/test_live_and_ai.py::test_ai_brief_and_explain_endpoints PASSED

============================= 29 passed in 51.90s =============================
```

---

## 📁 Repository Directory Structure

```text
BDA/
├── README.md                      # Primary project documentation with screenshots & guide
├── .gitignore                     # Git ignore rules (secrets, node_modules, caches, zips)
├── docs/
│   └── screenshots/               # High-resolution application screenshots
│       ├── market_overview.png
│       └── stock_terminal.png
└── stockgraph/
    ├── run.bat                    # 1-Click launcher for Windows
    ├── run.sh                     # 1-Click launcher for Linux / macOS
    ├── backend/
    │   ├── requirements.txt       # Python dependencies (FastAPI, PyArrow, NetworkX, etc.)
    │   ├── .env.example           # Environment template for Alpaca & Groq keys
    │   ├── app/
    │   │   ├── main.py            # FastAPI ASGI entrypoint & middleware configuration
    │   │   ├── schemas.py         # Pydantic v2 data models
    │   │   ├── dependencies.py    # Dependency injection singletons
    │   │   ├── routers/           # 13 modular REST & WebSocket route handlers
    │   │   └── services/          # Quantitative math, graph algorithms, AI & streaming
    │   ├── pipeline/
    │   │   └── ingest.py          # Chunked Parquet ingestion & data cleaning pipeline
    │   └── tests/                 # 29 comprehensive pytest test cases
    ├── data/
    │   ├── raw/                   # Raw S&P 500 prices & company metadata
    │   └── processed/             # Optimized Parquet columnar datasets
    └── frontend/
        ├── package.json           # React, MUI v5, TradingView Lightweight Charts, Vite
        ├── vite.config.ts         # Vite server & reverse proxy configuration
        └── src/
            ├── App.tsx            # Main application layout, theme & WebSocket controller
            ├── theme.ts           # Professional dark/light financial theme tokens
            ├── pages/             # 7 core analytical modules & views
            └── components/        # Reusable TradingView Candlestick charts, drawers, cards
```

---

## 🎓 University Evaluation Highlights

1. **Big Data Processing**: Cleanly ingests multi-million row datasets in 200,000-row chunks with memory tracking; reduces query latencies from seconds to sub-milliseconds using Apache Parquet columnar storage.
2. **Advanced Mathematics & Machine Learning**:
   - Clauset-Newman-Moore greedy modularity community clustering.
   - Bivariate 3-component Gaussian Mixture Model (GMM) on rolling market volatility and pairwise correlation.
   - Matrix-vectorized cross-sectional lead-lag momentum backtest with strictly lookback-bounded data to eliminate look-ahead bias.
3. **Real-Time Distributed Architecture**: WebSocket streaming engine with non-blocking Asyncio queues and 250ms batch frame rate-limiting.
4. **Professional Visual Engineering**: TradingView HTML5 Canvas candlestick terminal with in-place zero-recreation streaming updates (`series.update()`) and TanStack virtualized watchlist.
