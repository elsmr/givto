<div align="center">
		<img width="200" height="200" src="public/givto-logo.png" alt="Givto logo">
</div>

# Givto ![](https://github.com/elsmr/givto/workflows/CI/badge.svg)

> Givto: Secret Santa app 🎅🎁

## Features

- Start a Secret Santa and share one link in the group chat; people join with their name and an emailed code (email invites too)
- Sign in with an emailed code or link, or a passkey: no passwords
- Phases from draft to open, drawn, gift day and done: scheduled draws, deadlines, reminders, calendar events
- A fair draw that keeps households and chosen pairs apart, and avoids last year's giftee
- One wishlist for all your groups: prices, links, import from a shop URL, hide wishes per group, Dibs! so nobody buys the same gift
- Tips for someone's Santa, anonymous questions and Psst! nudges between Santa and giftee
- Gift day: unwrap order, presenter view and the big reveal
- Same again next year: groups keep their people, each year is a new edition
- English and Dutch, light and dark mode, made for phones

## Local development

Needs Node 24, pnpm and Docker (Docker Desktop or [Colima](https://github.com/abiosoft/colima)).

```sh
pnpm install
pnpm dev:local   # Mongo and the mail mock in Docker (docker-compose.yml), then next dev on :3000
pnpm seed        # (second terminal) wipes the local database, adds demo groups, one per phase
```

Sign in at http://localhost:3000 with `you@example.test` (or the `SEED_EMAIL` you seeded with).
Mail doesn't leave your machine: codes, links and every other email land in the inbox at
http://localhost:3091.

- `pnpm cron tick` runs the scheduled jobs once (draws, gift day, emails), `pnpm cron retention` the daily
  cleanup, as Vercel Cron does in production.
- `pnpm test` runs the checks; `pnpm e2e` the Playwright tests: stop `next dev` and run `pnpm build` first
  (both write `.next`); e2e starts its own app, Mongo and mail mock, see [e2e/README.md](e2e/README.md).
- `docker compose down` stops the services; `docker compose down -v` also deletes the database.

Local settings live in `.env.development` (committed, dev-only values). `next dev` loads it over `.env`
and it sets every variable the app reads, so a `.env` file is not used for local development.
Production secrets live in Vercel only.
