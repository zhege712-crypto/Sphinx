import { CONTENT_SECURITY_POLICY } from '../shared/security-policy.mjs';
import { DEMO_RUNNER_POLICY } from '../shared/code-demo.mjs';
export function secureResponse(response, env, requestUrl) {
  // Workers Assets redirects .html to its exact extensionless clean URL.
  const runnerPath = requestUrl && ['/demo-runner.html', '/demo-runner'].includes(new URL(requestUrl).pathname);
  // The canonical redirect is part of the iframe navigation too. Keep every
  // other redirect/error under the application policy.
  const runnerRedirect = requestUrl && new URL(requestUrl).pathname === '/demo-runner.html' && [301, 302, 307, 308].includes(response.status) && response.headers.get('Location') === '/demo-runner';
  const runner = runnerRedirect || (runnerPath && (response.status === 304 || (response.ok && response.headers.get('Content-Type')?.startsWith('text/html'))));
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  // A sandboxed runner has an opaque origin, so X-Frame-Options SAMEORIGIN
  // rejects it in Chromium. CSP checks the allowed ancestor URL instead.
  if (runner) headers.delete('X-Frame-Options');
  else headers.set('X-Frame-Options', 'DENY');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (env.LOCAL_DEMO !== true || runner) {
    headers.set('Content-Security-Policy', runner ? `${DEMO_RUNNER_POLICY}; frame-ancestors ${new URL(requestUrl).origin}; sandbox allow-scripts` : `${CONTENT_SECURITY_POLICY}; frame-ancestors 'none'`);
    headers.set('Strict-Transport-Security', 'max-age=31536000');
  }
  return new Response(response.body, { status: response.status, headers });
}
