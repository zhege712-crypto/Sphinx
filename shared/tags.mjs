import { InputError } from './document.mjs';

export const tagKey = value => value.normalize('NFKC').trim().toLocaleLowerCase();
export function safeTags(value = []) {
  if (!Array.isArray(value) || value.length > 50) throw new InputError('标签应为列表，最多 12 个');
  const seen = new Set(); const tags = [];
  for (const raw of value) {
    if (typeof raw !== 'string') throw new InputError('标签必须是文字');
    const tag = raw.normalize('NFKC').trim();
    if (!tag || tag.length > 32 || /[\u0000-\u001f\u007f]/.test(tag)) throw new InputError('每个标签应为 1–32 个字符，不含控制字符');
    const key = tagKey(tag);
    if (!seen.has(key)) { seen.add(key); tags.push(tag); }
  }
  if (tags.length > 12) throw new InputError('每个词条最多 12 个标签');
  return tags;
}
