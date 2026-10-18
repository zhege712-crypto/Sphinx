import { isAboutDocument } from './project.mjs';

export const directoryParent = row => row.parent_id ?? row.parentId ?? null;
export const directoryDocuments = rows => rows.filter(row => row.kind !== 'reference' && !isAboutDocument(row));
export const compareDirectoryEntries = (a, b) => (Number(a.position) || 0) - (Number(b.position) || 0) || a.title.localeCompare(b.title, 'zh-CN') || a.id.localeCompare(b.id);
export const directoryStamp = rows => JSON.stringify(rows.map(row => [row.id, row.version, directoryParent(row)]).sort((a, b) => a[0].localeCompare(b[0])));
export const directorySiblings = (rows, parentId = null) => directoryDocuments(rows).filter(row => directoryParent(row) === parentId).sort(compareDirectoryEntries);
