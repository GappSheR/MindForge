import React, { createContext, useState, useEffect, useContext } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const THEMES = {
  dark: {
    name: 'Тёмная',
    bg: '#1e1e1e',
    card: '#252526',
    surface: '#2d2d30',
    text: '#d4d4d4',
    muted: '#9a9a9a',
    accent: '#007ACC',
    border: '#3a3a3d',
  },
  light: {
    name: 'Светлая',
    bg: '#f3f3f3',
    card: '#ffffff',
    surface: '#fafafa',
    text: '#1f1f1f',
    muted: '#6e6e6e',
    accent: '#0066B4',
    border: '#dddddd',
  },
};

const ThemeContext = createContext(null);

export function useAppTheme() {
  return useContext(ThemeContext);
}

export default function AppThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() => {
    try {
      return localStorage.getItem('mf-theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    try { localStorage.setItem('mf-theme', themeName); } catch (e) {}
  }, [themeName]);

  const toggle = () => setThemeName(t => (t === 'dark' ? 'light' : 'dark'));

  const c = THEMES[themeName];

  const muiTheme = createTheme({
    palette: {
      mode: themeName,
      primary: { main: c.accent },
      secondary: { main: c.accent },
      background: { default: c.bg, paper: c.card },
      text: { primary: c.text, secondary: c.muted },
    },
    shape: { borderRadius: 6 },
    typography: {
      fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
      button: { textTransform: 'none' },
    },
  });

  return (
    <ThemeContext.Provider value={{ themeName, theme: c, toggle, THEMES }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}