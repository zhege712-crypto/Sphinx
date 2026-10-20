import test from 'node:test';
import assert from 'node:assert/strict';
import { boundaryForScroll, boundaryWords } from '../shared/scroll-boundary.mjs';

test('boundary feedback handles only outward gestures, including fractional and short pages', () => {
  const metrics = { scrollTop: 0, scrollHeight: 1500, clientHeight: 700 };
  assert.equal(boundaryForScroll(metrics, -20), 'top');
  assert.equal(boundaryForScroll(metrics, 20), null);
  assert.equal(boundaryForScroll({ ...metrics, scrollTop: 400 }, -20), null);
  assert.equal(boundaryForScroll({ ...metrics, scrollTop: 799.5 }, 20), 'bottom');
  assert.equal(boundaryForScroll({ ...metrics, scrollTop: 800 }, -20), null);
  assert.equal(boundaryForScroll({ ...metrics, scrollHeight: 500 }, 20), 'bottom');
  assert.equal(boundaryForScroll({ ...metrics, clientHeight: 0 }, -20), null);
  for (const delta of [0, NaN, Infinity]) assert.equal(boundaryForScroll(metrics, delta), null);
});

test('word cloud uses published Reference titles only, deduplicates and bounds its size', () => {
  const words = boundaryWords([
    { kind: 'reference', publishedVersion: 1, title: ' Windows ' },
    { kind: 'reference', publishedAt: '2026-10-20T00:00:00Z', title: 'Windows' },
    { kind: 'reference', title: 'private draft' },
    { kind: 'document', publishedVersion: 1, title: 'unrelated article' },
  ]);
  assert.equal(words[0], 'Sphinx');
  assert.equal(words[1], 'Windows');
  assert.ok(words.length >= 40 && words.length <= 80);
  assert.equal(new Set(words).size, words.length);
  assert.ok(!words.includes('private draft'));
  assert.ok(!words.includes('unrelated article'));
  assert.equal(boundaryWords([])[0], 'Sphinx');
});
