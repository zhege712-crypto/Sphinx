import { InputError, sanitizeDocument, documentText } from './document.mjs';

export function readValhalla(value) {
  const raw = typeof value === 'string' ? JSON.parse(value || '{}') : value;
  return { enabled: raw?.enabled === true, blocks: Array.isArray(raw?.blocks) ? raw.blocks : [] };
}
export function safeValhalla(value, kind) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.enabled !== 'boolean' || Object.keys(value).some(key => !['enabled', 'blocks'].includes(key))) throw new InputError('Valhalla 设置格式不正确');
  const result = { enabled: value.enabled, blocks: Array.isArray(value.blocks) && !value.blocks.length ? [] : sanitizeDocument(value.blocks) };
  if (kind !== 'reference' && (result.enabled || result.blocks.length)) throw new InputError('只有 Reference 词条可以同步到 Valhalla');
  return result;
}
export function valhallaDocument(document) {
  if (!document) return null;
  const data = readValhalla(document.valhalla);
  return { ...document, blocks: data.blocks, text: typeof document.valhalla?.text === 'string' ? document.valhalla.text : documentText(data.blocks), section: 'valhalla' };
}
export const hasValhalla = document => document?.kind === 'reference' && document?.valhalla?.enabled === true;

export function recoverKnowledgeSection(latest, copy, section) {
  const sameVersion = latest.version === copy.version;
  const valhalla = readValhalla(latest.valhalla);
  if (sameVersion && section !== 'valhalla' && typeof copy.valhalla?.enabled === 'boolean') valhalla.enabled = copy.valhalla.enabled;
  return {
    title: sameVersion && section !== 'valhalla' ? copy.title : latest.title,
    blocks: copy.blocks,
    referenceBlocks: latest.blocks,
    valhalla,
    tags: sameVersion && section !== 'valhalla' ? copy.tags || latest.tags || [] : latest.tags || [],
    tagDraft: sameVersion && section !== 'valhalla' ? copy.tagDraft || '' : '',
  };
}
