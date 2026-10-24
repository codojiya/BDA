import React from 'react';
import { Snackbar, Alert, Typography, Box, Chip } from '@mui/material';
import { Zap, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export interface LiveAnomalyAlert {
  id: string;
  ticker: string;
  type: 'price_surge' | 'volume_spike';
  message: string;
  change_pct?: number;
  time: string;
}

interface Props {
  alert: LiveAnomalyAlert | null;
  onClose: () => void;
  onInspectTicker?: (ticker: string) => void;
}

export const LiveAlertToast: React.FC<Props> = ({ alert, onClose, onInspectTicker }) => {
  if (!alert) return null;

  const isPrice = alert.type === 'price_surge';

  return (
    <Snackbar
      open={Boolean(alert)}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        onClose={onClose}
        severity={isPrice ? 'warning' : 'info'}
        icon={isPrice ? <Zap size={18} color="#f59e0b" /> : <AlertTriangle size={18} color="#3b82f6" />}
        sx={{
          borderRadius: 2,
          boxShadow: 6,
          alignItems: 'center',
          cursor: onInspectTicker ? 'pointer' : 'default',
        }}
        onClick={() => {
          if (onInspectTicker) {
            onInspectTicker(alert.ticker);
            onClose();
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {alert.ticker}
          </Typography>
          <Chip
            label={isPrice ? `${alert.change_pct}% 1m Move` : 'Volume Surge'}
            size="small"
            color={isPrice ? 'warning' : 'primary'}
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
          />
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            {alert.message}
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
};
