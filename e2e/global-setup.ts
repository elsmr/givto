// Mongo in Docker as a single-node replica set (Better Auth uses transactions).
// Runs after the webServers are up: the app only connects to Mongo on its first request.
import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { MONGO_CONTAINER, MONGO_PORT } from './env';

const docker = (...args: string[]) => execFileSync('docker', args, { stdio: 'pipe' }).toString().trim();
const mongosh = (js: string) => docker('exec', MONGO_CONTAINER, 'mongosh', '--quiet', '--eval', js);

const waitFor = async (check: () => boolean, what: string) => {
  for (let i = 0; i < 60; i++) {
    try {
      if (check()) return;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error(`Mongo: ${what} timed out`);
};

export default async function globalSetup() {
  try {
    docker('rm', '-f', MONGO_CONTAINER);
  } catch {
    // no leftover container
  }
  // No TTL monitor: it deletes expired documents about once a minute, so a test that expires a
  // code or session in the database would race it.
  docker('run', '-d', '--rm', '--name', MONGO_CONTAINER, '-p', `${MONGO_PORT}:27017`, 'mongo:latest',
    '--replSet', 'rs0', '--setParameter', 'ttlMonitorEnabled=false');
  await waitFor(() => mongosh('db.runCommand({ ping: 1 }).ok') === '1', 'ping');
  mongosh('rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "localhost:27017" }] })');
  await waitFor(() => mongosh('db.hello().isWritablePrimary') === 'true', 'primary');

  return () => {
    docker('stop', MONGO_CONTAINER);
  };
}
