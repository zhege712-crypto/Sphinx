import { isAboutDocument, isContributorsDocument } from './project.mjs';
import { hasValhalla } from './valhalla.mjs';

// Resolve from the current URL and the last successfully loaded public snapshot.
// A failed refresh must never clear the selected article or leave an old one open.
export function publicReaderEntry(documents, destination) {
  const reference = ['references', 'valhalla'].includes(destination.view);
  const pool = documents.filter(item => reference
    ? item.kind === 'reference' && (destination.view !== 'valhalla' || hasValhalla(item))
    : item.kind !== 'reference' && (!isAboutDocument(item) || (isContributorsDocument(item) && destination.id === item.id)));
  if (destination.id) return pool.find(item => item.id === destination.id) || null;
  if (reference || destination.view === 'about') return null;
  return pool.find(item => item.kind !== 'folder') || pool[0] || null;
}
