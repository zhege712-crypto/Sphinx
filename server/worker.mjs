import { InputError, sanitizeDocument, safeTitle, emptyDocument, imageType, collectAssets, documentText } from '../shared/document.mjs';
import { safeTags } from '../shared/tags.mjs';
import { authRoute, authorize, HttpError, json, queryAll, now, recordAudit } from './auth.mjs';
import { publicCatalog, publishedVersion, publish, reconcile } from './publication.mjs';
import { d1Files } from './d1-files.mjs';
import { initializeReferences } from './initialize-references.mjs';
import { isLoopbackDemo } from '../shared/security-policy.mjs';
import { secureResponse } from './response-security.mjs';
import { PROJECT_DOCUMENT_ID, CONTRIBUTORS_DOCUMENT_ID } from '../shared/project.mjs';
import { contributorsDraft } from './contributors.mjs';
import { directoryStamp } from '../shared/directory-order.mjs';
import { prepareDirectoryOrder } from './directory-order.mjs';
import { deletionSelection } from '../shared/document-selection.mjs';
import { authorsRoute } from './authors.mjs';
import { readValhalla, safeValhalla } from '../shared/valhalla.mjs';

const uuid = (id) => /^[a-f0-9-]{36}$/.test(id ?? '');
const parse = JSON.parse;
const unlocked = "NOT EXISTS(SELECT 1 FROM locks WHERE name='publication' AND expires_at>?) AND NOT EXISTS(SELECT 1 FROM publication_jobs WHERE status IN ('pending','committed'))";
const meta = (r) => ({ id: r.id, title: r.title, parentId: r.parent_id, kind: r.kind, position: r.position, version: r.version, publishedVersion: r.published_version, publishedAt: r.published_at, updatedAt: r.updated_at, updatedBy: r.updated_by, tags: parse(r.tags || '[]'), text: documentText(parse(r.draft)), valhalla: { enabled: readValhalla(r.valhalla).enabled, text: documentText(readValhalla(r.valhalla).blocks) } });
const rowFor = async (env, id) => { const r = await env.DB.prepare('SELECT * FROM documents WHERE id=? AND archived=0').bind(id).first(); if (!r) throw new HttpError(404, '文档不存在或已被移除'); return r; };
export const treeStamp = directoryStamp;
async function writable(env) {
  if (await env.DB.prepare("SELECT name FROM locks WHERE name='publication' AND expires_at>? UNION ALL SELECT id FROM publication_jobs WHERE status IN ('pending','committed') LIMIT 1").bind(Date.now()).first()) throw new HttpError(409, '发布正在进行或等待恢复，请稍后保存；当前编辑内容仍保留');
}
async function bytes(request, limit) {
  if (Number(request.headers.get('content-length') || 0) > limit) throw new HttpError(413, '上传内容过大');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw new HttpError(413, '上传内容过大'); } chunks.push(value); }
  const result = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; } return result;
}
async function body(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new HttpError(415, '此接口仅接受 JSON 内容');
  try { const input = parse(new TextDecoder().decode(await bytes(request, 450000))); if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(); return input; }
  catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(400, '请求内容格式不正确'); }
}
async function parentCheck(env, id, parentId) {
  let current = parentId; const seen = new Set([id]);
  for (let depth = 0; current; depth++) { if (depth > 12 || seen.has(current)) throw new HttpError(400, '目录不能循环嵌套，最多支持 12 层'); seen.add(current); current = (await rowFor(env, current)).parent_id; }
}
async function assertAssets(env, blocks) {
  const ids = collectAssets(blocks);
  if (ids.length > 20) throw new HttpError(400, '单篇文档最多使用 20 张图片，请拆分章节');
  if (ids.length) {
    const found = await queryAll(env, 'SELECT id FROM assets WHERE id IN (SELECT value FROM json_each(?))', JSON.stringify(ids));
    if (found.length !== ids.length) throw new HttpError(400, '图片不存在，请重新上传');
  }
}
async function save(env, user, id, input) {
  await writable(env);
  const row = await rowFor(env, id);
  const title = safeTitle(input.title);
  const tags = JSON.stringify(safeTags(input.tags === undefined ? parse(row.tags || '[]') : input.tags));
  if (row.kind !== 'reference' && parse(tags).length) throw new InputError('仅 Reference 词条支持标签');
  const draft = JSON.stringify(sanitizeDocument(input.blocks));
  const valhalla = JSON.stringify(safeValhalla(input.valhalla === undefined ? readValhalla(row.valhalla) : input.valhalla, row.kind));
  if (draft.length + valhalla.length > 350000) throw new InputError('词条与 Valhalla 评测内容过大，请精简或拆分内容');
  await assertAssets(env, [...parse(draft), ...parse(valhalla).blocks]);
  if (input.version !== row.version) throw new HttpError(409, '另一位伙伴已更新这篇文档。请保留当前内容，再重新加载最新版本');
  const time = now();
  // Snapshot and compare-and-swap run in one D1 transaction. No publication may overlap a save.
  const results = await env.DB.batch([
    env.DB.prepare(`INSERT INTO revisions(id,document_id,title,draft,tags,valhalla,version,actor,created_at) SELECT ?,id,title,draft,tags,valhalla,version,?,? FROM documents WHERE id=? AND version=? AND archived=0 AND ${unlocked}`).bind(crypto.randomUUID(), user.id, time, id, input.version, Date.now()),
    env.DB.prepare(`UPDATE documents SET title=?,draft=?,tags=?,valhalla=?,version=version+1,updated_at=?,updated_by=? WHERE id=? AND version=? AND archived=0 AND ${unlocked}`).bind(title, draft, tags, valhalla, time, user.id, id, input.version, Date.now()),
  ]);
  if (!results[1].meta.changes) throw new HttpError(409, '保存时文档状态已变化，请保留内容后重新加载');
  return json({ document: { ...meta(await rowFor(env, id)), blocks: parse(draft), valhalla: parse(valhalla) } });
}
async function route(request, env) {
  const path = new URL(request.url).pathname;
  if (path.startsWith('/auth/') || ['/api/session','/api/local-session','/api/logout'].includes(path)) { const response = await authRoute(request, env, path); if (response) return response; }
  if (path === '/api/public/catalog' && request.method === 'GET') return json(await publicCatalog(env));
  const publicAsset = /^\/assets\/([a-f0-9-]{36})\.(png|jpg|gif|webp)$/.exec(path);
  const assetMatch = /^\/api\/assets\/([a-f0-9-]{36})$/.exec(path) || publicAsset;
  if (assetMatch && request.method === 'GET') {
    if (!publicAsset) await authorize(request, env);
    const a = await env.DB.prepare('SELECT * FROM assets WHERE id=?').bind(assetMatch[1]).first();
    if (!a) throw new HttpError(404, '图片不存在');
    if (publicAsset && (!a.public_at || publicAsset[2] !== a.extension)) throw new HttpError(404, '图片尚未公开');
    const object = await env.FILES.get(a.id); if (!object) throw new HttpError(404, '图片不存在');
    return new Response(object.body, { headers: { 'Content-Type': a.mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': publicAsset ? 'public, max-age=3600' : 'private, no-store', 'Content-Disposition': 'inline' } });
  }
  if (!path.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  const aboutInitialization = ['/api/project/initialize', '/api/contributors/initialize'].includes(path);
  const user = await authorize(request, env, path.startsWith('/api/members') || path === '/api/audit' || path === '/api/reconcile' || path === '/api/references/initialize' || aboutInitialization);
  const authorResponse = await authorsRoute(request, env, user, body);
  if (authorResponse) return authorResponse;
  if (aboutInitialization && request.method === 'POST') {
    await writable(env);
    const contributors = path === '/api/contributors/initialize';
    const id = contributors ? CONTRIBUTORS_DOCUMENT_ID : PROJECT_DOCUMENT_ID;
    const existing = await env.DB.prepare('SELECT * FROM documents WHERE id=?').bind(id).first();
    if (existing) return json({ document: meta(await rowFor(env, id)) });
    const draft = contributors ? contributorsDraft([{ login: user.login }, ...await queryAll(env, 'SELECT login FROM members WHERE active=1 ORDER BY created_at,login')]) : emptyDocument();
    const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO documents(id,title,kind,position,draft,updated_at,updated_by) SELECT ?,?,'document',0,?,?,? WHERE ${unlocked}`).bind(id, contributors ? '参与者与致谢' : '关于 Sphinx', JSON.stringify(draft), now(), user.id, Date.now()).run();
    if (inserted.meta.changes) await recordAudit(env, user.id, 'create', id);
    return json({ document: { ...meta(await rowFor(env, id)) } });
  }
  if (path === '/api/references/initialize' && request.method === 'POST') { await writable(env); return json(await initializeReferences(env, user)); }
  if (path === '/api/documents' && request.method === 'GET') return json({ documents: (await queryAll(env, 'SELECT * FROM documents WHERE archived=0 ORDER BY position,title')).map(meta) });
  if (path === '/api/directory/order' && request.method === 'POST') {
    if (user.role !== 'owner') throw new HttpError(403, '排序应用仅站主可执行，伙伴请提交排序审核');
    await writable(env);
    const input = await body(request);
    const rows = await queryAll(env, 'SELECT * FROM documents WHERE archived=0');
    const order = prepareDirectoryOrder(rows, input);
    const result = await publish(env, user, order.delta, [], null, input.tree);
    await recordAudit(env, user.id, 'reorder-directory', order.parentId || 'root');
    return json(result);
  }
  if (path === '/api/documents' && request.method === 'POST') {
    await writable(env); const input = await body(request); const id = crypto.randomUUID();
    const parentId = input.parentId || null; if (parentId) await parentCheck(env, id, parentId);
    const title = safeTitle(input.title || '未命名文档'); const kind = ['folder', 'reference'].includes(input.kind) ? input.kind : 'document';
    const inserted = await env.DB.prepare(`INSERT INTO documents(id,title,parent_id,kind,position,draft,updated_at,updated_by) SELECT ?,?,?,?,COALESCE(MAX(position),0)+1,?,?,? FROM documents HAVING ${unlocked} AND (? IS NULL OR EXISTS(SELECT 1 FROM documents WHERE id=? AND archived=0))`).bind(id, title, parentId, kind, JSON.stringify(emptyDocument()), now(), user.id, Date.now(), parentId, parentId).run();
    if (!inserted.meta.changes) throw new HttpError(409, '发布过程中无法新建，请稍后重试');
    await recordAudit(env, user.id, 'create', id);
    return json({ document: { ...meta(await rowFor(env, id)), blocks: emptyDocument() } }, 201);
  }
  const docMatch = /^\/api\/documents\/([a-f0-9-]{36})(?:\/(publish|history|restore|move))?$/.exec(path);
  if (docMatch) {
    const [, id, action] = docMatch;
    const row = await rowFor(env, id);
    if (!action && request.method === 'GET') return json({ document: { ...meta(row), blocks: parse(row.draft), valhalla: readValhalla(row.valhalla) } });
    if (!action && request.method === 'PUT') return save(env, user, id, await body(request));
    if (action === 'history' && request.method === 'GET') return json({ revisions: await queryAll(env, 'SELECT id,title,version,actor,created_at FROM revisions WHERE document_id=? ORDER BY version DESC LIMIT 50', id) });
    if (action === 'restore' && request.method === 'POST') {
      const input = await body(request); const revision = await env.DB.prepare('SELECT * FROM revisions WHERE document_id=? AND id=?').bind(id, input.revisionId).first();
      if (!revision) throw new HttpError(404, '历史版本不存在');
      return save(env, user, id, { version: input.version, title: revision.title, blocks: parse(revision.draft), tags: parse(revision.tags || '[]'), valhalla: readValhalla(revision.valhalla) });
    }
    if (action === 'publish' && request.method === 'POST') {
      const input = await body(request); if (input.version !== row.version) throw new HttpError(409, '文档已更新，请先加载最新版本再发布');
      const { snapshot, assets } = await publishedVersion(env, row);
      return json(await publish(env, user, [{ id, snapshot, expectedVersion: row.version }], assets));
    }
    if (action === 'move' && request.method === 'POST') {
      throw new HttpError(400, '请通过目录调整申请提交审核');
    }
  }
  if (path === '/api/assets' && request.method === 'POST') {
    const data = await bytes(request, 5 * 1024 * 1024); const type = imageType(data); const id = crypto.randomUUID();
    const totals = await env.DB.prepare('SELECT count(*) AS count,COALESCE(sum(size),0) AS size FROM assets WHERE actor=? AND created_at>?').bind(user.id, new Date(Date.now() - 86400000).toISOString()).first();
    if (totals.count >= 100 || totals.size + data.byteLength > 100 * 1024 * 1024) throw new HttpError(429, '今天的图片上传已达到上限，请稍后继续');
    await env.FILES.put(id, data, { httpMetadata: { contentType: type.mime } });
    try { await env.DB.prepare('INSERT INTO assets(id,mime,extension,size,created_at,actor) VALUES(?,?,?,?,?,?)').bind(id, type.mime, type.extension, data.byteLength, now(), user.id).run(); }
    catch (error) { if (env.FILES.delete) await env.FILES.delete(id); throw error; }
    return json({ url: `/api/assets/${id}`, id }, 201);
  }
  if (path === '/api/assets' && request.method === 'GET') return json({ assets: await queryAll(env, 'SELECT * FROM assets ORDER BY created_at DESC LIMIT 200') });
  if (path === '/api/reviews' && request.method === 'GET') return json({ reviews: (await queryAll(env, 'SELECT * FROM reviews ORDER BY created_at DESC LIMIT 100')).map((r) => ({ ...r, payload: parse(r.payload) })) });
  if (path === '/api/reviews' && request.method === 'POST') {
    const input = await body(request); const rows = await queryAll(env, 'SELECT * FROM documents WHERE archived=0');
    if (input.action === 'reorder') {
      await writable(env);
      const order = prepareDirectoryOrder(rows, input);
      const id = crypto.randomUUID();
      const payload = { ids: order.ids, parentId: order.parentId, titles: order.titles, tree: treeStamp(rows) };
      const inserted = await env.DB.prepare(`INSERT INTO reviews(id,action,payload,actor,created_at) SELECT ?,'reorder',?,?,? WHERE ${unlocked}`).bind(id, JSON.stringify(payload), user.id, now(), Date.now()).run();
      if (!inserted.meta.changes) throw new HttpError(409, '发布过程中暂时无法提交排序，请稍后重试');
      await recordAudit(env, user.id, 'request-reorder', id);
      return json({ id }, 201);
    }
    if (!['delete', 'bulkMove'].includes(input.action) || !Array.isArray(input.ids) || !input.ids.length || input.ids.length > 100 || input.ids.some((id) => !uuid(id) || !rows.some((r) => r.id === id))) throw new HttpError(400, '请选择需要审核的文档');
    if (input.action === 'delete' && input.tree !== undefined && input.tree !== treeStamp(rows)) throw new HttpError(409, '删除确认后内容或目录已变化，请关闭窗口并重新选择，核对最新的子文档');
    const selected = new Set(input.action === 'delete' ? deletionSelection(rows, input.ids).map(row => row.id) : input.ids);
    const parentId = input.parentId || null;
    if (input.action === 'bulkMove') for (const id of selected) { await parentCheck(env, id, parentId); if (selected.has(parentId)) throw new HttpError(400, '目标目录不能属于待移动的文档'); }
    const payload = { ids: [...selected], parentId, titles: rows.filter((r) => selected.has(r.id)).map((r) => r.title), tree: treeStamp(rows) };
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO reviews(id,action,payload,actor,created_at) VALUES(?,?,?,?,?)').bind(id, input.action, JSON.stringify(payload), user.id, now()).run();
    await recordAudit(env, user.id, `request-${input.action}`, id);
    return json({ id }, 201);
  }
  const reviewMatch = /^\/api\/reviews\/([a-f0-9-]{36})\/(approve|reject)$/.exec(path);
  if (reviewMatch && request.method === 'POST') {
    if (user.role !== 'owner') throw new HttpError(403, '审核仅站主可执行');
    const r = await env.DB.prepare("SELECT * FROM reviews WHERE id=? AND status='pending'").bind(reviewMatch[1]).first();
    if (!r) throw new HttpError(409, '此申请已处理');
    if (reviewMatch[2] === 'reject') {
      const rejected = await env.DB.prepare(`UPDATE reviews SET status='rejected',resolved_at=?,resolved_by=? WHERE id=? AND status='pending' AND ${unlocked}`).bind(now(), user.id, r.id, Date.now()).run();
      if (!rejected.meta.changes) throw new HttpError(409, '该申请正在执行或已处理，请确认最新状态');
      return json({ ok: true });
    }
    const payload = parse(r.payload); const rows = await queryAll(env, 'SELECT * FROM documents WHERE archived=0');
    if (treeStamp(rows) !== payload.tree) throw new HttpError(409, '申请提交后内容或目录已变化，请驳回后重新提交，避免误删或覆盖');
    const delta = r.action === 'reorder' ? prepareDirectoryOrder(rows, payload).delta : rows.filter((row) => payload.ids.includes(row.id)).map((row) => r.action === 'delete' ? { id: row.id, expectedVersion: row.version, remove: true } : { id: row.id, expectedVersion: row.version, move: { parentId: payload.parentId, position: row.position }, ...(row.published ? { snapshot: { ...parse(row.published), parentId: payload.parentId } } : {}) });
    const result = await publish(env, user, delta, [], r.id);
    await env.DB.prepare('UPDATE reviews SET resolved_by=? WHERE id=?').bind(user.id, r.id).run();
    await recordAudit(env, user.id, `approve-${r.action}`, r.id);
    return json(result);
  }
  if (path === '/api/members' && request.method === 'GET') return json({ members: await queryAll(env, 'SELECT * FROM members ORDER BY active DESC,created_at') });
  if (path === '/api/members' && request.method === 'POST') {
    const input = await body(request); if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(input.login ?? '')) throw new HttpError(400, '请输入正确的 GitHub 用户名');
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(input.login)}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Sphinx' }, signal: AbortSignal.timeout(10000) });
    const profile = await response.json(); if (!response.ok || !Number.isSafeInteger(profile.id)) throw new HttpError(400, '未找到这个 GitHub 账号，请检查用户名');
    if (String(profile.id) === env.OWNER_GITHUB_ID) throw new HttpError(400, '该账号已经是站主');
    await env.DB.prepare('INSERT INTO members(github_id,login,name,active,created_at) VALUES(?,?,?,1,?) ON CONFLICT(github_id) DO UPDATE SET login=excluded.login,active=1').bind(String(profile.id), profile.login, profile.name || '', now()).run();
    await recordAudit(env, user.id, 'invite', String(profile.id)); return json({ ok: true });
  }
  const memberMatch = /^\/api\/members\/([\w-]+)\/deactivate$/.exec(path);
  if (memberMatch && request.method === 'POST') {
    if (memberMatch[1] === env.OWNER_GITHUB_ID) throw new HttpError(400, '不能移除站主');
    await env.DB.batch([env.DB.prepare('UPDATE members SET active=0 WHERE github_id=?').bind(memberMatch[1]), env.DB.prepare('DELETE FROM sessions WHERE github_id=?').bind(memberMatch[1])]);
    await recordAudit(env, user.id, 'deactivate', memberMatch[1]); return json({ ok: true });
  }
  if (path === '/api/audit' && request.method === 'GET') return json({ events: await queryAll(env, 'SELECT * FROM audit ORDER BY created_at DESC LIMIT 100') });
  if (path === '/api/reconcile' && request.method === 'POST') return json(await reconcile(env));
  throw new HttpError(404, '未找到该功能');
}
export default {
  async fetch(request, env) {
    env = { ...env, LOCAL_DEMO: isLoopbackDemo(env, request.url) };
    try {
      env = { ...env, FILES: env.FILES || d1Files(env.DB) };
      return secureResponse(await route(request, env), env, request.url);
    } catch (error) {
      if (!(error instanceof HttpError || error instanceof InputError)) console.error('Request failed', error.name || 'Error');
      return secureResponse(json({ error: error instanceof HttpError || error instanceof InputError ? error.message : '操作暂未完成，请保留内容后重试' }, error.status || (error instanceof InputError ? 400 : 500)), env);
    }
  },
  async scheduled(_event, env) { await env.DB.batch(['sessions', 'oauth_states', 'rate_limits', 'locks'].map((table) => env.DB.prepare(`DELETE FROM ${table} WHERE expires_at<?`).bind(Date.now()))); },
};
