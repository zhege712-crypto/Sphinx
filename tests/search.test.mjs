import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchEntries, entryTags } from '../shared/search.mjs';
import { safeTags } from '../shared/tags.mjs';
import { parseRoute, documentRoute, safeReturn } from '../shared/navigation.mjs';
const entries = [
  { id: '1', title: '智能体', tags: ['基础概念', '工具'], text: '可以调用外部工具完成任务' },
  { id: '2', title: 'Claude', tags: ['模型', 'Anthropic'], text: '智能体应用使用的语言模型' },
  { id: '3', title: '模型', tags: ['基础概念'], text: 'Claude 等产品的基础' },
];
test('词条搜索支持关联标签、正文、多关键词、拼音和相关程度排序', () => {
  const ids = query => searchEntries(entries, query).map(({ entry }) => entry.id);
  assert.deepEqual(ids('模型'), ['3', '2']);
  assert.deepEqual(ids('Anthropic 模型'), ['2']);
  assert.deepEqual(ids('外部 工具'), ['1']);
  assert.deepEqual(ids('zhinengti'), ['1']); assert.deepEqual(ids('znt'), ['1']);
  assert.deepEqual(ids('jichugainian'), ['3', '1']);
  assert.deepEqual(ids('ＣＬＡＵＤＥ'), ['2', '3']);
  assert.deepEqual(ids('claude 不存在'), []); assert.deepEqual(ids('   '), ['1', '2', '3']);
  assert.match(searchEntries(entries, 'Anthropic')[0].hint, /标签/);
  assert.equal(entryTags(entries).find(({ tag }) => tag === '基础概念').count, 2);
});
test('标签规范化、去重与限额校验不静默删除非法输入', () => {
  assert.deepEqual(safeTags([' 模型 ', '模型', 'ＡＩ', 'ai']), ['模型', 'AI']);
  for (const value of ['模型', [null], [''], ['x'.repeat(33)], ['a\nb'], Array.from({ length: 13 }, (_, i) => `tag${i}`)]) assert.throws(() => safeTags(value));
});
test('创作页历史区分具体文档、词条和管理页面，返回只接受本站路由', () => {
  const id = 'c71e0000-0000-4000-8000-000000000003';
  assert.deepEqual(parseRoute(documentRoute({ id, kind: 'document' })), { writing: true, view: 'editor', id });
  assert.equal(parseRoute('#/write/documents').view, 'documents');
  assert.equal(parseRoute('#/write/reference').view, 'references');
  assert.equal(parseRoute(documentRoute({ id, kind: 'reference' })).id, id);
  assert.deepEqual(parseRoute(`#/write/valhalla/${id}`), { writing: true, view: 'editor', id, section: 'valhalla' });
  assert.equal(parseRoute('#/valhalla').view, 'valhalla');
  assert.equal(documentRoute({ id, kind: 'reference', section: 'valhalla' }), `#/write/valhalla/${id}`);
  assert.equal(safeReturn(`#/valhalla/${id}`), true);
  for (const value of ['https://example.com/', '//example.com', 'javascript:alert(1)', '#/read/../../write']) assert.equal(safeReturn(value), false);
});
