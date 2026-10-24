import React from 'react';
import { Button, Tooltip } from '@mui/material';
import { Download } from 'lucide-react';

interface Props {
  data: any[];
  filename: string;
  label?: string;
  disabled?: boolean;
}

export const ExportCsvButton: React.FC<Props> = ({
  data,
  filename,
  label = 'Export CSV',
  disabled = false,
}) => {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvRows: string[] = [];

    // Header row
    csvRows.push(headers.join(','));

    // Value rows
    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        if (val === null || val === undefined) return '';
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Tooltip title="Download tabular data as CSV" arrow>
      <span>
        <Button
          variant="outlined"
          size="small"
          onClick={handleExport}
          disabled={disabled || !data || data.length === 0}
          startIcon={<Download size={14} />}
          sx={{ fontSize: '0.78rem', py: 0.5, px: 1.5 }}
        >
          {label}
        </Button>
      </span>
    </Tooltip>
  );
};
