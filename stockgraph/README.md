# StockGraph: Market Contagion Explorer
*A Full-Stack Big Data Analysis Mini Project for University Evaluation*

![StockGraph Banner](https://img.shields.io/badge/Status-Complete-emerald?style=for-the-badge)
![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776ab?style=for-the-badge&logo=python&logoColor=white)
![Node 18+](https://img.shields.io/badge/Node-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React Vite](https://img.shields.io/badge/React_18-Vite_TypeScript-61dafb?style=for-the-badge&logo=react&logoColor=black)

**StockGraph** is a full-stack, locally runnable web application and quantitative analytics platform. It ingests 5 years of daily S&P 500 trading data (2013–2018), builds high-dimensional correlation networks, detects unsupervised macroeconomic regimes via Gaussian Mixture Models (GMM), simulates multi-hop systemic financial shocks, and backtests network peer-momentum trading strategies with zero look-ahead bias.

Designed with a modern, high-density financial interface inspired by Zerodha Kite and Groww.

---

## 🚀 Quick Start (Localhost Only)

### Prerequisites
- **Python 3.10+** (Tested on Python 3.10.0)
- **Node.js 18+** (Tested on Node.js v24.12.0 / npm 11.6.2)

### 1-Click Launch Scripts

#### On Windows:
Double-click `run.bat` or run in Command Prompt / PowerShell:
```cmd
run.bat
```

#### On macOS / Linux:
```bash
chmod +x run.sh
./run.sh
```

The script will automatically:
1. Initialize a Python virtual environment (`.venv`) and install dependencies.
2. Check `data/processed/`; if not present, it runs the chunked data ingestion pipeline.
3. Start the FastAPI backend on **`http://127.0.0.1:8000`** (Interactive Swagger docs: **`http://127.0.0.1:8000/docs`**).
4. Install frontend dependencies and start Vite on **`http://localhost:5173`**.

---

## 📂 Project Architecture

```
stockgraph/
├── data/
│   ├── raw/
│   │   ├── prices.csv                  # 619,040 rows from Kaggle S&P 500
│   │   └── companies.csv               # Company & sector metadata
│   └── processed/
│       ├── ohlcv_long.parquet          # Cleaned multi-index OHLCV long table
│       ├── prices_wide.parquet         # (1259 dates × 482 tickers) wide close prices
│       ├── volume_wide.parquet         # (1259 dates × 482 tickers) wide volume
│       ├── returns_wide.parquet        # (1259 dates × 482 tickers) daily pct returns
│       ├── metadata.parquet            # Joined company, sector & market cap metadata
│       └── pipeline_report.json        # Step timings, memory RSS, and survivorship
├── backend/
│   ├── pipeline/
│   │   └── ingest.py                   # Chunked ETL pipeline (200k rows/chunk)
│   ├── app/
│   │   ├── main.py                     # FastAPI entry point, CORS & lifespan loader
│   │   ├── schemas.py                  # Pydantic request & response schemas
│   │   ├── dependencies.py             # Dependency injection providers
│   │   ├── services/
│   │   │   ├── data_loader.py          # In-memory singleton dataset manager
│   │   │   ├── analytics.py            # Sharpe, CAGR, Vol, Drawdown, Beta, RSI, MAs
│   │   │   ├── network.py              # NetworkX graph, centrality, greedy modularity
│   │   │   ├── contagion.py            # Multi-hop shock cascade propagation
│   │   │   ├── backtest.py             # Top-k neighbor peer momentum backtester
│   │   │   ├── regimes.py              # 3-Component GMM volatility & correlation
│   │   │   └── anomalies.py            # 3-sigma return shocks & 3x volume surges
│   │   └── routers/
│   │       ├── meta.py                 # GET /api/meta
│   │       ├── prices.py               # GET /api/prices/{ticker}?period=&compare=
│   │       ├── stocks.py               # GET /api/stocks, GET /api/stocks/{ticker}/analytics
│   │       ├── correlation.py          # GET /api/correlation
│   │       ├── network.py              # GET /api/network
│   │       ├── contagion.py            # POST /api/simulate/contagion
│   │       ├── backtest.py             # GET /api/backtest/neighbor-signal
│   │       ├── sectors.py              # GET /api/sectors
│   │       ├── regimes.py              # GET /api/regimes
│   │       └── anomalies.py            # GET /api/anomalies
│   ├── tests/
│   │   ├── test_analytics.py           # Unit tests for finance formulas
│   │   ├── test_backtest.py            # Zero look-ahead bias validation
│   │   ├── test_contagion.py           # Multi-hop cascade verification
│   │   └── test_api.py                 # TestClient tests for all endpoints
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── types/index.ts              # TypeScript interfaces
│   │   ├── theme.ts                    # Zerodha/Groww custom theme (Light & Dark)
│   │   ├── services/api.ts             # Axios API client
│   │   ├── components/
│   │   │   ├── Layout.tsx              # Application shell with responsive drawer
│   │   │   ├── NavigationRail.tsx      # Sidebar rail with navigation items
│   │   │   ├── TopBar.tsx              # Top bar with Ctrl+K trigger & theme toggle
│   │   │   ├── CommandPalette.tsx      # Global search modal (Ctrl/Cmd+K)
│   │   │   ├── MetricCard.tsx          # Stat KPI card with tooltips and trend badges
│   │   │   ├── SectorBadge.tsx         # Modern color-coded sector pill
│   │   │   ├── LoadingSkeleton.tsx     # Skeleton loading state
│   │   │   ├── EmptyState.tsx          # Empty state fallback
│   │   │   ├── ErrorAlert.tsx          # Error banner with retry trigger
│   │   │   └── ExportCsvButton.tsx     # 1-Click CSV export for chart tables
│   │   └── pages/
│   │       ├── Overview.tsx            # KPIs, Market chart, Gainers/Losers, Anomalies
│   │       ├── StockExplorer.tsx       # Watchlist, OHLCV, Comparisons, MAs, RSI
│   │       ├── CorrelationNetwork.tsx  # Vis-network graph, centrality, modularity
│   │       ├── ContagionSimulator.tsx  # Multi-hop cascades, sector drawdowns
│   │       ├── StrategyBacktester.tsx  # Quantitative backtest & drawdown curve
│   │       ├── SectorsRegimes.tsx      # Heatmap, rotation, GMM market regimes
│   │       └── DataPipeline.tsx        # Ingestion metrics, step benchmarks & table
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
│   └── METHODS.md                      # Comprehensive academic viva defense guide
├── run.bat                             # Windows runner
├── run.sh                              # Unix runner
└── README.md
```

---

## 📊 Application Pages Overview

| Page | Description | Core Capabilities |
| :--- | :--- | :--- |
| **Market Overview** | Executive summary dashboard | 4 key KPIs, Equal-Weighted S&P 500 Index interactive area chart, Top 5 Gainers & Losers, Real-time statistical anomaly feed. |
| **Stock Explorer** | Deep-dive individual stock terminal | Searchable watchlist, Period selectors (`1M`, `3M`, `6M`, `1Y`, `3Y`, `All`), Up to 4-ticker comparative overlay rebased to 100, 20 & 50-day Moving Averages, 14-day RSI sub-chart, Risk/Return profile cards, Top correlated peers panel. |
| **Correlation Network** | Interactive graph visualization | Rendered with `vis-network`. Node sizing by betweenness centrality, edge thickness by correlation, greedy modularity community clustering, sector and threshold filters, interactive hover and click inspection drawer. |
| **Contagion Simulator** | Systemic shock propagation model | Choose seed stock and shock size (e.g. -5%). Watch the shock cascade over 1 to 3 hops through correlation and beta channels. Includes hop-by-hop animation, sector vulnerability bar chart, and ranked impact table. |
| **Strategy Backtester** | Quantitative trading engine | Peer-momentum anomaly: long top quintile, short bottom quintile of top-$k$ correlated neighbors. Features **zero look-ahead bias guarantee**, turnover-adjusted transaction costs, dual equity and underwater drawdown charts. |
| **Sectors & Regimes** | Macro & industry dynamics | Full sector-to-sector correlation heatmap, sector rotation performance lines, and 3-component Gaussian Mixture Model (GMM) volatility & correlation regimes ("Calm", "Normal", "Stressed"). |
| **Data Pipeline** | Engineering & ETL transparency | Raw vs Cleaned row counts, 90% coverage survivorship reporting, dropped tickers breakdown (late IPOs), execution step timings bar chart, and live processed Parquet table preview. |

---

## 🔬 Analytical Methods Implemented

1. **Pearson Correlation:** Pairwise return co-movement on daily percentage returns.
2. **Dynamic Rolling Correlation:** Sliding 60-day window tracking non-stationary relationships.
3. **Capital Asset Pricing Model (CAPM) Beta:** Systematic risk elasticity $\beta = \text{Cov}(R_i, R_M) / \text{Var}(R_M)$ against equal-weight S&P 500 index.
4. **Jensen's Alpha:** Annualized risk-adjusted excess return $\alpha = R_i - (r_f + \beta(R_M - r_f))$.
5. **Compound Annual Growth Rate (CAGR):** Multi-year geometric annualized return.
6. **Annualized Volatility:** Sample standard deviation scaled by $\sqrt{252}$.
7. **Sharpe Ratio:** Risk-adjusted return metric $(R_{\text{ann}} - r_f) / \sigma_{\text{ann}}$.
8. **Maximum Drawdown:** Peak-to-trough worst-case wealth destruction percentage.
9. **Relative Strength Index (RSI):** 14-day Wilder's smoothed momentum oscillator ($0-100$).
10. **Network Centrality (Betweenness):** Measures systemic bridge nodes on shortest paths across the market graph.
11. **Community Detection (Greedy Modularity):** Clauset-Newman-Moore modularity maximization discovering real industrial groupings without labels.
12. **Gaussian Mixture Model (GMM):** Unsupervised 3-state clustering on 20-day rolling volatility and cross-stock correlation.
13. **Multi-Hop Contagion Cascade:** Epidemic shock propagation scaling by correlation, beta, and distance damping.
14. **Zero Look-Ahead Backtesting:** Rebalancing at day $t$ using signals and neighbor correlations estimated strictly on $[t-\text{lookback}, t-1]$.

*For mathematical derivations and viva preparation, see [docs/METHODS.md](docs/METHODS.md).*

---

## 📖 Glossary of Terms

- **CAGR:** Compound Annual Growth Rate; the annualized constant growth rate of an investment over multiple years.
- **Beta ($\beta$):** Measure of systematic risk indicating how volatile a stock is relative to the broad market.
- **Sharpe Ratio:** Return earned in excess of the risk-free rate per unit of volatility.
- **Max Drawdown:** The maximum percentage loss from a peak to a trough before a new peak is reached.
- **RSI:** Relative Strength Index; a technical momentum oscillator measuring the speed and change of price movements.
- **Betweenness Centrality:** In network theory, a measure of how often a node falls on the shortest path between other nodes.
- **Greedy Modularity:** An algorithm for finding community structure in complex networks by iteratively merging node pairs that produce the largest modularity increase.
- **GMM (Gaussian Mixture Model):** A probabilistic model that assumes data points are generated from a mixture of a finite number of Gaussian distributions with unknown parameters.
- **Look-Ahead Bias:** An error in backtesting where future data or outcomes are inadvertently used to make trading decisions in past periods.
- **Basis Points (bps):** A financial unit of measure equal to one one-hundredth of a percentage point ($1\text{ bps} = 0.01\% = 0.0001$).
- **Parquet:** An open-source, columnar storage file format optimized for fast query performance and high compression in big data systems.

---

## 🧪 Running Tests

The test suite validates financial analytics, backtester temporal integrity, multi-hop contagion logic, technical indicators (Bollinger Bands, MACD, RSI), live aggregation, and AI tool calling:

```bash
cd backend
python -m pytest tests -v
```

All 29 test cases pass with 100% mathematical ground-truth verification.

---

## ⚡ Real-Time Streaming & AI Intelligence Extension

StockGraph includes an institutional-grade live data streaming engine and an LLM research co-pilot:

### 1. Live Market Feed Engine (Alpaca IEX WebSocket)
- **Live Stream:** Connects to Alpaca's market data WebSocket feed (`wss://stream.data.alpaca.markets/v2/iex`) on the free tier.
- **In-Memory Candle Aggregation:** Assembles raw trades into 1-minute and 5-minute OHLCV candles in real-time.
- **Memory Protection:** Maintains a bounded circular deque buffer (`MAX_CANDLES_PER_SYMBOL = 2,000`) per stock.
- **Throttled Push Broadcast:** Server batches live updates into client frames at $\le 4$ fps ($\le 250$ ms) over WebSocket (`/api/live/stream`).
- **Graceful Reconnection:** Exponential backoff with jitter on disconnects, auth errors, or market closed conditions.
- **Zero-Dependency Historical Fallback:** If API keys are omitted or live mode is switched off, the application seamlessly uses the 2013-2018 historical dataset.

### 2. "Ask the Market" AI Research Panel (`Ctrl + J`)
- **Groq Tool Calling:** Powered by `qwen/qwen3.8-27b` via Groq's high-speed inference engine.
- **Strict Grounding:** The model calls internal quantitative tools (`get_analytics`, `get_network`, `run_contagion_simulation`, `run_backtest`, `get_regimes`, `get_anomalies`, `get_live_status`). It never invents numbers and cites the source tool for every metric.
- **6-Hour Cached Market Brief:** `GET /api/ai/brief` precomputes an institutional macro overview synthesizing current regimes, systemic bridge nodes, and recent anomalies.
- **Slide-Over Panel:** Triggerable anytime via `Ctrl + J` or the top bar "Ask AI" button with suggested quantitative questions.

### 3. Professional Candlestick Charts (Lightweight Charts v5)
- Located in the **Stock Explorer** under the **Candles (Pro)** tab.
- Sub-millisecond HTML5 Canvas rendering with synchronized volume histogram.
- Overlays: 20-day MA, 50-day MA, Bollinger Bands ($20, 2\sigma$), and dedicated sub-pane for 14-day RSI.
- Interactive Timeframe Switcher: `1D` (historical), `5m` (live), and `1m` (live).
- Crosshair hover with precise open, high, low, close, volume, and percentage change.
- Interactive annotations: left-click to add horizontal support/resistance price lines, right-click to remove.
- In-place `series.update()` for real-time live ticks without redrawing the chart.
- Virtualized S&P 500 Watchlist using `@tanstack/react-virtual` for 60fps scrolling across 482 stocks.

---

## 🔐 Environment Configuration (`.env`)

Create a `backend/.env` file (copied from `backend/.env.example`):

```bash
# Alpaca Markets Free Tier (Paper trading keys)
ALPACA_API_KEY=your_alpaca_key_here
ALPACA_API_SECRET=your_alpaca_secret_here
ALPACA_FEED=iex
LIVE_PROVIDER=alpaca

# Groq Cloud AI (Free tier API key)
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=qwen/qwen3.8-27b
```
*Note: Both keys are 100% free and paper-trading keys are supported.*

