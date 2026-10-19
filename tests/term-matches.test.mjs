import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTermIndex, exactTermMatches, preferredTermMatch } from '../shared/term-matches.mjs';

test('选中文字按规范化的完整词条名称匹配，保留重名与草稿', () => {
  const entries = [
    { id: '1', title: 'Claude', publishedVersion: 2 },
    { id: '2', title: 'ＣＬＡＵＤＥ', publishedVersion: null },
    { id: '3', title: 'Attention Is All You Need', publishedVersion: 1 },
    { id: '4', title: '智能体', tags: ['Claude'], text: 'Claude' },
  ];
  const index = createTermIndex(entries);
  assert.deepEqual(exactTermMatches(index, '  claude '), entries.slice(0, 2));
  assert.deepEqual(exactTermMatches(index, 'Attention   Is All You Need'), [entries[2]]);
  assert.deepEqual(exactTermMatches(index, '智能体'), [entries[3]]);
  assert.deepEqual(exactTermMatches(index, 'Clau'), []);
  assert.deepEqual(exactTermMatches(index, '这段提到 Claude'), []);
  assert.equal(preferredTermMatch(exactTermMatches(index, 'Claude')), null);
  assert.equal(preferredTermMatch(exactTermMatches(index, '智能体')), entries[3]);
});

test('空选区、过长选区、失效条目与重复 id 不会产生快捷关联', () => {
  const index = createTermIndex([{ id: '1', title: '' }, null, { title: 'missing' }, { id: '2', title: '模型' }, { id: '2', title: '模型' }, { id: '3', title: 'x'.repeat(161) }]);
  assert.deepEqual(exactTermMatches(index, '  '), []);
  assert.deepEqual(exactTermMatches(index, 'x'.repeat(161)), []);
  assert.deepEqual(exactTermMatches(index, 'missing'), []);
  assert.equal(exactTermMatches(index, '模型').length, 1);
  assert.equal(preferredTermMatch([]), null);
});
