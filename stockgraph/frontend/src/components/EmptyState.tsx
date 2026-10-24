import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { SearchX } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<Props> = ({
  title = 'No Data Found',
  description = 'Try adjusting your filters or search terms to see results.',
  actionText,
  onAction,
  icon,
}) => {
  return (
    <Box
      sx={{
        py: 8,
        px: 3,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          p: 2,
          mb: 2,
          borderRadius: '50%',
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
          color: 'text.secondary',
        }}
      >
        {icon || <SearchX size={36} />}
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: actionText ? 2.5 : 0 }}>
        {description}
      </Typography>

      {actionText && onAction && (
        <Button variant="outlined" size="small" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </Box>
  );
};
