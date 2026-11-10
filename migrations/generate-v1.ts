// pnpm migrate:sample [--users 60] [--groups 24] [--seed 58]: fills an empty LOCAL database with
// synthetic old-format data (migrations/v1-sample.ts) to rehearse `pnpm migrate`.
import { parseArgs } from 'node:util';
import { MongoClient } from 'mongodb';
import { generateV1 } from './v1-sample';

const { values } = parseArgs({ options: { users: { type: 'string' }, groups: { type: 'string' }, seed: { type: 'string' } } });
const uri = process.env.MONGODB_URI ?? '';
const dbName = process.env.MONGODB_DB ?? '';
const host = URL.parse(uri)?.hostname ?? '';
if (!uri.startsWith('mongodb://') || !['localhost', '127.0.0.1'].includes(host) || !dbName) {
  console.error(`Refusing: MONGODB_URI must point at localhost or 127.0.0.1 (host: "${host}") and MONGODB_DB must be set.`);
  process.exit(1);
}

const client = await new MongoClient(uri).connect();
try {
  const db = client.db(dbName);
  for (const name of ['users', 'groups', 'v1_users', 'v1_groups']) {
    if ((await db.collection(name).estimatedDocumentCount()) > 0) throw new Error(`${dbName}.${name} isn't empty: use a fresh database.`);
  }
  const data = generateV1({
    ...(values.users && { users: Number(values.users) }),
    ...(values.groups && { groups: Number(values.groups) }),
    ...(values.seed && { seed: Number(values.seed) }),
  });
  for (const [name, docs] of Object.entries(data)) {
    if (docs.length > 0) await db.collection(name).insertMany(docs);
    console.log(`${name}: ${docs.length}`);
  }
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await client.close();
}
