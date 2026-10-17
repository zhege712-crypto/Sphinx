import { HttpError } from './auth.mjs';

export const FILE_CHUNK_BYTES = 256 * 1024;
export const DEFAULT_FILE_BUDGET = 256 * 1024 * 1024;
// Keep the same private object interface as the optional future R2 binding.
// Reservations and transactional chunks prevent concurrent uploads exceeding
// the image budget; no object URL is exposed without the normal asset checks.
export function d1Files(DB, limit = DEFAULT_FILE_BUDGET) {
  return {
    async put(id, source) {
      if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(400, '图片标识不正确');
      const bytes = new Uint8Array(source);
      if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024) throw new HttpError(413, '单张图片应小于 5 MB');
      const reserved = await DB.prepare('INSERT INTO file_objects(id,size,created_at) SELECT ?,?,? WHERE (SELECT COALESCE(sum(size),0) FROM file_objects)+?<=?').bind(id, bytes.byteLength, new Date().toISOString(), bytes.byteLength, limit).run();
      if (!reserved.meta.changes) throw new HttpError(413, '图片库已达到首版容量上限，请联系站主整理素材');
      try {
        const statements = [];
        for (let start = 0, part = 0; start < bytes.byteLength; start += FILE_CHUNK_BYTES, part++) {
          const chunk = bytes.slice(start, start + FILE_CHUNK_BYTES);
          statements.push(DB.prepare('INSERT INTO file_chunks(object_id,part,data) VALUES(?,?,?)').bind(id, part, chunk.buffer));
        }
        await DB.batch(statements);
      } catch (error) { await DB.prepare('DELETE FROM file_objects WHERE id=?').bind(id).run(); throw error; }
    },
    async get(id) {
      if (!/^[a-f0-9-]{36}$/.test(id)) return null;
      const { results } = await DB.prepare('SELECT c.part,c.data,o.size FROM file_chunks c JOIN file_objects o ON o.id=c.object_id WHERE o.id=? ORDER BY c.part').bind(id).all();
      if (!results.length) return null;
      const size = results[0].size;
      if (!Number.isSafeInteger(size) || size <= 0 || size > 5 * 1024 * 1024) throw new HttpError(503, '图片暂时无法读取，请联系站主检查存储');
      const bytes = new Uint8Array(size); let offset = 0;
      for (let index = 0; index < results.length; index++) {
        const part = results[index]; const chunk = new Uint8Array(part.data);
        if (part.part !== index || chunk.byteLength !== Math.min(FILE_CHUNK_BYTES, size - offset)) throw new HttpError(503, '图片数据不完整，请联系站主检查存储');
        bytes.set(chunk, offset); offset += chunk.byteLength;
      }
      if (offset !== size) throw new HttpError(503, '图片数据不完整，请联系站主检查存储');
      return { body: bytes, arrayBuffer: async () => bytes.buffer };
    },
    async delete(id) { await DB.prepare('DELETE FROM file_objects WHERE id=?').bind(id).run(); },
  };
}
