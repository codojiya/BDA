import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  LayoutDashboard,
  LineChart,
  Network,
  Activity,
  Repeat,
  Layers,
  Database,
  ArrowRight,
} from 'lucide-react';
import { StockSummary } from '../types';
import { SectorBadge } from './SectorBadge';

interface Props {
  open: boolean;
  onClose: () => void;
  stocks: StockSummary[];
  onSelectStock: (ticker: string) => void;
  onNavigate: (page: string) => void;
}

const PAGES = [
  { id: 'overview', title: 'Market Overview', desc: 'KPIs, market index, gainers & losers, anomaly feed', icon: <LayoutDashboard size={18} /> },
  { id: 'explorer', title: 'Stock Explorer', desc: 'Price history, technical indicators, analytics & neighbors', icon: <LineChart size={18} /> },
  { id: 'network', title: 'Correlation Network', desc: 'Interactive graph, community detection & centralities', icon: <Network size={18} /> },
  { id: 'contagion', title: 'Contagion Simulator', desc: 'Shock propagation model across network hops', icon: <Activity size={18} /> },
  { id: 'backtester', title: 'Strategy Backtester', desc: 'Peer-momentum long-short backtest with zero look-ahead', icon: <Repeat size={18} /> },
  { id: 'sectors', title: 'Sectors & Regimes', desc: 'Sector heatmap, rotation chart & GMM regime timeline', icon: <Layers size={18} /> },
  { id: 'pipeline', title: 'Data Pipeline', desc: 'Ingestion report, step benchmarks & dataset tables', icon: <Database size={18} /> },
];

export const CommandPalette: React.FC<Props> = ({
  open,
  onClose,
  stocks,
  onSelectStock,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const filteredPages = PAGES.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.desc.toLowerCase().includes(query.toLowerCase())
  );

  const filteredStocks = stocks
    .filter(
      (s) =>
        s.ticker.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.sector.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundImage: 'none',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
          <TextField
            autoFocus
            fullWidth
            placeholder="Type a stock ticker (e.g. AAPL, MSFT) or page command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} color="#9ca3af" />
                </InputAdornment>
              ),
              sx: { fontSize: '1rem', fontWeight: 500 },
            }}
          />
        </Box>

        <Box sx={{ maxHeight: 420, overflowY: 'auto', p: 1 }}>
          {filteredStocks.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  px: 1.5,
                  py: 0.5,
                  display: 'block',
                  fontWeight: 700,
                  color: 'text.secondary',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Stocks
              </Typography>
              <List disablePadding>
                {filteredStocks.map((stock) => (
                  <ListItemButton
                    key={stock.ticker}
                    onClick={() => {
                      onSelectStock(stock.ticker);
                      onNavigate('explorer');
                      onClose();
                    }}
                    sx={{ borderRadius: 1.5, py: 1, px: 1.5 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ fontWeight: 700, minWidth: 55, fontSize: '0.9rem' }}>
                          {stock.ticker}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
                          {stock.name}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <SectorBadge sector={stock.sector} size="small" />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: stock.change_pct_1d >= 0 ? 'success.main' : 'error.main',
                            minWidth: 50,
                            textAlign: 'right',
                          }}
                        >
                          {stock.change_pct_1d >= 0 ? `+${stock.change_pct_1d}%` : `${stock.change_pct_1d}%`}
                        </Typography>
                      </Box>
                    </Box>
                  </ListItemButton>
                ))}
              </List>
            </Box>
          )}

          {filteredPages.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  px: 1.5,
                  py: 0.5,
                  display: 'block',
                  fontWeight: 700,
                  color: 'text.secondary',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Navigation
              </Typography>
              <List disablePadding>
                {filteredPages.map((page) => (
                  <ListItemButton
                    key={page.id}
                    onClick={() => {
                      onNavigate(page.id);
                      onClose();
                    }}
                    sx={{ borderRadius: 1.5, py: 1, px: 1.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                      {page.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={page.title}
                      secondary={page.desc}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                    <ArrowRight size={16} color="#9ca3af" />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          )}

          {filteredStocks.length === 0 && filteredPages.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No matching stocks or commands for "{query}"
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            p: 1.2,
            px: 2,
            backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#0b0f19' : '#f8fafc'),
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Use <Chip label="↑" size="small" sx={{ height: 18, fontSize: '0.65rem' }} /> <Chip label="↓" size="small" sx={{ height: 18, fontSize: '0.65rem' }} /> to navigate, <Chip label="ESC" size="small" sx={{ height: 18, fontSize: '0.65rem' }} /> to close
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            StockGraph Search
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
