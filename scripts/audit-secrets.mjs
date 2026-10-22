import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const maxSize = 20 * 1024 * 1024;
const binary = /\.(?:png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|pdf|zip|7z|mp[34]|webm)$/i;
const sensitiveFile = value => /(?:^|\/)(?:\.env(?:\..+)?|\.dev\.vars(?:\..+)?|[^/]+\.(?:pfx|p12|jks|keystore|key))$/i.test(value.replaceAll('\\', '/')) && !/\.example$/i.test(value);
// This user-owned directory must never be opened, even when auditing history.
export const excludedPath = value => /(?:^|\/)myphotos(?:\/|$)/i.test(value.replaceAll('\\', '/'));

const detectors = [
  ['github-token', /\b(?:github_pat_[A-Za-z0-9_]{30,}|gh[pousr]_[A-Za-z0-9]{25,})\b/g],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['google-api-key', /\bAIza[A-Za-z0-9_-]{35}\b/g],
  ['npm-token', /\bnpm_[A-Za-z0-9]{36,}\b/g],
  ['named-credential', /\b(?:GITHUB_CLIENT_SECRET|GITHUB_PUBLISH_TOKEN|CLOUDFLARE_API_TOKEN|CF_API_TOKEN|AWS_SECRET_ACCESS_KEY)["']?\s*[:=]\s*["']?([A-Za-z0-9_+\/=-]{20,})/g],
  ['credential-in-url', /https?:\/\/[^\s/"'<>:@]+:[^\s/"'<>@]+@/g],
];

// Exact reviewed examples only: changing even one character makes a finding visible.
// No file-wide exemptions: genuine credentials in examples or tests still fail.
const fixtures = new Map([
  ['.dev.vars.example:named-credential', new Set([
    'e96a4f31a40bae1729d70129e7ba2974ff3a2ff4d7fa657735964166d0cf2d9e',
    'eb7d26dd0e2805a66c0f25c7fa0b299bbea820b04240f30020d6d707848de771',
    'ca776b9173be315e67d6bf6eefe06ea333b4aae0814fa86b89825d23206ea5f6',
  ])],
  ['tests/security.test.mjs:credential-in-url', new Set(['093866188144b0216fb125431572e8ac2df8980dfeeb6ebeb3d9f3987d1e4c1d'])],
]);

function detections(text) {
  const findings = [];
  for (const [detector, pattern] of detectors) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) findings.push({ detector, line: text.slice(0, match.index).split('\n').length, value: '[redacted]', digest: createHash('sha256').update(match[0]).digest('hex') });
  }
  return findings;
}

export const scanText = text => detections(text).map(({ digest, ...finding }) => finding);

export function auditSecrets({ history = false, dist = false, cwd = root } = {}) {
  const git = args => execFileSync('git', args, { cwd, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  const report = { trackedFiles: 0, historyBlobs: 0, distFiles: 0, reviewedFixtureMatches: 0, skipped: [], findings: [] };
  const inspectName = location => { if (sensitiveFile(location.file)) report.findings.push({ ...location, detector: 'sensitive-file', value: '[redacted]' }); };
  const inspect = (data, location) => {
    if (data.includes(0)) return; // Skip binary data; never print source or matched values.
    for (const { digest, ...finding } of detections(data.toString('utf8'))) {
      if (location.scope !== 'dist' && fixtures.get(`${location.file.replaceAll('\\', '/')}:${finding.detector}`)?.has(digest)) report.reviewedFixtureMatches++;
      else report.findings.push({ ...location, ...finding });
    }
  };
  const inspectFile = (relative, scope) => {
    if (excludedPath(relative)) return;
    const absolute = path.join(cwd, relative);
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) { report.skipped.push({ scope, file: relative, reason: 'not-regular-file' }); return; }
    inspectName({ scope, file: relative });
    if (binary.test(relative)) return;
    if (stat.size > maxSize) { report.skipped.push({ scope, file: relative, reason: 'size-limit' }); return; }
    report[scope === 'tracked' ? 'trackedFiles' : 'distFiles']++;
    inspect(readFileSync(absolute), { scope, file: relative });
  };
  const tracked = git(['ls-files', '-z']).toString('utf8').split('\0').filter(Boolean);
  for (const relative of tracked) inspectFile(relative, 'tracked');

  if (history) {
    const objects = new Map();
    const listed = git(['-c', 'core.quotePath=false', 'rev-list', '--objects', '--all', '--', '.', ':(top,exclude,icase)myphotos', ':(top,exclude,icase)myphotos/**']).toString('utf8');
    for (const line of listed.split('\n')) {
      const match = /^([a-f0-9]{40,64}) (.+)$/.exec(line);
      if (match && !excludedPath(match[2]) && !binary.test(match[2])) objects.set(match[1], match[2]);
    }
    const metadata = execFileSync('git', ['cat-file', '--batch-check'], { cwd, input: [...objects.keys()].join('\n') + '\n', encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    let batch = []; let size = 0;
    const flush = () => {
      if (!batch.length) return;
      const data = execFileSync('git', ['cat-file', '--batch'], { cwd, input: batch.join('\n') + '\n', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
      let offset = 0;
      for (const oid of batch) {
        const end = data.indexOf(10, offset);
        const header = data.subarray(offset, end).toString('utf8').split(' ');
        const length = Number(header[2]);
        if (header[0] !== oid || header[1] !== 'blob' || !Number.isSafeInteger(length)) throw new Error('Invalid Git object response');
        const location = { scope: 'history', file: objects.get(oid), object: oid };
        inspectName(location);
        inspect(data.subarray(end + 1, end + 1 + length), location);
        report.historyBlobs++;
        offset = end + 1 + length + 1;
      }
      batch = []; size = 0;
    };
    for (const line of metadata.split('\n')) {
      const [oid, type, bytes] = line.split(' ');
      if (type !== 'blob') continue;
      if (Number(bytes) > maxSize) { report.skipped.push({ scope: 'history', file: objects.get(oid), object: oid, reason: 'size-limit' }); continue; }
      if (size + Number(bytes) > 16 * 1024 * 1024) flush();
      batch.push(oid); size += Number(bytes);
    }
    flush();
  }
  if (dist) {
    const walk = directory => {
      for (const entry of readdirSync(path.join(cwd, directory), { withFileTypes: true })) {
        const relative = path.join(directory, entry.name);
        if (excludedPath(relative) || entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) walk(relative); else inspectFile(relative, 'dist');
      }
    };
    walk('dist');
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = auditSecrets({ history: process.argv.includes('--history'), dist: process.argv.includes('--dist') });
    console.log(JSON.stringify(report, null, 2));
    if (report.findings.length || report.skipped.length) process.exitCode = 1;
  } catch {
    console.error('Secret audit failed; source and command output suppressed.');
    process.exitCode = 1;
  }
}
