export const DEMO_SOURCE_LIMIT = 100000;
export const DEMO_HEIGHTS = [240, 400, 560, 720];
export const DEMO_SANDBOX = 'allow-scripts';
// Only this static, sandboxed runner allows inline scripts. The application never does.
export const DEMO_RUNNER_POLICY = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src about:; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
export function demoProps(raw = {}) {
  if (typeof raw.source !== 'string' || raw.source.length > DEMO_SOURCE_LIMIT) throw new Error('演示代码最多 100,000 个字符，请精简或拆分演示');
  return { title: typeof raw.title === 'string' ? raw.title.slice(0, 160) : '', source: raw.source, height: DEMO_HEIGHTS.includes(raw.height) ? raw.height : 400 };
}
