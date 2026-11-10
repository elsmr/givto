// Lets node run the app's TypeScript directly, as the bundler does: extensionless relative imports
// resolve to `.ts` then `.tsx`, `.tsx` (the email templates) compiles with Next's SWC (already
// installed), `.json` (messages) imports without import attributes, and directory imports resolve to
// their `index.ts`. Node strips `.ts` types itself.
// Use: node --import ./tests/ts-hooks.mjs <script>
import { readFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc/index.js');
await swc.loadBindings();

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith('.')) throw error;
      if (error?.code === 'ERR_UNSUPPORTED_DIR_IMPORT') return nextResolve(`${specifier}/index.ts`, context);
      if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        return nextResolve(`${specifier}.tsx`, context);
      }
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.json') && !url.includes('/node_modules/')) {
      return { format: 'module', source: `export default ${readFileSync(fileURLToPath(url), 'utf8')}`, shortCircuit: true };
    }
    if (!url.endsWith('.tsx')) return nextLoad(url, context);
    const { code } = swc.transformSync(readFileSync(fileURLToPath(url), 'utf8'), {
      filename: fileURLToPath(url),
      jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2022' },
      module: { type: 'es6' },
    });
    return { format: 'module', source: code, shortCircuit: true };
  },
});
