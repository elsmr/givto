// Email design tokens (07): the app's palette, square corners, ink borders. Email clients
// drop box-shadow and web fonts, so shadows are table cells (shadow.tsx) and headings fall
// back to Arial Black.
export const color = {
  ink: '#111111',
  page: '#FFF8EC',
  surface: '#FFFFFF',
  primary: '#5A51FF',
  primaryMuted: '#BDB9FF',
  coral: '#FE7362',
  yellow: '#FFD23F',
  mint: '#4ADE80',
  textMuted: '#5C5C66',
};

// Dark mode (53, G2): outlines and hard shadows stay black, warm purple page and card, cream text
// only; colour fills (button, code box) keep their light look with their own text colour.
export const darkColor = {
  page: '#2B1C3B',
  surface: '#3C2D51',
  ink: '#FFF8EC',
  textMuted: '#C7BFD8',
  outline: '#111111',
};

export const font = {
  heading: '"Bricolage Grotesque", "Arial Black", Arial, Helvetica, sans-serif',
  body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  code: '"SFMono-Regular", Menlo, Consolas, "Courier New", monospace',
};

export const BORDER = 3;
