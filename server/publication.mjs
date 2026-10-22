import { collectAssets, publicBlocks, documentText } from '../shared/document.mjs';
import { HttpError, now, queryAll, recordAudit } from './auth.mjs';
import { compareDirectoryEntries, directoryStamp } from '../shared/directory-order.mjs';
import { readValhalla } from '../shared/valhalla.mjs';
import { readerCatalogDocuments, readerCatalogAssetIds } from '../shared/reader-visibility.mjs';

const parse = (value) => value ? JSON.parse(value) : null;
export async function publicCatalog(env) {
  const rows = await queryAll(env, 'SELECT id,parent_id,reader_hidden,published FROM documents WHERE archived=0 ORDER BY position,title');
  const jobs = await queryAll(env, "SELECT id FROM publication_jobs WHERE status='complete' ORDER BY created_at DESC LIMIT 100");
  return { schemaVersion: 1, siteTitle: env.SITE_TITLE || 'Sphinx', documents: readerCatalogDocuments(rows), publicationIds: jobs.map((j) => j.id) };
}
async function github(env, path, init = {}) {
  const response = await (env.GITHUB_FETCH || fetch)(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/${path}`, { ...init, signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${env.GITHUB_PUBLISH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Sphinx-publisher', 'Content-Type': 'application/json' } });
  if (!response.ok) throw new HttpError(response.status === 409 || response.status === 422 ? 409 : 502, 'GitHub 发布未完成，请检查独立仓库配置或稍后重试；草稿仍然保留');
  return response.json();
}
function base64(bytes) {
  const data = new Uint8Array(bytes);
  let binary = '';
  for (let start = 0; start < data.length; start += 16384) binary += String.fromCharCode(...data.subarray(start, start + 16384));
  return btoa(binary);
}
async function pushCatalog(env, catalog, assets, token) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? '') || !env.GITHUB_PUBLISH_TOKEN) throw new HttpError(503, '发布尚未配置：需要独立的 GitHub 仓库及仅限该仓库的服务端凭证');
  const branch = env.GITHUB_BRANCH || 'main';
  if (!/^[\w./-]+$/.test(branch)) throw new HttpError(503, '发布分支配置不正确');
  const reference = await github(env, `git/ref/heads/${branch}`);
  const commit = await github(env, `git/commits/${reference.object.sha}`);
  const tree = [];
  for (const asset of assets) {
    const object = await env.FILES.get(asset.id);
    if (!object) throw new HttpError(409, '文档引用的图片不存在，请重新上传');
    const blob = await github(env, 'git/blobs', { method: 'POST', body: JSON.stringify({ content: base64(await object.arrayBuffer()), encoding: 'base64' }) });
    tree.push({ path: `public/assets/${asset.id}.${asset.extension}`, mode: '100644', type: 'blob', sha: blob.sha });
  }
  tree.push({ path: 'public/catalog.json', mode: '100644', type: 'blob', content: JSON.stringify(catalog) });
  const madeTree = await github(env, 'git/trees', { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
  const madeCommit = await github(env, 'git/commits', { method: 'POST', body: JSON.stringify({ message: 'Publish guide content', tree: madeTree.sha, parents: [reference.object.sha] }) });
  const held = await env.DB.prepare('SELECT token FROM locks WHERE name=? AND token=? AND expires_at>?').bind('publication', token, Date.now() + 15000).first();
  if (!held) throw new HttpError(409, '发布锁已过期，请恢复发布状态后重试');
  await github(env, `git/refs/heads/${branch}`, { method: 'PATCH', body: JSON.stringify({ sha: madeCommit.sha, force: false }) });
  return madeCommit.sha;
}
export async function publishedVersion(env, row) {
  const blocks = parse(row.draft);
  const evaluation = readValhalla(row.valhalla);
  const evaluationBlocks = row.kind === 'reference' && evaluation.enabled ? evaluation.blocks : [];
  const assetIds = collectAssets([...blocks, ...evaluationBlocks]);
  if (assetIds.length > 20) throw new HttpError(400, '单篇文档最多发布 20 张图片，请拆分章节');
  const assets = new Map();
  let totalSize = 0;
  const records = assetIds.length ? await queryAll(env, 'SELECT * FROM assets WHERE id IN (SELECT value FROM json_each(?))', JSON.stringify(assetIds)) : [];
  for (const id of assetIds) {
    const asset = records.find((record) => record.id === id);
    if (!asset) throw new HttpError(409, '引用的图片不存在，请移除后重新上传');
    assets.set(id, asset);
    totalSize += asset.size;
  }
  if (totalSize > 15 * 1024 * 1024) throw new HttpError(400, '单次发布图片总量应小于 15 MB，请压缩或拆分章节');
  return { snapshot: { id: row.id, title: row.title, parentId: row.parent_id, position: row.position, kind: row.kind, version: row.version, updatedAt: row.updated_at, publishedAt: now(), blocks: publicBlocks(blocks, assets), text: documentText(blocks), tags: parse(row.tags || '[]'), ...(row.kind === 'reference' ? { valhalla: { enabled: evaluation.enabled, blocks: publicBlocks(evaluationBlocks, assets), text: documentText(evaluationBlocks) } } : {}) }, assets: [...assets.values()] };
}
async function applyJob(env, job) {
  // Set-based updates keep approved subtree changes and image publication below
  // the D1 Free per-invocation query limit, including large approved batches.
  const statements = [
    env.DB.prepare("UPDATE documents SET archived=1,published=NULL WHERE id IN (SELECT json_extract(value,'$.id') FROM json_each(?) WHERE json_extract(value,'$.remove')=1)").bind(job.delta),
    env.DB.prepare("UPDATE documents SET parent_id=json_extract(item.value,'$.move.parentId'),position=json_extract(item.value,'$.move.position'),version=version+1,updated_at=? FROM json_each(?) item WHERE documents.id=json_extract(item.value,'$.id') AND json_type(item.value,'$.move')='object'").bind(now(), job.delta),
    env.DB.prepare("UPDATE documents SET position=json_extract(item.value,'$.reorder.position'),version=version+1 FROM json_each(?) item WHERE documents.id=json_extract(item.value,'$.id') AND json_type(item.value,'$.reorder')='object'").bind(job.delta),
    env.DB.prepare("UPDATE documents SET published=json_extract(item.value,'$.snapshot'),published_version=json_extract(item.value,'$.snapshot.version'),published_at=json_extract(item.value,'$.snapshot.publishedAt') FROM json_each(?) item WHERE documents.id=json_extract(item.value,'$.id') AND json_type(item.value,'$.snapshot')='object'").bind(job.delta),
    env.DB.prepare("UPDATE documents SET reader_hidden=CASE WHEN json_extract(item.value,'$.visibility.hidden') THEN 1 ELSE 0 END FROM json_each(?) item WHERE documents.id=json_extract(item.value,'$.id') AND json_type(item.value,'$.visibility')='object'").bind(job.delta),
    env.DB.prepare('UPDATE assets SET public_at=COALESCE(public_at,?) WHERE id IN (SELECT value FROM json_each(?))').bind(now(), job.asset_ids),
  ];
  if (job.review_id) statements.push(env.DB.prepare("UPDATE reviews SET status='approved',resolved_at=? WHERE id=?").bind(now(), job.review_id));
  statements.push(env.DB.prepare("UPDATE publication_jobs SET status='complete',updated_at=? WHERE id=?").bind(now(), job.id));
  await env.DB.batch(statements);
}
export async function publish(env, actor, delta, assets = [], reviewId = null, expectedTree = null) {
  if (env.LOCAL_DEMO !== true && (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? '') || !env.GITHUB_PUBLISH_TOKEN)) throw new HttpError(503, '发布服务尚未配置，草稿已保留');
  const token = crypto.randomUUID();
  const acquired = await env.DB.prepare('INSERT INTO locks(name,token,expires_at) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at WHERE locks.expires_at<? RETURNING token').bind('publication', token, Date.now() + 300000, Date.now()).first();
  if (!acquired) throw new HttpError(409, '另一次发布正在进行，请稍后重试');
  let job;
  try {
    const pending = await env.DB.prepare("SELECT id FROM publication_jobs WHERE status IN ('pending','committed') LIMIT 1").first();
    if (pending) throw new HttpError(409, '存在未确认的发布，请让站主先恢复发布状态');
    if (reviewId || expectedTree !== null) {
      const review = reviewId ? await env.DB.prepare("SELECT payload FROM reviews WHERE id=? AND status='pending'").bind(reviewId).first() : null;
      const rows = await queryAll(env, 'SELECT id,version,parent_id FROM documents WHERE archived=0');
      const stamp = directoryStamp(rows);
      if (reviewId ? !review || parse(review.payload).tree !== stamp : expectedTree !== stamp) throw new HttpError(409, '内容或目录已变化，请刷新后重新调整或提交申请');
    }
    const currentRows = await queryAll(env, 'SELECT id,version,archived,reader_hidden FROM documents WHERE id IN (SELECT value FROM json_each(?))', JSON.stringify(delta.map((entry) => entry.id)));
    for (const entry of delta) {
      const row = currentRows.find((candidate) => candidate.id === entry.id);
      if (!row || row.archived || row.version !== entry.expectedVersion) throw new HttpError(409, '文档已发生变化，请刷新后重新操作');
      if (entry.visibility && (row.reader_hidden === 1) !== entry.expectedHidden) throw new HttpError(409, '阅读可见性已变化，请刷新后重新操作');
    }
    const catalog = await publicCatalog(env);
    const rows = await queryAll(env, 'SELECT id,parent_id,reader_hidden,published FROM documents WHERE archived=0');
    catalog.documents = readerCatalogDocuments(rows, delta);
    catalog.documents.sort(compareDirectoryEntries);
    if (new TextEncoder().encode(JSON.stringify(catalog)).byteLength > 1400000) throw new HttpError(400, '站点内容已超出首版发布容量，请由站主调整发布架构');
    const visibleAssetIds = readerCatalogAssetIds(catalog.documents);
    // A hidden publication retains its approved snapshot privately. Upload its
    // new images only when that snapshot actually returns to the reader catalog.
    assets = visibleAssetIds.length ? await queryAll(env, 'SELECT * FROM assets WHERE public_at IS NULL AND id IN (SELECT value FROM json_each(?))', JSON.stringify(visibleAssetIds)) : [];
    const id = crypto.randomUUID();
    catalog.publicationIds = [id, ...catalog.publicationIds].slice(0, 100);
    job = { id, delta: JSON.stringify(delta), asset_ids: JSON.stringify(assets.map((a) => a.id)), review_id: reviewId };
    await recordAudit(env, actor.id, 'publish-attempt', id);
    await env.DB.prepare('INSERT INTO publication_jobs(id,delta,asset_ids,review_id,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(id, job.delta, job.asset_ids, reviewId, 'pending', now(), now()).run();
    let commitSha;
    try { commitSha = env.LOCAL_DEMO === true ? 'local-demo' : await pushCatalog(env, catalog, assets, token); }
    catch (error) {
      // A network timeout can happen after GitHub accepted the write. Keep it pending for reconciliation.
      // Any remote failure can have an ambiguous outcome. Reconcile before another publication.
      throw error;
    }
    await env.DB.prepare("UPDATE publication_jobs SET status='committed',commit_sha=?,updated_at=? WHERE id=?").bind(commitSha, now(), id).run();
    await applyJob(env, job);
    return { publicationId: id, commitSha, localDemo: env.LOCAL_DEMO === true };
  } finally { await env.DB.prepare('DELETE FROM locks WHERE name=? AND token=?').bind('publication', token).run(); }
}
export async function reconcile(env) {
  const token = crypto.randomUUID();
  const lock = await env.DB.prepare('INSERT INTO locks(name,token,expires_at) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at WHERE locks.expires_at<? RETURNING token').bind('publication', token, Date.now() + 300000, Date.now()).first();
  if (!lock) throw new HttpError(409, '发布仍在执行，请稍后恢复状态');
  try {
  const jobs = await queryAll(env, "SELECT * FROM publication_jobs WHERE status IN ('pending','committed') ORDER BY created_at");
  if (!jobs.length) return { recovered: 0 };
  if (jobs.some((j) => j.status === 'pending' && Date.now() - Date.parse(j.created_at) < 120000)) throw new HttpError(409, '上一次发布结果尚在确认中，请在两分钟后恢复状态');
  let catalog;
  if (env.LOCAL_DEMO !== true) {
    let remote = await github(env, `contents/public/catalog.json?ref=${encodeURIComponent(env.GITHUB_BRANCH || 'main')}`);
    if (!remote.content && /^[a-f0-9]{40}$/.test(remote.sha || '')) remote = await github(env, `git/blobs/${remote.sha}`);
    if (typeof remote.content !== 'string') throw new HttpError(502, '暂时无法核对远程目录，请稍后重试，发布状态仍保留');
    catalog = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(remote.content.replaceAll('\n', '')), (c) => c.charCodeAt(0))));
  }
  let recovered = 0;
  for (const job of jobs) {
    if (job.status === 'committed' || catalog?.publicationIds?.includes(job.id)) { await applyJob(env, job); recovered += 1; }
    else await env.DB.prepare("UPDATE publication_jobs SET status='failed',updated_at=? WHERE id=?").bind(now(), job.id).run();
  }
  return { recovered };
  } finally { await env.DB.prepare('DELETE FROM locks WHERE name=? AND token=?').bind('publication', token).run(); }
}
