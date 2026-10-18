import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sanitizeDocument, documentText, publicBlocks, collectAssets, InputError } from '../shared/document.mjs';
import { DEMO_RUNNER_POLICY, DEMO_SANDBOX } from '../shared/code-demo.mjs';
import { CONTENT_SECURITY_POLICY } from '../shared/security-policy.mjs';
import { secureResponse } from '../server/response-security.mjs';

test('代码演示保留源码与窗口设置，搜索只收录名称，发布不执行或改写源码', () => {
  const source = '<svg onload="window.test=1"><text>SVG</text></svg>\n<script>console.log("</script>");</script>';
  const blocks = sanitizeDocument([{ id: 'test-demo', type: 'codeDemo', props: { source, title: '鹈鹕骑车', height: 560, sandbox: 'allow-same-origin', url: '/api/assets/secret' } }]);
  assert.deepEqual(blocks[0].props, { source, title: '鹈鹕骑车', height: 560 });
  assert.equal(documentText(blocks), '鹈鹕骑车');
  assert.deepEqual(collectAssets(blocks), []);
  assert.deepEqual(publicBlocks(blocks, new Map()), blocks);
  assert.equal(sanitizeDocument([{ type: 'codeDemo', props: { source: '', height: '100vh' } }])[0].props.height, 400);
  assert.throws(() => sanitizeDocument([{ type: 'codeDemo', props: { source: 'x'.repeat(100001) } }]), InputError);
  assert.throws(() => sanitizeDocument([{ type: 'codeDemo', props: { source: {} } }]), InputError);
});

test('只有静态运行器可嵌入并执行内联脚本，应用与错误响应保留严格策略', () => {
  const env = { LOCAL_DEMO: false };
  const html = () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  const runner = secureResponse(html(), env, 'https://workspace.example/demo-runner.html');
  assert.equal(runner.headers.get('X-Frame-Options'), null);
  assert.equal(runner.headers.get('Content-Security-Policy'), DEMO_RUNNER_POLICY + "; frame-ancestors https://workspace.example; sandbox allow-scripts");
  assert.equal(secureResponse(html(), env, 'https://workspace.example/demo-runner').headers.get('Content-Security-Policy'), runner.headers.get('Content-Security-Policy'));
  const cached = secureResponse(new Response(null, { status: 304, headers: { 'X-Frame-Options': 'DENY' } }), env, 'https://workspace.example/demo-runner');
  assert.equal(cached.headers.get('Content-Security-Policy'), runner.headers.get('Content-Security-Policy'));
  assert.equal(cached.headers.get('X-Frame-Options'), null);
  const redirect = location => new Response(null, { status: 307, headers: { Location: location } });
  assert.equal(secureResponse(redirect('/demo-runner'), env, 'https://workspace.example/demo-runner.html').headers.get('Content-Security-Policy'), runner.headers.get('Content-Security-Policy'));
  for (const location of ['/api/documents', 'https://elsewhere.example/demo-runner', '/demo-runner?other=1']) {
    assert.equal(secureResponse(redirect(location), env, 'https://workspace.example/demo-runner.html').headers.get('X-Frame-Options'), 'DENY');
  }
  assert.equal(secureResponse(redirect('/demo-runner'), env, 'https://workspace.example/other.html').headers.get('X-Frame-Options'), 'DENY');
  assert.equal(DEMO_SANDBOX, 'allow-scripts');
  for (const url of ['/', '/api/documents', '/other/demo-runner.html', '/demo-runner.html/']) {
    const response = secureResponse(html(), env, 'https://workspace.example' + url);
    assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(response.headers.get('Content-Security-Policy'), CONTENT_SECURITY_POLICY + "; frame-ancestors 'none'");
  }
  assert.equal(secureResponse(new Response('Not found', { status: 404 }), env, 'https://workspace.example/demo-runner.html').headers.get('X-Frame-Options'), 'DENY');
  assert.match(CONTENT_SECURITY_POLICY, /script-src 'self' 'wasm-unsafe-eval';/);
  assert.match(DEMO_RUNNER_POLICY, /connect-src 'none'; frame-src about:; worker-src 'none'/);
});

test('Pages 静态运行器使用同一策略，嵌套演示没有同源、弹窗或导航权限', async () => {
  const runner = await readFile(new URL('../public/demo-runner.html', import.meta.url), 'utf8');
  assert.ok(runner.includes('content="' + DEMO_RUNNER_POLICY + '"'));
  assert.ok(runner.includes("frame.setAttribute('sandbox', 'allow-scripts')"));
  assert.ok(runner.includes('event.source === parent'));
  assert.ok(runner.includes('event.source === frame.contentWindow'));
  assert.ok(runner.includes("frame-src 'none'; worker-src 'none'"));
  assert.ok(!runner.includes('allow-same-origin'));
  assert.ok(!runner.includes('allow-popups'));
});
