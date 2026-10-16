import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: {
    '/api': 'http://127.0.0.1:8788', '/auth': 'http://127.0.0.1:8788', '/assets': { target: 'http://127.0.0.1:8788', bypass: (req) => req.url.startsWith('/assets/') ? undefined : req.url },
  } },
  build: { target: 'es2022' },
});
