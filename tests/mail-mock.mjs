// Stands in for Mailgun's HTTP API. Records messages; tests read them back.
//   POST   /messages          Mailgun-style multipart send (what the app calls)
//   GET    /messages?to=<email>  recorded messages, oldest first:
//          { to, from, subject, text, html, headers (h:*), tags (o:tag), attachments (file names), at }
//   DELETE /messages          forget everything
// Inbox for local development (browser):
//   GET    /                  newest first; GET /<n> one message (n = 1 for the first recorded)
//   POST   /clear             forget everything, back to the inbox
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

const escape = (text) =>
  String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const page = (res, title, body) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><meta charset="utf-8"><title>${escape(title)}</title>
<style>body{font:14px system-ui,sans-serif;margin:16px}table{border-collapse:collapse;width:100%}
td,th{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd}a{color:#5a51ff}
iframe{width:100%;height:80vh;border:1px solid #ddd}pre{white-space:pre-wrap}</style>
${body}
<script>for (const t of document.querySelectorAll('time')) t.textContent = new Date(t.dateTime).toLocaleString()</script>`);
};

// Shown in the browser's time zone (the container runs in UTC).
const time = (at) => `<time datetime="${at}">${at}</time>`;

const inbox = (res) => {
  const rows = messages
    .map((m, i) => `<tr><td>${escape(m.to)}</td><td><a href="/${i + 1}">${escape(m.subject || '(no subject)')}</a></td><td>${time(m.at)}</td></tr>`)
    .reverse()
    .join('');
  page(
    res,
    `Inbox (${messages.length})`,
    `<meta http-equiv="refresh" content="5"><h1>Inbox (${messages.length})</h1>
<form method="post" action="/clear"><button>Clear</button></form>
<table><tr><th>To</th><th>Subject</th><th>Time</th></tr>${rows || '<tr><td colspan="3">No mail yet.</td></tr>'}</table>`
  );
};

// Links in the mail open in this tab, like a click in a mail client.
const withBaseTarget = (html) =>
  /<head(\s[^>]*)?>/i.test(html) ? html.replace(/<head(\s[^>]*)?>/i, '$&<base target="_top">') : `<base target="_top">${html}`;

const message = (res, m) =>
  page(
    res,
    m.subject,
    `<p><a href="/">← Inbox</a></p><h1>${escape(m.subject)}</h1>
<p>To: ${escape(m.to)}<br>From: ${escape(m.from)}<br>${time(m.at)}</p>
${m.html ? `<iframe srcdoc="${escape(withBaseTarget(m.html))}"></iframe>` : `<pre>${escape(m.text)}</pre>`}`
  );

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/') return inbox(res);
    if (req.method === 'GET' && /^\/\d+$/.test(url.pathname)) {
      const found = messages[Number(url.pathname.slice(1)) - 1];
      return found ? message(res, found) : json(res, 404, { message: 'Not found' });
    }
    if (req.method === 'POST' && url.pathname === '/clear') {
      messages.length = 0;
      res.writeHead(303, { location: '/' });
      return res.end();
    }
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
        headers: Object.fromEntries([...form.keys()].filter((key) => key.startsWith('h:')).map((key) => [key.slice(2), field(key)])),
        tags: form.getAll('o:tag').map(String),
        attachments: form.getAll('attachment').map((file) => file.name),
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
