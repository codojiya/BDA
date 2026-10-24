import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  MenuItem,
  InputAdornment,
  ButtonGroup,
  Button,
  FormControlLabel,
  Switch,
  Chip,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Autocomplete,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Sliders,
  BarChart2,
  Share2,
  CandlestickChart as CandleIcon,
  LineChart as LineIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useVirtualizer } from '@tanstack/react-virtual';

import { StockSummary, PricesResponse, StockAnalyticsResponse, LiveTick } from '../types';
import { fetchPrices, fetchStockAnalytics, fetchCorrelation, fetchCandles, fetchIndicators, fetchLiveCandles } from '../services/api';
import { SectorBadge } from '../components/SectorBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorAlert } from '../components/ErrorAlert';
import { ExportCsvButton } from '../components/ExportCsvButton';
import { CandleChart, CandleRecord } from '../components/CandleChart';

interface Props {
  stocks: StockSummary[];
  selectedTicker: string;
  onSelectStock: (ticker: string) => void;
  themeMode?: 'light' | 'dark';
  liveTick?: LiveTick | null;
  isLiveMode?: boolean;
  liveQuotes?: Record<string, { ticker: string; price: number; change_pct?: number; size?: number; time?: string; candle?: any }>;
}

const PERIODS = ['1M', '3M', '6M', '1Y', '3Y', 'All'];
const COMPARE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const StockExplorer: React.FC<Props> = ({
  stocks,
  selectedTicker,
  onSelectStock,
  themeMode = 'light',
  liveTick,
  isLiveMode = false,
  liveQuotes = {},
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [period, setPeriod] = useState('1Y');
  const [compareTickers, setCompareTickers] = useState<string[]>([]);
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showRSI, setShowRSI] = useState(true);

  const [pricesData, setPricesData] = useState<PricesResponse | null>(null);
  const [analytics, setAnalytics] = useState<StockAnalyticsResponse | null>(null);
  const [neighbors, setNeighbors] = useState<Array<{ ticker: string; name: string; sector: string; corr: number }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New: Chart Tab (0 = Line, 1 = Candlesticks)
  const [chartTab, setChartTab] = useState<number>(isLiveMode ? 1 : 0);
  const [candleTimeframe, setCandleTimeframe] = useState<'1m' | '5m' | '1D'>('1D');
  const [candleRecords, setCandleRecords] = useState<CandleRecord[]>([]);
  const [indicatorsData, setIndicatorsData] = useState<any | null>(null);
  const [candleLoading, setCandleLoading] = useState<boolean>(false);

  // Auto-switch to Candlestick 1m live view when Live Feed is toggled ON
  useEffect(() => {
    if (isLiveMode) {
      setChartTab(1);
      setCandleTimeframe('1m');
    }
  }, [isLiveMode]);

  // Ref for virtualized watchlist
  const listParentRef = useRef<HTMLDivElement>(null);

  // Load stock details whenever selectedTicker, period, or compareTickers change
  useEffect(() => {
    const loadStockDetails = async () => {
      if (!selectedTicker) return;
      try {
        setLoading(true);
        const compareParam = compareTickers.length > 0 ? compareTickers.join(',') : undefined;

        const [pData, aData] = await Promise.all([
          fetchPrices(selectedTicker, period, compareParam),
          fetchStockAnalytics(selectedTicker, 0.02),
        ]);

        setPricesData(pData);
        setAnalytics(aData);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load stock details', err);
        setError(err?.message || 'Failed to fetch stock price history.');
      } finally {
        setLoading(false);
      }
    };

    loadStockDetails();
  }, [selectedTicker, period, compareTickers]);

  // Load candlestick data and indicators
  useEffect(() => {
    const loadCandlesAndIndicators = async () => {
      if (!selectedTicker) return;
      try {
        setCandleLoading(true);
        if (candleTimeframe === '1D') {
          const [cRes, indRes] = await Promise.all([
            fetchCandles(selectedTicker, '1D', period),
            fetchIndicators(selectedTicker, 'ma20,ma50,bb,rsi,macd', period),
          ]);
          const rawCandles = Array.isArray(cRes) ? cRes : (cRes?.candles || []);
          setCandleRecords(rawCandles);
          setIndicatorsData({
            dates: indRes?.dates || [],
            ma20: indRes?.indicators?.ma20,
            ma50: indRes?.indicators?.ma50,
            bb: indRes?.indicators?.bb,
            rsi: indRes?.indicators?.rsi,
            macd: indRes?.indicators?.macd,
          });
        } else {
          // Live 1m or 5m
          const liveCandles = await fetchLiveCandles(selectedTicker, candleTimeframe);
          const rawLive = Array.isArray(liveCandles) ? liveCandles : ((liveCandles as any)?.candles || []);
          if (rawLive.length === 0) {
            // Fallback to historical daily candles if live session has no bars yet
            const cRes = await fetchCandles(selectedTicker, '1D', period);
            setCandleRecords(Array.isArray(cRes) ? cRes : (cRes?.candles || []));
          } else {
            setCandleRecords(rawLive);
          }
          setIndicatorsData(null);
        }
      } catch (err) {
        console.error('Failed to load candle or indicator data', err);
      } finally {
        setCandleLoading(false);
      }
    };

    loadCandlesAndIndicators();
  }, [selectedTicker, period, candleTimeframe]);

  // Derive live tick candle update if active
  const activeLiveCandle: CandleRecord | null = useMemo(() => {
    if (!liveTick || liveTick.ticker !== selectedTicker) return null;
    return {
      time: liveTick.timestamp || new Date().toISOString(),
      open: liveTick.price,
      high: liveTick.price,
      low: liveTick.price,
      close: liveTick.price,
      volume: liveTick.volume || 100,
    };
  }, [liveTick, selectedTicker]);

  // Load top correlated neighbors for the selected stock
  useEffect(() => {
    const loadNeighbors = async () => {
      if (!selectedTicker || stocks.length === 0) return;
      try {
        // Pick top 25 liquid stocks to find top peers
        const candidateTickers = [
          selectedTicker,
          ...stocks.filter((s) => s.ticker !== selectedTicker).slice(0, 25).map((s) => s.ticker),
        ];

        const corrRes = await fetchCorrelation(candidateTickers, 60);
        const targetIdx = corrRes.tickers.indexOf(selectedTicker);

        if (targetIdx !== -1) {
          const row = corrRes.matrix[targetIdx];
          const scored = corrRes.tickers
            .map((t, idx) => {
              const stockMeta = stocks.find((s) => s.ticker === t);
              return {
                ticker: t,
                name: stockMeta?.name || t,
                sector: stockMeta?.sector || 'Other',
                corr: row[idx],
              };
            })
            .filter((item) => item.ticker !== selectedTicker)
            .sort((a, b) => b.corr - a.corr)
            .slice(0, 5);

          setNeighbors(scored);
        }
      } catch (err) {
        console.error('Error fetching correlated neighbors', err);
      }
    };

    loadNeighbors();
  }, [selectedTicker, stocks]);

  // Filter watchlist stocks
  const filteredStocks = stocks.filter((s) => {
    const matchesSearch =
      s.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = sectorFilter === 'All' || s.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  // TanStack Virtualizer for 60fps scrolling across 500+ stocks
  const rowVirtualizer = useVirtualizer({
    count: filteredStocks.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 58,
    overscan: 5,
  });

  const sectorsList = ['All', ...Array.from(new Set(stocks.map((s) => s.sector))).filter(Boolean)];

  // Prepare chart data with moving averages or comparison series
  const chartData = React.useMemo(() => {
    if (!pricesData) return [];

    // If comparing multiple stocks, use comparison rebased series
    if (pricesData.comparison) {
      const dates = pricesData.comparison.dates;
      const series = pricesData.comparison.series;
      return dates.map((date, idx) => {
        const point: Record<string, any> = { date };
        for (const [t, vals] of Object.entries(series)) {
          point[t] = vals[idx];
        }
        return point;
      });
    }

    // Otherwise, single stock with moving averages
    const raw = pricesData.records;
    const closes = raw.map((r) => r.close);

    return raw.map((r, idx) => {
      // Calculate 20 MA and 50 MA on the fly for chart slice
      let ma20 = null;
      if (idx >= 19) {
        const sum20 = closes.slice(idx - 19, idx + 1).reduce((a, b) => a + b, 0);
        ma20 = Number((sum20 / 20).toFixed(2));
      }

      let ma50 = null;
      if (idx >= 49) {
        const sum50 = closes.slice(idx - 49, idx + 1).reduce((a, b) => a + b, 0);
        ma50 = Number((sum50 / 50).toFixed(2));
      }

      return {
        date: r.date,
        close: r.close,
        open: r.open,
        high: r.high,
        low: r.low,
        volume: r.volume,
        ma20,
        ma50,
      };
    });
  }, [pricesData]);

  const activeStock = stocks.find((s) => s.ticker === selectedTicker) || {
    ticker: selectedTicker,
    name: pricesData?.name || selectedTicker,
    sector: pricesData?.sector || 'Other',
    industry: 'Other',
    market_cap: 0,
    latest_price: pricesData?.records?.slice(-1)[0]?.close || 0,
    change_pct_1d: 0,
  };

  return (
    <Grid container spacing={3}>
      {/* Left Column: Watchlist sidebar */}
      <Grid item xs={12} md={4} lg={3.5}>
        <Card sx={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 2, pb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              S&P 500 Watchlist
            </Typography>

            <TextField
              size="small"
              fullWidth
              placeholder="Search ticker or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color="#9ca3af" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1.5 }}
            />

            <TextField
              select
              size="small"
              fullWidth
              label="Filter by Sector"
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
            >
              {sectorsList.map((sec) => (
                <MenuItem key={sec} value={sec} sx={{ fontSize: '0.85rem' }}>
                  {sec}
                </MenuItem>
              ))}
            </TextField>
          </CardContent>

          <Divider />

          {/* Virtualized Watchlist with 60fps performance */}
          <Box ref={listParentRef} sx={{ flex: 1, overflowY: 'auto', p: 1, position: 'relative' }}>
            <Box
              sx={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const stock = filteredStocks[virtualRow.index];
                if (!stock) return null;
                const isSelected = stock.ticker === selectedTicker;
                return (
                  <Box
                    key={stock.ticker}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      px: 0.5,
                      boxSizing: 'border-box',
                    }}
                  >
                    <ListItemButton
                      onClick={() => onSelectStock(stock.ticker)}
                      sx={{
                        borderRadius: 2,
                        height: '100%',
                        py: 0.5,
                        px: 1.5,
                        backgroundColor: isSelected
                          ? (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(37, 99, 235, 0.2)'
                                : 'rgba(37, 99, 235, 0.1)'
                          : 'transparent',
                        border: isSelected ? '1px solid rgba(37, 99, 235, 0.4)' : '1px solid transparent',
                        '&:hover': {
                          backgroundColor: (theme) =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.03)',
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                                {stock.ticker}
                              </Typography>
                              {liveQuotes[stock.ticker] && (
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }} />
                              )}
                            </Box>
                            <Typography
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                color: liveQuotes[stock.ticker] ? 'success.main' : 'inherit',
                              }}
                            >
                              ${(liveQuotes[stock.ticker]?.price ?? stock.latest_price).toFixed(2)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.2 }}>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 120 }}>
                              {stock.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: stock.change_pct_1d >= 0 ? 'success.main' : 'error.main',
                              }}
                            >
                              {liveQuotes[stock.ticker] ? 'LIVE IEX' : (stock.change_pct_1d >= 0 ? `+${stock.change_pct_1d}%` : `${stock.change_pct_1d}%`)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Card>
      </Grid>

      {/* Right Column: Chart, Indicators, Analytics & Neighbors */}
      <Grid item xs={12} md={8} lg={8.5}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {error && <ErrorAlert error={error} />}

          {/* Stock Header Card */}
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {activeStock.ticker}
                    </Typography>
                    <SectorBadge sector={activeStock.sector} size="medium" />
                    {liveQuotes[activeStock.ticker] && (
                      <Chip label="LIVE" size="small" color="success" sx={{ height: 22, fontSize: '0.68rem', fontWeight: 800 }} />
                    )}
                  </Box>
                  <Typography variant="body1" color="text.secondary">
                    {activeStock.name}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      color: liveQuotes[activeStock.ticker] ? 'success.main' : 'inherit',
                    }}
                  >
                    ${(liveQuotes[activeStock.ticker]?.price ?? activeStock.latest_price).toFixed(2)}
                  </Typography>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    {liveQuotes[activeStock.ticker] ? (
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Real-time IEX Tick • {liveQuotes[activeStock.ticker]?.time?.split('T')[1]?.slice(0, 8) || 'Streaming'}
                      </Typography>
                    ) : (
                      <>
                        {activeStock.change_pct_1d >= 0 ? (
                          <TrendingUp size={16} color="#10b981" />
                        ) : (
                          <TrendingDown size={16} color="#f43f5e" />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: activeStock.change_pct_1d >= 0 ? 'success.main' : 'error.main',
                          }}
                        >
                          {activeStock.change_pct_1d >= 0 ? `+${activeStock.change_pct_1d}%` : `${activeStock.change_pct_1d}%`}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Controls bar: Periods, Compare, Indicators, Export */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <ButtonGroup size="small" variant="outlined">
                  {PERIODS.map((p) => (
                    <Button
                      key={p}
                      variant={period === p ? 'contained' : 'outlined'}
                      onClick={() => setPeriod(p)}
                      sx={{ fontWeight: 600, fontSize: '0.78rem' }}
                    >
                      {p}
                    </Button>
                  ))}
                </ButtonGroup>

                {/* Compare tickers input */}
                <Box sx={{ minWidth: 220 }}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={stocks.filter((s) => s.ticker !== selectedTicker).map((s) => s.ticker)}
                    value={compareTickers}
                    onChange={(_, newVal) => {
                      if (newVal.length <= 4) setCompareTickers(newVal);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} placeholder={compareTickers.length === 0 ? "Compare (up to 4)..." : ""} />
                    )}
                  />
                </Box>

                {/* Technical Toggles */}
                {compareTickers.length === 0 && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControlLabel
                      control={<Switch size="small" checked={showMA20} onChange={(e) => setShowMA20(e.target.checked)} />}
                      label={<Typography variant="caption" sx={{ fontWeight: 600, color: '#f59e0b' }}>20 MA</Typography>}
                    />
                    <FormControlLabel
                      control={<Switch size="small" checked={showMA50} onChange={(e) => setShowMA50(e.target.checked)} />}
                      label={<Typography variant="caption" sx={{ fontWeight: 600, color: '#ec4899' }}>50 MA</Typography>}
                    />
                    <FormControlLabel
                      control={<Switch size="small" checked={showRSI} onChange={(e) => setShowRSI(e.target.checked)} />}
                      label={<Typography variant="caption" sx={{ fontWeight: 600, color: '#8b5cf6' }}>RSI</Typography>}
                    />
                  </Box>
                )}

                <ExportCsvButton
                  data={pricesData?.records || []}
                  filename={`${selectedTicker}_ohlcv_${period}`}
                  label="Export OHLCV"
                />
              </Box>
            </CardContent>
          </Card>

          {/* Main Price Chart */}
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              {/* Chart Mode Tab Switcher */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                  pb: 1,
                }}
              >
                <Tabs
                  value={chartTab}
                  onChange={(_, val) => setChartTab(val)}
                  sx={{ minHeight: 36 }}
                >
                  <Tab
                    icon={<LineIcon size={16} />}
                    iconPosition="start"
                    label="Line Chart"
                    sx={{ minHeight: 36, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                  />
                  <Tab
                    icon={<CandleIcon size={16} />}
                    iconPosition="start"
                    label="Candles (Pro)"
                    sx={{ minHeight: 36, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                  />
                </Tabs>

                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {chartTab === 0
                    ? compareTickers.length > 0
                      ? `Relative Performance (Rebased to 100 on ${chartData[0]?.date || ''})`
                      : `${selectedTicker} Price History ($)`
                    : `${selectedTicker} Candlesticks • High-Performance Canvas`}
                </Typography>
              </Box>

              {chartTab === 0 ? (
                <>
                  {loading ? (
                    <LoadingSkeleton height={320} />
                  ) : (
                    <Box sx={{ width: '100%', height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={35} />
                          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.92)',
                              borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#ffffff',
                              fontSize: '0.8rem',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: 8 }} />

                          {compareTickers.length > 0 ? (
                            [selectedTicker, ...compareTickers].map((t, idx) => (
                              <Line
                                key={t}
                                type="monotone"
                                dataKey={t}
                                stroke={COMPARE_COLORS[idx % COMPARE_COLORS.length]}
                                strokeWidth={2}
                                dot={false}
                              />
                            ))
                          ) : (
                            <>
                              <Line
                                type="monotone"
                                dataKey="close"
                                name={`${selectedTicker} Close`}
                                stroke="#2563eb"
                                strokeWidth={2.5}
                                dot={false}
                              />
                              {showMA20 && (
                                <Line
                                  type="monotone"
                                  dataKey="ma20"
                                  name="20-Day MA"
                                  stroke="#f59e0b"
                                  strokeWidth={1.5}
                                  strokeDasharray="4 4"
                                  dot={false}
                                />
                              )}
                              {showMA50 && (
                                <Line
                                  type="monotone"
                                  dataKey="ma50"
                                  name="50-Day MA"
                                  stroke="#ec4899"
                                  strokeWidth={1.5}
                                  strokeDasharray="4 4"
                                  dot={false}
                                />
                              )}
                            </>
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  )}

                  {/* Sub-Chart: 14-day RSI */}
                  {showRSI && compareTickers.length === 0 && analytics?.rsi?.history && (
                    <Box sx={{ mt: 3, pt: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          14-DAY RELATIVE STRENGTH INDEX (RSI) • Current: {analytics.rsi.current_rsi} ({analytics.rsi.status})
                        </Typography>
                      </Box>
                      <Box sx={{ width: '100%', height: 110 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analytics.rsi.history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="2 2" opacity={0.1} />
                            <XAxis dataKey="date" hide />
                            <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fontSize: 9 }} />
                            <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" opacity={0.6} />
                            <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" opacity={0.6} />
                            <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  )}
                </>
              ) : (
                // TAB 1: Candlestick Chart with Volume, Bollinger Bands, Moving Averages, RSI pane
                <Box>
                  {candleLoading && candleRecords.length === 0 ? (
                    <LoadingSkeleton height={460} />
                  ) : (
                    <CandleChart
                      ticker={selectedTicker}
                      data={candleRecords}
                      indicators={indicatorsData}
                      liveCandle={activeLiveCandle}
                      timeframe={candleTimeframe}
                      onTimeframeChange={(tf) => setCandleTimeframe(tf)}
                      themeMode={themeMode}
                      height={460}
                    />
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Analytics Cards & Correlated Neighbors Grid */}
          <Grid container spacing={2.5}>
            {/* Analytics Metrics */}
            <Grid item xs={12} lg={7}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Quantitative Risk & Return Profile
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">
                        CAGR (Annualized)
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: (analytics?.annualized_return || 0) >= 0 ? 'success.main' : 'error.main' }}>
                        {analytics?.annualized_return}%
                      </Typography>
                    </Grid>

                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">
                        Annualized Volatility
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {analytics?.annualized_volatility}%
                      </Typography>
                    </Grid>

                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">
                        Sharpe Ratio (Rf=2%)
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {analytics?.sharpe_ratio}
                      </Typography>
                    </Grid>

                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">
                        Max Drawdown
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                        {analytics?.max_drawdown}%
                      </Typography>
                    </Grid>

                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">
                        Market Beta (Equal-Weight)
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {analytics?.beta}x
                      </Typography>
                    </Grid>

                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">
                        Jensen's Alpha
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: (analytics?.alpha || 0) >= 0 ? 'success.main' : 'error.main' }}>
                        {analytics?.alpha}%
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Correlated Neighbors Panel */}
            <Grid item xs={12} lg={5}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Top Correlated Peers
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Trailing 60-day Pearson correlation
                      </Typography>
                    </Box>
                    <Share2 size={16} color="#3b82f6" />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                    {neighbors.map((peer) => (
                      <Box
                        key={peer.ticker}
                        sx={{
                          p: 1.2,
                          borderRadius: 2,
                          backgroundColor: (theme) =>
                            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: (theme) =>
                              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                          },
                        }}
                        onClick={() => onSelectStock(peer.ticker)}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {peer.ticker}
                            </Typography>
                            <SectorBadge sector={peer.sector} size="small" />
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            ρ = {peer.corr.toFixed(2)}
                          </Typography>
                        </Box>

                        <LinearProgress
                          variant="determinate"
                          value={Math.max(0, peer.corr * 100)}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Grid>
    </Grid>
  );
};
