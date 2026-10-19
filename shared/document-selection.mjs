import { directoryParent } from './directory-order.mjs';

// Match the server's descendant expansion so the confirmation lists every affected document.
export function deletionSelection(documents, ids) {
  const selected = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const document of documents) {
      if (selected.has(directoryParent(document)) && !selected.has(document.id)) {
        selected.add(document.id);
        changed = true;
      }
    }
  }
  return documents.filter(document => selected.has(document.id));
}
