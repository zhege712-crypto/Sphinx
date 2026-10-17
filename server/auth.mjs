export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const now = () => new Date().toISOString();
export const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};
export const hash = async (value) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map((b) => b.toString(16).padStart(2, '0')).join('');
export const cookieValue = (request, name) => request.headers.get('cookie')?.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`))?.slice(name.length + 1);
const cookie = (env, name, value, seconds) => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${env.LOCAL_DEMO === true ? '' : '; Secure'}`;
export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
export const redirect = (to, cookies = []) => {
  const headers = new Headers({ Location: to, 'Cache-Control': 'no-store' });
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 302, headers });
};
export const queryAll = async (env, sql, ...params) => (await env.DB.prepare(sql).bind(...params).all()).results;
export const recordAudit = (env, actor, action, target) => env.DB.prepare('INSERT INTO audit(id,actor,action,target,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(), actor, action, target, now()).run();
export function requireOrigin(request, env) {
  if (!env.APP_ORIGIN || request.headers.get('origin') !== env.APP_ORIGIN) throw new HttpError(403, '请求来源不符合工作台配置，请重新打开正式工作台');
}
export async function session(request, env, required = true) {
  const raw = cookieValue(request, 'guide_session');
  const found = raw && /^[\w-]{43}$/.test(raw) ? await env.DB.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?').bind(await hash(raw), Date.now()).first() : null;
  if (found) {
    const owner = found.github_id === env.OWNER_GITHUB_ID;
    const member = owner || await env.DB.prepare('SELECT github_id FROM members WHERE github_id=? AND active=1').bind(found.github_id).first();
    if (member) return { id: found.github_id, login: found.login, role: owner ? 'owner' : 'editor', csrf: found.csrf, tokenHash: found.token_hash };
  }
  if (required) throw new HttpError(401, '请先登录受邀的 GitHub 账号');
  return null;
}
export async function authorize(request, env, ownerOnly = false) {
  const user = await session(request, env);
  if (ownerOnly && user.role !== 'owner') throw new HttpError(403, '这项操作仅站主可执行');
  if (!['GET', 'HEAD'].includes(request.method)) {
    requireOrigin(request, env);
    if (request.headers.get('x-csrf-token') !== user.csrf) throw new HttpError(403, '安全校验失效，请刷新后重试');
  }
  const minute = Math.floor(Date.now() / 60000);
  const key = `user:${user.id}:${request.method === 'GET' ? 'read' : 'write'}:${minute}`;
  const limit = request.method === 'GET' ? 120 : 45;
  const counted = await env.DB.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key, Date.now() + 120000).first();
  if (counted.count > limit) throw new HttpError(429, '操作较频繁，请稍后重试；未保存内容请先保留');
  return user;
}
async function startSession(env, id, login) {
  const token = randomToken();
  const csrf = randomToken();
  await env.DB.prepare('INSERT INTO sessions(token_hash,github_id,login,csrf,expires_at) VALUES(?,?,?,?,?)').bind(await hash(token), id, login, csrf, Date.now() + 8 * 3600000).run();
  await recordAudit(env, id, 'login', id);
  return cookie(env, 'guide_session', token, 8 * 3600);
}
export async function authRoute(request, env, path) {
  const methods = { '/api/session': 'GET', '/api/logout': 'POST', '/api/local-session': 'POST', '/auth/github': 'GET', '/auth/callback': 'GET' };
  if (methods[path] && request.method !== methods[path]) return new Response(JSON.stringify({ error: '此入口不支持该请求方法' }), { status: 405, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Allow: methods[path] } });
  if (path.startsWith('/auth/') || path === '/api/local-session') {
    const identity = await hash(request.headers.get('cf-connecting-ip') || 'local');
    const key = `auth:${identity}:${Math.floor(Date.now() / 600000)}`;
    const counted = await env.DB.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key, Date.now() + 1200000).first();
    if (counted.count > 30) throw new HttpError(429, '登录尝试较频繁，请稍后再试');
  }
  if (path === '/api/session') {
    const user = await session(request, env, false);
    return json({ user: user ? { id: user.id, login: user.login, role: user.role } : null, csrf: user?.csrf, localDemo: env.LOCAL_DEMO === true, githubConfigured: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.OWNER_GITHUB_ID), ...(user?.role === 'owner' ? { publishingConfigured: env.LOCAL_DEMO === true || Boolean(env.GITHUB_REPOSITORY && env.GITHUB_PUBLISH_TOKEN) } : {}) });
  }
  if (path === '/api/local-session' && request.method === 'POST') {
    if (env.LOCAL_DEMO !== true) throw new HttpError(404, '未找到该入口');
    requireOrigin(request, env);
    const input = await request.json();
    if (!input || !['owner', 'editor'].includes(input.role)) throw new HttpError(400, '请选择本地演示角色');
    const id = input.role === 'editor' ? 'local-editor' : env.OWNER_GITHUB_ID;
    const login = input.role === 'editor' ? '演示伙伴' : '演示站主';
    if (id === 'local-editor') await env.DB.prepare('INSERT INTO members(github_id,login,active,created_at) VALUES(?,?,1,?) ON CONFLICT(github_id) DO UPDATE SET active=1').bind(id, login, now()).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', 'Set-Cookie': await startSession(env, id, login), 'Cache-Control': 'no-store' } });
  }
  if (path === '/api/logout' && request.method === 'POST') {
    const user = await authorize(request, env);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(user.tokenHash).run();
    return new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie(env, 'guide_session', '', 0), 'Cache-Control': 'no-store' } });
  }
  if (path === '/auth/github' && request.method === 'GET') {
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.OWNER_GITHUB_ID || !env.APP_ORIGIN) throw new HttpError(503, 'GitHub 登录尚未配置；当前只可使用本地演示入口');
    if (new URL(request.url).origin !== env.APP_ORIGIN) throw new HttpError(403, '请从正式工作台开始登录');
    const state = randomToken();
    await env.DB.prepare('INSERT INTO oauth_states(state_hash,expires_at) VALUES(?,?)').bind(await hash(state), Date.now() + 600000).run();
    const target = new URL('https://github.com/login/oauth/authorize');
    target.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${env.APP_ORIGIN}/auth/callback`, state, scope: 'read:user' }).toString();
    return redirect(target.href, [cookie(env, 'guide_oauth', state, 600)]);
  }
  if (path === '/auth/callback' && request.method === 'GET') {
    if (new URL(request.url).origin !== env.APP_ORIGIN) throw new HttpError(403, '登录回调地址不符合工作台配置');
    const url = new URL(request.url);
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    if (!state || state !== cookieValue(request, 'guide_oauth') || !code || !/^[\w-]{43}$/.test(state)) throw new HttpError(403, 'GitHub 登录校验失败，请重新登录');
    const consumed = await env.DB.prepare('DELETE FROM oauth_states WHERE state_hash=? AND expires_at>? RETURNING state_hash').bind(await hash(state), Date.now()).first();
    if (!consumed) throw new HttpError(403, '登录链接已失效，请重新登录');
    const tokenResponse = await (env.OAUTH_FETCH || fetch)('https://github.com/login/oauth/access_token', { method: 'POST', signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${env.APP_ORIGIN}/auth/callback` }) });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || typeof token.access_token !== 'string' || !token.access_token || /[\r\n]/.test(token.access_token)) throw new HttpError(502, 'GitHub 验证未完成，请重新登录');
    const profileResponse = await (env.OAUTH_FETCH || fetch)('https://api.github.com/user', { signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Sphinx' } });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !Number.isSafeInteger(profile.id) || profile.id <= 0 || typeof profile.login !== 'string' || !/^[a-z\d][a-z\d-]{0,38}$/i.test(profile.login)) throw new HttpError(502, '无法读取 GitHub 身份，请稍后重试');
    const id = String(profile.id);
    const invited = id === env.OWNER_GITHUB_ID || await env.DB.prepare('SELECT github_id FROM members WHERE github_id=? AND active=1').bind(id).first();
    if (!invited) throw new HttpError(403, '这个 GitHub 账号尚未被站主邀请');
    return redirect(`${env.APP_ORIGIN}/#/write`, [cookie(env, 'guide_oauth', '', 0), await startSession(env, id, profile.login)]);
  }
  return null;
}
