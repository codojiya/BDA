import os
import json
import time
from typing import Dict, Any, List, Optional, AsyncGenerator
from dotenv import load_dotenv

load_dotenv()

from openai import OpenAI
from app.services.data_loader import DataLoader
from app.services.analytics import calculate_cagr, calculate_annualized_volatility, calculate_sharpe_ratio, calculate_drawdown_series, calculate_beta_and_alpha, calculate_rsi, calculate_moving_averages
from app.services.network import build_correlation_network
from app.services.contagion import run_contagion_simulation
from app.services.backtest import run_neighbor_signal_backtest
from app.services.regimes import compute_market_regimes
from app.services.anomalies import compute_market_anomalies
from app.services.live_feed import get_live_feed
from app.schemas import ContagionRequest

SYSTEM_PROMPT = """You are StockGraph AI, an expert quantitative finance assistant embedded in the StockGraph: Market Contagion Explorer platform.
You analyze S&P 500 equity networks, volatility regimes, systemic contagion cascades, and algorithmic backtests.

CRITICAL RULES:
1. Grounded Accuracy: Use tool results for EVERY number. NEVER invent prices, returns, ratios, or statistics.
2. Citation: Explicitly say which tool supplied each key number (e.g. "According to `get_analytics`...", "In `run_contagion_simulation`...").
3. Data Honesty: If the available data does not answer the question, state so clearly.
4. Temporal Distinction: Clearly distinguish between the Historical S&P 500 Dataset (2013-2018) and real-time Live Market Data.
5. Compliance & Ethics: Provide NO personalized investment advice. Always include a brief note that insights are strictly for quantitative research and educational exploration.
6. Tone: Crisp, mathematically precise, professional (comparable to institutional research like Two Sigma or AQR).
"""

TOOLS_SPEC = [
    {
        "type": "function",
        "function": {
            "name": "get_analytics",
            "description": "Fetch quantitative risk/return metrics for a stock (CAGR, volatility, Sharpe ratio, max drawdown, CAPM beta, alpha, RSI, moving averages).",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string", "description": "Stock ticker symbol (e.g. AAPL, MSFT)"},
                    "risk_free_rate": {"type": "number", "description": "Annualized risk-free rate (default 0.02)"}
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_network",
            "description": "Fetch correlation network topology metrics (density, clustering, community clusters, and top central stocks by betweenness).",
            "parameters": {
                "type": "object",
                "properties": {
                    "threshold": {"type": "number", "description": "Correlation threshold 0.3 to 0.85 (default 0.6)"},
                    "sector": {"type": "string", "description": "Sector filter or 'All'"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_contagion_simulation",
            "description": "Simulate systemic shock propagation cascading through correlation channels over up to 3 hops.",
            "parameters": {
                "type": "object",
                "properties": {
                    "seed_ticker": {"type": "string", "description": "Originating stock ticker (e.g. AAPL)"},
                    "shock": {"type": "number", "description": "Initial shock as decimal, e.g. -0.05 for -5%"}
                },
                "required": ["seed_ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_backtest",
            "description": "Run the zero look-ahead bias peer-momentum long-short backtest.",
            "parameters": {
                "type": "object",
                "properties": {
                    "k": {"type": "integer", "description": "Number of top-k correlated neighbors (default 5)"},
                    "lookback": {"type": "integer", "description": "Rolling lookback window in days (default 60)"},
                    "cost_bps": {"type": "number", "description": "Transaction cost in basis points (default 10)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_regimes",
            "description": "Get current macro market regime (Calm, Normal, Stressed) from 3-component Gaussian Mixture Model.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_anomalies",
            "description": "Fetch recent 3-sigma return shocks and 3x volume surges across S&P 500 stocks.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Number of anomalies to fetch (default 10)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_live_status",
            "description": "Check real-time WebSocket connection to Alpaca IEX market stream and market open/closed status.",
            "parameters": {"type": "object", "properties": {}}
        }
    }
]

# 6-Hour Market Brief Cache
_cached_brief: Optional[Dict[str, Any]] = None
_cached_brief_time: float = 0.0

class AIService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b").strip()
        self.base_url = "https://api.groq.com/openai/v1"
        self._client: Optional[OpenAI] = None

    def get_client(self) -> Optional[OpenAI]:
        if not self.api_key:
            self.api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not self.api_key:
            return None
        if self._client is None:
            self._client = OpenAI(base_url=self.base_url, api_key=self.api_key)
        return self._client

    def execute_tool(self, name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatch tool calls to internal backend analytical services."""
        loader = DataLoader.get_instance()
        
        try:
            if name == "get_analytics":
                ticker = args.get("ticker", "AAPL")
                rf = float(args.get("risk_free_rate", 0.02))
                vt = loader.validate_ticker(ticker)
                meta = loader.get_meta_for_ticker(vt)
                prices = loader.prices_wide[vt]
                returns = loader.returns_wide[vt]
                cagr = calculate_cagr(prices)
                vol = calculate_annualized_volatility(returns)
                sharpe = calculate_sharpe_ratio(cagr, vol, rf)
                max_dd, _ = calculate_drawdown_series(prices)
                beta, alpha = calculate_beta_and_alpha(returns, loader.market_returns, cagr, calculate_cagr(loader.market_index), rf)
                rsi_val, _ = calculate_rsi(prices, 14)
                return {
                    "tool": "get_analytics",
                    "ticker": vt,
                    "name": meta["name"],
                    "sector": meta["sector"],
                    "current_price": round(float(prices.iloc[-1]), 2),
                    "annualized_cagr": f"{round(cagr * 100, 2)}%",
                    "annualized_volatility": f"{round(vol * 100, 2)}%",
                    "sharpe_ratio": round(sharpe, 3),
                    "max_drawdown": f"{round(max_dd * 100, 2)}%",
                    "beta": round(beta, 3),
                    "alpha": f"{round(alpha * 100, 2)}%",
                    "rsi_14": round(rsi_val, 2)
                }

            elif name == "get_network":
                thresh = float(args.get("threshold", 0.6))
                sec = args.get("sector", "All")
                net = build_correlation_network(loader, threshold=thresh, sector=sec, limit=40)
                top_central = sorted(net.nodes, key=lambda n: n.betweenness_centrality, reverse=True)[:5]
                return {
                    "tool": "get_network",
                    "density": net.stats.density,
                    "clustering": net.stats.average_clustering,
                    "communities": net.stats.num_communities,
                    "nodes": net.stats.num_nodes,
                    "edges": net.stats.num_edges,
                    "top_central_bridge_stocks": [
                        {"ticker": n.ticker, "betweenness": n.betweenness_centrality, "sector": n.sector}
                        for n in top_central
                    ]
                }

            elif name == "run_contagion_simulation":
                seed = args.get("seed_ticker", "AAPL")
                shock = float(args.get("shock", -0.05))
                req = ContagionRequest(seed_ticker=seed, shock=shock, hops=3, threshold=0.35, damping=0.7)
                res = run_contagion_simulation(loader, req)
                return {
                    "tool": "run_contagion_simulation",
                    "seed": res.seed_ticker,
                    "initial_shock": f"{res.initial_shock}%",
                    "total_impacted_stocks": len(res.ranked_impact),
                    "top_impacted_peers": [
                        {"ticker": s.ticker, "sector": s.sector, "impact": f"{s.total_impact_pct}%", "hop": s.hop_reached}
                        for s in res.ranked_impact[:6]
                    ],
                    "worst_hit_sectors": res.sector_impact_summary[:3]
                }

            elif name == "run_backtest":
                k = int(args.get("k", 5))
                lb = int(args.get("lookback", 60))
                cost = float(args.get("cost_bps", 10.0))
                b_res = run_neighbor_signal_backtest(loader, k=k, lookback=lb, cost_bps=cost)
                return {
                    "tool": "run_backtest",
                    "strategy_sharpe": b_res.metrics.sharpe_ratio,
                    "strategy_return": f"{b_res.metrics.annualized_return}%",
                    "benchmark_sharpe": b_res.benchmark_metrics.sharpe_ratio,
                    "benchmark_return": f"{b_res.benchmark_metrics.annualized_return}%",
                    "hit_rate": f"{b_res.metrics.hit_rate}%",
                    "max_drawdown": f"{b_res.metrics.max_drawdown}%",
                    "cost_drag": f"{b_res.metrics.cost_drag_pct}%"
                }

            elif name == "get_regimes":
                reg = compute_market_regimes(loader)
                return {
                    "tool": "get_regimes",
                    "current_regime": reg.current_regime,
                    "regimes_summary": [
                        {"regime": s.regime, "pct_of_time": f"{s.percentage}%", "avg_vol": f"{s.avg_volatility}%", "avg_corr": s.avg_correlation}
                        for s in reg.regime_stats
                    ]
                }

            elif name == "get_anomalies":
                limit = int(args.get("limit", 10))
                anom = compute_market_anomalies(loader, limit=limit)
                return {
                    "tool": "get_anomalies",
                    "total_found": anom.total_anomalies_found,
                    "sample": [
                        {"date": a.date, "ticker": a.ticker, "type": a.anomaly_type, "return_pct": f"{a.return_pct}%", "severity": a.severity}
                        for a in anom.records[:limit]
                    ]
                }

            elif name == "get_live_status":
                feed = get_live_feed()
                st = feed.get_status()
                return {
                    "tool": "get_live_status",
                    "status": st["status"],
                    "market_open": st["market_open"],
                    "market_status": st["market_status"],
                    "msg_rate": f"{st['messages_per_sec']} msg/s",
                    "subscribed_count": st["subscribed_symbols_count"]
                }

            else:
                return {"error": f"Unknown tool '{name}'"}
        except Exception as e:
            return {"error": f"Error executing tool {name}: {str(e)}"}

    async def stream_chat(self, message: str, history: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Stream chat completions with tool-calling capabilities."""
        client = self.get_client()
        if not client:
            yield json.dumps({
                "type": "error",
                "message": "Groq API key not configured. Add GROQ_API_KEY=your_key in backend/.env to enable AI features."
            }) + "\n\n"
            return

        # Prepare messages array (limit history to last 10 messages)
        clean_history = history[-10:] if len(history) > 10 else history
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for m in clean_history:
            messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
        messages.append({"role": "user", "content": message})

        # Tool calling loop (up to 4 rounds)
        tools_used = []
        max_rounds = 4

        for _ in range(max_rounds):
            try:
                response = client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=TOOLS_SPEC,
                    tool_choice="auto",
                    temperature=0.2,
                )
            except Exception as e:
                yield json.dumps({"type": "error", "message": f"Groq API Error: {str(e)}"}) + "\n\n"
                return

            choice = response.choices[0]
            msg = choice.message

            # Check if model chose to invoke tools
            if msg.tool_calls:
                messages.append(msg)
                for tc in msg.tool_calls:
                    fname = tc.function.name
                    fargs = json.loads(tc.function.arguments) if tc.function.arguments else {}
                    tools_used.append(fname)
                    
                    # Notify frontend that tool was invoked
                    yield json.dumps({"type": "tool_call", "tool": fname, "args": fargs}) + "\n\n"
                    
                    # Execute tool
                    tool_result = self.execute_tool(fname, fargs)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "name": fname,
                        "content": json.dumps(tool_result)
                    })
            else:
                # No more tool calls, stream final answer or output content
                final_text = msg.content or ""
                yield json.dumps({
                    "type": "final_content",
                    "content": final_text,
                    "tools_used": list(set(tools_used))
                }) + "\n\n"
                return

        # Fallback if loop finishes without break
        yield json.dumps({
            "type": "final_content",
            "content": "Analysis completed. See data references above.",
            "tools_used": list(set(tools_used))
        }) + "\n\n"

    def explain_chart(self, chart_type: str, data_summary: Dict[str, Any]) -> str:
        """Generate a concise plain-English explanation of chart patterns."""
        client = self.get_client()
        if not client:
            return "Groq API key not configured in .env. Configure GROQ_API_KEY to receive real-time AI chart explanations."

        prompt = f"""Explain this quantitative chart for a student or financial analyst in 3 clear sentences:
Chart Type: {chart_type}
Data Snapshot: {json.dumps(data_summary)}

Highlight: 1) What the shape shows, 2) The primary risk or trend, 3) The practical takeaway."""

        try:
            resp = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=250
            )
            return resp.choices[0].message.content or "No explanation generated."
        except Exception as e:
            return f"Error generating chart explanation: {str(e)}"

    def get_market_brief(self) -> Dict[str, Any]:
        """Generate and cache 6-hour daily market brief."""
        global _cached_brief, _cached_brief_time
        now = time.time()
        
        # 6 hours = 21,600 seconds
        if _cached_brief and (now - _cached_brief_time < 21600):
            return _cached_brief

        loader = DataLoader.get_instance()
        reg = compute_market_regimes(loader)
        anom = compute_market_anomalies(loader, limit=5)
        net = build_correlation_network(loader, threshold=0.6, limit=40)
        top_central = sorted(net.nodes, key=lambda n: n.betweenness_centrality, reverse=True)[:3]

        client = self.get_client()
        if not client:
            brief_text = f"Market is currently in {reg.current_regime} regime. Top central hub stocks: {', '.join(n.ticker for n in top_central)}. {anom.total_anomalies_found} statistical anomalies flagged."
        else:
            prompt = f"""Synthesize a concise 4-sentence institutional executive market brief from these quantitative metrics:
- Current Regime: {reg.current_regime}
- Top Betweenness Centrality Hub Stocks: {', '.join(n.ticker for n in top_central)}
- Total Historical 3-Sigma Anomalies: {anom.total_anomalies_found}
- Top Recent Anomalies: {json.dumps([a.ticker for a in anom.records[:4]])}

Format cleanly with: Macro Regime, Systemic Bridge Nodes, and Outliers."""

            try:
                resp = client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=300
                )
                brief_text = resp.choices[0].message.content or "Market brief generated."
            except Exception as e:
                brief_text = f"Market in {reg.current_regime} regime with {len(top_central)} systemic bridge stocks. (Groq API note: {str(e)})"

        _cached_brief = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "current_regime": reg.current_regime,
            "top_bridge_stocks": [n.ticker for n in top_central],
            "brief": brief_text,
            "expires_in_hours": 6
        }
        _cached_brief_time = now
        return _cached_brief

def get_ai_service() -> AIService:
    return AIService()
