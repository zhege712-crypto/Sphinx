import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const allowed = new Set(['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_PUBLISH_TOKEN']);
const limit = 16 * 1024;

export function validateSecrets(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid');
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!allowed.has(key) || typeof raw !== 'string' || /[\r\n\x00]/.test(raw)) throw new Error('invalid');
    if (raw.trim()) result[key] = raw.trim();
  }
  if (!Object.keys(result).length || Boolean(result.GITHUB_CLIENT_ID) !== Boolean(result.GITHUB_CLIENT_SECRET)) throw new Error('invalid');
  return result;
}

async function writeSecrets(values) {
  const config = JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'));
  if (config.name !== 'howtoagent-workspace' || config.account_id !== '48720c9632014847eacd7a8bf8a8994b' || config.vars?.GITHUB_REPOSITORY !== 'zhege712-crypto/Sphinx') throw new Error('config');
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), 'secret', 'bulk', '--config', path.join(root, 'wrangler.jsonc')], {
      cwd: root, windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'],
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG: 'error', WRANGLER_WRITE_LOGS: 'false', WRANGLER_LOG_SANITIZE: 'true' },
    });
    const timer = setTimeout(() => { child.kill(); reject(new Error('timeout')); }, 120_000);
    child.on('error', () => { clearTimeout(timer); reject(new Error('process')); });
    child.on('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error('deployment')); });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(values));
  });
}

function page(nonce) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>工作台 · 安全配置</title>
<style>body{font:16px/1.65 system-ui,sans-serif;background:#f6f7f9;color:#20252c;margin:0}main{max-width:640px;margin:48px auto;padding:32px;background:white;border:1px solid #e1e5eb;border-radius:14px}h1{font-size:26px;margin:0 0 8px}p{color:#596270}label{display:block;margin:24px 0 6px;font-weight:600}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #aab4c2;border-radius:7px;font:inherit}button{padding:12px 20px;margin-top:24px;background:#2468e5;border:0;border-radius:7px;color:white;font:inherit;cursor:pointer}button:disabled{opacity:.6}small{display:block;color:#596270}a{color:#2468e5}#status{min-height:30px}hr{border:0;border-top:1px solid #e1e5eb;margin:32px 0}</style>
<main><small>仅在本机运行 · 127.0.0.1</small><h1>连接创作工作台</h1><p>配置将通过官方 Wrangler 写入本项目的 Cloudflare Worker Secrets。密钥不会写入项目文件或 GitHub。</p>
<form id="oauth" autocomplete="off"><h2>1. GitHub 登录</h2><p>在 <a href="https://github.com/settings/applications/3939671" target="_blank" rel="noreferrer">刚注册的 OAuth 应用</a> 中生成 Client secret，然后粘贴到下方。</p><label for="client">Client ID</label><input id="client" name="GITHUB_CLIENT_ID" autocomplete="off" required><label for="secret">Client secret</label><input id="secret" name="GITHUB_CLIENT_SECRET" type="password" autocomplete="new-password" required><button>保存登录配置到 Cloudflare</button></form>
<hr><form id="publish" autocomplete="off"><h2>2. 文章发布</h2><p>稍后配置仅限 Sphinx 仓库、Contents 读写权限的细粒度 GitHub token。</p><label for="token">发布 token</label><input id="token" name="GITHUB_PUBLISH_TOKEN" type="password" autocomplete="new-password" required><button>保存发布配置到 Cloudflare</button></form><p id="status" role="status" aria-live="polite"></p><small>目标：howtoagent-workspace · zhege712-crypto/Sphinx<br>页面一小时后失效。请勿将密钥发到聊天中。</small></main>
<script nonce="${nonce}">for(const form of document.forms){form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;const status=document.getElementById('status');status.textContent='正在安全写入 Cloudflare…';const values=Object.fromEntries(new FormData(form));try{const response=await fetch('/configure',{method:'POST',headers:{'Content-Type':'application/json','X-Setup-Nonce':'${nonce}'},body:JSON.stringify(values)});const data=await response.json();status.textContent=response.ok?'配置成功：'+data.configured.join('、'):'配置失败。请检查 Cloudflare 登录及输入，然后重试。';}catch{status.textContent='未能连接本机配置服务。请重新启动配置页。';}finally{for(const input of form.querySelectorAll('input[type=password]'))input.value='';for(const key of Object.keys(values))values[key]='';button.disabled=false;}});}</script></html>`;
}

export function createSetupServer({ port = 8977, configure = writeSecrets } = {}) {
  const nonce = randomBytes(32).toString('hex');
  let busy = false;
  const started = Date.now();
  const server = createServer(async (req, res) => {
    const expectedHost = `127.0.0.1:${server.address().port}`;
    const origin = `http://${expectedHost}`;
    const send = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`);
    if (req.headers.host !== expectedHost || Date.now() - started > 3_600_000) return send(403, { error: 'expired or invalid host' });
    if (req.method === 'GET' && req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(page(nonce)); }
    if (req.method !== 'POST' || req.url !== '/configure') return send(404, { error: 'not found' });
    const provided = Buffer.from(String(req.headers['x-setup-nonce'] || ''));
    if (req.headers.origin !== origin || provided.length !== nonce.length || !timingSafeEqual(provided, Buffer.from(nonce)) || req.headers['content-type'] !== 'application/json') return send(403, { error: 'forbidden' });
    if (busy) return send(409, { error: 'busy' });
    busy = true;
    let values;
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > limit) { send(413, { error: 'too large' }); return; } chunks.push(chunk); }
      try { values = validateSecrets(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { return send(400, { error: 'invalid input' }); }
      const configured = Object.keys(values);
      await configure(values);
      send(200, { configured });
    } catch { if (!res.headersSent) send(502, { error: 'configuration failed' }); }
    finally { if (values) for (const key of Object.keys(values)) values[key] = ''; busy = false; }
  });
  server.requestTimeout = 150_000;
  server.headersTimeout = 10_000;
  return { server, listen: () => new Promise(resolve => server.listen(port, '127.0.0.1', resolve)) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const setup = createSetupServer();
  await setup.listen();
  console.log('Local secret setup: http://127.0.0.1:8977 (no secrets are logged)');
}
