export function boundaryForScroll({ scrollTop, scrollHeight, clientHeight }, delta) {
  if (!Number.isFinite(delta) || delta === 0 || clientHeight <= 0) return null;
  if (delta < 0 && scrollTop <= 1) return 'top';
  if (delta > 0 && scrollTop + clientHeight >= scrollHeight - 1) return 'bottom';
  return null;
}

const fallbackWords = ['Sphinx', 'Agent', 'Reference', 'Prompt', '探索', '理解', '实践', '创造', '分享', '灵感', '知识', '继续生长'];
export function boundaryWords(entries = []) {
  const words = [...new Set(entries.filter(entry => entry.kind === 'reference' && (entry.publishedAt || entry.publishedVersion))
    .map(entry => String(entry.title || '').trim()).filter(Boolean))];
  return [...new Set([...words, ...fallbackWords])].slice(0, 12);
}
