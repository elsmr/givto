export const theme = {
  space: [0, 4, 8, 16, 32, 64, 128, 256, 512],
  fonts: {
    body:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    heading: 'Lato, system-ui, sans-serif',
    monospace: 'Menlo, monospace'
  },
  fontSizes: [12, 14, 16, 20, 24, 32, 48, 64, 96],
  fontWeights: {
    body: 400,
    heading: 700,
    bold: 700
  },
  lineHeights: {
    body: 1.5,
    heading: 1.125
  },
  colors: {
    gray: [
      null,
      '#f7fafc',
      '#edf2f7',
      '#e2e8f0',
      '#cbd5e0',
      '#a0aec0',
      '#718096',
      '#4a5568',
      '#2d3748',
      '#1a202c'
    ],
    text: '#2d3748',
    background: '#fff',
    muted: '#e2e8f0',
    success: '#9ae6b4',
    info: '#63b3ed',
    warning: '#faf089',
    danger: '#FE7362',
    light: '#f7fafc',
    dark: '#2d3748',
    textMuted: '#66778A',
    primary: '#5A51FF',
    primaryMuted: '#837cff',
    secondary: '#FE7362'
  },
  borderWidths: [1, 2, 4],
  transitionTiming: 'cubic-bezier(0.07, 0.82, 0.16, 1)',
  transitionDurations: [0.3, 0.6, 1.2]
};
export type Theme = typeof theme;
