import { normalizeSearch } from './search.mjs';

// Build once per catalog, rather than searching article bodies on each selection.
export function createTermIndex(entries = []) {
  const byTitle = new Map();
  const seen = new Set();
  for (const entry of entries) {
    if (!entry?.id || seen.has(entry.id)) continue;
    seen.add(entry.id);
    const key = normalizeSearch(entry.title);
    if (!key) continue;
    const group = byTitle.get(key) || [];
    group.push(entry); byTitle.set(key, group);
  }
  return byTitle;
}

export function exactTermMatches(index, text) {
  const key = normalizeSearch(text);
  // A vocabulary association is intentionally limited to a short selection.
  if (!key || key.length > 160) return [];
  return index.get(key) || [];
}

export function preferredTermMatch(matches) {
  // Never silently pick between identically named terms or replace an existing link.
  return matches.length === 1 ? matches[0] : null;
}
