import { CONTENT_SECURITY_POLICY } from '../shared/security-policy.mjs';
export function secureResponse(response, env) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (env.LOCAL_DEMO !== true) {
    headers.set('Content-Security-Policy', `${CONTENT_SECURITY_POLICY}; frame-ancestors 'none'`);
    headers.set('Strict-Transport-Security', 'max-age=31536000');
  }
  return new Response(response.body, { status: response.status, headers });
}
