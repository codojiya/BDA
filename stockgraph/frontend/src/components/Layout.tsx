import React, { useState, useEffect } from 'react';
import { Box, Drawer } from '@mui/material';
import { NavigationRail } from './NavigationRail';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { AskTheMarketDrawer } from './AskTheMarketDrawer';
import { LiveAlertToast, LiveAnomalyAlert } from './LiveAlertToast';
import { MetaResponse, StockSummary, LiveStatusResponse } from '../types';

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  meta: MetaResponse | null;
  stocks: StockSummary[];
  onSelectStock: (ticker: string) => void;
  selectedTicker?: string;
  liveStatus?: LiveStatusResponse | null;
  isLiveMode?: boolean;
  onToggleLiveMode?: () => void;
  liveAlert?: LiveAnomalyAlert | null;
  onCloseLiveAlert?: () => void;
  children: React.ReactNode;
}

const PAGE_TITLES: Record<string, string> = {
  overview: 'Market Overview',
  explorer: 'Stock Explorer',
  network: 'Correlation Network',
  contagion: 'Contagion Simulator',
  backtester: 'Strategy Backtester',
  sectors: 'Sectors & Regimes',
  pipeline: 'Data Pipeline',
};

export const Layout: React.FC<Props> = ({
  activePage,
  onNavigate,
  themeMode,
  onToggleTheme,
  meta,
  stocks,
  onSelectStock,
  selectedTicker,
  liveStatus,
  isLiveMode = false,
  onToggleLiveMode,
  liveAlert,
  onCloseLiveAlert,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [askDrawerOpen, setAskDrawerOpen] = useState(false);

  // Global Keyboard shortcuts: Ctrl+K (Command palette) and Ctrl+J (Ask AI)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setAskDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Desktop Navigation Rail */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
        <NavigationRail activePage={activePage} onNavigate={onNavigate} />
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        <NavigationRail
          activePage={activePage}
          onNavigate={(page) => {
            onNavigate(page);
            setMobileOpen(false);
          }}
        />
      </Drawer>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        <TopBar
          activePageTitle={PAGE_TITLES[activePage] || 'StockGraph'}
          themeMode={themeMode}
          onToggleTheme={onToggleTheme}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onToggleSidebar={handleDrawerToggle}
          meta={meta}
          liveStatus={liveStatus}
          isLiveMode={isLiveMode}
          onToggleLiveMode={onToggleLiveMode}
          onOpenAskDrawer={() => setAskDrawerOpen(true)}
        />

        <Box sx={{ flex: 1, p: { xs: 2, sm: 3, md: 3.5 } }}>
          {children}
        </Box>
      </Box>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        stocks={stocks}
        onSelectStock={onSelectStock}
        onNavigate={onNavigate}
      />

      {/* "Ask the Market" AI Slide-Over Panel */}
      <AskTheMarketDrawer
        open={askDrawerOpen}
        onClose={() => setAskDrawerOpen(false)}
        selectedTicker={selectedTicker}
      />

      {/* Non-blocking Live Anomaly Alert Toast */}
      <LiveAlertToast
        alert={liveAlert || null}
        onClose={onCloseLiveAlert || (() => {})}
        onInspectTicker={(t) => {
          onSelectStock(t);
          onNavigate('explorer');
        }}
      />
    </Box>
  );
};
