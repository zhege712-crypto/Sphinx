// A mail link targets one mailbox; composing or sending stays in the reader's mail app.
export function emailAddress(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('请输入有效的邮箱地址');
  let address = value.trim();
  if (/^mailto:/i.test(address)) {
    try { address = decodeURIComponent(address.slice(7)); } catch { throw new Error('请输入有效的邮箱地址'); }
  }
  const parts = address.split('@');
  const [local, domain] = parts;
  const labels = domain?.split('.') || [];
  if (parts.length !== 2 || address.length > 254 || !local || local.length > 64 ||
      !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..') ||
      labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) {
    throw new Error('请输入有效的邮箱地址，例如 name@example.com');
  }
  return `${local}@${domain.toLowerCase()}`;
}
export const emailHref = value => {
  const address = emailAddress(value); const split = address.lastIndexOf('@');
  return `mailto:${encodeURIComponent(address.slice(0, split))}@${address.slice(split + 1)}`;
};
