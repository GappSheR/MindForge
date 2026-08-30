import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme } from '@mui/material/styles';
import App from './App';

const baseTheme = createTheme({
  typography: {
    fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
  },
  shape: { borderRadius: 12 },
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    try {
      if (window.electronAPI && window.electronAPI.writeFile) {
        const msg = new Date().toISOString() + ' RENDER_ERROR: ' + (error.message || '') + '\n' + (info.componentStack || '') + '\n';
        window.electronAPI.writeFile(
          (window.location.pathname.includes('dist') ? '../../../' : '') + 'debug.log',
          Array.from(new TextEncoder().encode(msg))
        );
      }
    } catch (e) {}
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, background: '#0d1117', color: '#ff6b6b', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2>Ошибка</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#e6edf3' }}>
            {this.state.error.message || String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <ThemeProvider theme={baseTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </ErrorBoundary>
);