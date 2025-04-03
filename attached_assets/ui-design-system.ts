import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';

// Define theme color tokens
const tokens = {
  light: {
    primary: {
      main: '#2563EB',     // Primary blue
      light: '#3B82F6',
      dark: '#1D4ED8',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#059669',     // Secondary green
      light: '#10B981',
      dark: '#047857',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#DC2626',     // Error red
      light: '#EF4444',
      dark: '#B91C1C',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#D97706',     // Warning orange
      light: '#F59E0B',
      dark: '#B45309',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#0284C7',     // Info blue
      light: '#0EA5E9',
      dark: '#0369A1',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#059669',     // Success green
      light: '#10B981',
      dark: '#047857',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8FAFC',  // Light gray background
      paper: '#FFFFFF',    // White paper surfaces
      card: '#FFFFFF',     // Card background
      dialog: '#FFFFFF',   // Dialog background
      appBar: '#FFFFFF',   // App bar background
    },
    text: {
      primary: '#0F172A',  // Dark text
      secondary: '#475569', // Medium gray text
      disabled: '#94A3B8',  // Light gray text
      hint: '#64748B',      // Hint text
    },
    border: {
      main: '#E2E8F0',     // Border color
      light: '#F1F5F9',    // Light border
      dark: '#CBD5E1',     // Dark border
    },
    divider: '#E2E8F0',    // Divider color
    // Specialized colors for aviation/training context
    chart: {
      blue: '#2563EB',      // Primary series
      green: '#10B981',     // Secondary series
      amber: '#F59E0B',     // Warning series
      red: '#EF4444',       // Critical series 
      purple: '#8B5CF6',    // Additional series
      cyan: '#06B6D4',      // Additional series
      pink: '#EC4899',      // Additional series
    },
    status: {
      active: '#22C55E',    // Active status
      standby: '#F59E0B',   // Standby status
      caution: '#EAB308',   // Caution status
      warning: '#F97316',   // Warning status
      danger: '#EF4444',    // Danger status
      offline: '#94A3B8',   // Offline status
    },
    proficiency: {
      level1: '#EF4444',    // Unsatisfactory
      level2: '#F97316',    // Below standards
      level3: '#22C55E',    // Meets standards
      level4: '#10B981',    // Exceeds standards
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    }
  },
  dark: {
    primary: {
      main: '#3B82F6',     // Primary blue (lighter for dark mode)
      light: '#60A5FA',
      dark: '#2563EB',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#10B981',     // Secondary green (lighter for dark mode)
      light: '#34D399',
      dark: '#059669',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF4444',     // Error red (lighter for dark mode)
      light: '#F87171',
      dark: '#DC2626',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F59E0B',     // Warning orange (lighter for dark mode)
      light: '#FBBF24',
      dark: '#D97706',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#0EA5E9',     // Info blue (lighter for dark mode)
      light: '#38BDF8',
      dark: '#0284C7',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#10B981',     // Success green (lighter for dark mode)
      light: '#34D399',
      dark: '#059669',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0F172A',  // Dark blue-gray background
      paper: '#1E293B',    // Slightly lighter surface
      card: '#1E293B',     // Card background
      dialog: '#1E293B',   // Dialog background
      appBar: '#1E293B',   // App bar background
    },
    text: {
      primary: '#F1F5F9',  // Light text
      secondary: '#CBD5E1', // Medium light gray text
      disabled: '#64748B',  // Dark gray text
      hint: '#94A3B8',      // Hint text
    },
    border: {
      main: '#334155',     // Border color
      light: '#475569',    // Light border
      dark: '#1E293B',     // Dark border
    },
    divider: '#334155',    // Divider color
    // Specialized colors for aviation/training context - brighter in dark mode
    chart: {
      blue: '#60A5FA',      // Primary series
      green: '#34D399',     // Secondary series
      amber: '#FBBF24',     // Warning series
      red: '#F87171',       // Critical series 
      purple: '#A78BFA',    // Additional series
      cyan: '#22D3EE',      // Additional series
      pink: '#F472B6',      // Additional series
    },
    status: {
      active: '#4ADE80',    // Active status
      standby: '#FBBF24',   // Standby status
      caution: '#FCD34D',   // Caution status
      warning: '#FB923C',   // Warning status
      danger: '#F87171',    // Danger status
      offline: '#94A3B8',   // Offline status
    },
    proficiency: {
      level1: '#F87171',    // Unsatisfactory
      level2: '#FB923C',    // Below standards
      level3: '#4ADE80',    // Meets standards
      level4: '#34D399',    // Exceeds standards
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
    }
  },
};

// Define typography settings
const typography = {
  fontFamily: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.01562em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.00833em',
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '0em',
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '0.00735em',
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '0em',
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '0.0075em',
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '0.00938em',
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '0.00714em',
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0.00938em',
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0.01071em',
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.75,
    letterSpacing: '0.02857em',
    textTransform: 'none',
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.66,
    letterSpacing: '0.03333em',
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 2.66,
    letterSpacing: '0.08333em',
    textTransform: 'uppercase',
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
};

// Define shape settings
const shape = {
  borderRadius: 8,
  cardBorderRadius: 12,
  buttonBorderRadius: 8,
  inputBorderRadius: 8,
  dialogBorderRadius: 12,
};

// Define transition settings
const transitions = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  enter: 'cubic-bezier(0.0, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },
};

// Customize component overrides for both themes
const getComponentOverrides = (mode) => ({
  MuiCssBaseline: {
    styleOverrides: {
      '*': {
        boxSizing: 'border-box',
      },
      'html, body': {
        height: '100%',
        width: '100%',
        margin: 0,
        padding: 0,
      },
      '#root': {
        height: '100%',
        width: '100%',
      },
      '::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '::-webkit-scrollbar-track': {
        background: mode === 'light' ? '#F1F5F9' : '#1E293B',
      },
      '::-webkit-scrollbar-thumb': {
        background: mode === 'light' ? '#CBD5E1' : '#475569',
        borderRadius: '4px',
      },
      '::-webkit-scrollbar-thumb:hover': {
        background: mode === 'light' ? '#94A3B8' : '#64748B',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        boxShadow: 'none',
        borderRadius: shape.buttonBorderRadius,
        padding: '8px 16px',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      contained: {
        '&:hover': {
          boxShadow: 'none',
        },
      },
      containedPrimary: {
        '&:hover': {
          backgroundColor: mode === 'light' ? tokens.light.primary.dark : tokens.dark.primary.light,
        },
      },
      containedSecondary: {
        '&:hover': {
          backgroundColor: mode === 'light' ? tokens.light.secondary.dark : tokens.dark.secondary.light,
        },
      },
      outlined: {
        borderWidth: '1px',
        '&:hover': {
          borderWidth: '1px',
        },
      },
      outlinedPrimary: {
        borderColor: mode === 'light' ? tokens.light.primary.main : tokens.dark.primary.main,
        '&:hover': {
          backgroundColor: mode === 'light' ? 'rgba(37, 99, 235, 0.04)' : 'rgba(59, 130, 246, 0.08)',
        },
      },
      startIcon: {
        marginRight: 8,
      },
      endIcon: {
        marginLeft: 8,
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: shape.cardBorderRadius,
        boxShadow: mode === 'light' ? tokens.light.shadows.md : tokens.dark.shadows.md,
        overflow: 'visible',
      },
    },
  },
  MuiCardHeader: {
    styleOverrides: {
      root: {
        padding: '16px 24px',
      },
      title: {
        fontSize: '1.25rem',
        fontWeight: 600,
      },
      subheader: {
        fontSize: '0.875rem',
        color: mode === 'light' ? tokens.light.text.secondary : tokens.dark.text.secondary,
      },
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: {
        padding: '24px',
        '&:last-child': {
          paddingBottom: '24px',
        },
      },
    },
  },
  MuiCardActions: {
    styleOverrides: {
      root: {
        padding: '16px 24px',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        height: 32,
        fontSize: '0.875rem',
        fontWeight: 500,
      },
      filled: {
        backgroundColor: mode === 'light' ? tokens.light.primary.light : tokens.dark.primary.dark,
        color: mode === 'light' ? tokens.light.primary.contrastText : tokens.dark.primary.contrastText,
      },
      outlined: {
        borderWidth: 1,
        backgroundColor: 'transparent',
      },
      deleteIcon: {
        color: 'inherit',
        '&:hover': {
          color: 'inherit',
          opacity: 0.7,
        },
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: shape.dialogBorderRadius,
        boxShadow: mode === 'light' ? tokens.light.shadows.xl : tokens.dark.shadows.xl,
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        padding: '24px 24px 16px 24px',
        fontSize: '1.25rem',
        fontWeight: 600,
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: '16px 24px',
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '16px 24px 24px 24px',
      },
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: mode === 'light' ? tokens.light.divider : tokens.dark.divider,
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: mode === 'light' ? tokens.light.background.paper : tokens.dark.background.paper,
        border: 'none',
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: shape.buttonBorderRadius,
        padding: 8,
        '&:hover': {
          backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
        },
      },
      colorPrimary: {
        '&:hover': {
          backgroundColor: mode === 'light' ? 'rgba(37, 99, 235, 0.04)' : 'rgba(59, 130, 246, 0.08)',
        },
      },
      colorSecondary: {
        '&:hover': {
          backgroundColor: mode === 'light' ? 'rgba(5, 150, 105, 0.04)' : 'rgba(16, 185, 129, 0.08)',
        },
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 4,
        height: 6,
        backgroundColor: mode === 'light' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(59, 130, 246, 0.16)',
      },
      bar: {
        borderRadius: 4,
      },
    },
  },
  MuiLink: {
    styleOverrides: {
      root: {
        fontWeight: 500,
        '&:hover': {
          textDecoration: 'none',
        },
      },
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        paddingTop: 12,
        paddingBottom: 12,
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: shape.borderRadius,
        '&.Mui-selected': {
          backgroundColor: mode === 'light' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.16)',
          '&:hover': {
            backgroundColor: mode === 'light' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(59, 130, 246, 0.24)',
          },
        },
        '&:hover': {
          backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
        },
      },
    },
  },
  MuiListItemIcon: {
    styleOverrides: {
      root: {
        minWidth: 40,
        color: mode === 'light' ? tokens.light.text.secondary : tokens.dark.text.secondary,
      },
    },
  },
  MuiListItemText: {
    styleOverrides: {
      primary: {
        fontSize: '0.9375rem',
        fontWeight: 500,
      },
      secondary: {
        fontSize: '0.875rem',
        color: mode === 'light' ? tokens.light.text.secondary : tokens.dark.text.secondary,
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: shape.borderRadius,
        boxShadow: mode === 'light' ? tokens.light.shadows.lg : tokens.dark.shadows.lg,
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        padding: '8px 16px',
        minHeight: 'auto',
        fontSize: '0.9375rem',
        '&.Mui-selected': {
          backgroundColor: mode === 'light' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.16)',
          '&:hover': {
            backgroundColor: mode === 'light' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(59, 130, 246, 0.24)',
          },
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
      rounded: {
        borderRadius: shape.borderRadius,
      },
      elevation1: {
        boxShadow: mode === 'light' ? tokens.light.shadows.sm : tokens.dark.shadows.sm,
      },
      elevation4: {
        boxShadow: mode === 'light' ? tokens.light.shadows.md : tokens.dark.shadows.md,
      },
      elevation8: {
        boxShadow: mode === 'light' ? tokens.light.shadows.lg : tokens.dark.shadows.lg,
      },
      elevation16: {
        boxShadow: mode === 'light' ? tokens.light.shadows.xl : tokens.dark.shadows.xl,
      },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      switchBase: {
        padding: 2,
        '&.Mui-checked': {
          transform: 'translateX(20px)',
          color: '#fff',
          '& + .MuiSwitch-track': {
            opacity: 1,
            backgroundColor: mode === 'light' ? tokens.light.primary.main : tokens.dark.primary.main,
          },
        },
      },
      thumb: {
        width: 16,
        height: 16,
        boxShadow: 'none',
      },
      track: {
        opacity: 1,
        borderRadius: 16,
        backgroundColor: mode === 'light' ? tokens.light.text.disabled : tokens.dark.text.disabled,
      },
      root: {
        width: 42,
        height: 24,
        padding: 0,
        '.MuiSwitch-switchBase': {
          padding: 4,
        },
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontSize: '0.9375rem',
        fontWeight: 500,
        minWidth: 100,
        padding: '12px 16px',
        '&.Mui-selected': {
          fontWeight: 600,
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      head: {
        fontWeight: 600,
        fontSize: '0.875rem',
        backgroundColor: mode === 'light' ? tokens.light.background.default : tokens.dark.background.default,
      },
      body: {
        fontSize: '0.9375rem',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: shape.inputBorderRadius,
          '& fieldset': {
            borderColor: mode === 'light' ? tokens.light.border.main : tokens.dark.border.main,
          },
          '&:hover fieldset': {
            borderColor: mode === 'light' ? tokens.light.border.dark : tokens.dark.border.light,
          },
          '&.Mui-focused fieldset': {
            borderColor: mode === 'light' ? tokens.light.primary.main : tokens.dark.primary.main,
          },
        },
      },
    },
  },
  MuiToolbar: {
    styleOverrides: {
      root: {
        minHeight: '64px !important',
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.75)',
        color: mode === 'light' ? '#fff' : '#000',
        fontSize: '0.75rem',
        fontWeight: 400,
        padding: '8px 12px',
        borderRadius: 4,
      },
      arrow: {
        color: mode === 'light' ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.75)',
      },
    },
  },
});

// Define animation settings
const aviation = {
  // Flight animations for feedback
  animation: {
    takeoff: {
      enter: 'cubic-bezier(0.0, 0, 0.2, 1)',
      exit: 'cubic-bezier(0.4, 0, 1, 1)',
      duration: '400ms',
    },
    landing: {
      enter: 'cubic-bezier(0.2, 0, 0.4, 1)',
      exit: 'cubic-bezier(0.4, 0, 0.2, 1)',
      duration: '600ms',
    },
    turbulence: {
      keyframes: '{ 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 50% { transform: translateX(5px); } 75% { transform: translateX(-3px); } }',
      duration: '250ms',
    },
  },
  // Aviation-specific UI elements
  indicators: {
    alertLevels: [
      { name: 'normal', color: '#22C55E' },
      { name: 'advisory', color: '#F59E0B' },
      { name: 'caution', color: '#EAB308' },
      { name: 'warning', color: '#F97316' },
      { name: 'danger', color: '#EF4444' },
    ],
    grading: [
      { name: 'unsatisfactory', value: 1, color: '#EF4444' },
      { name: 'below-standards', value: 2, color: '#F97316' },
      { name: 'meets-standards', value: 3, color: '#22C55E' },
      { name: 'exceeds-standards', value: 4, color: '#10B981' },
    ],
  },
};

// Create Context for Theme Mode
type ThemeContextType = {
  mode: 'light' | 'dark';
  toggleMode: () => void;
  tokens: typeof tokens.light | typeof tokens.dark;
  aviation: typeof aviation;
};

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleMode: () => {},
  tokens: tokens.light,
  aviation: aviation,
});

// Theme Provider Component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check user preference for dark mode
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Check for stored theme preference or use system preference
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const storedMode = localStorage.getItem('themeMode');
    if (storedMode === 'light' || storedMode === 'dark') {
      return storedMode;
    }
    return prefersDarkMode ? 'dark' : 'light';
  });

  // Update localStorage when mode changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Toggle theme function
  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Create theme based on current mode
  const theme = React.useMemo(() => {
    // Select token set based on mode
    const currentTokens = mode === 'light' ? tokens.light : tokens.dark;
    
    // Create MUI theme with our design tokens
    return createTheme({
      palette: {
        mode,
        primary: currentTokens.primary,
        secondary: currentTokens.secondary,
        error: currentTokens.error,
        warning: currentTokens.warning,
        info: currentTokens.info,
        success: currentTokens.success,
        background: currentTokens.background,
        text: currentTokens.text,
        divider: currentTokens.divider,
      },
      typography,
      shape: {
        borderRadius: shape.borderRadius,
      },
      transitions: {
        easing: {
          easeInOut: transitions.standard,
          easeOut: transitions.enter,
          easeIn: transitions.exit,
          sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
        },
        duration: transitions.duration,
      },
      components: getComponentOverrides(mode),
    });
  }, [mode]);

  // Context value
  const contextValue = {
    mode,
    toggleMode,
    tokens: mode === 'light' ? tokens.light : tokens.dark,
    aviation,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Export theme-related constants
export { tokens, typography, shape, transitions, aviation };

// Custom components that utilize the theme system

// ThemeToggle component for switching between light and dark modes
export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { mode, toggleMode } = useTheme();
  
  return (
    <div className={className}>
      <IconButton 
        onClick={toggleMode} 
        color="inherit" 
        aria-label="toggle theme"
        sx={{ 
          backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
          '&:hover': {
            backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
          }
        }}
      >
        {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </div>
  );
};

// StatusIndicator component for showing aviation-specific status
type StatusType = 'active' | 'standby' | 'caution' | 'warning' | 'danger' | 'offline';

export const StatusIndicator: React.FC<{ 
  status: StatusType;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}> = ({ status, label, size = 'medium', className }) => {
  const { tokens } = useTheme();
  
  const getStatusColor = (status: StatusType) => {
    return tokens.status[status] || tokens.status.offline;
  };
  
  const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small':
        return { width: 8, height: 8, fontSize: '0.75rem' };
      case 'large':
        return { width: 16, height: 16, fontSize: '1rem' };
      default:
        return { width: 12, height: 12, fontSize: '0.875rem' };
    }
  };
  
  const sizeStyles = getSizeStyles(size);
  
  return (
    <Box 
      className={className}
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1 
      }}
    >
      <Box 
        sx={{ 
          width: sizeStyles.width, 
          height: sizeStyles.height, 
          borderRadius: '50%', 
          backgroundColor: getStatusColor(status),
          boxShadow: `0 0 8px ${getStatusColor(status)}`,
          display: 'inline-block',
          animation: status === 'warning' || status === 'danger' 
            ? 'pulse 1.5s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.6 },
            '100%': { opacity: 1 },
          },
        }} 
      />
      {label && (
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: sizeStyles.fontSize,
            fontWeight: 500,
            color: 'text.secondary',
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );
};

// ProficiencyBadge component for training assessment levels
type ProficiencyLevel = 1 | 2 | 3 | 4;

export const ProficiencyBadge: React.FC<{
  level: ProficiencyLevel;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}> = ({ level, showLabel = true, size = 'medium', className }) => {
  const { tokens, aviation } = useTheme();
  
  const getLevelInfo = (level: ProficiencyLevel) => {
    const levelInfo = aviation.indicators.grading.find(g => g.value === level);
    return {
      color: levelInfo?.color || tokens.text.disabled,
      label: levelInfo?.name.replace('-', ' ') || 'Unknown',
    };
  };
  
  const levelInfo = getLevelInfo(level);
  
  const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small':
        return { height: 24, fontSize: '0.75rem', padding: '0 8px' };
      case 'large':
        return { height: 36, fontSize: '1rem', padding: '0 16px' };
      default:
        return { height: 32, fontSize: '0.875rem', padding: '0 12px' };
    }
  };
  
  const sizeStyles = getSizeStyles(size);
  
  return (
    <Box 
      className={className}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        height: sizeStyles.height,
        backgroundColor: `${levelInfo.color}20`, // 20% opacity
        color: levelInfo.color,
        borderRadius: sizeStyles.height,
        padding: sizeStyles.padding,
        fontWeight: 600,
        fontSize: sizeStyles.fontSize,
      }}
    >
      {level}
      {showLabel && (
        <Typography 
          component="span" 
          sx={{ 
            ml: 0.5, 
            fontSize: 'inherit',
            fontWeight: 500,
            textTransform: 'capitalize',
          }}
        >
          {levelInfo.label}
        </Typography>
      )}
    </Box>
  );
};

// Required MUI imports
import { 
  Box, 
  IconButton, 
  Typography 
} from '@mui/material';

// Icons
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

export default ThemeProvider;
