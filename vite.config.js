import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { CONTENT_SECURITY_POLICY } from './shared/security-policy.mjs';
export default defineConfig({
  plugins: [react(), { name: 'sphinx-static-security', apply: 'build', transformIndexHtml: { order: 'post', handler: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY }, injectTo: 'head-prepend' },
    { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
  ] } }],
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: {
    '/api': 'http://127.0.0.1:8788', '/auth': 'http://127.0.0.1:8788', '/assets': { target: 'http://127.0.0.1:8788', bypass: (req) => req.url.startsWith('/assets/') ? undefined : req.url },
  } },
  build: { target: 'es2022' },
});
