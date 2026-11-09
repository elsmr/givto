import { createNextApiHandler } from '@trpc/server/adapters/next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'node:crypto';
import { isUnexpected, reportUnexpected, toAppCode } from '../../../lib/server/errors';
import { log } from '../../../lib/server/log';
import { appRouter } from '../../../lib/server/routers';
import { createContext, loggedErrors, REQUEST_ID_HEADER } from '../../../lib/server/trpc';

const handler = createNextApiHandler({
  router: appRouter,
  createContext,
  // Every error; the log line for errors outside a procedure (unknown path, bad body, context failure).
  onError: ({ error, path, req }) => {
    const requestId = String(req.headers[REQUEST_ID_HEADER]);
    reportUnexpected(error, { requestId, procedure: path });
    if (loggedErrors.has(error)) return;
    const fields = { requestId, procedure: path, appCode: toAppCode(error) };
    if (isUnexpected(error)) log.error({ ...fields, err: error.cause ?? error }, 'request failed');
    else log.info(fields, 'request rejected');
  },
});

export default function trpcHandler(req: NextApiRequest, res: NextApiResponse) {
  // Ours, not the client's: the id ties the generic error message to the server log.
  const requestId = randomUUID();
  req.headers[REQUEST_ID_HEADER] = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  return handler(req, res);
}
