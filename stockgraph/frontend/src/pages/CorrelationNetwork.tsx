import React, { useState, useEffect, useRef } from 'react';
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
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Network,
  RotateCw,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Network as VisNetwork, DataSet } from 'vis-network/standalone';

import { NetworkResponse, NetworkNode } from '../types';
import { fetchNetwork } from '../services/api';
import { SectorBadge } from '../components/SectorBadge';
import { MetricCard } from '../components/MetricCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorAlert } from '../components/ErrorAlert';

interface Props {
  onSelectStock: (ticker: string) => void;
  onNavigate: (page: string) => void;
}

const SECTOR_COLOR_MAP: Record<string, string> = {
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

const COMMUNITY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#e11d48'
];

export const CorrelationNetwork: React.FC<Props> = ({
  onSelectStock,
  onNavigate,
}) => {
  const [threshold, setThreshold] = useState<number>(0.6);
  const [sector, setSector] = useState<string>('All');
  const [limit, setLimit] = useState<number>(60);
  const [colorMode, setColorMode] = useState<'sector' | 'community'>('sector');

  const [networkData, setNetworkData] = useState<NetworkResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const visNetworkRef = useRef<VisNetwork | null>(null);

  const loadNetwork = async () => {
    try {
      setLoading(true);
      const data = await fetchNetwork(threshold, sector, limit);
      setNetworkData(data);
      setSelectedNode(null);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load correlation network', err);
      setError(err?.message || 'Failed to fetch correlation network.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetwork();
  }, [threshold, sector, limit]);

  // Render VisNetwork whenever networkData changes
  useEffect(() => {
    if (!containerRef.current || !networkData || networkData.nodes.length === 0) return;

    // Convert nodes to Vis format
    const maxBetweenness = Math.max(...networkData.nodes.map((n) => n.betweenness_centrality), 0.001);

    const visNodes = new DataSet(
      networkData.nodes.map((n) => {
        const color =
          colorMode === 'sector'
            ? SECTOR_COLOR_MAP[n.sector] || '#64748b'
            : COMMUNITY_COLORS[n.community_id % COMMUNITY_COLORS.length];

        // Scale size by betweenness centrality (min 16, max 38)
        const size = 16 + (n.betweenness_centrality / maxBetweenness) * 22;

        return {
          id: n.id,
          label: n.ticker,
          title: `<b>${n.ticker}</b> - ${n.name}<br/>Sector: ${n.sector}<br/>Degree: ${n.degree}<br/>Centrality: ${n.betweenness_centrality.toFixed(4)}<br/>Community: ${n.community_id}`,
          value: size,
          color: {
            background: color,
            border: '#ffffff',
            highlight: { background: '#2563eb', border: '#ffffff' },
          },
          font: { color: '#ffffff', size: 12, face: 'Inter', strokeWidth: 2, strokeColor: '#0f172a' },
          shape: 'dot',
        };
      })
    );

    // Convert edges to Vis format
    const visEdges = new DataSet(
      networkData.edges.map((e, idx) => ({
        id: `e-${idx}`,
        from: e.source,
        to: e.target,
        width: Math.max(1, (e.weight - 0.4) * 8),
        color: {
          color: 'rgba(148, 163, 184, 0.45)',
          highlight: '#2563eb',
          opacity: 0.6,
        },
        title: `Correlation: ${e.weight.toFixed(4)}`,
      }))
    );

    const options = {
      nodes: {
        scaling: { min: 14, max: 36 },
        borderWidth: 2,
        shadow: true,
      },
      edges: {
        smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
      },
      physics: {
        stabilization: { iterations: 120 },
        barnesHut: {
          gravitationalConstant: -3500,
          centralGravity: 0.35,
          springLength: 95,
          springConstant: 0.04,
          damping: 0.09,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
      },
    };

    const networkInstance = new VisNetwork(containerRef.current, { nodes: visNodes, edges: visEdges }, options);
    visNetworkRef.current = networkInstance;

    networkInstance.on('selectNode', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const found = networkData.nodes.find((n) => n.id === nodeId);
        setSelectedNode(found || null);
      }
    });

    networkInstance.on('deselectNode', () => {
      setSelectedNode(null);
    });

    return () => {
      networkInstance.destroy();
    };
  }, [networkData, colorMode]);

  const handleZoomIn = () => {
    if (visNetworkRef.current) {
      const scale = visNetworkRef.current.getScale();
      visNetworkRef.current.moveTo({ scale: scale * 1.3 });
    }
  };

  const handleZoomOut = () => {
    if (visNetworkRef.current) {
      const scale = visNetworkRef.current.getScale();
      visNetworkRef.current.moveTo({ scale: scale * 0.7 });
    }
  };

  const handleFit = () => {
    if (visNetworkRef.current) {
      visNetworkRef.current.fit({ animation: true });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <ErrorAlert error={error} onRetry={loadNetwork} />}

      {/* Header and Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
            S&P 500 Correlation Network
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Graph topology, node betweenness centrality, and greedy modularity community detection.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button
            variant={colorMode === 'sector' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setColorMode('sector')}
            sx={{ fontSize: '0.78rem' }}
          >
            Color: Sector
          </Button>
          <Button
            variant={colorMode === 'community' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setColorMode('community')}
            sx={{ fontSize: '0.78rem' }}
          >
            Color: Community
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RotateCw size={14} />}
            onClick={loadNetwork}
            sx={{ fontSize: '0.78rem' }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Graph Filter Controls Card */}
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                CORRELATION THRESHOLD (ρ ≥ {threshold.toFixed(2)})
              </Typography>
              <Slider
                value={threshold}
                min={0.3}
                max={0.85}
                step={0.05}
                onChange={(_, val) => setThreshold(val as number)}
                valueLabelDisplay="auto"
                sx={{ py: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Filter Sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
              >
                <MenuItem value="All">All Sectors</MenuItem>
                <MenuItem value="Technology">Technology</MenuItem>
                <MenuItem value="Financial Services">Financial Services</MenuItem>
                <MenuItem value="Healthcare">Healthcare</MenuItem>
                <MenuItem value="Consumer Cyclical">Consumer Cyclical</MenuItem>
                <MenuItem value="Industrials">Industrials</MenuItem>
                <MenuItem value="Communication Services">Communication Services</MenuItem>
                <MenuItem value="Energy">Energy</MenuItem>
                <MenuItem value="Utilities">Utilities</MenuItem>
                <MenuItem value="Real Estate">Real Estate</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Maximum Nodes"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                <MenuItem value={30}>30 Leading Stocks</MenuItem>
                <MenuItem value={50}>50 Leading Stocks</MenuItem>
                <MenuItem value={80}>80 Leading Stocks</MenuItem>
                <MenuItem value={120}>120 Leading Stocks</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Graph Canvas and Inspection Grid */}
      <Grid container spacing={3}>
        {/* Network Canvas */}
        <Grid item xs={12} lg={selectedNode ? 8.5 : 12}>
          <Card sx={{ height: 620, position: 'relative', overflow: 'hidden' }}>
            {loading ? (
              <LoadingSkeleton height={620} />
            ) : (
              <Box ref={containerRef} sx={{ width: '100%', height: '100%', background: (theme) => (theme.palette.mode === 'dark' ? '#090d16' : '#fafafa') }} />
            )}

            {/* Float Canvas Zoom Controls */}
            <Box sx={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 1, backgroundColor: 'background.paper', p: 0.5, borderRadius: 2, boxShadow: 3 }}>
              <Tooltip title="Zoom In" arrow>
                <IconButton size="small" onClick={handleZoomIn}>
                  <ZoomIn size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out" arrow>
                <IconButton size="small" onClick={handleZoomOut}>
                  <ZoomOut size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Fit Entire Network" arrow>
                <IconButton size="small" onClick={handleFit}>
                  <Maximize2 size={18} />
                </IconButton>
              </Tooltip>
            </Box>
          </Card>
        </Grid>

        {/* Selected Node Details Card */}
        {selectedNode && (
          <Grid item xs={12} lg={3.5}>
            <Card sx={{ height: 620, display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {selectedNode.ticker}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedNode.name}
                    </Typography>
                  </Box>
                  <SectorBadge sector={selectedNode.sector} size="medium" />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 3 }}>
                  <Box sx={{ p: 2, borderRadius: 2, backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#141b2d' : '#f8fafc') }}>
                    <Typography variant="caption" color="text.secondary">
                      NETWORK CENTRALITY (BETWEENNESS)
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.5 }}>
                      {selectedNode.betweenness_centrality.toFixed(5)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Fraction of all shortest paths passing through this node.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: 2, backgroundColor: (theme) => (theme.palette.mode === 'dark' ? '#141b2d' : '#f8fafc') }}>
                    <Typography variant="caption" color="text.secondary">
                      NODE DEGREE & COMMUNITY
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Degree: {selectedNode.degree}
                      </Typography>
                      <Chip
                        label={`Community #${selectedNode.community_id}`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          backgroundColor: COMMUNITY_COLORS[selectedNode.community_id % COMMUNITY_COLORS.length],
                          color: '#ffffff',
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  endIcon={<ExternalLink size={16} />}
                  onClick={() => {
                    onSelectStock(selectedNode.ticker);
                    onNavigate('explorer');
                  }}
                  sx={{ mt: 'auto' }}
                >
                  Inspect in Stock Explorer
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Network Stats Cards */}
      {networkData && (
        <Grid container spacing={2.5}>
          <Grid item xs={6} sm={3}>
            <MetricCard
              title="GRAPH DENSITY"
              value={networkData.stats.density}
              subtitle="Ratio of actual to potential edges"
              tooltip="Higher density implies greater overall market synchrony"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <MetricCard
              title="AVG CLUSTERING"
              value={networkData.stats.average_clustering}
              subtitle="Triadic closure coefficient"
              tooltip="Likelihood that two correlated peers are also correlated with each other"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <MetricCard
              title="COMMUNITIES"
              value={networkData.stats.num_communities}
              subtitle="Greedy Modularity Partition"
              tooltip="Densely connected modular subgroups"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <MetricCard
              title="GRAPH TOPOLOGY"
              value={`${networkData.stats.num_nodes}N • ${networkData.stats.num_edges}E`}
              subtitle={`Threshold ρ ≥ ${networkData.threshold}`}
              tooltip="Total active vertices and correlated edges"
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
