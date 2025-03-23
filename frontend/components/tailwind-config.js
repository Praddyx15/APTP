/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './visualizations/**/*.{js,ts,jsx,tsx,mdx}',
    './collaboration/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette
        'primary': {
          50: '#e6f1ff',
          100: '#cce3ff',
          200: '#99c8ff',
          300: '#66adff',
          400: '#3392ff',
          500: '#0077ff', // Primary brand color
          600: '#005fcc',
          700: '#004799',
          800: '#003066',
          900: '#001833',
        },
        // Secondary palette (aviation blue)
        'secondary': {
          50: '#edf8ff',
          100: '#dbf1ff',
          200: '#b7e3ff',
          300: '#94d5ff',
          400: '#70c7ff',
          500: '#4db9ff', // Secondary action color
          600: '#3e94cc',
          700: '#2e6f99',
          800: '#1f4a66',
          900: '#0f2533',
        },
        // Alert colors
        'success': {
          50: '#e6f7ed',
          100: '#ccefdb',
          200: '#99dfb7',
          300: '#66cf93',
          400: '#33bf6f',
          500: '#00af4b', // Success color
          600: '#008c3c',
          700: '#00692d',
          800: '#00461e',
          900: '#00230f',
        },
        'warning': {
          50: '#fff8e6',
          100: '#fff1cc',
          200: '#ffe399',
          300: '#ffd566',
          400: '#ffc733',
          500: '#ffb900', // Warning color
          600: '#cc9400',
          700: '#996f00',
          800: '#664a00',
          900: '#332500',
        },
        'danger': {
          50: '#fde9e9',
          100: '#fbd4d4',
          200: '#f7a9a9',
          300: '#f37e7e',
          400: '#ef5353',
          500: '#eb2828', // Error/danger color
          600: '#bc2020',
          700: '#8d1818',
          800: '#5e1010',
          900: '#2f0808',
        },
        // UI grays
        'ui': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280', // Base text color
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        // Aviation-specific colors
        'cockpit': {
          'dark': '#1a1a1a',
          'panel': '#2c2c2c',
          'warning': '#ffb703',
          'caution': '#fb8500',
          'normal': '#8ecae6',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        'display': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        '2xs': '0.625rem', // 10px
        'xs': '0.75rem',   // 12px
        'sm': '0.875rem',  // 14px
        'base': '1rem',    // 16px
        'lg': '1.125rem',  // 18px
        'xl': '1.25rem',   // 20px
        '2xl': '1.5rem',   // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem',  // 36px
        '5xl': '3rem',     // 48px
        '6xl': '3.75rem',  // 60px
        '7xl': '4.5rem',   // 72px
        '8xl': '6rem',     // 96px
        '9xl': '8rem',     // 128px
      },
      borderRadius: {
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      spacing: {
        '0': '0',
        '0.5': '0.125rem',
        '1': '0.25rem',
        '1.5': '0.375rem',
        '2': '0.5rem',
        '2.5': '0.625rem',
        '3': '0.75rem',
        '3.5': '0.875rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '7': '1.75rem',
        '8': '2rem',
        '9': '2.25rem',
        '10': '2.5rem',
        '11': '2.75rem',
        '12': '3rem',
        '14': '3.5rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
        '28': '7rem',
        '32': '8rem',
        '36': '9rem',
        '40': '10rem',
        '44': '11rem',
        '48': '12rem',
        '52': '13rem',
        '56': '14rem',
        '60': '15rem',
        '64': '16rem',
        '72': '18rem',
        '80': '20rem',
        '96': '24rem',
        '112': '28rem',
        '128': '32rem',
        '144': '36rem',
        '160': '40rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'none': 'none',
        // Aviation-specific shadows
        'panel': '0 4px 8px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)',
        'instrument': '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        'floating': '0 8px 16px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'fade-out': 'fadeOut 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-out-right': 'slideOutRight 0.3s ease-in',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-out-left': 'slideOutLeft 0.3s ease-in',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'slide-out-up': 'slideOutUp 0.3s ease-in',
        'slide-in-down': 'slideInDown 0.3s ease-out',
        'slide-out-down': 'slideOutDown 0.3s ease-in',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-warning': 'pulseWarning 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutLeft: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideOutUp: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideOutDown: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        pulseWarning: {
          '0%, 100%': { backgroundColor: 'rgba(255, 185, 0, 0.1)' },
          '50%': { backgroundColor: 'rgba(255, 185, 0, 0.3)' },
        },
      },
      // Custom aviation-related measurements
      height: {
        'cockpit-panel': '24rem',
        'instrument-panel': '18rem',
        'screen-minus-header': 'calc(100vh - 4rem)',
        'screen-minus-header-footer': 'calc(100vh - 8rem)',
      },
      // Z-index utility
      zIndex: {
        'behind': '-1',
        'default': '0',
        'floating': '10',
        'dropdown': '20',
        'sticky': '30',
        'fixed': '40',
        'modal-backdrop': '50',
        'modal': '60',
        'popover': '70',
        'tooltip': '80',
        'notification': '90',
        'top': '100',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    function ({ addComponents }) {
      // Add custom component classes
      addComponents({
        '.cockpit-panel': {
          backgroundColor: '#1f2937',
          borderRadius: '0.375rem',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)',
          padding: '1rem',
          border: '1px solid #374151',
        },
        '.instrument-display': {
          backgroundColor: '#111827',
          borderRadius: '0.25rem',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
          padding: '0.75rem',
          border: '1px solid #1f2937',
          color: '#8ecae6',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.875rem',
        },
        '.warning-indicator': {
          backgroundColor: '#771500',
          color: '#ffb703',
          borderRadius: '0.25rem',
          padding: '0.5rem 0.75rem',
          fontWeight: '600',
          boxShadow: 'inset 0 0 4px #ffb703',
          animation: 'pulseWarning 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        '.data-tag': {
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: '#4db9ff20',
          color: '#4db9ff',
          borderRadius: '9999px',
          padding: '0.25rem 0.75rem',
          fontSize: '0.75rem',
          fontWeight: '500',
          border: '1px solid #4db9ff40',
        },
        '.control-button': {
          backgroundColor: '#1f2937',
          borderRadius: '0.375rem',
          border: '1px solid #374151',
          padding: '0.5rem 1rem',
          color: '#d1d5db',
          fontWeight: '500',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
          transition: 'all 100ms ease-in-out',
          '&:hover': {
            backgroundColor: '#2c3c4f',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          },
          '&:active': {
            backgroundColor: '#1a2636',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
            transform: 'translateY(1px)',
          },
        },
      });
    },
  ],
  safelist: [
    // Core colors that should never be purged
    {
      pattern: /(bg|text|border|ring)-(primary|secondary|success|warning|danger|ui)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    // Animation safelist
    {
      pattern: /animate-(fade|slide|spin|ping|pulse)-.*/,
    },
    // Cockpit specific classes
    {
      pattern: /(cockpit-panel|instrument-display|warning-indicator|data-tag|control-button)/,
    },
  ],
}