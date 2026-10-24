# BDA - Big Data Analysis

## StockGraph: Market Contagion Explorer
*A Full-Stack Big Data Analysis Project for University Evaluation*

![Status](https://img.shields.io/badge/Status-Complete-emerald?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React_18-Vite_TypeScript-61dafb?style=for-the-badge&logo=react&logoColor=black)

**StockGraph** is a full-stack, locally runnable web application and quantitative analytics platform. It ingests 5 years of daily S&P 500 trading data (2013–2018), builds high-dimensional correlation networks, detects unsupervised macroeconomic regimes via Gaussian Mixture Models (GMM), simulates multi-hop systemic financial shocks, and backtests network peer-momentum trading strategies with zero look-ahead bias.

---

### 🚀 Quick Start (Localhost Only)

#### 1. Backend
```bash
cd stockgraph/backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation is available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### 2. Frontend
```bash
cd stockgraph/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Open your browser at: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

---

### 📂 Repository Structure
- `stockgraph/backend/`: FastAPI backend with data ingestion pipeline, analytics, quantitative network models, and real-time WebSocket feeds.
- `stockgraph/frontend/`: React 18, TypeScript, Material UI (MUI v5), and TradingView Lightweight Charts v5.
- `stockgraph/data/`: Processed Apache Parquet datasets and pipeline execution reports.
- `stockgraph/docs/`: Architecture diagrams, math documentation, and project reports.
