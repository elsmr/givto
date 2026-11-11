<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## e2e

- Never run the full e2e suite (`pnpm e2e`, `pnpm e2e:api`, `pnpm e2e:ui` without a path). Run only the specs your change affects: `pnpm e2e flows/gift-day`, narrowed with `-g "<test name>"` and `--project desktop` while iterating.
- Find the affected specs by grepping `e2e/` for the UI text, route or tRPC procedure you changed.
