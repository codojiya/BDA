from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field

# --- Common & Meta ---
class DateRange(BaseModel):
    start: str
    end: str
    total_trading_days: int

class MetaResponse(BaseModel):
    dataset: str = "S&P 500 Daily Market Data"
    source_badge: str = "real"
    ticker_count: int
    date_range: DateRange
    sectors: List[str]
    pipeline_report: Dict[str, Any]
    market_summary: Dict[str, Any]

# --- Prices & OHLCV ---
class OHLCVRecord(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class PriceComparisonSeries(BaseModel):
    dates: List[str]
    target_ticker: str
    series: Dict[str, List[Optional[float]]]

class PricesResponse(BaseModel):
    ticker: str
    period: str
    name: str
    sector: str
    records: List[OHLCVRecord]
    comparison: Optional[PriceComparisonSeries] = None

# --- Stock Analytics ---
class MovingAverages(BaseModel):
    ma20: Optional[float] = None
    ma50: Optional[float] = None
    above_ma20: Optional[bool] = None
    above_ma50: Optional[bool] = None

class RSIData(BaseModel):
    current_rsi: Optional[float] = None
    status: str # "Oversold", "Neutral", "Overbought"
    history: List[Dict[str, Union[str, float]]]

class StockAnalyticsResponse(BaseModel):
    ticker: str
    name: str
    sector: str
    industry: str
    market_cap: float
    current_price: float
    annualized_return: float
    annualized_volatility: float
    sharpe_ratio: float
    risk_free_rate: float
    max_drawdown: float
    beta: float
    alpha: float
    rsi: RSIData
    moving_averages: MovingAverages
    total_trading_days: int
    date_range: DateRange

# --- Correlation ---
class RollingPairPoint(BaseModel):
    date: str
    correlation: float

class CorrelationResponse(BaseModel):
    tickers: List[str]
    window: int
    matrix: List[List[float]]
    rolling_pair: Optional[Dict[str, Any]] = None

# --- Network ---
class NetworkNode(BaseModel):
    id: str
    ticker: str
    label: str
    name: str
    sector: str
    degree: int
    betweenness_centrality: float
    community_id: int

class NetworkEdge(BaseModel):
    source: str
    target: str
    weight: float

class NetworkStats(BaseModel):
    density: float
    average_clustering: float
    num_communities: int
    num_nodes: int
    num_edges: int

class NetworkResponse(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
    stats: NetworkStats
    threshold: float
    sector_filter: str

# --- Contagion Simulation ---
class ContagionRequest(BaseModel):
    seed_ticker: str = Field(..., description="Ticker symbol initiating the shock")
    shock: float = Field(-0.05, description="Initial percentage shock e.g. -0.05 for -5%")
    hops: int = Field(3, ge=1, le=4, description="Number of hops to propagate")
    threshold: float = Field(0.35, ge=0.1, le=0.9, description="Minimum correlation to propagate shock")
    damping: float = Field(0.70, ge=0.1, le=1.0, description="Damping decay factor per hop")

class ImpactedStock(BaseModel):
    ticker: str
    name: str
    sector: str
    total_impact_pct: float
    hop_reached: int
    correlation_to_seed: float
    beta_to_seed: float

class HopImpactDetail(BaseModel):
    hop: int
    newly_affected_count: int
    total_cumulative_impact: float
    top_stocks: List[Dict[str, Any]]

class ContagionResponse(BaseModel):
    seed_ticker: str
    seed_name: str
    seed_sector: str
    initial_shock: float
    parameters: Dict[str, Any]
    hop_details: List[HopImpactDetail]
    ranked_impact: List[ImpactedStock]
    sector_impact_summary: List[Dict[str, Any]]

# --- Backtest ---
class BacktestMetrics(BaseModel):
    annualized_return: float
    annualized_volatility: float
    sharpe_ratio: float
    max_drawdown: float
    hit_rate: float
    total_return: float
    total_trades: int
    total_turnover: float
    cost_drag_pct: float

class BenchmarkMetrics(BaseModel):
    annualized_return: float
    annualized_volatility: float
    sharpe_ratio: float
    max_drawdown: float
    total_return: float

class EquityCurvePoint(BaseModel):
    date: str
    strategy_equity: float
    benchmark_equity: float
    strategy_drawdown: float
    benchmark_drawdown: float
    daily_net_return: float

class BacktestResponse(BaseModel):
    parameters: Dict[str, Any]
    metrics: BacktestMetrics
    benchmark_metrics: BenchmarkMetrics
    equity_curve: List[EquityCurvePoint]
    look_ahead_bias_guarantee: str

# --- Sectors & Regimes ---
class SectorMetric(BaseModel):
    sector: str
    ticker_count: int
    cumulative_return: float
    annualized_return: float
    annualized_volatility: float
    sharpe_ratio: float

class SectorsResponse(BaseModel):
    window: str
    sectors: List[str]
    sector_metrics: List[SectorMetric]
    correlation_matrix: List[List[float]]
    timeline: List[Dict[str, Any]]

class RegimePoint(BaseModel):
    date: str
    market_price: float
    market_return: float
    rolling_vol: float
    rolling_corr: float
    regime: str # "Calm", "Normal", "Stressed"
    regime_id: int

class RegimeStats(BaseModel):
    regime: str
    days_count: int
    percentage: float
    avg_volatility: float
    avg_correlation: float
    avg_daily_return: float

class RegimesResponse(BaseModel):
    current_regime: str
    regime_stats: List[RegimeStats]
    timeline: List[RegimePoint]

# --- Anomalies ---
class AnomalyRecord(BaseModel):
    date: str
    ticker: str
    name: str
    sector: str
    return_pct: float
    z_score: float
    volume: int
    volume_ratio: float
    anomaly_type: str # "Price Shock", "Volume Spike", "Dual Shock"
    severity: float

class AnomaliesResponse(BaseModel):
    total_anomalies_found: int
    limit: int
    records: List[AnomalyRecord]
