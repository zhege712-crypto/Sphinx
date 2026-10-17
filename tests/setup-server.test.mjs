import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { createSetupServer, validateSecrets } from '../scripts/configure-workspace.mjs';

test('本机配置限制来源、nonce、字段、大小，且不反射或保留密钥', async t => {
  let calls = 0; let received;
  const setup = createSetupServer({ port: 0, configure: async values => { calls++; received = values; assert.equal(values.GITHUB_CLIENT_SECRET, 'sample-secret'); } });
  await setup.listen(); t.after(() => setup.server.close());
  const origin = `http://127.0.0.1:${setup.server.address().port}`;
  const page = await fetch(origin); assert.equal(page.headers.get('cache-control'), 'no-store');
  const html = await page.text(); const nonce = html.match(/X-Setup-Nonce':'([a-f0-9]+)'/)[1];
  const post = (value, overrides = {}) => fetch(origin + '/configure', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Setup-Nonce': nonce, ...overrides }, body: JSON.stringify(value) });
  const values = { GITHUB_CLIENT_ID: 'sample-id', GITHUB_CLIENT_SECRET: 'sample-secret' };
  assert.equal((await post(values, { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await post(values, { 'X-Setup-Nonce': 'bad' })).status, 403);
  const wrongHost = await new Promise((resolve, reject) => {
    const req = request(origin, { headers: { Host: 'untrusted.example' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject); req.end();
  });
  assert.equal(wrongHost, 403);
  assert.equal((await post({ UNEXPECTED: 'sample' })).status, 400);
  assert.equal((await post({ GITHUB_PUBLISH_TOKEN: 'x'.repeat(17000) })).status, 413);
  assert.equal(calls, 0);
  const response = await post(values); assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { configured: Object.keys(values) });
  assert.equal(calls, 1); assert.equal(received.GITHUB_CLIENT_SECRET, '');
});

test('配置接受单独发布 token，但 OAuth 必须成对且不得夹带控制字符', () => {
  assert.deepEqual(validateSecrets({ GITHUB_PUBLISH_TOKEN: ' sample ' }), { GITHUB_PUBLISH_TOKEN: 'sample' });
  for (const value of [[], null, {}, { GITHUB_CLIENT_ID: 'id' }, { GITHUB_PUBLISH_TOKEN: 'x\ny' }]) assert.throws(() => validateSecrets(value));
});
