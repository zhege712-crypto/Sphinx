import { readFile } from 'node:fs/promises';
import { runtimeIssue } from './check-runtime.mjs';

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
const issues = [];
if (runtimeIssue()) issues.push(runtimeIssue());
const versionAtLeast = (version, minimum) => {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return false;
  const current = version.split('.').map(Number);
  const floor = minimum.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (current[index] !== floor[index]) return current[index] > floor[index];
  }
  return true;
};

for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) issues.push(`Direct dependency must be pinned: ${name}@${version}`);
  if (lock.packages[`node_modules/${name}`]?.version !== version) issues.push(`Lockfile does not match: ${name}`);
}

const guardedPackages = [];
for (const [path, dependency] of Object.entries(lock.packages)) {
  if (!path) continue;
  if (path.includes('node_modules/@blocknote/xl-')) issues.push(`Unreviewed XL license boundary: ${path}`);
  if (dependency.resolved && !dependency.link && !dependency.integrity) issues.push(`Missing integrity: ${path}`);
  if (dependency.resolved && !dependency.resolved.startsWith('https://registry.npmjs.org/')) {
    issues.push(`Unexpected package source: ${path}`);
  }
  if (path.endsWith('node_modules/@tiptap/core')) {
    guardedPackages.push({ package: '@tiptap/core', version: dependency.version });
    // Covers the fixed releases for GHSA-cp6q-959q-f8rh and GHSA-j95f-988m-3j2f.
    if (!versionAtLeast(dependency.version, '3.30.5')) issues.push(`Known-vulnerability baseline: ${path}@${dependency.version}`);
  }
  if (path.endsWith('node_modules/@tiptap/extension-collaboration-caret')) {
    guardedPackages.push({ package: '@tiptap/extension-collaboration-caret', version: dependency.version });
    if (!versionAtLeast(dependency.version, '3.31.3')) issues.push(`Known-vulnerability baseline: ${path}@${dependency.version}`);
  }
}
if (!guardedPackages.some((entry) => entry.package === '@tiptap/core')) issues.push('Expected Tiptap core dependency was not found');
console.log(JSON.stringify({ status: issues.length ? 'failed' : 'passed', guardedPackages, issues }, null, 2));
if (issues.length) process.exitCode = 1;
