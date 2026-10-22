export const readerHidden = row => row?.readerHidden === true || row?.reader_hidden === 1;

// Include the hidden ancestor so the workspace can show where to restore access.
export function readerHiddenSource(document, documents) {
  const byId = new Map(documents.map(row => [row.id, row]));
  const seen = new Set();
  let row = document;
  while (row) {
    if (readerHidden(row) || seen.has(row.id)) return row;
    seen.add(row.id);
    row = byId.get(row.parent_id ?? row.parentId);
  }
  return null;
}

// Project the full retained set before filtering: restoring visibility must use
// the last public snapshot, including descendants, never the current drafts.
export function readerCatalogDocuments(rows, delta = []) {
  const byId = new Map(rows.map(row => [row.id, { ...row }]));
  for (const entry of delta) {
    const row = byId.get(entry.id);
    if (!row) continue;
    if (entry.remove) { byId.delete(entry.id); continue; }
    if (entry.snapshot) row.published = JSON.stringify(entry.snapshot);
    if (entry.move) row.parent_id = entry.move.parentId;
    if (entry.visibility) row.reader_hidden = entry.visibility.hidden ? 1 : 0;
  }
  const projected = [...byId.values()];
  return projected.filter(row => row.published && !readerHiddenSource(row, projected))
    .map(row => typeof row.published === 'string' ? JSON.parse(row.published) : row.published);
}

export function readerCatalogAssetIds(documents) {
  const ids = new Set();
  function visit(blocks = []) {
    for (const block of blocks) {
      if (['image', 'imageText', 'pageBackground'].includes(block.type)) {
        const id = /^assets\/([a-f0-9-]{36})\.(png|jpg|gif|webp)$/.exec(block.props?.url || '')?.[1];
        if (id) ids.add(id);
      }
      visit(block.children);
    }
  }
  for (const document of documents) { visit(document.blocks); visit(document.valhalla?.blocks); }
  return [...ids];
}
