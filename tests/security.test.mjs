import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sqliteAdapter } from '../server/local-storage.mjs';
import worker from '../server/worker.mjs';
import { sanitizeDocument, safeLink, imageType } from '../shared/document.mjs';
import { hash } from '../server/auth.mjs';
import { imageLayoutReplacement } from '../shared/image-layout.mjs';
import { referenceHref, referenceIdFromLink } from '../shared/reference-links.mjs';
const ORIGIN = 'http://127.0.0.1:5173';
test('词汇链接只允许固定格式的站内词条，跨部署路径仍指向同一词条', () => {
  const id = 'c71e0000-0000-4000-8000-000000000003'; const href = referenceHref(id);
  assert.equal(safeLink(href), href); assert.equal(referenceIdFromLink(href), id);
  assert.equal(new URL(href, 'https://example.github.io/Sphinx/').href, `https://example.github.io/Sphinx/${href}`);
  assert.equal(new URL(href, 'https://workspace.example/').href, `https://workspace.example/${href}`);
  for (const value of ['#/write', '#/reference/../../write', `#/reference/${id}?edit=1`, `//evil.example/#/reference/${id}`, `#/reference/${id}\n`, 'javascript:alert(1)']) assert.throws(() => safeLink(value));
  assert.throws(() => referenceHref('../write'));
  assert.equal(safeLink('https://example.com/guide'), 'https://example.com/guide');
});
test('指定词汇的站内外链接保留样式并随显式发布公开，不自动链接其他同名文字', async t => {
  const f = await fixture(t); const d = await f.create();
  const reference = await f.create(f.editor, { kind: 'reference', title: '测试词条' });
  const href = referenceHref(reference.id);
  const value = [{ type: 'paragraph', content: [{ type: 'link', href, content: [{ type: 'text', text: 'Claude', styles: { bold: true } }] }, { type: 'text', text: ' 与普通 Claude；', styles: {} }, { type: 'link', href: 'https://example.com/docs', content: [{ type: 'text', text: '官方资料', styles: { italic: true } }] }] }];
  const result = await f.as(f.editor, `/api/documents/${d.id}`, 'PUT', { title: d.title, version: 1, blocks: value });
  assert.equal(result.status, 200); const saved = (await result.json()).document;
  assert.equal(saved.blocks[0].content[0].content[0].styles.bold, true);
  assert.equal(saved.blocks[0].content[1].type, 'text');
  assert.equal((await (await f.req('/api/public/catalog')).json()).documents.length, 0);
  assert.equal((await f.as(f.editor, `/api/documents/${d.id}/publish`, 'POST', { version: saved.version })).status, 200);
  const published = (await (await f.req('/api/public/catalog')).json()).documents.find(row => row.id === d.id);
  assert.equal(published.blocks[0].content[0].href, href); assert.equal(published.blocks[0].content[2].href, 'https://example.com/docs');
  assert.ok(published.text.includes('普通 Claude'));
  assert.throws(() => sanitizeDocument([{ type: 'linkCard', props: { url: href } }]), /网站卡片只支持/);
});
test('图文排版切换保留图片和多段正文，退出并排后正文回到普通流', () => {
  const image = { id: 'img', type: 'image', props: { url: '/api/assets/c71e0000-0000-4000-8000-000000000001', name: '图', caption: '图注', previewWidth: 320 } };
  const beside = imageLayoutReplacement(image, 'image-left')[0];
  assert.equal(beside.type, 'imageText'); assert.equal(beside.children[0].type, 'paragraph');
  beside.children = [{ id: 'p1', type: 'paragraph', content: '第一段' }, { id: 'p2', type: 'bulletListItem', content: '重点' }];
  const right = imageLayoutReplacement(beside, 'text-left')[0];
  assert.equal(right.props.side, 'right'); assert.deepEqual(right.children, beside.children);
  const stacked = imageLayoutReplacement(right, 'center');
  assert.equal(stacked[0].props.url, image.props.url); assert.equal(stacked[0].props.textAlignment, 'center'); assert.equal(stacked[0].props.previewWidth, 320);
  assert.deepEqual(stacked.slice(1), beside.children); assert.equal(stacked[0].children, undefined);
});
test('图文并排的图片仍受私有素材与发布检查保护，并保存正文与尺寸', async (t) => {
  const f = await fixture(t); const d = await f.create();
  const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0]);
  const a = await (await f.as(f.editor, '/api/assets', 'POST', png)).json();
  const value = [{ type: 'imageText', props: { url: a.url, side: 'right', imageWidth: 45, caption: '示意图' }, children: [{ type: 'paragraph', content: '图片旁的正文' }] }];
  assert.equal((await f.as(f.editor, `/api/documents/${d.id}`, 'PUT', { title: d.title, version: 1, blocks: value })).status, 200);
  assert.equal((await f.req(a.url)).status, 401);
  assert.equal((await f.as(f.editor, `/api/documents/${d.id}/publish`, 'POST', { version: 2 })).status, 200);
  const published = (await (await f.req('/api/public/catalog')).json()).documents[0];
  assert.equal(published.blocks[0].props.url, `assets/${a.id}.png`); assert.equal(published.blocks[0].props.imageWidth, 45);
  assert.ok(published.text.includes('图片旁的正文')); assert.equal((await f.req(`/assets/${a.id}.png`)).status, 200);
  assert.throws(() => sanitizeDocument([{ ...value[0], props: { url: 'https://other.example/private.png' } }]), /上传图片/);
  const safe = sanitizeDocument([{ ...value[0], props: { ...value[0].props, imageWidth: 900, previewWidth: -10, side: 'evil', style: 'position:fixed' } }])[0];
  assert.equal(safe.props.imageWidth, 65); assert.equal(safe.props.previewWidth, 64); assert.equal(safe.props.side, 'left'); assert.equal(safe.props.style, undefined);
});
const blocks = (text) => [{ type: 'paragraph', content: text }];
async function fixture(t) {
  const DB = sqliteAdapter(); DB.exec(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8')); t.after(() => DB.close());
  const objects = new Map(); const env = { DB, FILES: { put: async (k, v) => objects.set(k, v), get: async (k) => objects.has(k) ? { body: objects.get(k), arrayBuffer: async () => objects.get(k) } : null }, APP_ORIGIN: ORIGIN, OWNER_GITHUB_ID: 'owner', LOCAL_DEMO: true };
  async function req(path, { method = 'GET', body, cookie, csrf, origin = ORIGIN } = {}) { return worker.fetch(new Request(`${ORIGIN}${path}`, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(method !== 'GET' ? { Origin: origin, 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: body instanceof Uint8Array ? body : JSON.stringify(body) } : {}) }), env); }
  async function login(role) { const r = await req('/api/local-session', { method: 'POST', body: { role } }); assert.equal(r.status, 200); const cookie = r.headers.get('set-cookie').split(';')[0]; const s = await (await req('/api/session', { cookie })).json(); return { cookie, csrf: s.csrf }; }
  const owner = await login('owner'), editor = await login('editor');
  const as = (auth, path, method = 'GET', body) => req(path, { ...auth, method, body });
  const create = async (auth = editor, extra = {}) => { const r = await as(auth, '/api/documents', 'POST', { title: '测试文章', ...extra }); assert.equal(r.status, 201, await r.clone().text()); return (await r.json()).document; };
  return { DB, env, req, owner, editor, as, create, objects };
}
test('匿名读者无法访问草稿，伙伴可管理所有文档，站主权限不可借用', async (t) => {
  const f = await fixture(t); const doc = await f.create(f.owner);
  assert.equal((await f.req(`/api/documents/${doc.id}`)).status, 401);
  assert.equal((await f.as(f.editor, `/api/documents/${doc.id}`)).status, 200);
  for (const path of ['/api/members', '/api/audit']) assert.equal((await f.as(f.editor, path)).status, 403);
  assert.equal((await f.as(f.editor, '/api/members/fake/deactivate', 'POST')).status, 403);
  assert.deepEqual((await (await f.req('/api/public/catalog')).json()).documents, []);
});
test('跨站请求和缺失 CSRF 被拒绝，服务端禁用生产演示登录', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.req('/api/documents', { ...f.editor, method: 'POST', body: { title: 'bad' }, origin: 'https://evil.example' })).status, 403);
  assert.equal((await f.req('/api/documents', { cookie: f.editor.cookie, method: 'POST', body: { title: 'bad' } })).status, 403);
  f.env.LOCAL_DEMO = false;
  assert.equal((await f.req('/api/local-session', { method: 'POST', body: {} })).status, 404);
});
test('保存以版本号防止覆盖，同时保留可恢复的历史', async (t) => {
  const f = await fixture(t); const d = await f.create();
  const first = await f.as(f.editor, `/api/documents/${d.id}`, 'PUT', { title: '修改后', version: d.version, blocks: blocks('伙伴内容') }); assert.equal(first.status, 200);
  const stale = await f.as(f.owner, `/api/documents/${d.id}`, 'PUT', { title: '旧窗口覆盖', version: d.version, blocks: blocks('丢失内容') }); assert.equal(stale.status, 409);
  const history = (await (await f.as(f.owner, `/api/documents/${d.id}/history`)).json()).revisions; assert.equal(history.length, 1);
  const restored = await f.as(f.owner, `/api/documents/${d.id}/restore`, 'POST', { revisionId: history[0].id, version: 2 }); assert.equal(restored.status, 200); assert.equal((await restored.json()).document.version, 3);
});
test('普通伙伴可发布，之后的草稿修改不会泄露到公开版本', async (t) => {
  const f = await fixture(t); const d = await f.create();
  await f.as(f.editor, `/api/documents/${d.id}`, 'PUT', { title: '公开标题', version: 1, blocks: blocks('公开内容') });
  await f.DB.prepare('UPDATE documents SET updated_at=? WHERE id=?').bind('2026-10-16T08:30:00.000Z', d.id).run();
  assert.equal((await f.as(f.editor, `/api/documents/${d.id}/publish`, 'POST', { version: 2 })).status, 200);
  await f.as(f.editor, `/api/documents/${d.id}`, 'PUT', { title: '秘密草稿', version: 2, blocks: blocks('秘密内容') });
  const c = await (await f.req('/api/public/catalog')).json(); assert.equal(c.documents[0].title, '公开标题'); assert.equal(c.documents[0].updatedAt, '2026-10-16T08:30:00.000Z'); assert.ok(!JSON.stringify(c).includes('秘密'));
  assert.equal((await f.as(f.owner, `/api/documents/${d.id}/publish`, 'POST', { version: 2 })).status, 409);
});
test('草稿图片保密，真实图片格式验证，明确发布后才允许匿名访问', async (t) => {
  const f = await fixture(t); const d = await f.create();
  const fake = new TextEncoder().encode('<svg onload="evil()"></svg>'); assert.equal((await f.as(f.editor, '/api/assets', 'POST', fake)).status, 400);
  const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0]); const r = await f.as(f.editor, '/api/assets', 'POST', png); assert.equal(r.status, 201); const a = await r.json();
  assert.equal((await f.req(a.url)).status, 401); assert.equal((await f.req(`/assets/${a.id}.png`)).status, 404);
  assert.equal((await f.as(f.owner, a.url)).status, 200);
  assert.equal((await f.as(f.editor, `/api/documents/${d.id}`, 'PUT', { title: '有图文章', version: 1, blocks: [{ type: 'image', props: { url: a.url } }] })).status, 200);
  assert.equal((await f.as(f.editor, `/api/documents/${d.id}/publish`, 'POST', { version: 2 })).status, 200);
  assert.equal((await f.req(a.url)).status, 401); assert.equal((await f.req(`/assets/${a.id}.png`)).status, 200);
});
test('删除必须申请且只有站主可批准，包含子文档，公开目录随审核一起移除', async (t) => {
  const f = await fixture(t); const folder = await f.create(f.editor, { title: '目录', kind: 'folder' }); const child = await f.create(f.editor, { parentId: folder.id });
  await f.as(f.editor, `/api/documents/${child.id}/publish`, 'POST', { version: 1 });
  assert.equal((await f.as(f.editor, `/api/documents/${child.id}`, 'DELETE')).status, 404);
  const r = await f.as(f.editor, '/api/reviews', 'POST', { action: 'delete', ids: [folder.id] }); assert.equal(r.status, 201); const { id } = await r.json();
  assert.equal((await f.as(f.editor, `/api/reviews/${id}/approve`, 'POST')).status, 403);
  assert.equal((await f.as(f.owner, `/api/reviews/${id}/approve`, 'POST')).status, 200);
  assert.equal((await f.as(f.editor, `/api/documents/${child.id}`)).status, 404); assert.equal((await (await f.req('/api/public/catalog')).json()).documents.length, 0);
});
test('过期审核不能删除申请之后改过的文章或新加入的子文档', async (t) => {
  const f = await fixture(t); const d = await f.create();
  const { id } = await (await f.as(f.editor, '/api/reviews', 'POST', { action: 'delete', ids: [d.id] })).json();
  await f.create(f.editor, { parentId: d.id });
  assert.equal((await f.as(f.owner, `/api/reviews/${id}/approve`, 'POST')).status, 409);
  assert.equal((await f.as(f.editor, `/api/documents/${d.id}`)).status, 200);
});
test('目录循环被拒绝，批量移动需审核且版本会递增', async (t) => {
  const f = await fixture(t); const a = await f.create(), b = await f.create(f.editor, { parentId: a.id });
  assert.equal((await f.as(f.editor, '/api/reviews', 'POST', { action: 'bulkMove', ids: [a.id], parentId: b.id })).status, 400);
  const { id } = await (await f.as(f.editor, '/api/reviews', 'POST', { action: 'bulkMove', ids: [b.id], parentId: null })).json();
  assert.equal((await f.as(f.owner, `/api/reviews/${id}/approve`, 'POST')).status, 200);
  const result = (await (await f.as(f.editor, `/api/documents/${b.id}`)).json()).document; assert.equal(result.parentId, null); assert.equal(result.version, 2);
});
test('停用伙伴同时撤销已有登录，不能依靠旧 cookie 继续读取', async (t) => {
  const f = await fixture(t); assert.equal((await f.as(f.owner, '/api/members/local-editor/deactivate', 'POST')).status, 200); assert.equal((await f.as(f.editor, '/api/documents')).status, 401);
});
test('发布锁和未确认的远程发布会阻止写入，避免静默丢失', async (t) => {
  const f = await fixture(t); const d = await f.create();
  await f.DB.prepare('INSERT INTO locks(name,token,expires_at) VALUES(?,?,?)').bind('publication','test',Date.now()+60000).run();
  assert.equal((await f.as(f.editor, `/api/documents/${d.id}`, 'PUT', { title: '覆盖', version: 1, blocks: blocks('x') })).status, 409);
  assert.equal((await f.as(f.owner, '/api/reconcile', 'POST')).status, 409);
});
test('发布网络结果不明时保留作业，恢复会核对远程提交记录', async (t) => {
  const f = await fixture(t); const d = await f.create(); f.env.LOCAL_DEMO = false; f.env.GITHUB_REPOSITORY = 'example/guide'; f.env.GITHUB_PUBLISH_TOKEN = 'test-only';
  f.env.GITHUB_FETCH = async () => { throw new Error('network'); };
  assert.equal((await f.as(f.editor, `/api/documents/${d.id}/publish`, 'POST', { version: 1 })).status, 500);
  const job = await f.DB.prepare("SELECT * FROM publication_jobs WHERE status='pending'").first(); assert.ok(job);
  assert.equal((await f.as(f.owner, '/api/reconcile', 'POST')).status, 409);
  await f.DB.prepare('UPDATE publication_jobs SET created_at=? WHERE id=?').bind(new Date(Date.now()-180000).toISOString(), job.id).run();
  f.env.GITHUB_FETCH = async () => new Response(JSON.stringify({ content: btoa(JSON.stringify({ publicationIds: [job.id] })) }));
  assert.equal((await f.as(f.owner, '/api/reconcile', 'POST')).status, 200);
  assert.equal((await f.DB.prepare('SELECT status FROM publication_jobs WHERE id=?').bind(job.id).first()).status, 'complete');
  assert.equal((await (await f.req('/api/public/catalog')).json()).documents.length, 1);
});
test('内容净化拒绝危险链接和外部图片，丢弃未知键且保留代码和表格', () => {
  for (const link of ['javascript:alert(1)', 'data:text/html,x', 'https://user:password@example.com']) assert.throws(() => safeLink(link));
  assert.throws(() => sanitizeDocument([{ type: 'image', props: { url: 'https://example.com/track.png' } }]));
  assert.throws(() => imageType(new TextEncoder().encode('<svg/>')));
  const clean = sanitizeDocument(JSON.parse('[{"type":"paragraph","props":{"__proto__":{"polluted":true}},"content":[{"type":"text","text":"safe","styles":{"bold":true,"onclick":"evil"}}],"onclick":"evil"}]'));
  assert.equal(clean[0].onclick, undefined); assert.equal({}.polluted, undefined); assert.deepEqual(clean[0].content[0].styles, { bold: true });
  assert.equal(sanitizeDocument([{ type: 'codeBlock', content: 'const x = 1;' }])[0].content, 'const x = 1;');
});
test('GitHub OAuth state 单次使用，数字身份验证，生产 cookie 保持安全属性', async (t) => {
  const f = await fixture(t); f.env.LOCAL_DEMO = false; f.env.OWNER_GITHUB_ID = '12345'; f.env.GITHUB_CLIENT_ID = 'test-client'; f.env.GITHUB_CLIENT_SECRET = 'test-secret';
  const start = await f.req('/auth/github'); assert.equal(start.status, 302);
  const location = new URL(start.headers.get('location')); const state = location.searchParams.get('state'); assert.equal(location.searchParams.get('scope'), 'read:user');
  let calls = 0; f.env.OAUTH_FETCH = async () => new Response(JSON.stringify(++calls === 1 ? { access_token: 'oauth-test-token' } : { id: 12345, login: 'renamed-owner' }));
  const cookie = start.headers.get('set-cookie').split(';')[0];
  assert.equal((await f.req(`/auth/callback?state=${state}&code=test`, { cookie: 'guide_oauth=bad' })).status, 403);
  const callback = await f.req(`/auth/callback?state=${state}&code=test`, { cookie }); assert.equal(callback.status, 302);
  assert.match(callback.headers.get('set-cookie'), /HttpOnly/); assert.match(callback.headers.get('set-cookie'), /Secure/); assert.match(callback.headers.get('set-cookie'), /SameSite=Lax/);
  assert.equal((await f.req(`/auth/callback?state=${state}&code=test`, { cookie })).status, 403); assert.equal(calls, 2);
  const rows = await f.DB.prepare('SELECT github_id,token_hash FROM sessions WHERE github_id=?').bind('12345').all(); assert.equal(rows.results.length, 1); assert.equal(rows.results[0].token_hash.length, 64);
});
test('生产发布只提交公开快照，拒绝强制覆盖，凭证留在服务端', async (t) => {
  const f = await fixture(t); const d = await f.create(); f.env.LOCAL_DEMO = false; f.env.GITHUB_REPOSITORY = 'example/guide'; f.env.GITHUB_PUBLISH_TOKEN = 'server-only-test';
  const calls = [];
  f.env.GITHUB_FETCH = async (url, options) => { calls.push({ url, options }); const path = url.split('example/guide/')[1];
    const result = path === 'git/ref/heads/main' ? { object: { sha: 'old-commit' } } : path === 'git/commits/old-commit' ? { tree: { sha: 'old-tree' } } : { sha: path === 'git/trees' ? 'new-tree' : 'new-commit' };
    return new Response(JSON.stringify(result));
  };
  assert.equal((await f.as(f.editor, `/api/documents/${d.id}/publish`, 'POST', { version: 1 })).status, 200);
  const ref = calls.find((c) => c.options.method === 'PATCH'); assert.deepEqual(JSON.parse(ref.options.body), { sha: 'new-commit', force: false });
  const tree = JSON.parse(calls.find((c) => c.url.endsWith('git/trees')).options.body); assert.equal(tree.tree[0].path, 'public/catalog.json'); assert.ok(!tree.tree[0].content.includes('server-only-test'));
  const catalog = await (await f.req('/api/public/catalog')).json(); assert.equal(catalog.documents.length, 1); assert.ok(!JSON.stringify(catalog).includes('draft'));
});

test('Reference 词条可编辑、发布、保留私有改稿和历史，删除仍须站主审核', async t => {
  const f = await fixture(t);
  const entry = await f.create(f.editor, { title: 'Agent', kind: 'reference' });
  assert.equal(entry.kind, 'reference');
  const content = [{ type: 'paragraph', content: '我编写的词条定义' }, { type: 'linkCard', props: { title: '官方资料', url: 'https://example.com/docs' } }];
  const saved = await (await f.as(f.editor, `/api/documents/${entry.id}`, 'PUT', { title: 'Agent', version: 1, blocks: content })).json();
  assert.equal(saved.document.blocks[1].type, 'linkCard');
  assert.equal((await f.as(f.editor, `/api/documents/${entry.id}/publish`, 'POST', { version: 2 })).status, 200);
  const catalog = (await (await f.req('/api/public/catalog')).json()).documents;
  assert.equal(catalog[0].kind, 'reference');
  assert.equal(catalog[0].blocks[1].props.url, 'https://example.com/docs');
  await f.as(f.editor, `/api/documents/${entry.id}`, 'PUT', { title: 'Agent 新草稿', version: 2, blocks: blocks('尚未公开的定义') });
  assert.equal((await (await f.req('/api/public/catalog')).json()).documents[0].title, 'Agent');
  assert.equal((await f.req(`/api/documents/${entry.id}`)).status, 401);
  const history = await (await f.as(f.editor, `/api/documents/${entry.id}/history`)).json();
  assert.equal(history.revisions.length, 2);
  const review = await (await f.as(f.editor, '/api/reviews', 'POST', { action: 'delete', ids: [entry.id] })).json();
  assert.equal((await f.as(f.editor, `/api/reviews/${review.id}/approve`, 'POST')).status, 403);
  assert.equal((await f.as(f.owner, `/api/reviews/${review.id}/approve`, 'POST')).status, 200);
  assert.equal((await (await f.req('/api/public/catalog')).json()).documents.length, 0);
});

test('初始词条迁移仅限站主且幂等，不发布改过的草稿或覆盖用户内容', async t => {
  const f = await fixture(t);
  const ordinary = await f.create(f.owner, { title: '私有指南' });
  const seedId = 'c71e0000-0000-4000-8000-000000000001';
  await f.DB.prepare("INSERT INTO documents(id,title,kind,draft,version,updated_at,updated_by) VALUES(?,?,'reference',?,2,?,?)").bind(seedId, '我的修改', JSON.stringify(blocks('私有改稿')), new Date().toISOString(), 'local-owner').run();
  assert.equal((await f.req('/api/references/initialize', { method: 'POST', body: {} })).status, 401);
  assert.equal((await f.as(f.editor, '/api/references/initialize', 'POST', {})).status, 403);
  const response = await f.as(f.owner, '/api/references/initialize', 'POST', {});
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).initialized, 11);
  const catalog = (await (await f.req('/api/public/catalog')).json()).documents;
  assert.equal(catalog.length, 11); assert.ok(catalog.every(d => d.kind === 'reference'));
  assert.ok(!JSON.stringify(catalog).includes('私有改稿'));
  const repeat = await (await f.as(f.owner, '/api/references/initialize', 'POST', {})).json();
  assert.equal(repeat.initialized, 0);
  assert.equal((await (await f.as(f.owner, `/api/documents/${seedId}`)).json()).document.title, '我的修改');
  assert.equal((await (await f.as(f.owner, `/api/documents/${ordinary.id}`)).json()).document.publishedVersion, null);
});

test('网站卡片净化阻止危险协议、携带凭据与任意属性，保留正常网址', () => {
  const card = url => [{ type: 'linkCard', props: { title: '资料', url, html: '<script>bad</script>' } }];
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'mailto:test@example.com', 'https://user:password@example.com/']) assert.throws(() => sanitizeDocument(card(url)));
  assert.deepEqual(sanitizeDocument(card('https://example.com/'))[0].props, { title: '资料', url: 'https://example.com/' });
});

test('标签与草稿共同保存、审核版本冲突、显式发布和历史恢复，旧客户端不清空标签', async t => {
  const f = await fixture(t); const entry = await f.create(f.editor, { kind: 'reference' });
  const put = (version, tags) => f.as(f.editor, `/api/documents/${entry.id}`, 'PUT', { title: '模型词条', version, blocks: blocks('可搜索的私有正文'), ...(tags === undefined ? {} : { tags }) });
  assert.equal((await put(1, ['模型', 'ＡＩ', 'ai'])).status, 200);
  const privateList = (await (await f.as(f.editor, '/api/documents')).json()).documents;
  assert.deepEqual(privateList[0].tags, ['模型', 'AI']); assert.match(privateList[0].text, /私有正文/);
  assert.equal((await f.req('/api/documents')).status, 401);
  assert.equal((await f.as(f.editor, `/api/documents/${entry.id}/publish`, 'POST', { version: 2 })).status, 200);
  await put(2, ['尚未公开的标签']);
  let published = (await (await f.req('/api/public/catalog')).json()).documents[0];
  assert.deepEqual(published.tags, ['模型', 'AI']);
  assert.equal((await put(2, ['过期覆盖'])).status, 409);
  assert.equal((await put(3)).status, 200);
  assert.deepEqual((await (await f.as(f.editor, `/api/documents/${entry.id}`)).json()).document.tags, ['尚未公开的标签']);
  const revisions = (await (await f.as(f.editor, `/api/documents/${entry.id}/history`)).json()).revisions;
  const revision = revisions.find(r => r.version === 2);
  assert.equal((await f.as(f.editor, `/api/documents/${entry.id}/restore`, 'POST', { revisionId: revision.id, version: 4 })).status, 200);
  assert.deepEqual((await (await f.as(f.editor, `/api/documents/${entry.id}`)).json()).document.tags, ['模型', 'AI']);
  assert.equal((await put(5, ['x'.repeat(33)])).status, 400);
  published = (await (await f.req('/api/public/catalog')).json()).documents[0]; assert.deepEqual(published.tags, ['模型', 'AI']);
});

test('旧数据库标签迁移保留草稿、公开快照、版本和修改时间', async t => {
  const DB = sqliteAdapter(); t.after(() => DB.close());
  const schema = (await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8')).replaceAll(", tags TEXT NOT NULL DEFAULT '[]'", '');
  DB.exec(schema);
  const draft = JSON.stringify(blocks('原有私有稿')); const published = JSON.stringify({ title: '原有公开稿' });
  await DB.prepare('INSERT INTO documents(id,title,draft,published,version,updated_at,updated_by) VALUES(?,?,?,?,?,?,?)').bind('original', '原词条', draft, published, 7, 'unchanged-time', 'owner').run();
  DB.exec(await readFile(new URL('../server/migrations/0001-reference-tags.sql', import.meta.url), 'utf8'));
  const row = await DB.prepare('SELECT * FROM documents WHERE id=?').bind('original').first();
  assert.equal(row.draft, draft); assert.equal(row.published, published); assert.equal(row.version, 7); assert.equal(row.updated_at, 'unchanged-time'); assert.equal(row.tags, '[]');
});

test('匿名无法探测工作台图片是否存在，停用后下载权限立即撤销', async t => {
  const f = await fixture(t); const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0]);
  const asset = await (await f.as(f.editor, '/api/assets', 'POST', png)).json();
  const existing = await f.req(asset.url); const missing = await f.req(`/api/assets/${crypto.randomUUID()}`);
  assert.equal(existing.status, 401); assert.equal(missing.status, 401); assert.deepEqual(await existing.json(), await missing.json());
  const privateFile = await f.as(f.editor, asset.url); assert.equal(privateFile.status, 200); assert.equal(privateFile.headers.get('cache-control'), 'private, no-store');
  await f.as(f.owner, '/api/members/local-editor/deactivate', 'POST');
  assert.equal((await f.as(f.editor, asset.url)).status, 401);
});

test('生产成功与错误响应都应用 CSP、防嵌入与资源隔离，匿名不披露发布配置', async t => {
  const f = await fixture(t); f.env.LOCAL_DEMO = false; f.env.GITHUB_PUBLISH_TOKEN = 'test-only-token'; f.env.GITHUB_REPOSITORY = 'example/guide';
  f.env.ASSETS = { fetch: async () => new Response('<!doctype html><title>Test</title>', { headers: { 'Content-Type': 'text/html' } }) };
  for (const path of ['/', '/api/documents', `/assets/${crypto.randomUUID()}.png`, '/api/session']) {
    const response = await f.req(path); const headers = response.headers;
    assert.match(headers.get('content-security-policy'), /script-src 'self'/); assert.match(headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(headers.get('x-content-type-options'), 'nosniff'); assert.equal(headers.get('x-frame-options'), 'DENY');
    assert.equal(headers.get('referrer-policy'), 'no-referrer'); assert.equal(headers.get('cross-origin-resource-policy'), 'same-origin');
    assert.equal(headers.get('cross-origin-opener-policy'), 'same-origin'); assert.match(headers.get('strict-transport-security'), /max-age=/);
  }
  const anonymous = await (await f.req('/api/session')).json(); assert.equal(anonymous.user, null); assert.equal(anonymous.csrf, undefined); assert.equal(anonymous.publishingConfigured, undefined);
  assert.equal((await (await f.as(f.editor, '/api/session')).json()).publishingConfigured, undefined);
  assert.equal((await (await f.as(f.owner, '/api/session')).json()).publishingConfigured, true);
  const invalidMethod = await f.req('/api/session', { method: 'POST', body: {} }); assert.equal(invalidMethod.status, 405); assert.equal(invalidMethod.headers.get('allow'), 'GET');
});

test('演示登录仅限回环 HTTP 环境，生产误配置也不会开放站主身份', async t => {
  const f = await fixture(t);
  assert.equal((await f.req('/api/local-session', { method: 'POST', body: {} })).status, 400);
  f.env.APP_ORIGIN = 'https://workspace.example'; f.env.LOCAL_DEMO = true;
  const request = new Request('https://workspace.example/api/local-session', { method: 'POST', headers: { Origin: f.env.APP_ORIGIN, 'Content-Type': 'application/json' }, body: '{"role":"owner"}' });
  const response = await worker.fetch(request, f.env); assert.equal(response.status, 404); assert.equal(response.headers.get('set-cookie'), null);
  const session = await (await worker.fetch(new Request('https://workspace.example/api/session'), f.env)).json(); assert.equal(session.localDemo, false); assert.equal(session.user, null);
});

test('过期或伪造会话被拒绝，JSON 接口拒绝非对象和错误格式', async t => {
  const f = await fixture(t);
  for (const body of [null, [], 'text']) assert.equal((await f.as(f.editor, '/api/documents', 'POST', body)).status, 400);
  const plain = new Request(`${ORIGIN}/api/documents`, { method: 'POST', headers: { Origin: ORIGIN, Cookie: f.editor.cookie, 'X-CSRF-Token': f.editor.csrf, 'Content-Type': 'text/plain' }, body: '{"title":"bad"}' });
  assert.equal((await worker.fetch(plain, f.env)).status, 415);
  await f.DB.prepare('UPDATE sessions SET expires_at=? WHERE github_id=?').bind(Date.now() - 1, 'local-editor').run();
  assert.equal((await f.as(f.editor, '/api/documents')).status, 401);
  assert.equal((await f.req('/api/documents', { cookie: `guide_session=${'a'.repeat(43)}` })).status, 401);
});

test('未受邀 GitHub 账号无法创建会话，登录起点与回调必须使用正式域名', async t => {
  const f = await fixture(t); f.env.LOCAL_DEMO = false; f.env.GITHUB_CLIENT_ID = 'test-client'; f.env.GITHUB_CLIENT_SECRET = 'test-secret';
  assert.equal((await worker.fetch(new Request('https://alias.example/auth/github'), f.env)).status, 403);
  const start = await f.req('/auth/github'); const state = new URL(start.headers.get('location')).searchParams.get('state'); const cookie = start.headers.get('set-cookie').split(';')[0];
  assert.equal((await worker.fetch(new Request(`https://alias.example/auth/callback?state=${state}&code=test`, { headers: { Cookie: cookie } }), f.env)).status, 403);
  let calls = 0; f.env.OAUTH_FETCH = async () => new Response(JSON.stringify(++calls === 1 ? { access_token: 'test-token' } : { id: 1234567, login: 'not-invited' }));
  const response = await f.req(`/auth/callback?state=${state}&code=test`, { cookie }); assert.equal(response.status, 403); assert.equal(response.headers.get('set-cookie'), null);
  assert.equal((await f.DB.prepare('SELECT count(*) AS count FROM sessions WHERE github_id=?').bind('1234567').first()).count, 0);
});

test('登录限流会在发起更多 OAuth 跳转之前生效', async t => {
  const f = await fixture(t); f.env.LOCAL_DEMO = false; f.env.GITHUB_CLIENT_ID = 'test-client'; f.env.GITHUB_CLIENT_SECRET = 'test-secret';
  await f.DB.prepare("DELETE FROM rate_limits WHERE key LIKE 'auth:%'").run();
  for (let i = 0; i < 30; i++) assert.equal((await f.req('/auth/github')).status, 302);
  const response = await f.req('/auth/github'); assert.equal(response.status, 429); assert.equal(response.headers.get('location'), null);
});
