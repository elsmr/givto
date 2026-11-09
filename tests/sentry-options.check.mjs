// Sentry events carry no personal data (44): lib/sentry-options.ts beforeSend.
import assert from 'node:assert/strict';
import { sentryOptions } from '../lib/sentry-options.ts';

const event = sentryOptions.beforeSend({
  message: 'failed for ann@example.test with 123456',
  exception: { values: [{ type: 'Error', value: 'E11000 dup key: { email: "ann@example.test" } ?token=abc' }] },
  request: {
    method: 'GET',
    url: 'https://givto.app/api/trpc/wish.add?input={"title":"Red bike"}',
    headers: { cookie: 'session=secret' },
    cookies: { session: 'secret' },
    data: '{"title":"Red bike"}',
    query_string: 'input=Red bike',
  },
  user: { id: 'u1', email: 'ann@example.test', ip_address: '1.2.3.4' },
  extra: { wish: 'Red bike' },
  breadcrumbs: [
    { category: 'console', message: 'Red bike for ann@example.test' },
    { category: 'ui.click', message: 'button[aria-label="Delete Red bike"]' },
    { category: 'fetch', message: 'Red bike', data: { method: 'POST', url: '/api/trpc/wish.add?batch=1&input=Red', status_code: 500, body: 'Red bike' } },
    { category: 'navigation', data: { from: '/auth/link#token=abc', to: '/unsubscribe?token=abc' } },
  ],
});

const text = JSON.stringify(event);
for (const secret of ['ann@example.test', '123456', 'abc', 'Red bike', 'secret', '1.2.3.4', 'input=']) {
  assert.ok(!text.includes(secret), `${secret} in ${text}`);
}
assert.equal(event.message, 'failed for [email] with [code]');
assert.equal(event.request.url, 'https://givto.app/api/trpc/wish.add');
assert.deepEqual(event.user, { id: 'u1' });
assert.deepEqual(event.breadcrumbs.map((crumb) => crumb.category), ['fetch', 'navigation']);
assert.equal(event.breadcrumbs[0].data.status_code, 500);
assert.equal(event.breadcrumbs[1].data.to, '/unsubscribe');
assert.equal(sentryOptions.dataCollection.stackFrameVariables, false);
console.log('ok  sentry events are scrubbed');
