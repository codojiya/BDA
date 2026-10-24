import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, ButtonGroup, Button, FormControlLabel, Checkbox, Tooltip, Chip } from '@mui/material';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  CandlestickData,
  HistogramData,
  LineData,
  LineStyle,
  IPriceLine,
  ColorType,
  Time,
  LineWidth,
} from 'lightweight-charts';

export interface CandleRecord {
  time: string; // "YYYY-MM-DD" or timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndicatorPayload {
  dates: string[];
  ma20?: (number | null)[];
  ma50?: (number | null)[];
  bb?: {
    middle: (number | null)[];
    upper: (number | null)[];
    lower: (number | null)[];
  };
  rsi?: (number | null)[];
  macd?: {
    macd: (number | null)[];
    signal: (number | null)[];
    histogram: (number | null)[];
  };
}

interface Props {
  ticker: string;
  data: CandleRecord[];
  indicators?: IndicatorPayload | null;
  liveCandle?: CandleRecord | null;
  timeframe: '1m' | '5m' | '1D';
  onTimeframeChange: (tf: '1m' | '5m' | '1D') => void;
  themeMode?: 'light' | 'dark';
  height?: number;
}

export const CandleChart: React.FC<Props> = ({
  ticker,
  data,
  indicators,
  liveCandle,
  timeframe,
  onTimeframeChange,
  themeMode = 'light',
  height = 480,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Overlay series refs
  const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // User horizontal price lines
  const priceLinesRef = useRef<IPriceLine[]>([]);

  // Toggles for overlays
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showBB, setShowBB] = useState(false);
  const [showRSI, setShowRSI] = useState(false);

  // Crosshair readout
  const [readout, setReadout] = useState<{
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
    change?: number;
    time?: string;
  } | null>(null);

  const isDark = themeMode === 'dark';

  // Initialize and mount chart
  useEffect(() => {
    if (!containerRef.current) return;

    const initialWidth = containerRef.current.clientWidth > 0
      ? containerRef.current.clientWidth
      : (containerRef.current.parentElement?.clientWidth || 800);

    const chart = createChart(containerRef.current, {
      width: initialWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0b0f19' : '#ffffff' },
        textColor: isDark ? '#9ca3af' : '#475569',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' },
        horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          color: isDark ? '#4b5563' : '#94a3b8',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: isDark ? '#4b5563' : '#94a3b8',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25, // Leaves bottom 25% for volume histogram
        },
      },
      timeScale: {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        timeVisible: timeframe !== '1D',
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // 1. Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });
    candleSeriesRef.current = candleSeries;

    // 2. Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Separate scale
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // volume at bottom 20%
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // 3. Technical overlays
    const ma20 = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, title: 'MA20' });
    const ma50 = chart.addSeries(LineSeries, { color: '#ec4899', lineWidth: 2, title: 'MA50' });
    const bbUp = chart.addSeries(LineSeries, { color: 'rgba(59, 130, 246, 0.7)', lineWidth: 1, lineStyle: LineStyle.Dotted, title: 'BB Up' });
    const bbMid = chart.addSeries(LineSeries, { color: 'rgba(59, 130, 246, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Mid' });
    const bbLow = chart.addSeries(LineSeries, { color: 'rgba(59, 130, 246, 0.7)', lineWidth: 1, lineStyle: LineStyle.Dotted, title: 'BB Low' });

    ma20SeriesRef.current = ma20;
    ma50SeriesRef.current = ma50;
    bbUpperSeriesRef.current = bbUp;
    bbMiddleSeriesRef.current = bbMid;
    bbLowerSeriesRef.current = bbLow;

    // 4. RSI sub-pane series
    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#8b5cf6',
      lineWidth: 2,
      priceScaleId: 'rsi_scale',
      title: 'RSI(14)',
    });
    rsiSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.75, bottom: 0.05 },
    });
    rsiSeriesRef.current = rsiSeries;

    // Crosshair listener for real-time OHLCV readout
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setReadout(null);
        return;
      }
      const cData = param.seriesData.get(candleSeries) as any;
      const vData = param.seriesData.get(volumeSeries) as any;
      if (cData) {
        const change = cData.open ? ((cData.close - cData.open) / cData.open) * 100 : 0;
        setReadout({
          open: cData.open,
          high: cData.high,
          low: cData.low,
          close: cData.close,
          volume: vData?.value || 0,
          change: Number(change.toFixed(2)),
          time: String(param.time),
        });
      }
    });

    // ResizeObserver to guarantee the chart always matches the container width
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const w = Math.floor(entries[0].contentRect.width);
      if (w > 0 && chartRef.current) {
        chartRef.current.applyOptions({ width: w });
        try {
          chartRef.current.timeScale().fitContent();
        } catch (_) {}
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) {
          chartRef.current.applyOptions({ width: w });
        }
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ma20SeriesRef.current = null;
      ma50SeriesRef.current = null;
      bbUpperSeriesRef.current = null;
      bbMiddleSeriesRef.current = null;
      bbLowerSeriesRef.current = null;
      rsiSeriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, [themeMode, timeframe, height]);

  // Safe time formatting helper for Lightweight Charts (supports YYYY-MM-DD for 1D and Unix seconds for intraday)
  const formatChartTime = (timeVal: string | number | undefined, tf: '1m' | '5m' | '1D'): Time | null => {
    if (!timeVal) return null;
    if (tf === '1D') {
      if (typeof timeVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(timeVal)) {
        return timeVal as Time;
      }
      const d = new Date(timeVal);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0] as Time;
      }
      return String(timeVal) as Time;
    }

    // For intraday (1m, 5m), convert to numeric Unix seconds
    if (typeof timeVal === 'number') {
      return (timeVal > 1e11 ? Math.floor(timeVal / 1000) : Math.floor(timeVal)) as Time;
    }
    const d = new Date(timeVal);
    if (!isNaN(d.getTime())) {
      return Math.floor(d.getTime() / 1000) as Time;
    }
    return null;
  };

  // Set historical / initial data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const safeData = Array.isArray(data) ? data : [];
    if (safeData.length === 0) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      return;
    }

    // Format candlestick data: sort ascending by time
    const sortedData = [...safeData].sort((a, b) => {
      const tA = typeof a.time === 'number' ? a.time : new Date(a.time).getTime();
      const tB = typeof b.time === 'number' ? b.time : new Date(b.time).getTime();
      return tA - tB;
    });

    const uniqueCandles: CandlestickData<Time>[] = [];
    const uniqueVolumes: HistogramData<Time>[] = [];
    let prevTime: any = null;

    for (const d of sortedData) {
      const t = formatChartTime(d.time, timeframe);
      if (!t || t === prevTime) continue;
      prevTime = t;

      uniqueCandles.push({
        time: t,
        open: Number(d.open),
        high: Number(d.high),
        low: Number(d.low),
        close: Number(d.close),
      });

      uniqueVolumes.push({
        time: t,
        value: Number(d.volume || 0),
        color: Number(d.close) >= Number(d.open) ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
      });
    }

    try {
      candleSeriesRef.current.setData(uniqueCandles);
      volumeSeriesRef.current.setData(uniqueVolumes);
    } catch (err) {
      console.warn('[CandleChart] Error setting candle series data:', err);
    }

    // Apply indicators if available
    if (indicators && Array.isArray(indicators.dates)) {
      const dates = indicators.dates;

      const formatLine = (vals?: (number | null)[]): LineData<Time>[] => {
        if (!vals || !Array.isArray(vals)) return [];
        const res: LineData<Time>[] = [];
        for (let i = 0; i < dates.length; i++) {
          const v = vals[i];
          if (v !== null && v !== undefined && !isNaN(Number(v))) {
            const t = formatChartTime(dates[i], timeframe);
            if (t) {
              res.push({ time: t, value: Number(v) });
            }
          }
        }
        return res;
      };

      try {
        if (ma20SeriesRef.current) {
          ma20SeriesRef.current.setData(showMA20 ? formatLine(indicators.ma20) : []);
        }
        if (ma50SeriesRef.current) {
          ma50SeriesRef.current.setData(showMA50 ? formatLine(indicators.ma50) : []);
        }
        if (bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
          bbUpperSeriesRef.current.setData(showBB && indicators.bb ? formatLine(indicators.bb.upper) : []);
          bbMiddleSeriesRef.current.setData(showBB && indicators.bb ? formatLine(indicators.bb.middle) : []);
          bbLowerSeriesRef.current.setData(showBB && indicators.bb ? formatLine(indicators.bb.lower) : []);
        }
        if (rsiSeriesRef.current) {
          rsiSeriesRef.current.setData(showRSI ? formatLine(indicators.rsi) : []);
        }
      } catch (err) {
        console.warn('[CandleChart] Error setting indicator series data:', err);
      }
    }

    // Auto-fit content
    if (chartRef.current && uniqueCandles.length > 0) {
      try {
        chartRef.current.timeScale().fitContent();
      } catch (err) {
        // ignore
      }
      requestAnimationFrame(() => {
        try {
          chartRef.current?.timeScale().fitContent();
        } catch (_) {}
      });
    }
  }, [data, indicators, showMA20, showMA50, showBB, showRSI, timeframe]);

  // In-place update when live candle tick arrives (DO NOT RECREATE CHART)
  useEffect(() => {
    if (!liveCandle || !candleSeriesRef.current || !volumeSeriesRef.current) return;

    try {
      const candleTime = formatChartTime(liveCandle.time, timeframe);
      if (!candleTime) return;

      candleSeriesRef.current.update({
        time: candleTime,
        open: Number(liveCandle.open),
        high: Number(liveCandle.high),
        low: Number(liveCandle.low),
        close: Number(liveCandle.close),
      });

      volumeSeriesRef.current.update({
        time: candleTime,
        value: Number(liveCandle.volume || 0),
        color: Number(liveCandle.close) >= Number(liveCandle.open) ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
      });
    } catch (err) {
      console.warn('[CandleChart] Live candle update skipped (out of order or duplicate time):', err);
    }
  }, [liveCandle, timeframe]);

  // Click to add horizontal price line, right-click to remove
  const handleChartClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!candleSeriesRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const price = candleSeriesRef.current.coordinateToPrice(y);

    if (price !== null) {
      const line = candleSeriesRef.current.createPriceLine({
        price: Number(price.toFixed(2)),
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `$${price.toFixed(2)}`,
      });
      priceLinesRef.current.push(line);
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!candleSeriesRef.current) return;
    // Remove the most recently added price line
    const lastLine = priceLinesRef.current.pop();
    if (lastLine) {
      candleSeriesRef.current.removePriceLine(lastLine);
    }
  }, []);

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Top Controls Bar: Timeframes, Indicator Toggles, Readout */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
          p: 1.5,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
        }}
      >
        {/* Timeframe Switcher */}
        <ButtonGroup size="small" variant="outlined">
          <Button
            variant={timeframe === '1D' ? 'contained' : 'outlined'}
            onClick={() => onTimeframeChange('1D')}
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          >
            1D (Hist)
          </Button>
          <Button
            variant={timeframe === '5m' ? 'contained' : 'outlined'}
            onClick={() => onTimeframeChange('5m')}
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          >
            5m (Live)
          </Button>
          <Button
            variant={timeframe === '1m' ? 'contained' : 'outlined'}
            onClick={() => onTimeframeChange('1m')}
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          >
            1m (Live)
          </Button>
        </ButtonGroup>

        {/* Indicators checklist */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControlLabel
            control={<Checkbox size="small" checked={showMA20} onChange={(e) => setShowMA20(e.target.checked)} sx={{ color: '#f59e0b', '&.Mui-checked': { color: '#f59e0b' } }} />}
            label={<Typography variant="caption" sx={{ fontWeight: 600, color: '#f59e0b' }}>MA20</Typography>}
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={showMA50} onChange={(e) => setShowMA50(e.target.checked)} sx={{ color: '#ec4899', '&.Mui-checked': { color: '#ec4899' } }} />}
            label={<Typography variant="caption" sx={{ fontWeight: 600, color: '#ec4899' }}>MA50</Typography>}
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={showBB} onChange={(e) => setShowBB(e.target.checked)} sx={{ color: '#3b82f6', '&.Mui-checked': { color: '#3b82f6' } }} />}
            label={<Typography variant="caption" sx={{ fontWeight: 600, color: '#3b82f6' }}>Bollinger (20,2σ)</Typography>}
          />
          <FormControlLabel
            control={<Checkbox size="small" checked={showRSI} onChange={(e) => setShowRSI(e.target.checked)} sx={{ color: '#8b5cf6', '&.Mui-checked': { color: '#8b5cf6' } }} />}
            label={<Typography variant="caption" sx={{ fontWeight: 600, color: '#8b5cf6' }}>RSI(14)</Typography>}
          />
        </Box>

        {/* Annotation instruction badge */}
        <Tooltip title="Left-click chart to add horizontal support/resistance line. Right-click to remove line." arrow>
          <Chip label="Click: +Line • Right-Click: -Line" size="small" sx={{ fontSize: '0.68rem', cursor: 'help' }} />
        </Tooltip>
      </Box>

      {/* Crosshair Readout Bar */}
      <Box
        sx={{
          px: 2,
          py: 0.8,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#0b0f19' : '#f8fafc'),
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          minHeight: 34,
          overflowX: 'auto',
        }}
      >
        {readout ? (
          <>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              {readout.time}
            </Typography>
            <Typography variant="caption">
              O: <b>${readout.open?.toFixed(2)}</b>
            </Typography>
            <Typography variant="caption">
              H: <b>${readout.high?.toFixed(2)}</b>
            </Typography>
            <Typography variant="caption">
              L: <b>${readout.low?.toFixed(2)}</b>
            </Typography>
            <Typography variant="caption">
              C: <b>${readout.close?.toFixed(2)}</b>
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: (readout.change || 0) >= 0 ? 'success.main' : 'error.main',
              }}
            >
              {(readout.change || 0) >= 0 ? `+${readout.change}%` : `${readout.change}%`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Vol: {readout.volume?.toLocaleString()}
            </Typography>
          </>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Hover over chart for crosshair OHLCV details • {ticker} ({timeframe})
          </Typography>
        )}
      </Box>

      {/* Empty State Overlay if no candles are present */}
      {(!data || data.length === 0) && (
        <Box
          sx={{
            position: 'absolute',
            top: 96,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(11,15,25,0.85)' : 'rgba(255,255,255,0.85)',
            zIndex: 10,
            backdropFilter: 'blur(3px)',
            gap: 1.5,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            No candles currently buffered for {ticker} ({timeframe}).
          </Typography>
          <Button
            variant="contained"
            size="small"
            color="primary"
            onClick={() => onTimeframeChange('1D')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Switch to 1D Historical Candlesticks
          </Button>
        </Box>
      )}

      {/* Lightweight Charts Canvas Container */}
      <Box
        ref={containerRef}
        onClick={handleChartClick}
        onContextMenu={handleContextMenu}
        sx={{ width: '100%', height: height, cursor: 'crosshair' }}
      />
    </Box>
  );
};
