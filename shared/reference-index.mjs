import { pinyin } from 'pinyin-pro';

export const REFERENCE_LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const collator = new Intl.Collator('zh-Hans-u-co-pinyin', { sensitivity: 'base', numeric: true });

export function referenceInitial(title = '') {
  const value = title.trim().normalize('NFKC');
  if (/^[a-z]/i.test(value)) return value[0].toUpperCase();
  if (/^\p{Script=Han}/u.test(value)) {
    // Convert the whole title so common polyphonic words can use their context.
    const [first = ''] = pinyin(value, { pattern: 'first', toneType: 'none', type: 'array' });
    if (/^[a-z]$/i.test(first)) return first.toUpperCase();
  }
  return '#';
}

export const compareReferenceTitles = (a, b) => collator.compare(a.title, b.title);
