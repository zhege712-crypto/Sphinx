import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sqliteAdapter } from '../server/local-storage.mjs';
import worker from '../server/worker.mjs';
import { filterAuthors, sanitizeAuthor, sanitizeAuthorIds } from '../shared/authors.mjs';

const ORIGIN = 'http://127.0.0.1:5173';
async function fixture(t) {
  const DB = sqliteAdapter();
  DB.exec(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  DB.exec(await readFile(new URL('../server/migrations/0002-authors.sql', import.meta.url), 'utf8'));
  t.after(() => DB.close());
  const env = { DB, APP_ORIGIN: ORIGIN, OWNER_GITHUB_ID: 'owner', LOCAL_DEMO: true };
  async function req(path, { method = 'GET', body, cookie, csrf, origin = ORIGIN } = {}) {
    return worker.fetch(new Request(`${ORIGIN}${path}`, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(method !== 'GET' ? { Origin: origin, 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }), env);
  }
  async function login(role) { const r = await req('/api/local-session', { method: 'POST', body: { role } }); assert.equal(r.status, 200); const cookie = r.headers.get('set-cookie').split(';')[0]; const session = await (await req('/api/session', { cookie })).json(); return { cookie, csrf: session.csrf }; }
  const owner = await login('owner'), editor = await login('editor');
  const as = (user, path, method = 'GET', body) => req(path, { ...user, method, body });
  const createAuthor = async (input = {}) => { const r = await as(editor, '/api/authors', 'POST', { name: '伙伴', email: 'private@example.com', github: 'helper', links: [{ label: '主页', url: 'https://example.com/private-profile' }], ...input }); assert.equal(r.status, 201, await r.clone().text()); return (await r.json()).author; };
  const createDocument = async () => { const r = await as(editor, '/api/documents', 'POST', { title: '作者关联测试' }); assert.equal(r.status, 201); return (await r.json()).document; };
  return { DB, env, req, as, owner, editor, createAuthor, createDocument };
}

test('作者字段严格校验，名称、邮箱、GitHub 和链接均可搜索', () => {
  const value = sanitizeAuthor({ name: ' Alice ', email: 'alice@example.com', github: 'https://github.com/alice/', links: [{ label: '个人主页', url: 'https://example.com/profile' }] });
  assert.equal(value.name, 'Alice'); assert.equal(value.github, 'alice');
  for (const query of ['alice', 'EXAMPLE.COM', '主页', 'alice profile', 'ＡＬＩＣＥ']) assert.equal(filterAuthors([value], query).length, 1);
  assert.equal(filterAuthors([value], 'not-present').length, 0);
  for (const input of [{ name: '' }, { name: 'A', email: 'bad' }, { name: 'A', email: 'a@example.com\r\nBcc:b@example.com' }, { name: 'A', github: 'https://evil.example/alice' }, { name: 'A', links: [{ label: 'bad', url: 'javascript:alert(1)' }] }, { name: 'A', links: Array.from({ length: 9 }, () => ({ label: 'x', url: 'https://example.com' })) }]) assert.throws(() => sanitizeAuthor(input));
  const id = crypto.randomUUID(); assert.deepEqual(sanitizeAuthorIds([id]), [id]);
  assert.throws(() => sanitizeAuthorIds([id, id])); assert.throws(() => sanitizeAuthorIds(['bad'])); assert.throws(() => sanitizeAuthorIds(Array.from({ length: 13 }, () => crypto.randomUUID())));
});

test('作者索引仅受邀成员可读写，匿名、跨站、缺失 CSRF 与移除成员均不能访问', async t => {
  const f = await fixture(t);
  assert.equal((await f.req('/api/authors')).status, 401);
  assert.equal((await f.req('/api/authors', { method: 'POST', body: { name: 'bad' } })).status, 401);
  assert.equal((await f.req('/api/authors', { ...f.editor, method: 'POST', body: { name: 'bad' }, origin: 'https://evil.example' })).status, 403);
  assert.equal((await f.req('/api/authors', { cookie: f.editor.cookie, method: 'POST', body: { name: 'bad' } })).status, 403);
  const a = await f.createAuthor(); assert.equal(a.email, 'private@example.com');
  assert.equal((await f.as(f.owner, '/api/authors')).status, 200);
  await f.DB.prepare('UPDATE members SET active=0 WHERE github_id=?').bind('local-editor').run();
  assert.equal((await f.as(f.editor, '/api/authors')).status, 401);
});

test('作者修改使用独立乐观版本，过期修改不可覆盖，非法字段不写入', async t => {
  const f = await fixture(t); const a = await f.createAuthor();
  let response = await f.as(f.owner, `/api/authors/${a.id}`, 'PUT', { ...a, name: '新名称' }); assert.equal(response.status, 200);
  const updated = (await response.json()).author; assert.equal(updated.version, 2);
  assert.equal((await f.as(f.editor, `/api/authors/${a.id}`, 'PUT', { ...a, name: '旧窗口' })).status, 409);
  assert.equal((await f.as(f.editor, `/api/authors/${a.id}`, 'PUT', { ...updated, email: 'not-an-email' })).status, 400);
  const authors = (await (await f.as(f.editor, '/api/authors')).json()).authors; assert.equal(authors[0].name, '新名称'); assert.equal(authors[0].email, a.email);
  assert.equal((await f.as(f.owner, `/api/authors/${a.id}`, 'DELETE')).status, 405);
});

test('作者关联独立保存与并发校验，发布及历史不包含私有联系方式或关联', async t => {
  const f = await fixture(t); const a = await f.createAuthor(), b = await f.createAuthor({ name: '第二位', email: 'second@example.com' }); const d = await f.createDocument();
  const path = `/api/documents/${d.id}/authors`;
  assert.equal((await f.req(path)).status, 401);
  assert.deepEqual(await (await f.as(f.editor, path)).json(), { authorIds: [], authors: [], version: 0 });
  assert.equal((await f.as(f.editor, path, 'PUT', { authorIds: [a.id], version: 9 })).status, 409);
  assert.equal((await f.as(f.editor, path, 'PUT', { authorIds: [crypto.randomUUID()], version: 0 })).status, 400);
  assert.equal((await f.as(f.editor, path, 'PUT', { authorIds: [a.id, a.id], version: 0 })).status, 400);
  let response = await f.as(f.editor, path, 'PUT', { authorIds: [b.id, a.id], version: 0 }); assert.equal(response.status, 200, await response.clone().text());
  const associated = await response.json(); assert.equal(associated.version, 1); assert.deepEqual(associated.authors.map(row => row.id), [b.id, a.id]);
  assert.equal((await f.as(f.owner, path, 'PUT', { authorIds: [], version: 0 })).status, 409);
  assert.equal((await f.req(path, { ...f.editor, method: 'PUT', body: { authorIds: [], version: 1 }, origin: 'https://evil.example' })).status, 403);
  const document = (await (await f.as(f.editor, `/api/documents/${d.id}`)).json()).document; assert.equal(document.version, d.version);
  assert.equal((await f.DB.prepare('SELECT count(*) AS n FROM revisions WHERE document_id=?').bind(d.id).first()).n, 0);
  assert.equal((await f.as(f.editor, `/api/documents/${d.id}/publish`, 'POST', { version: d.version })).status, 200);
  const publicJson = JSON.stringify(await (await f.req('/api/public/catalog')).json());
  for (const secret of [a.email, b.email, a.id, b.id, 'private-profile', 'authorIds']) assert.ok(!publicJson.includes(secret), secret);
  const published = await f.DB.prepare('SELECT published FROM documents WHERE id=?').bind(d.id).first(); assert.ok(!published.published.includes(a.email));
  response = await f.as(f.editor, path, 'PUT', { authorIds: [], version: 1 }); assert.equal(response.status, 200); assert.equal((await response.json()).version, 2);
  assert.equal((await f.as(f.owner, path, 'PUT', { authorIds: [a.id], version: 1 })).status, 409);
  await f.DB.prepare('UPDATE documents SET archived=1 WHERE id=?').bind(d.id).run(); assert.equal((await f.as(f.editor, path)).status, 404); assert.equal((await f.as(f.editor, path, 'PUT', { authorIds: [], version: 2 })).status, 404);
});
