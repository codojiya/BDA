import { createTheme, ThemeOptions } from '@mui/material/styles';

export const getAppTheme = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';

  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: '#2563eb', // Electric blue
        light: '#60a5fa',
        dark: '#1d4ed8',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#06b6d4', // Cyan
        light: '#67e8f9',
        dark: '#0e7490',
      },
      success: {
        main: isDark ? '#10b981' : '#059669', // Zerodha/Groww Emerald Green
        light: '#34d399',
        dark: '#047857',
        contrastText: '#ffffff',
      },
      error: {
        main: isDark ? '#f43f5e' : '#e11d48', // Crimson Red
        light: '#fb7185',
        dark: '#be123c',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
      },
      info: {
        main: '#3b82f6',
        light: '#93c5fd',
        dark: '#1d4ed8',
      },
      background: {
        default: isDark ? '#0b0f19' : '#f8fafc',
        paper: isDark ? '#111827' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f3f4f6' : '#0f172a',
        secondary: isDark ? '#9ca3af' : '#64748b',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      h1: { fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.025em' },
      h2: { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em' },
      h3: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' },
      h4: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.015em' },
      h5: { fontSize: '1.125rem', fontWeight: 600 },
      h6: { fontSize: '1rem', fontWeight: 600 },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 500 },
      subtitle2: { fontSize: '0.8125rem', fontWeight: 500 },
      body1: { fontSize: '0.875rem', lineHeight: 1.5 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 12,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: isDark
              ? '0 4px 20px -2px rgba(0, 0, 0, 0.5)'
              : '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '7px 16px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            borderRadius: 6,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '12px 16px',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(241, 245, 249, 1)',
          },
          head: {
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: isDark ? '#9ca3af' : '#64748b',
            backgroundColor: isDark ? '#111827' : '#f8fafc',
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};
