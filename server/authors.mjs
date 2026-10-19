import { sanitizeAuthor, sanitizeAuthorIds } from '../shared/authors.mjs';
import { HttpError, json, now, queryAll, recordAudit } from './auth.mjs';

const authorData = row => ({ id: row.id, name: row.name, email: row.email, github: row.github, links: JSON.parse(row.links), version: row.version, updatedAt: row.updated_at });
async function association(env, documentId) {
  const row = await env.DB.prepare('SELECT author_ids,version FROM document_authors WHERE document_id=?').bind(documentId).first();
  const authorIds = row ? JSON.parse(row.author_ids) : [];
  const authors = authorIds.length ? (await queryAll(env, 'SELECT * FROM authors WHERE id IN (SELECT value FROM json_each(?))', JSON.stringify(authorIds))).map(authorData) : [];
  return { authorIds, version: row?.version || 0, authors: authorIds.map(id => authors.find(author => author.id === id)).filter(Boolean) };
}

// The caller MUST authorize invited membership and enforce origin/CSRF before entering.
// Private contacts deliberately live outside document snapshots, revisions and publications.
export async function authorsRoute(request, env, user, readBody) {
  const path = new URL(request.url).pathname;
  if (path === '/api/authors') {
    if (request.method === 'GET') return json({ authors: (await queryAll(env, 'SELECT * FROM authors ORDER BY name COLLATE NOCASE,id')).map(authorData) });
    if (request.method === 'POST') {
      const author = sanitizeAuthor(await readBody(request)); const id = crypto.randomUUID(); const time = now();
      const inserted = await env.DB.prepare('INSERT INTO authors(id,name,email,github,links,created_at,updated_at,updated_by) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM authors)<500').bind(id, author.name, author.email, author.github, JSON.stringify(author.links), time, time, user.id).run();
      if (!inserted.meta.changes) throw new HttpError(400, '作者索引最多保存 500 位作者');
      await recordAudit(env, user.id, 'create-author', id);
      return json({ author: authorData(await env.DB.prepare('SELECT * FROM authors WHERE id=?').bind(id).first()) }, 201);
    }
    throw new HttpError(405, '作者索引不支持此操作');
  }
  const authorMatch = /^\/api\/authors\/([a-f0-9-]{36})$/.exec(path);
  if (authorMatch) {
    if (request.method !== 'PUT') throw new HttpError(405, '作者信息仅支持更新');
    const input = await readBody(request); const author = sanitizeAuthor(input);
    if (!Number.isSafeInteger(input.version) || input.version < 1) throw new HttpError(400, '请提供作者信息的版本号');
    if (!await env.DB.prepare('SELECT id FROM authors WHERE id=?').bind(authorMatch[1]).first()) throw new HttpError(404, '作者不存在');
    const saved = await env.DB.prepare('UPDATE authors SET name=?,email=?,github=?,links=?,version=version+1,updated_at=?,updated_by=? WHERE id=? AND version=?').bind(author.name, author.email, author.github, JSON.stringify(author.links), now(), user.id, authorMatch[1], input.version).run();
    if (!saved.meta.changes) throw new HttpError(409, '另一位伙伴已修改这位作者，请保留当前输入，再重新加载核对');
    await recordAudit(env, user.id, 'update-author', authorMatch[1]);
    return json({ author: authorData(await env.DB.prepare('SELECT * FROM authors WHERE id=?').bind(authorMatch[1]).first()) });
  }
  const docMatch = /^\/api\/documents\/([a-f0-9-]{36})\/authors$/.exec(path);
  if (!docMatch) return null;
  const documentId = docMatch[1];
  if (!await env.DB.prepare('SELECT id FROM documents WHERE id=? AND archived=0').bind(documentId).first()) throw new HttpError(404, '文档不存在或已被移除');
  if (request.method === 'GET') return json(await association(env, documentId));
  if (request.method !== 'PUT') throw new HttpError(405, '作者关联不支持此操作');
  const input = await readBody(request); const authorIds = sanitizeAuthorIds(input.authorIds);
  if (!Number.isSafeInteger(input.version) || input.version < 0) throw new HttpError(400, '请提供作者关联的版本号');
  const ids = JSON.stringify(authorIds);
  if ((await queryAll(env, 'SELECT id FROM authors WHERE id IN (SELECT value FROM json_each(?))', ids)).length !== authorIds.length) throw new HttpError(400, '部分作者不存在，请刷新作者索引');
  const saved = await env.DB.prepare(`INSERT INTO document_authors(document_id,author_ids,version,updated_at,updated_by)
    SELECT ?,?,1,?,? WHERE EXISTS(SELECT 1 FROM documents WHERE id=? AND archived=0)
    AND (?=0 OR EXISTS(SELECT 1 FROM document_authors WHERE document_id=? AND version=?))
    ON CONFLICT(document_id) DO UPDATE SET author_ids=excluded.author_ids,version=document_authors.version+1,updated_at=excluded.updated_at,updated_by=excluded.updated_by WHERE document_authors.version=?`).bind(documentId, ids, now(), user.id, documentId, input.version, documentId, input.version, input.version).run();
  if (!saved.meta.changes) throw new HttpError(409, '作者关联或文档状态已变化，请重新加载后核对');
  await recordAudit(env, user.id, 'associate-authors', documentId);
  return json(await association(env, documentId));
}
