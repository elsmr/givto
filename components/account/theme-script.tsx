import { applyTheme } from './theme';

// Runs before the first paint (no light flash in dark mode) and follows system changes.
const source = `(${applyTheme})();matchMedia('(prefers-color-scheme: dark)').addEventListener('change',${applyTheme});`;

export const ThemeScript = () => <script dangerouslySetInnerHTML={{ __html: source }} />;
