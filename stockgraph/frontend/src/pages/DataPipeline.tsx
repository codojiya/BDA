import React, { useState, useEffect } from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  Database,
  CheckCircle2,
  Clock,
  HardDrive,
  Cpu,
  Layers,
  FileSpreadsheet,
  AlertCircle,
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

import { MetaResponse, PricesResponse } from '../types';
import { fetchPrices } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { SectorBadge } from '../components/SectorBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ExportCsvButton } from '../components/ExportCsvButton';

interface Props {
  meta: MetaResponse | null;
}

export const DataPipeline: React.FC<Props> = ({ meta }) => {
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadSample = async () => {
      try {
        setLoading(true);
        // Load AAPL and MSFT recent records as a live sample of the processed dataset
        const [aapl, msft] = await Promise.all([
          fetchPrices('AAPL', '1M'),
          fetchPrices('MSFT', '1M'),
        ]);

        const combined = [
          ...aapl.records.slice(-5).map((r) => ({ ...r, ticker: 'AAPL', name: aapl.name, sector: aapl.sector })),
          ...msft.records.slice(-5).map((r) => ({ ...r, ticker: 'MSFT', name: msft.name, sector: msft.sector })),
        ];
        setSampleRows(combined);
      } catch (err) {
        console.error('Error fetching sample data', err);
      } finally {
        setLoading(false);
      }
    };

    loadSample();
  }, []);

  const report = meta?.pipeline_report;

  const stepTimingData = report?.step_timings_seconds
    ? Object.entries(report.step_timings_seconds)
        .filter(([k]) => k !== 'total')
        .map(([step, duration]) => ({
          step: step.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          duration: Number(duration),
        }))
    : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              Big Data Ingestion Pipeline
            </Typography>
            <Chip
              icon={<CheckCircle2 size={14} color="#10b981" />}
              label="Pipeline Status: Cleaned & Indexed"
              sx={{
                fontWeight: 700,
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: 'success.main',
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Chunked ETL ingestion (200,000 rows/chunk), 90% coverage survivorship filtering, and columnar Parquet optimization.
          </Typography>
        </Box>

        {report && (
          <ExportCsvButton
            data={sampleRows}
            filename="processed_sample_data"
            label="Export Processed Sample"
          />
        )}
      </Box>

      {/* Summary KPI Cards */}
      {report && (
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="RAW ROWS PROCESSED"
              value={report.rows_raw.toLocaleString()}
              subtitle="Chunksize: 200,000 rows"
              tooltip="Total records ingested from prices.csv"
              icon={<Database size={18} />}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="CLEANED RECORDS"
              value={report.rows_cleaned.toLocaleString()}
              subtitle={`Survivorship: ${((report.rows_cleaned / report.rows_raw) * 100).toFixed(1)}%`}
              tooltip="Deduplicated, date-standardized, forward-filled records"
              icon={<CheckCircle2 size={18} color="#10b981" />}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="TICKER SURVIVORSHIP"
              value={`${report.tickers_kept} / ${report.tickers_raw}`}
              subtitle={`${report.tickers_dropped} Dropped (< 90% Days)`}
              tooltip="Tickers with at least 90% trading history coverage"
              icon={<Layers size={18} />}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="EXECUTION BENCHMARK"
              value={`${report.step_timings_seconds.total}s`}
              subtitle={`Peak RSS: ${report.memory_usage_mb.peak_rss} MB`}
              tooltip="End-to-end ingestion and Parquet persistence duration"
              icon={<Clock size={18} color="#2563eb" />}
            />
          </Grid>
        </Grid>
      )}

      {/* Step Timings Benchmarking */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Pipeline Step Timings (Seconds)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                High-performance vectorized execution benchmarks
              </Typography>

              <Box sx={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stepTimingData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="step" type="category" tick={{ fontSize: 11 }} width={160} />
                    <RechartsTooltip
                      formatter={(val: any) => [`${Number(val).toFixed(3)}s`, 'Duration']}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        borderRadius: 8,
                        color: '#ffffff',
                        fontSize: '0.8rem',
                      }}
                    />
                    <Bar dataKey="duration" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Dropped Tickers Analysis */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AlertCircle size={18} color="#f59e0b" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Dropped Tickers ({report?.tickers_dropped || 0})
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Stocks with &lt; 90% calendar coverage (late IPOs, spin-offs, corporate restructurings between 2013-2018)
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 240, overflowY: 'auto' }}>
                {report?.dropped_tickers.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Processed Data Table Sample Preview */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Processed Parquet Table Sample Preview
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Verified schema: date, ticker, company_name, sector, open, high, low, close, volume
              </Typography>
            </Box>
            <Chip label="data/processed/ohlcv_long.parquet" size="small" sx={{ fontWeight: 600 }} />
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Ticker</TableCell>
                  <TableCell>Company Name</TableCell>
                  <TableCell>Sector</TableCell>
                  <TableCell align="right">Open ($)</TableCell>
                  <TableCell align="right">High ($)</TableCell>
                  <TableCell align="right">Low ($)</TableCell>
                  <TableCell align="right">Close ($)</TableCell>
                  <TableCell align="right">Volume</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sampleRows.map((row, idx) => (
                  <TableRow key={`${row.ticker}-${row.date}-${idx}`} hover>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{row.date}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{row.ticker}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{row.name}</TableCell>
                    <TableCell>
                      <SectorBadge sector={row.sector} size="small" />
                    </TableCell>
                    <TableCell align="right">${row.open.toFixed(2)}</TableCell>
                    <TableCell align="right">${row.high.toFixed(2)}</TableCell>
                    <TableCell align="right">${row.low.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>${row.close.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.volume.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
