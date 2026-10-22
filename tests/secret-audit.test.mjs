import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, unlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { auditSecrets, excludedPath, scanText } from '../scripts/audit-secrets.mjs';
import { runtimeIssue } from '../scripts/check-runtime.mjs';

test('运行时安全下限阻止证书事件修复前的 Node.js，接受已修复的支持版本', () => {
  for (const version of ['24.18.1', '24.22.0', '26.12.0', '22.23.4', '25.9.0', '24.22.1-rc.1']) assert.equal(typeof runtimeIssue(version), 'string');
  for (const version of ['24.22.1', '24.23.0', '26.12.1', '26.13.0']) assert.equal(runtimeIssue(version), null);
});

test('凭据扫描只报告类型和行号，不输出匹配值；保护用户排除目录', () => {
  const token = ['github', 'pat', 'A1'.repeat(30)].join('_');
  const findings = scanText(`sample\n${token}`);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].detector, 'github-token');
  assert.equal(findings[0].line, 2);
  assert.equal(findings[0].value, '[redacted]');
  assert.equal(JSON.stringify(findings).includes(token), false);
  for (const value of ['myphotos/x', 'MYPHOTOS/x', 'nested/myphotos/x', 'myphotos\\x']) assert.equal(excludedPath(value), true);
  assert.equal(excludedPath('src/photos.js'), false);
});

test('扫描覆盖已删除的历史凭据和构建产物，示例文件没有整文件豁免', t => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'sphinx-secret-audit-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = args => execFileSync('git', args, { cwd, stdio: 'ignore', windowsHide: true });
  git(['init']);
  const token = ['github', 'pat', 'B2'.repeat(30)].join('_');
  writeFileSync(path.join(cwd, 'old.txt'), token);
  git(['add', 'old.txt']);
  git(['-c', 'user.name=Audit Test', '-c', 'user.email=audit@example.invalid', 'commit', '--no-gpg-sign', '-m', 'fixture']);
  unlinkSync(path.join(cwd, 'old.txt'));
  writeFileSync(path.join(cwd, '.dev.vars.example'), `GITHUB_PUBLISH_TOKEN=${token}`);
  git(['add', 'old.txt', '.dev.vars.example']);
  git(['-c', 'user.name=Audit Test', '-c', 'user.email=audit@example.invalid', 'commit', '--no-gpg-sign', '-m', 'remove fixture']);
  mkdirSync(path.join(cwd, 'dist'));
  writeFileSync(path.join(cwd, 'dist', 'app.js'), token);
  const report = auditSecrets({ cwd, history: true, dist: true });
  assert.equal(report.skipped.length, 0);
  assert.equal(report.findings.some(f => f.scope === 'history' && f.file === 'old.txt'), true);
  assert.equal(report.findings.some(f => f.scope === 'tracked' && f.file === '.dev.vars.example'), true);
  assert.equal(report.findings.some(f => f.scope === 'dist'), true);
  assert.equal(JSON.stringify(report).includes(token), false);
});
