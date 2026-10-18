// Mantine/BlockNote need inline styles; executable scripts remain same-origin.
export const CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-src 'self'; form-action 'self'";

export function isLoopbackDemo(env, url) {
  if (env.LOCAL_DEMO !== true) return false;
  try {
    const app = new URL(env.APP_ORIGIN); const request = new URL(url);
    return app.protocol === 'http:' && request.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(app.hostname) && request.hostname === app.hostname;
  } catch { return false; }
}
