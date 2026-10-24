export interface DateRange {
  start: string;
  end: string;
  total_trading_days: number;
}

export interface MetaResponse {
  dataset: string;
  source_badge: string;
  ticker_count: number;
  date_range: DateRange;
  sectors: string[];
  pipeline_report: {
    status: string;
    timestamp: string;
    rows_raw: number;
    rows_cleaned: number;
    tickers_raw: number;
    tickers_kept: number;
    tickers_dropped: number;
    dropped_tickers: string[];
    date_range: DateRange;
    sectors: string[];
    step_timings_seconds: Record<string, number>;
    memory_usage_mb: {
      peak_rss: number;
      current_rss: number;
    };
    files_generated: string[];
  };
  market_summary: {
    market_cagr: number;
    market_annualized_volatility: number;
    market_sharpe: number;
    total_trading_days: number;
    start_date: string;
    end_date: string;
  };
}

export interface StockSummary {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: number;
  latest_price: number;
  change_pct_1d: number;
}

export interface OHLCVRecord {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceComparisonSeries {
  dates: string[];
  target_ticker: string;
  series: Record<string, number[]>;
}

export interface PricesResponse {
  ticker: string;
  period: string;
  name: string;
  sector: string;
  records: OHLCVRecord[];
  comparison?: PriceComparisonSeries | null;
}

export interface MovingAverages {
  ma20: number | null;
  ma50: number | null;
  above_ma20: boolean | null;
  above_ma50: boolean | null;
}

export interface RSIData {
  current_rsi: number | null;
  status: string;
  history: Array<{ date: string; rsi: number }>;
}

export interface StockAnalyticsResponse {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: number;
  current_price: number;
  annualized_return: number;
  annualized_volatility: number;
  sharpe_ratio: number;
  risk_free_rate: number;
  max_drawdown: number;
  beta: number;
  alpha: number;
  rsi: RSIData;
  moving_averages: MovingAverages;
  total_trading_days: number;
  date_range: DateRange;
}

export interface CorrelationResponse {
  tickers: string[];
  window: number;
  matrix: number[][];
  rolling_pair?: {
    ticker1: string;
    ticker2: string;
    window: number;
    series: Array<{ date: string; correlation: number }>;
  } | null;
}

export interface NetworkNode {
  id: string;
  ticker: string;
  label: string;
  name: string;
  sector: string;
  degree: number;
  betweenness_centrality: number;
  community_id: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
}

export interface NetworkStats {
  density: number;
  average_clustering: number;
  num_communities: number;
  num_nodes: number;
  num_edges: number;
}

export interface NetworkResponse {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: NetworkStats;
  threshold: number;
  sector_filter: string;
}

export interface ContagionRequest {
  seed_ticker: string;
  shock: number;
  hops: number;
  threshold: number;
  damping: number;
}

export interface ImpactedStock {
  ticker: string;
  name: string;
  sector: string;
  total_impact_pct: number;
  hop_reached: number;
  correlation_to_seed: number;
  beta_to_seed: number;
}

export interface HopImpactDetail {
  hop: number;
  newly_affected_count: number;
  total_cumulative_impact: number;
  top_stocks: Array<{
    ticker: string;
    name: string;
    sector: string;
    hop_delta: number;
  }>;
}

export interface ContagionResponse {
  seed_ticker: string;
  seed_name: string;
  seed_sector: string;
  initial_shock: number;
  parameters: {
    hops: number;
    threshold: number;
    damping: number;
    total_stocks_impacted: number;
  };
  hop_details: HopImpactDetail[];
  ranked_impact: ImpactedStock[];
  sector_impact_summary: Array<{
    sector: string;
    affected_count: number;
    average_impact_pct: number;
    max_impact_pct: number;
  }>;
}

export interface BacktestMetrics {
  annualized_return: number;
  annualized_volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  hit_rate: number;
  total_return: number;
  total_trades: number;
  total_turnover: number;
  cost_drag_pct: number;
}

export interface BenchmarkMetrics {
  annualized_return: number;
  annualized_volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  total_return: number;
}

export interface EquityCurvePoint {
  date: string;
  strategy_equity: number;
  benchmark_equity: number;
  strategy_drawdown: number;
  benchmark_drawdown: number;
  daily_net_return: number;
}

export interface BacktestResponse {
  parameters: Record<string, any>;
  metrics: BacktestMetrics;
  benchmark_metrics: BenchmarkMetrics;
  equity_curve: EquityCurvePoint[];
  look_ahead_bias_guarantee: string;
}

export interface SectorMetric {
  sector: string;
  ticker_count: number;
  cumulative_return: number;
  annualized_return: number;
  annualized_volatility: number;
  sharpe_ratio: number;
}

export interface SectorsResponse {
  window: string;
  sectors: string[];
  sector_metrics: SectorMetric[];
  correlation_matrix: number[][];
  timeline: Array<Record<string, any>>;
}

export interface RegimePoint {
  date: string;
  market_price: number;
  market_return: number;
  rolling_vol: number;
  rolling_corr: number;
  regime: "Calm" | "Normal" | "Stressed";
  regime_id: number;
}

export interface RegimeStats {
  regime: string;
  days_count: number;
  percentage: number;
  avg_volatility: number;
  avg_correlation: number;
  avg_daily_return: number;
}

export interface RegimesResponse {
  current_regime: string;
  regime_stats: RegimeStats[];
  timeline: RegimePoint[];
}

export interface AnomalyRecord {
  date: string;
  ticker: string;
  name: string;
  sector: string;
  return_pct: number;
  z_score: number;
  volume: number;
  volume_ratio: number;
  anomaly_type: "Price Shock" | "Volume Spike" | "Dual Shock";
  severity: number;
}

export interface AnomaliesResponse {
  total_anomalies_found: number;
  limit: number;
  records: AnomalyRecord[];
}

export interface CandleRecord {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandlesResponse {
  ticker: string;
  name: string;
  sector: string;
  timeframe: string;
  period: string;
  count: number;
  candles: CandleRecord[];
}

export interface IndicatorsResponse {
  ticker: string;
  period: string;
  dates: string[];
  indicators: {
    ma20?: (number | null)[];
    ma50?: (number | null)[];
    bb?: {
      middle: (number | null)[];
      upper: (number | null)[];
      lower: (number | null)[];
      bandwidth: (number | null)[];
      percent_b: (number | null)[];
    };
    macd?: {
      macd: (number | null)[];
      signal: (number | null)[];
      histogram: (number | null)[];
    };
    rsi?: (number | null)[];
  };
}

export interface LiveStatusResponse {
  status: 'connected' | 'reconnecting' | 'disconnected' | 'auth_error' | 'disabled';
  market_status: 'open' | 'pre_market' | 'after_hours' | 'closed';
  provider: string;
  feed: string;
  last_tick_time: string | null;
  subscribed_symbols_count: number;
  subscribed_symbols: string[];
  messages_per_second: number;
  total_messages_received: number;
  buffered_symbols_count: number;
  error: string | null;
}

export interface LiveTick {
  type: 'trade' | 'bar';
  ticker: string;
  price: number;
  size?: number;
  volume?: number;
  timestamp: string;
}

export interface AIBriefResponse {
  brief: string;
  cached_at: string;
  expires_at: string;
}

export interface AIExplainRequest {
  chart_type: string;
  data_summary: Record<string, any>;
}

export interface AIExplainResponse {
  chart_type: string;
  explanation: string;
}


