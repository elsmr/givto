// pnpm cron <job>: runs a scheduled job on the local dev app, as Vercel Cron does (tick, retention;
// see lib/server/jobs/index.ts). BETTER_AUTH_URL and CRON_SECRET come from .env.development.
const job = process.argv[2];
if (!job) {
  console.error('usage: pnpm cron <job>   (tick, retention)');
  process.exit(2);
}
const response = await fetch(`${process.env.BETTER_AUTH_URL}/api/cron/${encodeURIComponent(job)}`, {
  headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
});
console.log(response.status, await response.text());
process.exit(response.ok ? 0 : 1);
