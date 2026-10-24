import React, { useState, useEffect } from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Calendar,
  Zap,
  Info,
  Wifi,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';

import { MetaResponse, StockSummary, AnomalyRecord, RegimePoint } from '../types';
import { fetchRegimes, fetchAnomalies } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { SectorBadge } from '../components/SectorBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorAlert } from '../components/ErrorAlert';
import { ExportCsvButton } from '../components/ExportCsvButton';

interface Props {
  meta: MetaResponse | null;
  stocks: StockSummary[];
  onSelectStock: (ticker: string) => void;
  onNavigate: (page: string) => void;
  isLiveMode?: boolean;
  liveQuotes?: Record<string, { ticker: string; price: number; change_pct?: number; size?: number; time?: string; candle?: any }>;
}

export const Overview: React.FC<Props> = ({
  meta,
  stocks,
  onSelectStock,
  onNavigate,
  isLiveMode = false,
  liveQuotes = {},
}) => {
  const [regimes, setRegimes] = useState<RegimePoint[]>([]);
  const [currentRegime, setCurrentRegime] = useState<string>('Normal');
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        setLoading(true);
        const [regimesData, anomaliesData] = await Promise.all([
          fetchRegimes(),
          fetchAnomalies(25),
        ]);
        setRegimes(regimesData.timeline);
        setCurrentRegime(regimesData.current_regime);
        setAnomalies(anomaliesData.records);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load overview data', err);
        setError(err?.message || 'Failed to load market overview.');
      } finally {
        setLoading(false);
      }
    };

    loadOverviewData();
  }, []);

  // Top gainers and losers from stocks watchlist
  const sortedByChange = [...stocks].sort((a, b) => b.change_pct_1d - a.change_pct_1d);
  const topGainers = sortedByChange.slice(0, 5);
  const topLosers = [...sortedByChange].reverse().slice(0, 5);

  // Sample market chart data for smooth rendering
  const marketChartData = regimes.filter((_, idx) => idx % 2 === 0);

  const getRegimeColor = (regime: string) => {
    if (regime === 'Calm') return 'success.main';
    if (regime === 'Stressed') return 'error.main';
    return 'warning.main';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <ErrorAlert error={error} />}

      {/* Top Header Banner */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              S&P 500 Market Overview
            </Typography>
            {isLiveMode && (
              <Chip
                icon={<Wifi size={13} color="#10b981" />}
                label="LIVE STREAM ACTIVE"
                size="small"
                color="success"
                sx={{ fontWeight: 800, fontSize: '0.7rem' }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            Cross-sectional network topology, macroeconomic regime dynamics, and real-time anomaly feeds.
          </Typography>
        </Box>
        {meta && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <ExportCsvButton
              data={marketChartData}
              filename="sp500_market_index_timeline"
              label="Export Market Index"
            />
          </Box>
        )}
      </Box>

      {/* Live Market Streaming Active Banner & Real-Time Ticker Strip */}
      {isLiveMode && (
        <Card
          sx={{
            p: 2.5,
            border: '1px solid rgba(16, 185, 129, 0.4)',
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)', opacity: 1 },
                    '50%': { transform: 'scale(1.4)', opacity: 0.5 },
                    '100%': { transform: 'scale(1)', opacity: 1 },
                  },
                }}
              />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'success.main', letterSpacing: '-0.01em' }}>
                REAL-TIME STREAMING ACTIVE • ALPACA IEX FEED
              </Typography>
              <Chip
                label={`${Object.keys(liveQuotes).length > 0 ? Object.keys(liveQuotes).length : 20} Active Symbols`}
                size="small"
                color="success"
                sx={{ fontWeight: 700, fontSize: '0.72rem' }}
              />
            </Box>

            <Button
              variant="contained"
              size="small"
              color="success"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const activeLiveSyms = Object.keys(liveQuotes);
                const targetTicker = activeLiveSyms.length > 0 ? activeLiveSyms[0] : 'AAPL';
                onSelectStock(targetTicker);
                onNavigate('explorer');
              }}
              endIcon={<ArrowRight size={16} />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                borderRadius: 2,
                px: 2,
                cursor: 'pointer',
                zIndex: 2,
              }}
            >
              Open Live Candlestick Terminal (1m/5m)
            </Button>
          </Box>

          {/* Real-time Ticker Grid showing live ticks */}
          <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 0.5 }}>
            {['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'SPY', 'JPM'].map((sym) => {
              const live = liveQuotes[sym];
              const staticStock = stocks.find((s) => s.ticker === sym);
              const displayPrice = live ? live.price : staticStock?.latest_price || 0;
              const hasLiveTick = Boolean(live);

              return (
                <Card
                  key={sym}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectStock(sym);
                    onNavigate('explorer');
                  }}
                  sx={{
                    minWidth: 140,
                    p: 1.5,
                    cursor: 'pointer',
                    borderRadius: 2,
                    border: hasLiveTick ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                    backgroundColor: (theme) =>
                      hasLiveTick
                        ? theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)'
                        : theme.palette.mode === 'dark' ? '#111827' : '#ffffff',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{sym}</Typography>
                    {hasLiveTick ? (
                      <Chip label="LIVE" size="small" color="success" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800 }} />
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>waiting tick</Typography>
                    )}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem', color: hasLiveTick ? 'success.main' : 'text.primary' }}>
                    ${displayPrice.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                    {hasLiveTick && live?.time ? `Tick: ${live.time.split('T')[1]?.slice(0, 8) || 'Just now'}` : 'Click for 1m chart'}
                  </Typography>
                </Card>
              );
            })}
          </Box>
        </Card>
      )}

      {/* KPI Cards Row */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          {loading || !meta ? (
            <LoadingSkeleton type="card" />
          ) : (
            <MetricCard
              title="TOTAL TICKERS"
              value={meta.ticker_count}
              subtitle="Cleaned S&P 500 Universe"
              tooltip="Total surviving stocks with ≥ 90% trading history coverage"
              icon={<Layers size={18} />}
            />
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {loading || !meta ? (
            <LoadingSkeleton type="card" />
          ) : (
            <MetricCard
              title="TRADING DAYS"
              value={meta.date_range.total_trading_days.toLocaleString()}
              subtitle={`${meta.date_range.start} to ${meta.date_range.end}`}
              tooltip="Full trading calendar spanning 5 complete years"
              icon={<Calendar size={18} />}
            />
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {loading || !meta ? (
            <LoadingSkeleton type="card" />
          ) : (
            <MetricCard
              title="MARKET CAGR"
              value={`${meta.market_summary.market_cagr}%`}
              change={meta.market_summary.market_cagr}
              subtitle={`Annualized Vol: ${meta.market_summary.market_annualized_volatility}%`}
              tooltip="Compound Annual Growth Rate of equal-weighted S&P 500 index"
              icon={<TrendingUp size={18} />}
            />
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          {loading ? (
            <LoadingSkeleton type="card" />
          ) : (
            <MetricCard
              title="CURRENT REGIME"
              value={currentRegime}
              subtitle="3-Component GMM Model"
              tooltip="Fitted on 20-day market volatility & pairwise correlation"
              icon={<Activity size={18} color={getRegimeColor(currentRegime)} />}
            />
          )}
        </Grid>
      </Grid>

      {/* Market Index Chart */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Equal-Weighted S&P 500 Index History
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cumulative portfolio compounding starting at 100.0 (2013 - 2018)
              </Typography>
            </Box>
            <Chip
              label={`Sharpe: ${meta?.market_summary.market_sharpe || '1.15'}`}
              size="small"
              sx={{ fontWeight: 600, backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'primary.main' }}
            />
          </Box>

          {loading ? (
            <LoadingSkeleton height={320} />
          ) : (
            <Box sx={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={marketChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="marketGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={8} minTickGap={40} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.92)',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                    }}
                    formatter={(val: any) => [`${Number(val).toFixed(2)} pts`, 'Market Index']}
                  />
                  <Area
                    type="monotone"
                    dataKey="market_price"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#marketGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Gainers / Losers + Anomaly Feed Grid */}
      <Grid container spacing={3}>
        {/* Top Gainers & Losers */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Market Movers (1-Day)
                </Typography>
                <Tabs
                  value={tabValue}
                  onChange={(_, val) => setTabValue(val)}
                  sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, px: 2, fontSize: '0.78rem' } }}
                >
                  <Tab label="Gainers" />
                  <Tab label="Losers" />
                </Tabs>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Stock</TableCell>
                      <TableCell>Sector</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(tabValue === 0 ? topGainers : topLosers).map((stock) => (
                      <TableRow
                        key={stock.ticker}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          onSelectStock(stock.ticker);
                          onNavigate('explorer');
                        }}
                      >
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {stock.ticker}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 140, display: 'block' }}>
                            {stock.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <SectorBadge sector={stock.sector} size="small" />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          ${stock.latest_price.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${stock.change_pct_1d >= 0 ? '+' : ''}${stock.change_pct_1d}%`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              height: 22,
                              backgroundColor:
                                stock.change_pct_1d >= 0
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : 'rgba(244, 63, 94, 0.12)',
                              color: stock.change_pct_1d >= 0 ? 'success.main' : 'error.main',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Anomaly Feed */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Recent Anomaly Feed
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    3-Sigma return shocks & 3x volume surges
                  </Typography>
                </Box>
                <Chip
                  icon={<Zap size={13} color="#f59e0b" />}
                  label="Statistical Outliers"
                  size="small"
                  sx={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'warning.main', fontWeight: 600 }}
                />
              </Box>

              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Stock</TableCell>
                      <TableCell>Anomaly</TableCell>
                      <TableCell align="right">Severity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {anomalies.slice(0, 7).map((anom, idx) => (
                      <TableRow
                        key={`${anom.ticker}-${anom.date}-${idx}`}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          onSelectStock(anom.ticker);
                          onNavigate('explorer');
                        }}
                      >
                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                          {anom.date}
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {anom.ticker}
                          </Typography>
                          <SectorBadge sector={anom.sector} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={anom.anomaly_type}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              backgroundColor:
                                anom.anomaly_type === 'Dual Shock'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : anom.anomaly_type === 'Price Shock'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(59, 130, 246, 0.15)',
                              color:
                                anom.anomaly_type === 'Dual Shock'
                                  ? 'error.main'
                                  : anom.anomaly_type === 'Price Shock'
                                  ? 'warning.main'
                                  : 'primary.main',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {anom.severity}x
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {anom.return_pct >= 0 ? `+${anom.return_pct}%` : `${anom.return_pct}%`}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
