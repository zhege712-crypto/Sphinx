import { InputError, safeLink } from './document.mjs';

export const MAX_DOCUMENT_AUTHORS = 12;
export const authorId = value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
function field(value, label, limit) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) throw new InputError(`${label}格式不正确或过长`);
  return value.trim();
}
export function sanitizeAuthor(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('作者信息格式不正确');
  const name = field(input.name, '作者名称', 80);
  if (!name) throw new InputError('请填写作者名称');
  const email = field(input.email, '邮箱', 254);
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new InputError('请填写完整的邮箱地址');
  let github = field(input.github, 'GitHub 用户名', 100);
  github = github.replace(/^https:\/\/github\.com\//i, '').replace(/\/$/, '').replace(/^@/, '');
  if (github && (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(github) || github.includes('--'))) throw new InputError('请填写 GitHub 用户名或个人主页链接');
  if (input.links !== undefined && !Array.isArray(input.links)) throw new InputError('作者链接格式不正确');
  if ((input.links || []).length > 8) throw new InputError('每位作者最多添加 8 个链接');
  const links = (input.links || []).map(link => {
    if (!link || typeof link !== 'object') throw new InputError('作者链接格式不正确');
    const label = field(link.label, '链接名称', 80);
    if (!label) throw new InputError('请填写链接名称');
    const url = safeLink(link.url);
    if (!/^(https?:|mailto:)/i.test(url)) throw new InputError('作者链接仅支持 http、https 或邮箱链接');
    return { label, url };
  });
  return { name, email, github, links };
}
export function sanitizeAuthorIds(value) {
  if (!Array.isArray(value) || value.length > MAX_DOCUMENT_AUTHORS || value.some(id => !authorId(id)) || new Set(value).size !== value.length) throw new InputError(`请选择不超过 ${MAX_DOCUMENT_AUTHORS} 位作者，且不要重复`);
  return [...value];
}
const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase();
export function filterAuthors(authors, query) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return authors.filter(author => { const text = normalize([author.name, author.email, author.github, ...(author.links || []).flatMap(link => [link.label, link.url])].join(' ')); return words.every(word => text.includes(word)); });
}
