#!/usr/bin/env bash
# Isolated test environment: Mongo (single-node replica set, for transactions) in Docker,
# the mail mock and the app. Sets every env var the app reads, so a local .env is never
# used (process env wins over .env in Next) and no production value can leak in.
#
# Usage (from the repo root):
#   tests/env.sh <name> <app_port> <mongo_port> <mail_port> [dev|start]
#     dev   (default) next dev
#     start next start; run `pnpm build` first. Don't run both in one checkout: dev overwrites .next.
#   tests/env.sh stop <name> <app_port> <mail_port>
set -euo pipefail

if [ "${1:-}" = stop ]; then
  name=$2 app=$3 mail=$4
  for port in "$app" "$mail"; do lsof -nP -iTCP:"$port" -sTCP:LISTEN -t | xargs kill 2>/dev/null || true; done
  docker stop "givto-mongo-$name" >/dev/null 2>&1 || true
  echo "stopped: app=$app mail=$mail mongo=givto-mongo-$name"
  exit 0
fi

name=$1 app=$2 mongo=$3 mail=$4 mode=${5:-dev}
logs=${LOG_DIR:-${TMPDIR:-/tmp}/givto-test-$name}
mkdir -p "$logs"

docker rm -f "givto-mongo-$name" >/dev/null 2>&1 || true
docker run -d --rm --name "givto-mongo-$name" -p "$mongo:27017" mongo:latest --replSet rs0 >/dev/null
until docker exec "givto-mongo-$name" mongosh --quiet --eval 'db.runCommand({ ping: 1 }).ok' >/dev/null 2>&1; do sleep 1; done
docker exec "givto-mongo-$name" mongosh --quiet \
  --eval 'rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "localhost:27017" }] })' >/dev/null
until docker exec "givto-mongo-$name" mongosh --quiet --eval 'db.hello().isWritablePrimary' 2>/dev/null | grep -q true; do sleep 1; done

MAIL_PORT=$mail nohup node tests/mail-mock.mjs >"$logs/mail.log" 2>&1 &

export MONGODB_URI="mongodb://localhost:$mongo/?directConnection=true"
export MONGODB_DB=givto_test
export MAILGUN_API_BASE="http://localhost:$mail"
export MAILGUN_API_KEY=test-key
export BETTER_AUTH_URL="http://localhost:$app"
export BETTER_AUTH_SECRET=test-secret-test-secret-test-secret-0123
export BETTER_AUTH_TELEMETRY=0
export CRON_SECRET=test-cron-secret
export MAILGUN_WEBHOOK_SIGNING_KEY=test-webhook-signing-key
export LOG_LEVEL=debug
export NEXT_PUBLIC_SENTRY_DSN=
export JWT_SECRET_KEY=
export APP_HOST=

if [ "$mode" = start ]; then
  nohup pnpm start -p "$app" >"$logs/app.log" 2>&1 &
else
  nohup pnpm dev -p "$app" >"$logs/app.log" 2>&1 &
fi
for _ in $(seq 300); do curl -s -o /dev/null "http://localhost:$app/api/trpc/health" && break; sleep 1; done
curl -s -o /dev/null "http://localhost:$app/api/trpc/health" || { tail -50 "$logs/app.log"; echo "app did not start" >&2; exit 1; }

echo "ready: app=http://localhost:$app mongo=givto-mongo-$name:$mongo mail=http://localhost:$mail logs=$logs"
echo "smoke: BASE_URL=http://localhost:$app MAIL_URL=http://localhost:$mail SERVER_LOG=$logs/app.log MONGO_CONTAINER=givto-mongo-$name pnpm test:smoke"
echo "stop:  tests/env.sh stop $name $app $mail"
