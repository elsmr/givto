const systemFonts =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

export const theme = {
  space: [0, 8, 16, 32, 48],
  fontSizes: [12, 16, 20, 24, 32, 48],
  fontWeights: [400, 700, 900],
  fontFamilies: {
    display: systemFonts,
    title: `Lato, ${systemFonts}`
  },
  breakpoints: ['40em', '52em', '64em'],
  borderWidths: [2],
  colors: {
    primary: '#5A51FF',
    secondary: '#FE7362',
    white: '#fff',
    black: '#3E3E3E'
  },
  transitionTiming: 'cubic-bezier(0.07, 0.82, 0.16, 1)',
  transitionDurations: [0.3]
};

export type Theme = typeof theme;
