export class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
let csrf;
export function setCsrf(token) { csrf = token; }
export async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...options.headers } });
  const result = await response.json().catch(() => ({ error: '服务暂时不可用，请稍后重试' }));
  if (!response.ok) throw new ApiError(response.status, result.error || '操作未完成');
  return result;
}
export const post = (path, data = {}) => api(path, { method: 'POST', body: JSON.stringify(data) });
export function downloadJson(filename, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
