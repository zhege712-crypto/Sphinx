import { HttpError } from './auth.mjs';
import { directoryDocuments, directorySiblings, directoryStamp } from '../shared/directory-order.mjs';

export function prepareDirectoryOrder(rows, input) {
  if (typeof input.tree !== 'string' || input.tree !== directoryStamp(rows)) throw new HttpError(409, '内容或目录已变化，请关闭排序窗口后重新打开，保留最新修改');
  const parentId = input.parentId || null;
  const guides = directoryDocuments(rows);
  if (parentId !== null && (typeof parentId !== 'string' || !guides.some(row => row.id === parentId))) throw new HttpError(400, '请选择有效的指南目录');
  const ids = input.ids;
  const siblings = directorySiblings(rows, parentId);
  if (!Array.isArray(ids) || ids.length < 2 || ids.length > 100 || new Set(ids).size !== ids.length || ids.length !== siblings.length || ids.some(id => !siblings.some(row => row.id === id))) throw new HttpError(400, '排序必须包含当前目录内的全部文档，不能重复或跨目录调整');
  if (ids.every((id, index) => id === siblings[index].id)) throw new HttpError(400, '顺序尚未变化，请先拖动或上下移动文档');
  const delta = ids.flatMap((id, index) => {
    const row = siblings.find(item => item.id === id); const position = index + 1;
    if (row.position === position) return [];
    const published = row.published ? JSON.parse(row.published) : null;
    return [{ id, expectedVersion: row.version, reorder: { position }, ...(published ? { snapshot: { ...published, position, ...(row.published_version === row.version ? { version: row.version + 1 } : {}) } } : {}) }];
  });
  return { ids, parentId, titles: ids.map(id => siblings.find(row => row.id === id).title), delta };
}
