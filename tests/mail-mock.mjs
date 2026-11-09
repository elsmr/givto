// Stands in for Mailgun's HTTP API. Records messages; tests read them back.
//   POST   /messages          Mailgun-style multipart send (what the app calls)
//   GET    /messages?to=<email>  recorded messages, oldest first: { to, from, subject, text, html, at }
//   DELETE /messages          forget everything
// Run: MAIL_PORT=3691 node tests/mail-mock.mjs
import http from 'node:http';

const messages = [];

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/messages') return json(res, 404, { message: 'Not found' });
    if (req.method === 'POST') {
      if (!req.headers.authorization?.startsWith('Basic ')) return json(res, 401, { message: 'Unauthorized' });
      const form = await new Response(await readBody(req), {
        headers: { 'content-type': req.headers['content-type'] ?? '' },
      }).formData();
      const field = (name) => form.get(name)?.toString() ?? '';
      messages.push({
        to: field('to'),
        from: field('from'),
        subject: field('subject'),
        text: field('text'),
        html: field('html'),
        at: new Date().toISOString(),
      });
      process.stdout.write(`mail #${messages.length}: ${field('subject')}\n`);
      return json(res, 200, { id: `<mock-${messages.length}>`, message: 'Queued. Thank you.' });
    }
    if (req.method === 'GET') {
      const to = url.searchParams.get('to');
      return json(res, 200, to ? messages.filter((m) => m.to.includes(to)) : messages);
    }
    if (req.method === 'DELETE') {
      messages.length = 0;
      return json(res, 200, { ok: true });
    }
    return json(res, 405, { message: 'Method not allowed' });
  })
  .listen(Number(process.env.MAIL_PORT ?? 3691));
