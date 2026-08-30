import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00D4FF', light: '#33DDFF', dark: '#00A3CC' },
    secondary: { main: '#1a73e8' },
    background: { default: '#0d1117', paper: '#1a1a2e' },
    success: { main: '#28a745' },
    error: { main: '#dc3545' },
    warning: { main: '#ffc107' },
    info: { main: '#17a2b8' },
    text: { primary: '#e6edf3', secondary: '#8b949e' },
  },
  typography: {
    fontFamily: '"Roboto", "Arial", sans-serif',
    h1: { fontWeight: 900, fontSize: '3rem' },
    h2: { fontWeight: 700, fontSize: '2.2rem' },
    h3: { fontWeight: 700, fontSize: '1.8rem' },
    h4: { fontWeight: 600, fontSize: '1.4rem' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, padding: '10px 24px' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});

export default theme;
