import React from 'react';
import { Card, CardContent, Skeleton, Box } from '@mui/material';

interface Props {
  height?: number;
  lines?: number;
  type?: 'card' | 'chart' | 'table';
}

export const LoadingSkeleton: React.FC<Props> = ({
  height = 300,
  lines = 4,
  type = 'chart',
}) => {
  if (type === 'card') {
    return (
      <Card sx={{ height: 140, p: 2 }}>
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="text" width="70%" height={48} sx={{ my: 1 }} />
        <Skeleton variant="rectangular" width="30%" height={20} sx={{ borderRadius: 1 }} />
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2, height }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Skeleton variant="text" width="25%" height={28} />
        <Skeleton variant="rectangular" width="15%" height={28} sx={{ borderRadius: 1 }} />
      </Box>
      <Skeleton
        variant="rectangular"
        height={height - 80}
        sx={{ borderRadius: 2 }}
        animation="wave"
      />
    </Card>
  );
};
