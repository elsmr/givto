import http, { type IncomingHttpHeaders } from 'node:http';
import https from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import type { Readable } from 'node:stream';

export interface PinnedResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: Readable;
}

/** One request to `url`, connected to `address` (already validated) instead of a fresh DNS answer: no rebinding. */
export const sendPinned = (
  url: URL,
  address: string,
  headers: Record<string, string>,
  signal: AbortSignal
): Promise<PinnedResponse> =>
  new Promise((resolve, reject) => {
    const family = isIP(address);
    const pinnedLookup = ((_hostname, options, callback) =>
      options.all ? callback(null, [{ address, family }]) : callback(null, address, family)) as LookupFunction;
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(url, { headers, signal, agent: false, lookup: pinnedLookup }, (response) =>
      resolve({ status: response.statusCode ?? 0, headers: response.headers, body: response })
    );
    request.on('error', reject);
    request.end();
  });
