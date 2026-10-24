import React, { useState, useEffect } from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  ButtonGroup,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  Layers,
  Activity,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Sun,
  CloudRain,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

import { SectorsResponse, RegimesResponse } from '../types';
import { fetchSectors, fetchRegimes } from '../services/api';
import { SectorBadge } from '../components/SectorBadge';
import { MetricCard } from '../components/MetricCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorAlert } from '../components/ErrorAlert';
import { ExportCsvButton } from '../components/ExportCsvButton';

const WINDOWS = ['1M', '3M', '6M', '1Y', '3Y', 'All'];

const SECTOR_STROKES: Record<string, string> = {
  Technology: '#3b82f6',
  'Financial Services': '#10b981',
  Healthcare: '#ec4899',
  'Consumer Cyclical': '#f59e0b',
  Industrials: '#6366f1',
  'Communication Services': '#8b5cf6',
  'Consumer Defensive': '#14b8a6',
  Energy: '#ef4444',
  Utilities: '#0ea5e9',
  'Real Estate': '#a855f7',
  'Basic Materials': '#ea580c',
  Other: '#64748b',
};

export const SectorsRegimes: React.FC = () => {
  const [windowPeriod, setWindowPeriod] = useState<string>('1Y');
  const [sectorsData, setSectorsData] = useState<SectorsResponse | null>(null);
  const [regimesData, setRegimesData] = useState<RegimesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [sData, rData] = await Promise.all([
          fetchSectors(windowPeriod),
          fetchRegimes(),
        ]);
        setSectorsData(sData);
        setRegimesData(rData);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load sectors and regimes data', err);
        setError(err?.message || 'Failed to fetch sectors and regimes.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [windowPeriod]);

  // Color helper for correlation matrix heatmap
  const getHeatmapColor = (corr: number) => {
    if (corr >= 0.8) return 'rgba(37, 99, 235, 0.85)';
    if (corr >= 0.6) return 'rgba(37, 99, 235, 0.6)';
    if (corr >= 0.4) return 'rgba(37, 99, 235, 0.4)';
    if (corr >= 0.2) return 'rgba(37, 99, 235, 0.2)';
    if (corr >= 0.0) return 'rgba(148, 163, 184, 0.15)';
    return 'rgba(244, 63, 94, 0.3)';
  };

  const getRegimeIcon = (reg: string) => {
    if (reg === 'Calm') return <Sun size={18} color="#10b981" />;
    if (reg === 'Stressed') return <Flame size={18} color="#f43f5e" />;
    return <CloudRain size={18} color="#f59e0b" />;
  };

  const sectorTimelineSample = sectorsData
    ? sectorsData.timeline.filter((_, idx) => idx % 2 === 0)
    : [];

  const regimeTimelineSample = regimesData
    ? regimesData.timeline.filter((_, idx) => idx % 2 === 0)
    : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <ErrorAlert error={error} />}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
            Sectors & Macro Regimes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cross-industry correlation clustering and unsupervised Gaussian Mixture Model (GMM) volatility regimes.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <ButtonGroup size="small" variant="outlined">
            {WINDOWS.map((w) => (
              <Button
                key={w}
                variant={windowPeriod === w ? 'contained' : 'outlined'}
                onClick={() => setWindowPeriod(w)}
                sx={{ fontWeight: 600, fontSize: '0.78rem' }}
              >
                {w}
              </Button>
            ))}
          </ButtonGroup>

          {sectorsData && (
            <ExportCsvButton
              data={sectorsData.sector_metrics}
              filename={`sector_metrics_${windowPeriod}`}
              label="Export Sectors"
            />
          )}
        </Box>
      </Box>

      {/* GMM Regime Distribution Cards */}
      {regimesData && (
        <Grid container spacing={2.5}>
          {regimesData.regime_stats.map((stat) => (
            <Grid item xs={12} sm={4} key={stat.regime}>
              <Card sx={{ height: '100%', position: 'relative' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getRegimeIcon(stat.regime)}
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {stat.regime} Regime
                      </Typography>
                    </Box>
                    <Chip
                      label={`${stat.percentage}% of Days`}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        backgroundColor:
                          stat.regime === 'Calm'
                            ? 'rgba(16, 185, 129, 0.12)'
                            : stat.regime === 'Stressed'
                            ? 'rgba(244, 63, 94, 0.12)'
                            : 'rgba(245, 158, 11, 0.12)',
                        color:
                          stat.regime === 'Calm'
                            ? 'success.main'
                            : stat.regime === 'Stressed'
                            ? 'error.main'
                            : 'warning.main',
                      }}
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    {stat.days_count} trading sessions recorded
                  </Typography>

                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Avg 20d Volatility</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>{stat.avg_volatility}%</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Avg Correlation</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>ρ = {stat.avg_correlation}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Regime Timeline Behind Market Chart */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Market Regime Dynamics (2013 - 2018)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Gaussian Mixture Model classifications over trailing 20-day annualized volatility and correlation
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip label="Calm" size="small" sx={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'success.main', fontWeight: 700 }} />
              <Chip label="Normal" size="small" sx={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: 'warning.main', fontWeight: 700 }} />
              <Chip label="Stressed" size="small" sx={{ backgroundColor: 'rgba(244, 63, 94, 0.2)', color: 'error.main', fontWeight: 700 }} />
            </Box>
          </Box>

          {loading ? (
            <LoadingSkeleton height={300} />
          ) : (
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={regimeTimelineSample} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={35} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.92)',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: '0.8rem',
                    }}
                    formatter={(val: any, name: any, props: any) => [
                      `${Number(val).toFixed(2)} pts (Regime: ${props.payload.regime})`,
                      'S&P 500 Index',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="market_price"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={0.2}
                    fill="#2563eb"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Sector Rotation Chart & Heatmap */}
      <Grid container spacing={3}>
        {/* Sector Rotation Chart */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Sector Rotation Chart ({windowPeriod})
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Cumulative returns by sector rebased to 100 on start date
              </Typography>

              {loading ? (
                <LoadingSkeleton height={340} />
              ) : (
                <Box sx={{ width: '100%', height: 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sectorTimelineSample} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={35} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.92)',
                          borderRadius: 8,
                          color: '#ffffff',
                          fontSize: '0.8rem',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }} />
                      {sectorsData?.sectors.slice(0, 7).map((sec) => (
                        <Line
                          key={sec}
                          type="monotone"
                          dataKey={sec}
                          name={sec}
                          stroke={SECTOR_STROKES[sec] || '#64748b'}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sector-to-Sector Heatmap */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Sector Correlation Heatmap
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Cross-industry return Pearson correlation matrix
              </Typography>

              {loading || !sectorsData ? (
                <LoadingSkeleton height={340} />
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: `80px repeat(${sectorsData.sectors.length}, 34px)`, gap: '2px' }}>
                    {/* Header Row */}
                    <Box />
                    {sectorsData.sectors.map((s) => (
                      <Tooltip key={s} title={s} arrow>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {s.slice(0, 3).toUpperCase()}
                        </Typography>
                      </Tooltip>
                    ))}

                    {/* Matrix Rows */}
                    {sectorsData.sectors.map((rowSec, rowIdx) => (
                      <React.Fragment key={rowSec}>
                        <Tooltip title={rowSec} arrow>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              pr: 1,
                              display: 'flex',
                              alignItems: 'center',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {rowSec.slice(0, 8)}
                          </Typography>
                        </Tooltip>

                        {sectorsData.sectors.map((colSec, colIdx) => {
                          const val = sectorsData.correlation_matrix[rowIdx][colIdx];
                          return (
                            <Tooltip
                              key={`${rowSec}-${colSec}`}
                              title={`${rowSec} ↔ ${colSec}: ${val.toFixed(2)}`}
                              arrow
                            >
                              <Box
                                sx={{
                                  width: 34,
                                  height: 28,
                                  borderRadius: '3px',
                                  backgroundColor: getHeatmapColor(val),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'transform 0.15s ease',
                                  '&:hover': {
                                    transform: 'scale(1.15)',
                                    zIndex: 2,
                                  },
                                }}
                              >
                                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#ffffff' }}>
                                  {val.toFixed(2)}
                                </Typography>
                              </Box>
                            </Tooltip>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sector Performance Table */}
      {sectorsData && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Sector Performance Summary ({windowPeriod})
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sector</TableCell>
                    <TableCell align="center">Member Stocks</TableCell>
                    <TableCell align="right">Period Return</TableCell>
                    <TableCell align="right">Annualized Return</TableCell>
                    <TableCell align="right">Annualized Vol</TableCell>
                    <TableCell align="right">Sharpe Ratio</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sectorsData.sector_metrics.map((sec) => (
                    <TableRow key={sec.sector} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SectorBadge sector={sec.sector} size="small" />
                        </Box>
                      </TableCell>
                      <TableCell align="center">{sec.ticker_count} Tickers</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: sec.cumulative_return >= 0 ? 'success.main' : 'error.main' }}>
                        {sec.cumulative_return >= 0 ? `+${sec.cumulative_return}%` : `${sec.cumulative_return}%`}
                      </TableCell>
                      <TableCell align="right">{sec.annualized_return}%</TableCell>
                      <TableCell align="right">{sec.annualized_volatility}%</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {sec.sharpe_ratio}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
