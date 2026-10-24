import React, { useState, useEffect } from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Slider,
  TextField,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import {
  Repeat,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  BarChart2,
  DollarSign,
  Percent,
  Activity,
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

import { BacktestResponse } from '../types';
import { fetchBacktest } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorAlert } from '../components/ErrorAlert';
import { ExportCsvButton } from '../components/ExportCsvButton';

export const StrategyBacktester: React.FC = () => {
  const [k, setK] = useState<number>(5);
  const [lookback, setLookback] = useState<number>(60);
  const [costBps, setCostBps] = useState<number>(10);

  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = async () => {
    try {
      setLoading(true);
      const data = await fetchBacktest(k, lookback, costBps);
      setResult(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to run backtest', err);
      setError(err?.message || 'Failed to execute neighbor signal backtest.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runBacktest();
  }, []);

  // Downsample chart points for smooth rendering if needed
  const chartData = result
    ? result.equity_curve.filter((_, idx) => idx % 2 === 0)
    : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <ErrorAlert error={error} onRetry={runBacktest} />}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
            Network Peer Momentum Backtester
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cross-sectional peer-diffusion anomaly: long top quintile, short bottom quintile of top-k correlated neighbors.
          </Typography>
        </Box>

        {result && (
          <ExportCsvButton
            data={result.equity_curve}
            filename={`backtest_k${k}_lookback${lookback}_cost${costBps}`}
            label="Export Equity Curve"
          />
        )}
      </Box>

      {/* Zero Look-Ahead Bias Guarantee Banner */}
      <Alert
        icon={<ShieldCheck size={20} color="#10b981" />}
        severity="success"
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main', mb: 0.2 }}>
          Zero Look-Ahead Bias Guarantee
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
          Strict temporal causality: correlations and neighbor selection at day <i>t</i> use exclusively historical return data in <code>[t - lookback, t - 1]</code>. Signals are generated strictly at close of day <i>t - 1</i> and executed for day <i>t</i> return realizations with turnover transaction fees.
        </Typography>
      </Alert>

      {/* Parameters Setup Card */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Strategy Hyperparameters
          </Typography>

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={3}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                TOP-K CORRELATED NEIGHBORS: {k}
              </Typography>
              <Slider
                value={k}
                min={2}
                max={20}
                step={1}
                onChange={(_, val) => setK(val as number)}
                valueLabelDisplay="auto"
                sx={{ py: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                HISTORICAL LOOKBACK: {lookback} DAYS
              </Typography>
              <Slider
                value={lookback}
                min={20}
                max={180}
                step={10}
                onChange={(_, val) => setLookback(val as number)}
                valueLabelDisplay="auto"
                sx={{ py: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                TRANSACTION COST: {costBps} BPS ({ (costBps / 100).toFixed(2) }%)
              </Typography>
              <Slider
                value={costBps}
                min={0}
                max={40}
                step={5}
                onChange={(_, val) => setCostBps(val as number)}
                valueLabelDisplay="auto"
                sx={{ py: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={runBacktest}
                disabled={loading}
                startIcon={<Repeat size={18} />}
                sx={{ py: 1.1 }}
              >
                {loading ? 'Simulating...' : 'Run Backtest'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* KPI Comparison Cards */}
      {result && (
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="STRATEGY SHARPE"
              value={result.metrics.sharpe_ratio}
              subtitle={`Benchmark S&P: ${result.benchmark_metrics.sharpe_ratio}`}
              tooltip="Sharpe ratio net of turnover transaction drag"
              icon={<Activity size={18} />}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="HIT RATE"
              value={`${result.metrics.hit_rate}%`}
              subtitle={`Total Trading Days: ${result.metrics.total_trades}`}
              tooltip="Percentage of trading days with positive net return"
              icon={<Percent size={18} />}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="STRATEGY MAX DD"
              value={`${result.metrics.max_drawdown}%`}
              subtitle={`Benchmark Max DD: ${result.benchmark_metrics.max_drawdown}%`}
              tooltip="Maximum peak-to-trough capital drawdown"
              icon={<TrendingDown size={18} color="#f43f5e" />}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="TRANSACTION COST DRAG"
              value={`${result.metrics.cost_drag_pct}%`}
              subtitle={`Total Turnover: ${result.metrics.total_turnover}x`}
              tooltip="Cumulative return penalty deducted from gross returns due to turnover"
              icon={<DollarSign size={18} />}
            />
          </Grid>
        </Grid>
      )}

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Equity Curve Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Cumulative Equity Curves (Rebased to 100.0)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Strategy (Net of costs) vs Equal-Weighted S&P 500 Buy & Hold Benchmark
                  </Typography>
                </Box>
              </Box>

              {loading ? (
                <LoadingSkeleton height={340} />
              ) : (
                <Box sx={{ width: '100%', height: 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                      <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: 8 }} />
                      <Line
                        type="monotone"
                        dataKey="strategy_equity"
                        name="Neighbor Signal Strategy (Net)"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="benchmark_equity"
                        name="S&P 500 Equal-Weight Index"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Underwater Drawdown Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Underwater Drawdown Dynamics (%)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Capital drawdowns relative to previous all-time highs
              </Typography>

              {loading ? (
                <LoadingSkeleton height={200} />
              ) : (
                <Box sx={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={35} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.92)',
                          borderRadius: 8,
                          color: '#ffffff',
                          fontSize: '0.8rem',
                        }}
                        formatter={(val: any) => [`${Number(val).toFixed(2)}%`]}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: 8 }} />
                      <Area
                        type="monotone"
                        dataKey="strategy_drawdown"
                        name="Strategy Drawdown"
                        stroke="#f43f5e"
                        fill="rgba(244, 63, 94, 0.2)"
                      />
                      <Area
                        type="monotone"
                        dataKey="benchmark_drawdown"
                        name="Benchmark Drawdown"
                        stroke="#10b981"
                        fill="rgba(16, 185, 129, 0.15)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Head-to-Head Comparison Summary Table */}
        {result && (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Head-to-Head Quantitative Summary
                </Typography>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Metric</TableCell>
                        <TableCell align="right">Neighbor Signal Strategy</TableCell>
                        <TableCell align="right">Equal-Weight S&P 500 Index</TableCell>
                        <TableCell align="right">Delta</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 600 }}>Annualized Return (CAGR)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: result.metrics.annualized_return >= 0 ? 'success.main' : 'error.main' }}>
                          {result.metrics.annualized_return}%
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {result.benchmark_metrics.annualized_return}%
                        </TableCell>
                        <TableCell align="right">
                          {(result.metrics.annualized_return - result.benchmark_metrics.annualized_return).toFixed(2)}%
                        </TableCell>
                      </TableRow>

                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 600 }}>Annualized Volatility</TableCell>
                        <TableCell align="right">{result.metrics.annualized_volatility}%</TableCell>
                        <TableCell align="right">{result.benchmark_metrics.annualized_volatility}%</TableCell>
                        <TableCell align="right">
                          {(result.metrics.annualized_volatility - result.benchmark_metrics.annualized_volatility).toFixed(2)}%
                        </TableCell>
                      </TableRow>

                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 600 }}>Sharpe Ratio (Rf=2%)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {result.metrics.sharpe_ratio}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {result.benchmark_metrics.sharpe_ratio}
                        </TableCell>
                        <TableCell align="right">
                          {(result.metrics.sharpe_ratio - result.benchmark_metrics.sharpe_ratio).toFixed(3)}
                        </TableCell>
                      </TableRow>

                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 600 }}>Maximum Peak-to-Trough Drawdown</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>
                          {result.metrics.max_drawdown}%
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {result.benchmark_metrics.max_drawdown}%
                        </TableCell>
                        <TableCell align="right">
                          {(result.metrics.max_drawdown - result.benchmark_metrics.max_drawdown).toFixed(2)}%
                        </TableCell>
                      </TableRow>

                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 600 }}>Total Period Return</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{result.metrics.total_return}%</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{result.benchmark_metrics.total_return}%</TableCell>
                        <TableCell align="right">
                          {(result.metrics.total_return - result.benchmark_metrics.total_return).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
