import React from 'react';
import { Chip } from '@mui/material';

const SECTOR_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Technology: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  'Financial Services': { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  Healthcare: { bg: 'rgba(236, 72, 153, 0.12)', color: '#ec4899', border: 'rgba(236, 72, 153, 0.3)' },
  'Consumer Cyclical': { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
  Industrials: { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.3)' },
  'Communication Services': { bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
  'Consumer Defensive': { bg: 'rgba(20, 184, 166, 0.12)', color: '#14b8a6', border: 'rgba(20, 184, 166, 0.3)' },
  Energy: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
  Utilities: { bg: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', border: 'rgba(14, 165, 233, 0.3)' },
  'Real Estate': { bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
  'Basic Materials': { bg: 'rgba(234, 88, 12, 0.12)', color: '#ea580c', border: 'rgba(234, 88, 12, 0.3)' },
  Other: { bg: 'rgba(100, 116, 139, 0.12)', color: '#64748b', border: 'rgba(100, 116, 139, 0.3)' },
};

interface Props {
  sector: string;
  size?: 'small' | 'medium';
}

export const SectorBadge: React.FC<Props> = ({ sector, size = 'small' }) => {
  const style = SECTOR_COLORS[sector] || SECTOR_COLORS['Other'];
  return (
    <Chip
      label={sector}
      size={size}
      sx={{
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.72rem' : '0.8rem',
        height: size === 'small' ? 22 : 28,
      }}
    />
  );
};
