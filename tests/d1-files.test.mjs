import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sqliteAdapter } from '../server/local-storage.mjs';
import { d1Files, FILE_CHUNK_BYTES } from '../server/d1-files.mjs';
import worker from '../server/worker.mjs';
async function fixture(t, limit) {
  const DB = sqliteAdapter(); DB.exec(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8')); t.after(() => DB.close());
  return { DB, files: d1Files(DB, limit) };
}
test('D1 分块保存完整 5 MiB 图片并按顺序重组，单行不超平台限制', async (t) => {
  const { DB, files } = await fixture(t); const id = crypto.randomUUID();
  const bytes = new Uint8Array(5 * 1024 * 1024); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
  await files.put(id, bytes); const object = await files.get(id);
  assert.deepEqual(new Uint8Array(await object.arrayBuffer()), bytes);
  const row = await DB.prepare('SELECT count(*) AS parts,max(length(data)) AS max_size FROM file_chunks').first();
  assert.equal(row.parts, 20); assert.equal(row.max_size, FILE_CHUNK_BYTES);
});
test('容量预留阻止越额写入，并发时也不突破预算', async (t) => {
  const { DB, files } = await fixture(t, 1000);
  const results = await Promise.allSettled([files.put(crypto.randomUUID(), new Uint8Array(700)), files.put(crypto.randomUUID(), new Uint8Array(700))]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const rejected = results.find((r) => r.status === 'rejected'); assert.equal(rejected.reason.status, 413);
  assert.equal((await DB.prepare('SELECT sum(size) AS bytes FROM file_objects').first()).bytes, 700);
});
test('分块事务失败会释放预留容量，缺失分块不会返回截断图片', async (t) => {
  const { DB, files } = await fixture(t); const id = crypto.randomUUID();
  const broken = d1Files({ prepare: DB.prepare, batch: async () => { throw new Error('write failed'); } });
  await assert.rejects(() => broken.put(id, new Uint8Array(100)), /write failed/);
  assert.equal(await DB.prepare('SELECT id FROM file_objects WHERE id=?').bind(id).first(), null);
  await files.put(id, new Uint8Array(FILE_CHUNK_BYTES + 1));
  await DB.prepare('DELETE FROM file_chunks WHERE object_id=? AND part=1').bind(id).run();
  await assert.rejects(() => files.get(id), { status: 503 });
});
test('不绑定 R2 时使用真实 D1 图片适配器，匿名仍不可读取私有素材', async (t) => {
  const { DB } = await fixture(t); const origin = 'http://127.0.0.1:5173';
  const env = { DB, APP_ORIGIN: origin, OWNER_GITHUB_ID: 'owner', LOCAL_DEMO: true };
  const login = await worker.fetch(new Request(`${origin}/api/local-session`, { method: 'POST', headers: { Origin: origin }, body: '{}' }), env);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const s = await (await worker.fetch(new Request(`${origin}/api/session`, { headers: { Cookie: cookie } }), env)).json();
  const bytes = Uint8Array.from([137,80,78,71,13,10,26,10,1,2,3]);
  const response = await worker.fetch(new Request(`${origin}/api/assets`, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'X-CSRF-Token': s.csrf }, body: bytes }), env);
  assert.equal(response.status, 201); const asset = await response.json();
  assert.equal((await worker.fetch(new Request(`${origin}${asset.url}`), env)).status, 401);
  const privateResponse = await worker.fetch(new Request(`${origin}${asset.url}`, { headers: { Cookie: cookie } }), env);
  assert.deepEqual(new Uint8Array(await privateResponse.arrayBuffer()), bytes);
  assert.equal(privateResponse.headers.get('cache-control'), 'private, no-store');
});
