import axios from 'axios';
import {
  MetaResponse,
  StockSummary,
  PricesResponse,
  StockAnalyticsResponse,
  CorrelationResponse,
  NetworkResponse,
  ContagionRequest,
  ContagionResponse,
  BacktestResponse,
  SectorsResponse,
  RegimesResponse,
  AnomaliesResponse,
  CandlesResponse,
  IndicatorsResponse,
  LiveStatusResponse,
  CandleRecord,
  AIBriefResponse,
  AIExplainRequest,
  AIExplainResponse,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 45000,
});

export const fetchMeta = async (): Promise<MetaResponse> => {
  const { data } = await api.get<MetaResponse>('/meta');
  return data;
};

export const fetchStocks = async (sector?: string): Promise<StockSummary[]> => {
  const params = sector && sector !== 'All' ? { sector } : {};
  const { data } = await api.get<StockSummary[]>('/stocks', { params });
  return data;
};

export const fetchPrices = async (
  ticker: string,
  period: string = '1Y',
  compare?: string
): Promise<PricesResponse> => {
  const params: Record<string, string> = { period };
  if (compare) params.compare = compare;
  const { data } = await api.get<PricesResponse>(`/prices/${ticker}`, { params });
  return data;
};

export const fetchStockAnalytics = async (
  ticker: string,
  riskFreeRate: number = 0.02
): Promise<StockAnalyticsResponse> => {
  const { data } = await api.get<StockAnalyticsResponse>(`/stocks/${ticker}/analytics`, {
    params: { risk_free_rate: riskFreeRate },
  });
  return data;
};

export const fetchCorrelation = async (
  tickers?: string[],
  window: number = 60,
  pair?: string
): Promise<CorrelationResponse> => {
  const params: Record<string, any> = { window };
  if (tickers && tickers.length > 0) params.tickers = tickers.join(',');
  if (pair) params.pair = pair;
  const { data } = await api.get<CorrelationResponse>('/correlation', { params });
  return data;
};

export const fetchNetwork = async (
  threshold: number = 0.6,
  sector: string = 'All',
  limit: number = 80
): Promise<NetworkResponse> => {
  const { data } = await api.get<NetworkResponse>('/network', {
    params: { threshold, sector, limit },
  });
  return data;
};

export const simulateContagion = async (
  req: ContagionRequest
): Promise<ContagionResponse> => {
  const { data } = await api.post<ContagionResponse>('/simulate/contagion', req);
  return data;
};

export const fetchBacktest = async (
  k: number = 5,
  lookback: number = 60,
  costBps: number = 10
): Promise<BacktestResponse> => {
  const { data } = await api.get<BacktestResponse>('/backtest/neighbor-signal', {
    params: { k, lookback, cost_bps: costBps },
  });
  return data;
};

export const fetchSectors = async (window: string = '1Y'): Promise<SectorsResponse> => {
  const { data } = await api.get<SectorsResponse>('/sectors', { params: { window } });
  return data;
};

export const fetchRegimes = async (): Promise<RegimesResponse> => {
  const { data } = await api.get<RegimesResponse>('/regimes');
  return data;
};

export const fetchAnomalies = async (limit: number = 50): Promise<AnomaliesResponse> => {
  const { data } = await api.get<AnomaliesResponse>('/anomalies', { params: { limit } });
  return data;
};

export const fetchCandles = async (
  ticker: string,
  timeframe: string = '1D',
  period: string = '1Y'
): Promise<CandlesResponse> => {
  const { data } = await api.get<CandlesResponse>(`/candles/${ticker}`, {
    params: { timeframe, period },
  });
  return data;
};

export const fetchIndicators = async (
  ticker: string,
  names: string = 'ma20,ma50,bb,rsi,macd',
  period: string = '1Y'
): Promise<IndicatorsResponse> => {
  const { data } = await api.get<IndicatorsResponse>(`/indicators/${ticker}`, {
    params: { names, period },
  });
  return data;
};

export const fetchLiveStatus = async (): Promise<LiveStatusResponse> => {
  const { data } = await api.get<LiveStatusResponse>('/live/status');
  return data;
};

export const fetchLiveCandles = async (
  ticker: string,
  timeframe: string = '1m'
): Promise<CandleRecord[]> => {
  const { data } = await api.get<any>(`/live/candles/${ticker}`, {
    params: { timeframe },
  });
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.candles)) {
    return data.candles;
  }
  return [];
};

export const fetchAIBrief = async (): Promise<AIBriefResponse> => {
  const { data } = await api.get<AIBriefResponse>('/ai/brief');
  return data;
};

export const explainChart = async (
  req: AIExplainRequest
): Promise<AIExplainResponse> => {
  const { data } = await api.post<AIExplainResponse>('/ai/explain', req);
  return data;
};

export default api;

