// Lets node run the server's TypeScript modules directly (type stripping): resolves
// extensionless relative imports (`./safe-fetch`) to `.ts` files, as the bundler does.
// Use: node --import ./tests/ts-hooks.mjs <script>
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith('.') || error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});
