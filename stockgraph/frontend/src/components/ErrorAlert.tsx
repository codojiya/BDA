import React from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';
import { RotateCw } from 'lucide-react';

interface Props {
  error: string | Error;
  onRetry?: () => void;
}

export const ErrorAlert: React.FC<Props> = ({ error, onRetry }) => {
  const message = typeof error === 'string' ? error : error?.message || 'An unexpected error occurred.';

  return (
    <Box sx={{ my: 2 }}>
      <Alert
        severity="error"
        action={
          onRetry && (
            <Button
              color="inherit"
              size="small"
              onClick={onRetry}
              startIcon={<RotateCw size={14} />}
            >
              Retry
            </Button>
          )
        }
      >
        <AlertTitle sx={{ fontWeight: 600 }}>Error Loading Data</AlertTitle>
        {message}
      </Alert>
    </Box>
  );
};
