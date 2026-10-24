import React from 'react';
import { Card, CardContent, Typography, Box, Tooltip } from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number; // e.g. +2.4 or -1.5
  changeSuffix?: string;
  tooltip?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<Props> = ({
  title,
  value,
  subtitle,
  change,
  changeSuffix = '%',
  tooltip,
  icon,
}) => {
  const isPositive = change !== undefined ? change >= 0 : undefined;

  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent sx={{ p: '20px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Tooltip title={tooltip || ''} arrow placement="top">
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ cursor: tooltip ? 'help' : 'default', fontWeight: 600, letterSpacing: '0.02em' }}
            >
              {title}
            </Typography>
          </Tooltip>
          {icon && (
            <Box
              sx={{
                p: 0.8,
                borderRadius: 2,
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, letterSpacing: '-0.02em' }}>
          {value}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 20 }}>
          {change !== undefined && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.3,
                px: 0.8,
                py: 0.2,
                borderRadius: 1,
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                color: isPositive ? 'success.main' : 'error.main',
              }}
            >
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isPositive ? `+${change}${changeSuffix}` : `${change}${changeSuffix}`}
            </Box>
          )}

          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
