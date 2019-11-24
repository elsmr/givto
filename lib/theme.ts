export const theme = {
  space: [0, 4, 8, 16, 32, 64, 128, 256, 512],
  fonts: {
    body:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    heading: 'Lato, system-ui',
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
    text: '#000',
    background: '#fff',
    primary: '#5A51FF',
    secondary: '#FE7362',
    muted: '#f6f6f6'
  },
  borderWidths: [1, 2, 4],
  transitionTiming: 'cubic-bezier(0.07, 0.82, 0.16, 1)',
  transitionDurations: [0.3, 0.6, 1.2]
};
export type Theme = typeof theme;
