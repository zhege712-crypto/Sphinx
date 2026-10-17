import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function sqliteAdapter(path = ':memory:') {
  const connection = new DatabaseSync(path);
  const wrap = (sql, values = []) => ({
    bind: (...args) => wrap(sql, args.map((value) => value instanceof ArrayBuffer ? new Uint8Array(value) : value)),
    async first() { return connection.prepare(sql).get(...values) ?? null; },
    async all() { return { results: connection.prepare(sql).all(...values) }; },
    async run() { const r = connection.prepare(sql).run(...values); return { meta: { changes: Number(r.changes) } }; },
  });
  return {
    prepare: wrap,
    exec: (sql) => connection.exec(sql),
    async batch(statements) {
      connection.exec('BEGIN IMMEDIATE');
      try { const results = []; for (const s of statements) results.push(await s.run()); connection.exec('COMMIT'); return results; }
      catch (error) { connection.exec('ROLLBACK'); throw error; }
    },
    close: () => connection.close(),
  };
}
export async function fileBucket(path) {
  await mkdir(path, { recursive: true });
  const keyPath = (key) => { if (!/^[a-f0-9-]{36}$/.test(key)) throw new Error('Invalid storage key'); return join(path, key); };
  return {
    async put(key, bytes) { await writeFile(keyPath(key), new Uint8Array(bytes)); },
    async get(key) {
      try { const bytes = await readFile(keyPath(key)); return { body: bytes, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }; }
      catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    },
  };
}
