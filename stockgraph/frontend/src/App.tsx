import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { getAppTheme } from './theme';
import { Layout } from './components/Layout';
import { fetchMeta, fetchStocks, fetchLiveStatus } from './services/api';
import { MetaResponse, StockSummary, LiveStatusResponse, LiveTick } from './types';
import { LiveAnomalyAlert } from './components/LiveAlertToast';
import { LoadingSkeleton } from './components/LoadingSkeleton';

// Code-splitting & Lazy loaded pages
const Overview = lazy(() => import('./pages/Overview').then(m => ({ default: m.Overview })));
const StockExplorer = lazy(() => import('./pages/StockExplorer').then(m => ({ default: m.StockExplorer })));
const CorrelationNetwork = lazy(() => import('./pages/CorrelationNetwork').then(m => ({ default: m.CorrelationNetwork })));
const ContagionSimulator = lazy(() => import('./pages/ContagionSimulator').then(m => ({ default: m.ContagionSimulator })));
const StrategyBacktester = lazy(() => import('./pages/StrategyBacktester').then(m => ({ default: m.StrategyBacktester })));
const SectorsRegimes = lazy(() => import('./pages/SectorsRegimes').then(m => ({ default: m.SectorsRegimes })));
const DataPipeline = lazy(() => import('./pages/DataPipeline').then(m => ({ default: m.DataPipeline })));

export const App: React.FC = () => {
  // Theme state with localStorage persistence (default light)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('stockgraph_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [activePage, setActivePage] = useState<string>('overview');
  const [selectedTicker, setSelectedTicker] = useState<string>('AAPL');
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [stocks, setStocks] = useState<StockSummary[]>([]);

  // Live market streaming state
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [liveStatus, setLiveStatus] = useState<LiveStatusResponse | null>(null);
  const [latestLiveTick, setLatestLiveTick] = useState<LiveTick | null>(null);
  const [liveAlert, setLiveAlert] = useState<LiveAnomalyAlert | null>(null);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, { ticker: string; price: number; change_pct?: number; size?: number; time?: string; candle?: any }>>({});

  const wsRef = useRef<WebSocket | null>(null);

  // Toggle theme mode and persist
  const handleToggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('stockgraph_theme', next);
      return next;
    });
  };

  // Toggle live streaming mode
  const handleToggleLiveMode = () => {
    setIsLiveMode((prev) => !prev);
  };

  // Load global dataset meta and stock watchlist once on mount
  useEffect(() => {
    const initData = async () => {
      try {
        const [metaData, stocksData] = await Promise.all([
          fetchMeta(),
          fetchStocks(),
        ]);
        setMeta(metaData);
        setStocks(stocksData);
      } catch (err) {
        console.error('Error initializing app metadata', err);
      }
    };

    initData();
  }, []);

  // Poll live feed status periodically
  useEffect(() => {
    const checkLiveStatus = async () => {
      try {
        const st = await fetchLiveStatus();
        setLiveStatus(st);
      } catch (err) {
        // Backend live service may be offline/unconfigured
      }
    };

    checkLiveStatus();
    const timer = setInterval(checkLiveStatus, 10000);
    return () => clearInterval(timer);
  }, []);

  // WebSocket Live Stream connection when Live Mode is toggled ON
  useEffect(() => {
    if (!isLiveMode) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let isDisposed = false;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Connect directly to 127.0.0.1:8000 when running dev server
        const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '127.0.0.1:8000' : window.location.host;
        const wsUrl = `${protocol}//${host}/api/live/stream`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[LiveFeed] WebSocket connected to', wsUrl);
          // Subscribe to selected stock plus popular liquid core stocks
          const initialSymbols = Array.from(new Set([selectedTicker, 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'SPY']));
          ws?.send(JSON.stringify({ action: 'subscribe', tickers: initialSymbols }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const updates = data.updates || data.ticks || [];
            if (data.type === 'frame' && Array.isArray(updates)) {
              setLiveQuotes((prev) => {
                const next = { ...prev };
                for (const u of updates) {
                  if (u && u.ticker) {
                    next[u.ticker] = u;
                  }
                }
                return next;
              });

              for (const tick of updates) {
                if (tick.ticker === selectedTicker) {
                  setLatestLiveTick({
                    type: 'trade',
                    ticker: tick.ticker,
                    price: tick.price,
                    size: tick.size,
                    timestamp: tick.time || tick.timestamp || new Date().toISOString(),
                    volume: tick.candle?.volume || tick.size,
                  });
                }
                // Detect high-volume trades or price shocks for non-blocking live toast
                if (tick.size && tick.size >= 10000) {
                  setLiveAlert({
                    id: `${tick.ticker}-${Date.now()}`,
                    ticker: tick.ticker,
                    type: 'volume_spike',
                    message: `Block trade detected: ${tick.size.toLocaleString()} shares at $${Number(tick.price).toFixed(2)}`,
                    time: tick.time || tick.timestamp || new Date().toISOString(),
                  });
                }
              }
            }
          } catch (err) {
            console.error('Error handling WebSocket message', err);
          }
        };

        ws.onerror = (err) => {
          console.warn('[LiveFeed] WebSocket error', err);
        };

        ws.onclose = () => {
          if (!isDisposed && isLiveMode) {
            console.log('[LiveFeed] WebSocket closed, retrying in 3s...');
            reconnectTimer = setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        console.error('Failed to initiate live WebSocket connection', err);
      }
    };

    connect();

    return () => {
      isDisposed = true;
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [isLiveMode]);

  // Dynamically subscribe to newly selected ticker over WebSocket
  useEffect(() => {
    if (isLiveMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN && selectedTicker) {
      wsRef.current.send(JSON.stringify({ action: 'subscribe', tickers: [selectedTicker] }));
    }
  }, [selectedTicker, isLiveMode]);

  const theme = useMemo(() => getAppTheme(themeMode), [themeMode]);

  const renderActivePage = () => {
    switch (activePage) {
      case 'overview':
        return (
          <Overview
            meta={meta}
            stocks={stocks}
            onSelectStock={setSelectedTicker}
            onNavigate={setActivePage}
            isLiveMode={isLiveMode}
            liveQuotes={liveQuotes}
          />
        );
      case 'explorer':
        return (
          <StockExplorer
            stocks={stocks}
            selectedTicker={selectedTicker}
            onSelectStock={setSelectedTicker}
            themeMode={themeMode}
            liveTick={latestLiveTick}
            isLiveMode={isLiveMode}
            liveQuotes={liveQuotes}
          />
        );
      case 'network':
        return (
          <CorrelationNetwork
            onSelectStock={setSelectedTicker}
            onNavigate={setActivePage}
          />
        );
      case 'contagion':
        return (
          <ContagionSimulator
            stocks={stocks}
            defaultSeed={selectedTicker}
            onSelectStock={setSelectedTicker}
            onNavigate={setActivePage}
          />
        );
      case 'backtester':
        return <StrategyBacktester />;
      case 'sectors':
        return <SectorsRegimes />;
      case 'pipeline':
        return <DataPipeline meta={meta} />;
      default:
        return (
          <Overview
            meta={meta}
            stocks={stocks}
            onSelectStock={setSelectedTicker}
            onNavigate={setActivePage}
            isLiveMode={isLiveMode}
            liveQuotes={liveQuotes}
          />
        );
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout
        activePage={activePage}
        onNavigate={setActivePage}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        meta={meta}
        stocks={stocks}
        onSelectStock={setSelectedTicker}
        selectedTicker={selectedTicker}
        liveStatus={liveStatus}
        isLiveMode={isLiveMode}
        onToggleLiveMode={handleToggleLiveMode}
        liveAlert={liveAlert}
        onCloseLiveAlert={() => setLiveAlert(null)}
      >
        <Suspense fallback={<LoadingSkeleton height={500} />}>
          {renderActivePage()}
        </Suspense>
      </Layout>
    </ThemeProvider>
  );
};

export default App;

