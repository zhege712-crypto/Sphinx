const idPattern = /^[a-f0-9-]{36}$/;
const views = new Set(['home', 'documents', 'reviews', 'members', 'assets', 'references', 'settings', 'about', 'authors']);
export function parseRoute(hash = '#/read') {
  const parts = hash.split('?')[0].split('/');
  if (parts[1] === 'write') {
    if (parts[2] === 'reference') return { writing: true, view: parts[3] ? 'editor' : 'references', id: idPattern.test(parts[3] || '') ? parts[3] : null };
    if (parts[2] === 'documents' && idPattern.test(parts[3] || '')) return { writing: true, view: 'editor', id: parts[3] };
    return { writing: true, view: views.has(parts[2]) ? parts[2] : 'editor', id: null };
  }
  return { writing: false, view: parts[1] === 'about' ? 'about' : parts[1] === 'reference' ? 'references' : 'reader', id: idPattern.test(parts[2] || '') ? parts[2] : null };
}
export const documentRoute = doc => `#/write/${doc.kind === 'reference' ? 'reference' : 'documents'}/${doc.id}`;
export const safeReturn = hash => typeof hash === 'string' && /^#\/(?:read|reference|write)(?:\/[a-z0-9-]+)*$/.test(hash) || hash === '#/about';
