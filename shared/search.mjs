import { pinyin } from 'pinyin-pro';
import { tagKey } from './tags.mjs';

export const normalizeSearch = value => String(value || '').normalize('NFKC').toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim();
const cache = new WeakMap();
const phonetics = value => { const words = pinyin(value, { toneType: 'none', type: 'array' }); return { phonetic: normalizeSearch(words.join('')), initials: normalizeSearch(words.map(word => word[0]).join('')) }; };
function indexed(entry) {
  if (cache.has(entry)) return cache.get(entry);
  const tags = (entry.tags || []).map(tag => ({ tag, key: normalizeSearch(tag), ...phonetics(tag) }));
  const value = { title: normalizeSearch(entry.title), tags, body: normalizeSearch(entry.text), ...phonetics(entry.title || '') };
  cache.set(entry, value); return value;
}
export function searchEntries(entries, query = '') {
  const terms = normalizeSearch(query).split(' ').filter(Boolean).slice(0, 12);
  if (!terms.length) return entries.map(entry => ({ entry, score: 0, hint: '' }));
  return entries.flatMap(entry => {
    const index = indexed(entry); let score = 0; let hint = '';
    for (const term of terms) {
      const tag = index.tags.find(t => t.key.includes(term));
      if (index.title === term) score += 120;
      else if (index.title.startsWith(term)) score += 90;
      else if (index.title.includes(term)) score += 70;
      else if (tag) { score += tag.key === term ? 60 : 50; hint ||= `标签：${tag.tag}`; }
      else if (/^[a-z]+$/.test(term) && (index.phonetic.includes(term) || index.initials.startsWith(term))) { score += 35; hint ||= '拼音匹配'; }
      else if (/^[a-z]+$/.test(term) && index.tags.some(t => t.phonetic.includes(term) || t.initials.startsWith(term))) { score += 30; hint ||= `标签：${index.tags.find(t => t.phonetic.includes(term) || t.initials.startsWith(term)).tag}`; }
      else if (index.body.includes(term)) { score += 10; const at = index.body.indexOf(term); if (!hint || hint.startsWith('标签：') || hint === '拼音匹配') hint = `${at > 24 ? '…' : ''}${index.body.slice(Math.max(0, at - 24), at + 80)}${at + 80 < index.body.length ? '…' : ''}`; }
      else return [];
    }
    return [{ entry, score, hint }];
  }).sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'zh-Hans-u-co-pinyin'));
}
export function entryTags(entries) {
  const tags = new Map();
  for (const entry of entries) for (const tag of entry.tags || []) { const key = tagKey(tag); const previous = tags.get(key); tags.set(key, { tag: previous?.tag || tag, count: (previous?.count || 0) + 1 }); }
  return [...tags.values()].sort((a, b) => a.tag.localeCompare(b.tag, 'zh-Hans-u-co-pinyin'));
}
