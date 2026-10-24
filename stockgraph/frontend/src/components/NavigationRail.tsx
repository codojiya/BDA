import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import {
  LayoutDashboard,
  LineChart,
  Network,
  Activity,
  Repeat,
  Layers,
  Database,
  GitBranch,
} from 'lucide-react';

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
  collapsed?: boolean;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'explorer', label: 'Stock Explorer', icon: <LineChart size={20} /> },
  { id: 'network', label: 'Correlation Network', icon: <Network size={20} />, badge: 'Graph' },
  { id: 'contagion', label: 'Contagion Simulator', icon: <Activity size={20} />, badge: 'Sim' },
  { id: 'backtester', label: 'Strategy Backtester', icon: <Repeat size={20} /> },
  { id: 'sectors', label: 'Sectors & Regimes', icon: <Layers size={20} /> },
  { id: 'pipeline', label: 'Data Pipeline', icon: <Database size={20} /> },
];

export const NavigationRail: React.FC<Props> = ({
  activePage,
  onNavigate,
  collapsed = false,
}) => {
  return (
    <Box
      sx={{
        width: collapsed ? 72 : 240,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? '#0e1320' : '#ffffff',
        transition: 'width 0.2s ease',
        userSelect: 'none',
        zIndex: 1200,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Brand Header */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
        }}
        onClick={() => onNavigate('overview')}
      >
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #10b981 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            flexShrink: 0,
          }}
        >
          <GitBranch size={22} />
        </Box>
        {!collapsed && (
          <Box sx={{ overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                StockGraph
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.72rem' }}>
              Market Contagion Explorer
            </Typography>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Nav items */}
      <Box sx={{ flex: 1, py: 2, px: 1.5, overflow: 'hidden' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            px: 1.5,
            mb: 1,
            display: collapsed ? 'none' : 'block',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontSize: '0.68rem',
          }}
        >
          Core Platform
        </Typography>

        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <ListItemButton
                key={item.id}
                onClick={() => onNavigate(item.id)}
                sx={{
                  borderRadius: 2,
                  py: 1.1,
                  px: collapsed ? 1.5 : 1.8,
                  backgroundColor: isActive
                    ? (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(37, 99, 235, 0.16)'
                          : 'rgba(37, 99, 235, 0.08)'
                    : 'transparent',
                  color: isActive ? 'primary.main' : 'text.primary',
                  '&:hover': {
                    backgroundColor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.04)'
                        : 'rgba(0, 0, 0, 0.03)',
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 34,
                    color: isActive ? 'primary.main' : 'text.secondary',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.875rem',
                      color: isActive ? 'primary.main' : 'text.primary',
                    }}
                  />
                )}
                {!collapsed && item.badge && (
                  <Chip
                    label={item.badge}
                    size="small"
                    color={isActive ? 'primary' : 'default'}
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      borderRadius: 1,
                    }}
                  />
                )}
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};
