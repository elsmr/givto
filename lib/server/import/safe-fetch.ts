import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { pipeline, type Readable } from 'node:stream';
import zlib from 'node:zlib';
import { isBlockedAddress } from './blocked-address';
import { sendPinned, type PinnedResponse } from './pinned-request';

/** Server-side fetch of user-supplied URLs with the SSRF boundary from 39. */

export const FETCH_LIMITS = { timeoutMs: 5000, maxBytes: 2 * 1024 * 1024, maxRedirects: 3 };

export type ImportFailure =
  | 'blocked'
  | 'too_many_redirects'
  | 'timeout'
  | 'too_large'
  | 'unsupported_type'
  | 'http_error'
  | 'bot_wall'
  | 'network';

export class ImportError extends Error {
  readonly reason: ImportFailure;
  /** The address the fetch got to (after redirects), when it got an answer. */
  readonly url?: string;

  constructor(reason: ImportFailure, url?: string) {
    super(reason);
    this.reason = reason;
    this.url = url;
  }
}

/** Statuses shops answer bots with (Cloudflare, Akamai, DataDome): the page exists, we're just not let in. */
const BOT_WALL_STATUSES = new Set([403, 429, 503]);

export type FetchKind = 'page' | 'image';

const accepted: Record<FetchKind, { types: string[]; header: string }> = {
  page: {
    types: ['text/html', 'application/xhtml+xml'],
    header: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  // No SVG: it can carry scripts.
  image: {
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
    header: 'image/avif,image/webp,image/png,image/jpeg,image/gif',
  },
};

/** DNS and the HTTP request, swappable so tests can simulate public hosts without a network. */
export interface FetchTransport {
  resolve: (hostname: string) => Promise<string[]>;
  send: typeof sendPinned;
}

const defaultTransport: FetchTransport = {
  resolve: async (hostname) => (await lookup(hostname, { all: true, verbatim: true })).map((entry) => entry.address),
  send: sendPinned,
};

const untilAborted = <T>(promise: Promise<T>, signal: AbortSignal): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })),
  ]);

/** http(s) on the default ports, no credentials, and every address it resolves to is public. */
const resolveTarget = async (url: URL, transport: FetchTransport, signal: AbortSignal): Promise<string> => {
  const allowedPort = url.port === '' || url.port === '80' || url.port === '443';
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || !allowedPort) {
    throw new ImportError('blocked');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [host] : await untilAborted(transport.resolve(host), signal);
  if (addresses.length === 0 || addresses.some(isBlockedAddress)) throw new ImportError('blocked');
  return addresses[0];
};

const decompressor = (encoding: string | undefined) => {
  if (encoding === 'gzip' || encoding === 'x-gzip') return zlib.createGunzip();
  if (encoding === 'deflate') return zlib.createInflate();
  if (encoding === 'br') return zlib.createBrotliDecompress();
  return null;
};

/**
 * Reads at most `maxBytes` after decompression, so a small gzip bomb can't blow up memory. A
 * longer page is cut off there (big shop pages carry their product data near the top); a
 * longer image fails.
 */
const readBody = async (response: PinnedResponse, kind: FetchKind): Promise<Buffer> => {
  const unzip = decompressor(response.headers['content-encoding']?.toLowerCase());
  const stream: Readable = unzip ? pipeline(response.body, unzip, () => {}) : response.body;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    const room = FETCH_LIMITS.maxBytes - size;
    if (chunk.length > room) {
      response.body.destroy();
      if (kind === 'image') throw new ImportError('too_large');
      chunks.push(chunk.subarray(0, room));
      break;
    }
    size += chunk.length;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

// A browser's headers: several shops answer anything else with a bot wall or an empty page.
const requestHeaders = (kind: FetchKind): Record<string, string> => ({
  accept: accepted[kind].header,
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'nl-NL,nl;q=0.9,en;q=0.8',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  ...(kind === 'page' && { 'upgrade-insecure-requests': '1' }),
});

const fetchFollowingRedirects = async (start: URL, kind: FetchKind, transport: FetchTransport, signal: AbortSignal) => {
  let url = start;
  for (let redirects = 0; ; redirects++) {
    const address = await resolveTarget(url, transport, signal);
    const response = await untilAborted(transport.send(url, address, requestHeaders(kind), signal), signal);
    const location = response.headers.location;
    if (response.status >= 300 && response.status < 400 && location) {
      response.body.destroy();
      if (redirects >= FETCH_LIMITS.maxRedirects) throw new ImportError('too_many_redirects');
      url = new URL(location, url);
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      response.body.destroy();
      throw new ImportError(BOT_WALL_STATUSES.has(response.status) ? 'bot_wall' : 'http_error', url.toString());
    }
    const contentType = (response.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    if (!accepted[kind].types.includes(contentType)) {
      response.body.destroy();
      throw new ImportError('unsupported_type', url.toString());
    }
    if (kind === 'image' && Number(response.headers['content-length'] ?? 0) > FETCH_LIMITS.maxBytes) {
      response.body.destroy();
      throw new ImportError('too_large');
    }
    const body = await readBody(response, kind);
    return { url: url.toString(), contentType: response.headers['content-type'] ?? contentType, body };
  }
};

/**
 * GET a user-supplied URL: validated scheme/port, DNS resolved and checked before connecting
 * to that same address, every redirect re-validated (max 3), 5 s for everything, 2 MB cap
 * after decompression (pages cut off, images rejected), only HTML pages or raster images.
 * Throws ImportError.
 */
export const safeFetch = async (rawUrl: string, kind: FetchKind, transport: FetchTransport = defaultTransport) => {
  const signal = AbortSignal.timeout(FETCH_LIMITS.timeoutMs);
  try {
    return await fetchFollowingRedirects(new URL(rawUrl), kind, transport, signal);
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError(signal.aborted ? 'timeout' : 'network');
  }
};
