import { getAuth } from '@/lib/server/auth';
import { getDb } from '@/lib/server/db';
import { AppError } from '@/lib/server/errors';
import { subscribeGiftDay } from '@/lib/server/giftday-stream';
import { log } from '@/lib/server/log';
import { memberView } from '@/lib/server/giftday/giftday-view';
import { memberEdition } from '@/lib/server/trpc';
import { getHTTPStatusCodeFromError } from '@trpc/server/http';
import superjson from 'superjson';

/** Vercel Hobby's longest; the stream ends itself before, and EventSource reconnects. */
export const maxDuration = 300;
const CLOSE_AFTER_MS = 280_000;
const HEARTBEAT_MS = 25_000;

/** giftday.get's member view as server-sent events (97): now, then after every change to the edition. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string; edition: string }> }) {
  const { slug, edition: editionNumber } = await params;
  const [db, session] = await Promise.all([getDb(), getAuth().api.getSession({ headers: request.headers })]);
  if (!session) return new Response('UNAUTHENTICATED', { status: 401 });
  const found = await memberEdition(db, session.user.id, slug, Number(editionNumber)).catch((error: unknown) =>
    error instanceof AppError ? error : Promise.reject(error)
  );
  if (found instanceof AppError) return new Response(found.appCode, { status: getHTTPStatusCodeFromError(found) });
  const { group, edition } = found;

  const stop = new AbortController();
  const ended = AbortSignal.any([request.signal, stop.signal]);
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const write = (chunk: string) => {
        if (!ended.aborted) controller.enqueue(encoder.encode(chunk));
      };
      const end = () => {
        if (ended.aborted) return;
        stop.abort();
        controller.close();
      };
      let changed = false;
      const unsubscribe = subscribeGiftDay(db, edition._id, {
        send: (data) => {
          changed = true;
          write(`data: ${data}\n\n`);
        },
        close: end,
      });
      const heartbeat = setInterval(() => write(': heartbeat\n\n'), HEARTBEAT_MS);
      const timeout = setTimeout(end, CLOSE_AFTER_MS);
      ended.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(heartbeat);
        clearTimeout(timeout);
      });
      try {
        const view = superjson.stringify(await memberView(db, group, edition));
        // A change pushed while this was built is newer than it.
        if (!changed) write(`data: ${view}\n\n`);
      } catch (error) {
        log.error({ err: error, editionId: edition._id }, 'gift day stream: first view failed');
        end();
      }
    },
    cancel: () => stop.abort(),
  });
  return new Response(body, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no' },
  });
}
