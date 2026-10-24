import React, { useState, useEffect } from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Slider,
  TextField,
  MenuItem,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete,
  LinearProgress,
} from '@mui/material';
import {
  Activity,
  Play,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';

import { StockSummary, ContagionResponse } from '../types';
import { simulateContagion } from '../services/api';
import { SectorBadge } from '../components/SectorBadge';
import { MetricCard } from '../components/MetricCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorAlert } from '../components/ErrorAlert';
import { ExportCsvButton } from '../components/ExportCsvButton';

interface Props {
  stocks: StockSummary[];
  defaultSeed?: string;
  onSelectStock: (ticker: string) => void;
  onNavigate: (page: string) => void;
}

export const ContagionSimulator: React.FC<Props> = ({
  stocks,
  defaultSeed = 'AAPL',
  onSelectStock,
  onNavigate,
}) => {
  const [seedTicker, setSeedTicker] = useState<string>(defaultSeed);
  const [shockPct, setShockPct] = useState<number>(-5.0);
  const [hops, setHops] = useState<number>(3);
  const [threshold, setThreshold] = useState<number>(0.35);
  const [damping, setDamping] = useState<number>(0.70);

  const [activeHopStep, setActiveHopStep] = useState<number>(3);
  const [animating, setAnimating] = useState<boolean>(false);

  const [contagionResult, setContagionResult] = useState<ContagionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    try {
      setLoading(true);
      const res = await simulateContagion({
        seed_ticker: seedTicker,
        shock: shockPct / 100.0,
        hops,
        threshold,
        damping,
      });
      setContagionResult(res);
      setActiveHopStep(hops);
      setError(null);
    } catch (err: any) {
      console.error('Failed to run contagion simulation', err);
      setError(err?.message || 'Failed to simulate contagion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [seedTicker]);

  // Step-by-step animation effect
  const handlePlayAnimation = () => {
    setAnimating(true);
    setActiveHopStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step <= hops) {
        setActiveHopStep(step);
      } else {
        clearInterval(interval);
        setAnimating(false);
      }
    }, 1000);
  };

  const displayedStocks = contagionResult
    ? contagionResult.ranked_impact.filter((s) => s.hop_reached <= activeHopStep)
    : [];

  const sectorChartData = contagionResult
    ? contagionResult.sector_impact_summary.map((s) => ({
        sector: s.sector,
        impact: Math.abs(s.average_impact_pct),
        affected: s.affected_count,
      }))
    : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <ErrorAlert error={error} onRetry={runSimulation} />}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
            Market Contagion Simulator
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Simulate systemic shock propagation through correlation-weighted inter-stock channels across multiple hops.
          </Typography>
        </Box>

        {contagionResult && (
          <ExportCsvButton
            data={contagionResult.ranked_impact}
            filename={`${seedTicker}_contagion_simulation`}
            label="Export Impact Table"
          />
        )}
      </Box>

      {/* Simulation Setup Card */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Shock Parameters & Transmission Settings
          </Typography>

          <Grid container spacing={3} alignItems="center">
            {/* Seed stock selector */}
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                size="small"
                options={stocks.map((s) => s.ticker)}
                value={seedTicker}
                onChange={(_, val) => val && setSeedTicker(val)}
                renderInput={(params) => <TextField {...params} label="Seed Shock Stock" />}
              />
            </Grid>

            {/* Shock Percentage */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                INITIAL SHOCK: {shockPct}%
              </Typography>
              <Slider
                value={shockPct}
                min={-20}
                max={-1}
                step={0.5}
                onChange={(_, val) => setShockPct(val as number)}
                valueLabelDisplay="auto"
                sx={{ py: 1, color: 'error.main' }}
              />
            </Grid>

            {/* Max Hops */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Propagation Hops"
                value={hops}
                onChange={(e) => setHops(Number(e.target.value))}
              >
                <MenuItem value={1}>1 Hop (Direct)</MenuItem>
                <MenuItem value={2}>2 Hops (Secondary)</MenuItem>
                <MenuItem value={3}>3 Hops (Tertiary)</MenuItem>
              </TextField>
            </Grid>

            {/* Threshold */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Min Correlation"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              >
                <MenuItem value={0.25}>0.25 (Broad)</MenuItem>
                <MenuItem value={0.35}>0.35 (Standard)</MenuItem>
                <MenuItem value={0.45}>0.45 (Selective)</MenuItem>
                <MenuItem value={0.55}>0.55 (Tight)</MenuItem>
              </TextField>
            </Grid>

            {/* Run Button */}
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={runSimulation}
                disabled={loading || animating}
                startIcon={<Activity size={18} />}
              >
                Simulate
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Animation & Hop Progress Bar */}
      {contagionResult && (
        <Card sx={{ border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#130e16' : '#fffbfa') }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  icon={<AlertTriangle size={14} color="#f43f5e" />}
                  label={`Seed: ${contagionResult.seed_ticker} (${contagionResult.initial_shock}%)`}
                  sx={{ fontWeight: 700, backgroundColor: 'rgba(244, 63, 94, 0.15)', color: 'error.main' }}
                />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Showing Propagation at Hop {activeHopStep} of {hops}
                </Typography>
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={handlePlayAnimation}
                disabled={animating}
                startIcon={<Play size={14} />}
                sx={{ fontSize: '0.78rem' }}
              >
                {animating ? 'Propagating...' : 'Replay Cascade Animation'}
              </Button>
            </Box>

            {/* Hop Step Pills */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Card
                  sx={{
                    p: 1.5,
                    border: activeHopStep >= 0 ? '2px solid #f43f5e' : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveHopStep(0)}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>
                    HOP 0: EPICENTER
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {seedTicker} ({shockPct}%)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Initial catalyst shock
                  </Typography>
                </Card>
              </Grid>

              {contagionResult.hop_details.map((hop) => (
                <Grid item xs={12} sm={3} key={hop.hop}>
                  <Card
                    sx={{
                      p: 1.5,
                      border: activeHopStep >= hop.hop ? '2px solid #2563eb' : '1px solid transparent',
                      opacity: activeHopStep >= hop.hop ? 1.0 : 0.45,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => setActiveHopStep(hop.hop)}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      HOP {hop.hop}: {hop.hop === 1 ? 'DIRECT PEERS' : hop.hop === 2 ? 'SECONDARY CASPER' : 'TERTIARY'}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      +{hop.newly_affected_count} Stocks
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cum. Impact: {hop.total_cumulative_impact.toFixed(1)}%
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Impact Breakdown Charts & Tables */}
      <Grid container spacing={3}>
        {/* Sector Vulnerability Bar Chart */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Sector Drawdown Severity (%)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Average contagion damage across affected stocks in each sector
              </Typography>

              <Box sx={{ width: '100%', height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorChartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="sector" type="category" tick={{ fontSize: 11 }} width={110} />
                    <RechartsTooltip
                      formatter={(val: any) => [`-${Number(val).toFixed(2)}%`, 'Average Loss']}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        borderRadius: 8,
                        color: '#ffffff',
                        fontSize: '0.8rem',
                      }}
                    />
                    <Bar dataKey="impact" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Ranked Impact Table */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Ranked Impacted Stocks ({displayedStocks.length} Active)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sorted descending by cumulative shock magnitude
                  </Typography>
                </Box>
              </Box>

              <TableContainer sx={{ maxHeight: 380 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Stock</TableCell>
                      <TableCell>Sector</TableCell>
                      <TableCell align="center">Hop</TableCell>
                      <TableCell align="right">Corr to Seed</TableCell>
                      <TableCell align="right">Predicted Impact</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedStocks.slice(0, 15).map((stock) => (
                      <TableRow
                        key={stock.ticker}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          onSelectStock(stock.ticker);
                          onNavigate('explorer');
                        }}
                      >
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {stock.ticker}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 140, display: 'block' }}>
                            {stock.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <SectorBadge sector={stock.sector} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`Hop ${stock.hop_reached}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              backgroundColor: stock.hop_reached === 0 ? 'error.main' : 'rgba(37, 99, 235, 0.12)',
                              color: stock.hop_reached === 0 ? '#ffffff' : 'primary.main',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {stock.correlation_to_seed > 0 ? stock.correlation_to_seed.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${stock.total_impact_pct.toFixed(2)}%`}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              height: 22,
                              backgroundColor: 'rgba(244, 63, 94, 0.15)',
                              color: 'error.main',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
