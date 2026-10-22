import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 2026-10-21 security releases: updated CA trust/blocklist, TLS and HTTP fixes.
// https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
export function runtimeIssue(version = process.versions.node) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return 'Use a stable, supported Node.js security release.';
  const [major, minor, patch] = version.split('.').map(Number);
  const minimum = { 24: [22, 1], 26: [12, 1] }[major];
  if (minimum && (minor > minimum[0] || (minor === minimum[0] && patch >= minimum[1]))) return null;
  return `Node.js ${version} is below the project security baseline. Use Node.js 24.22.1+ (24.x) or 26.12.1+ (26.x).`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const issue = runtimeIssue();
  if (issue) { console.error(issue); process.exitCode = 1; }
  else console.log(`Node.js ${process.versions.node}: project security baseline passed.`);
}
