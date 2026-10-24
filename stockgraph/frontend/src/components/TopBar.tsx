import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Button,
} from '@mui/material';
import {
  Sun,
  Moon,
  Search,
  Menu,
  Database,
  Radio,
  Sparkles,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { MetaResponse, LiveStatusResponse } from '../types';

interface Props {
  activePageTitle: string;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar?: () => void;
  meta: MetaResponse | null;
  liveStatus?: LiveStatusResponse | null;
  isLiveMode?: boolean;
  onToggleLiveMode?: () => void;
  onOpenAskDrawer?: () => void;
}

export const TopBar: React.FC<Props> = ({
  activePageTitle,
  themeMode,
  onToggleTheme,
  onOpenCommandPalette,
  onToggleSidebar,
  meta,
  liveStatus,
  isLiveMode = false,
  onToggleLiveMode,
  onOpenAskDrawer,
}) => {
  // Determine status color and text for the live pill
  const getLivePillInfo = () => {
    if (!isLiveMode) {
      return {
        label: 'Historical Mode',
        color: 'default',
        dotColor: '#94a3b8',
        tooltip: 'Click "Live Feed" button to start streaming real-time S&P 500 market data.',
      };
    }

    if (!liveStatus) {
      return {
        label: 'LIVE • CONNECTING...',
        color: 'warning',
        dotColor: '#f59e0b',
        tooltip: 'Connecting to real-time market data stream...',
      };
    }

    const st = String(liveStatus.status).toLowerCase();
    const isStreaming = st === 'streaming' || st === 'connected';

    if (isStreaming) {
      const isMarketOpen = Boolean((liveStatus as any).market_open || String(liveStatus.market_status).toLowerCase() === 'open');
      const rate = (liveStatus as any).messages_per_sec ?? liveStatus.messages_per_second ?? 0;
      return {
        label: `LIVE • ${(liveStatus.feed || 'IEX').toUpperCase()}`,
        color: 'success',
        dotColor: '#10b981',
        tooltip: `${(liveStatus.provider || 'Alpaca').toUpperCase()} IEX Stream • ${rate} msg/s • ${liveStatus.subscribed_symbols_count || 20} symbols • Market ${liveStatus.market_status || 'Open'}`,
      };
    }

    if (st === 'reconnecting') {
      return {
        label: 'Reconnecting...',
        color: 'warning',
        dotColor: '#f59e0b',
        tooltip: 'Reconnecting to Alpaca WebSocket stream with backoff...',
      };
    }

    if (st === 'auth_error') {
      return {
        label: 'Auth Error',
        color: 'error',
        dotColor: '#ef4444',
        tooltip: liveStatus.error || 'Check ALPACA_API_KEY and ALPACA_API_SECRET in backend/.env',
      };
    }

    return {
      label: 'LIVE • READY',
      color: 'success',
      dotColor: '#10b981',
      tooltip: 'Live streaming engine active.',
    };
  };

  const pill = getLivePillInfo();

  return (
    <Box
      sx={{
        height: 64,
        px: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? '#0e1320' : '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
      }}
    >
      {/* Left side: Mobile menu + Page Title + Data badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {onToggleSidebar && (
          <IconButton size="small" onClick={onToggleSidebar} sx={{ display: { md: 'none' } }}>
            <Menu size={20} />
          </IconButton>
        )}
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
          {activePageTitle}
        </Typography>

        {meta && (
          <Chip
            icon={<Radio size={12} color="#10b981" />}
            label={`${meta.ticker_count} Tickers • 2013-2018`}
            size="small"
            sx={{
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
              color: 'success.main',
              fontWeight: 600,
              fontSize: '0.72rem',
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          />
        )}

        {/* Live Status Indicator Pill */}
        <Tooltip title={pill.tooltip || ''} arrow>
          <Chip
            icon={
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: pill.dotColor,
                  animation: liveStatus?.status === 'connected' ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { opacity: 1, transform: 'scale(1)' },
                    '50%': { opacity: 0.4, transform: 'scale(1.2)' },
                    '100%': { opacity: 1, transform: 'scale(1)' },
                  },
                }}
              />
            }
            label={pill.label}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.7rem',
              backgroundColor: (theme) =>
                pill.color === 'success'
                  ? theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)'
                  : pill.color === 'warning'
                  ? theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'
                  : pill.color === 'error'
                  ? theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'
                  : theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              color:
                pill.color === 'success'
                  ? 'success.main'
                  : pill.color === 'warning'
                  ? 'warning.main'
                  : pill.color === 'error'
                  ? 'error.main'
                  : 'text.secondary',
              display: { xs: 'none', md: 'inline-flex' },
            }}
          />
        </Tooltip>
      </Box>

      {/* Right side: Live Toggle + Ask AI + Search Ctrl+K + Theme toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Live / Historical Toggle Button */}
        {onToggleLiveMode && (
          <Tooltip title={isLiveMode ? "Streaming active. Click to switch to Historical view." : "Click to enable Live Streaming mode"} arrow>
            <Button
              variant={isLiveMode ? "contained" : "outlined"}
              size="small"
              color={isLiveMode ? "success" : "inherit"}
              onClick={onToggleLiveMode}
              startIcon={isLiveMode ? <Wifi size={14} /> : <WifiOff size={14} />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                borderRadius: 2,
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            >
              {isLiveMode ? 'Live Feed ON' : 'Live Feed'}
            </Button>
          </Tooltip>
        )}

        {/* "Ask the Market" AI Drawer Trigger */}
        {onOpenAskDrawer && (
          <Button
            variant="outlined"
            size="small"
            color="primary"
            onClick={onOpenAskDrawer}
            startIcon={<Sparkles size={15} color="#8b5cf6" />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              borderRadius: 2,
              borderColor: 'rgba(139, 92, 246, 0.4)',
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.04)',
              '&:hover': {
                borderColor: '#8b5cf6',
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)',
              },
            }}
          >
            Ask AI
            <Chip
              label="Ctrl J"
              size="small"
              sx={{
                ml: 1,
                height: 18,
                fontSize: '0.62rem',
                fontWeight: 700,
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                color: '#8b5cf6',
                display: { xs: 'none', md: 'inline-flex' },
              }}
            />
          </Button>
        )}

        {/* Command palette search button */}
        <Button
          variant="outlined"
          size="small"
          onClick={onOpenCommandPalette}
          startIcon={<Search size={15} />}
          sx={{
            color: 'text.secondary',
            borderColor: (theme) => theme.palette.divider,
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            textTransform: 'none',
            fontSize: '0.8rem',
            fontWeight: 500,
            py: 0.6,
            px: 1.5,
            borderRadius: 2,
            minWidth: { xs: 'auto', sm: 200 },
            justifyContent: 'space-between',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Search stocks...
          </Box>
          <Chip
            label="Ctrl K"
            size="small"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 700,
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
            }}
          />
        </Button>

        {/* Source badge */}
        <Chip
          label="REAL S&P 500"
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: '0.68rem',
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.1)',
            color: 'primary.main',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            display: { xs: 'none', lg: 'inline-flex' },
          }}
        />

        {/* Dark / Light Mode Toggle */}
        <Tooltip title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`} arrow>
          <IconButton
            size="small"
            onClick={onToggleTheme}
            sx={{
              p: 1,
              borderRadius: 2,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              color: 'text.primary',
            }}
          >
            {themeMode === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

