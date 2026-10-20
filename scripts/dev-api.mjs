import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { sqliteAdapter, fileBucket } from '../server/local-storage.mjs';
import worker from '../server/worker.mjs';
import { demoDocument, sanitizeDocument } from '../shared/document.mjs';

await mkdir('.local', { recursive: true });
const DB = sqliteAdapter('.local/guide.sqlite');
DB.exec(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8'));
for (const table of ['documents', 'revisions']) {
  const columns = await DB.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.results.some(column => column.name === 'tags')) DB.exec(`ALTER TABLE ${table} ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`);
  if (!columns.results.some(column => column.name === 'valhalla')) DB.exec(`ALTER TABLE ${table} ADD COLUMN valhalla TEXT NOT NULL DEFAULT '{"enabled":false,"blocks":[]}'`);
}
const env = { DB, FILES: await fileBucket('.local/assets'), LOCAL_DEMO: true, OWNER_GITHUB_ID: 'local-owner', APP_ORIGIN: 'http://127.0.0.1:5173', SITE_TITLE: 'Sphinx' };
if (!await DB.prepare('SELECT id FROM documents LIMIT 1').first()) {
  await DB.prepare('INSERT INTO documents(id,title,draft,updated_at,updated_by) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(), '编辑器使用示例', JSON.stringify(sanitizeDocument(demoDocument())), new Date().toISOString(), 'local-owner').run();
}
const server = createServer(async (incoming, outgoing) => {
  try {
    const request = new Request(`http://127.0.0.1:8788${incoming.url}`, { method: incoming.method, headers: incoming.headers, ...(incoming.method !== 'GET' && incoming.method !== 'HEAD' ? { body: incoming, duplex: 'half' } : {}) });
    const result = await worker.fetch(request, env);
    outgoing.writeHead(result.status, Object.fromEntries(result.headers));
    outgoing.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) { console.error(error); outgoing.writeHead(500); outgoing.end('Local server error'); }
});
server.listen(8788, '127.0.0.1', () => console.log('Local-only demo API: http://127.0.0.1:8788'));
