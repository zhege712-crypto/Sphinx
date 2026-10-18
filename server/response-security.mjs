import { CONTENT_SECURITY_POLICY } from '../shared/security-policy.mjs';
import { DEMO_RUNNER_POLICY } from '../shared/code-demo.mjs';
export function secureResponse(response, env, requestUrl) {
  // Workers Assets redirects .html to its exact extensionless clean URL.
  const runner = requestUrl && ['/demo-runner.html', '/demo-runner'].includes(new URL(requestUrl).pathname) && response.ok && response.headers.get('Content-Type')?.startsWith('text/html');
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Frame-Options', runner ? 'SAMEORIGIN' : 'DENY');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (env.LOCAL_DEMO !== true || runner) {
    headers.set('Content-Security-Policy', runner ? `${DEMO_RUNNER_POLICY}; frame-ancestors 'self'; sandbox allow-scripts` : `${CONTENT_SECURITY_POLICY}; frame-ancestors 'none'`);
    headers.set('Strict-Transport-Security', 'max-age=31536000');
  }
  return new Response(response.body, { status: response.status, headers });
}
