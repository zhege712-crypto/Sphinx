import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referenceInitial, compareReferenceTitles } from '../shared/reference-index.mjs';

test('中文词条按拼音加入 A–Z，兼容繁体和常见多音词', () => {
  for (const [title, letter] of [
    ['模型', 'M'], ['提示词', 'T'], ['智能体', 'Z'], ['人工智能', 'R'],
    ['阿里云', 'A'], ['百度', 'B'], ['重庆', 'C'], ['重复', 'C'],
    ['重量', 'Z'], ['银行', 'Y'], ['長度', 'C'], ['女娲', 'N'], ['吕布', 'L'],
    ['  中文模型 ', 'Z'], ['Claude', 'C'], ['deepseek', 'D'], ['Ａgent', 'A'],
  ]) assert.equal(referenceInitial(title), letter, title);
});

test('同组中英词条按拼音排序且保留数字、符号词条', () => {
  const entries = ['模型', '猫', '目录', '提示词', 'Claude', '重庆', '重复'].map(title => ({ title }));
  assert.deepEqual(entries.filter(entry => referenceInitial(entry.title) === 'M').sort(compareReferenceTitles).map(entry => entry.title), ['猫', '模型', '目录']);
  assert.equal(entries.filter(entry => referenceInitial(entry.title) === 'C').length, 3);
  for (const title of ['', ' ', '123', '🤖 Agent', '#标题']) assert.equal(referenceInitial(title), '#');
});
