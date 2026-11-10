// Renders every email template in every locale (14): no missing messages or variables, HTML
// under Gmail's 102 KB clip, a plain-text part with the button's link, `lang` set.
// EMAIL_PREVIEW_DIR=<dir> also writes each rendered HTML there for browser previews.
// Run: pnpm test (or node tests/emails.check.mjs)
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The templates are TSX: compile them with Next's SWC (already installed) as node loads them.
const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc/index.js');
await swc.loadBindings();
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith('.') || error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        return nextResolve(`${specifier}.tsx`, context);
      }
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.json')) {
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

process.env.BETTER_AUTH_URL ??= 'https://givto.example';
const { render } = await import('@react-email/render');
const { emailPreviews } = await import('../emails/previews.tsx');
const { emailTranslator } = await import('../emails/ui/translator.ts');

const MAX_HTML_BYTES = 102 * 1024;
const previewDir = process.env.EMAIL_PREVIEW_DIR;
if (previewDir) mkdirSync(previewDir, { recursive: true });

for (const locale of ['en', 'nl']) {
  for (const preview of await emailPreviews(locale)) {
    const label = `${preview.name} (${locale})`;
    const [html, text] = await Promise.all([render(preview.body), render(preview.body, { plainText: true })]);
    assert.ok(preview.subject.length > 0 && !/[{}]/.test(preview.subject), `${label}: subject ${preview.subject}`);
    assert.ok(Buffer.byteLength(html) < MAX_HTML_BYTES, `${label}: ${Buffer.byteLength(html)} bytes`);
    assert.match(html, new RegExp(`<html[^>]* lang="${locale}"`), `${label}: lang`);
    for (const [output, kind] of [[html, 'html'], [text, 'text']]) {
      assert.ok(!/undefined|NaN|\{[a-z-]+\}/.test(output), `${label}: unfilled variable in ${kind}`);
    }
    assert.ok(text.trim().length > 50, `${label}: plain text`);
    // Dutch copy says "namen trekken" and "je persoon"; "lootjes" is only for search metadata.
    assert.ok(!/lootje/i.test(`${preview.subject} ${text}`), `${label}: says lootje`);
    if (preview.url) assert.ok(text.includes(preview.url), `${label}: link in plain text`);
    // Account emails end with "Givto · givto.app"; notifications say why they come and how to stop them.
    const account = ['sign-in', 'delete-account', 'invite', 'join-reminder'].includes(preview.name);
    assert.equal(text.includes('Givto · givto.example'), account, `${label}: site footer line`);
    assert.equal(text.includes(emailTranslator(locale)('layout.why')), !account, `${label}: why footer line`);
    for (const secret of preview.mustNotContain ?? []) {
      assert.ok(!html.includes(secret) && !text.includes(secret) && !preview.subject.includes(secret), `${label}: leaks ${secret}`);
    }
    if (previewDir) writeFileSync(join(previewDir, `${preview.name}.${locale}.html`), html);
  }
}

console.log('ok  emails: every template renders in en and nl, < 102 KB, with plain text');
