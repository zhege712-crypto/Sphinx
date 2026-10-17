import { referenceSeeds } from '../shared/reference-seeds.mjs';
import { sanitizeDocument } from '../shared/document.mjs';
import { queryAll, now, HttpError } from './auth.mjs';
import { publish, publishedVersion } from './publication.mjs';

export async function initializeReferences(env, user) {
  if (user.role !== 'owner') throw new HttpError(403, '只有站主可以迁移初始词条');
  const drafts = new Map(referenceSeeds.map(seed => [seed.id, JSON.stringify(sanitizeDocument(seed.blocks))]));
  await env.DB.batch(referenceSeeds.map((seed, index) => env.DB.prepare(
    "INSERT OR IGNORE INTO documents(id,title,kind,position,draft,updated_at,updated_by) VALUES(?,?,'reference',?,?,?,?)"
  ).bind(seed.id, seed.title, index + 1, drafts.get(seed.id), now(), user.id)));
  const rows = await queryAll(env, 'SELECT * FROM documents WHERE id IN (SELECT value FROM json_each(?)) AND archived=0', JSON.stringify(referenceSeeds.map(s => s.id)));
  // Retry only untouched migration drafts. Edited/private content must never be auto-published.
  const candidates = rows.filter(row => row.kind === 'reference' && row.version === 1 && !row.published && row.draft === drafts.get(row.id) && row.title === referenceSeeds.find(s => s.id === row.id)?.title);
  if (!candidates.length) return { initialized: 0 };
  const delta = [];
  for (const row of candidates) { const { snapshot } = await publishedVersion(env, row); delta.push({ id: row.id, snapshot, expectedVersion: row.version }); }
  const result = await publish(env, user, delta);
  return { ...result, initialized: candidates.length };
}
