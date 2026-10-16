import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupLists } from '../shared/list-groups.mjs';
const item = (text, props = {}, children = []) => ({ type: 'numberedListItem', content: text, props, children });
test('普通连续步骤使用同一个有序列表，嵌套列表独立计数', () => {
  const blocks = [item('第一步'), item('第二步', {}, [item('子步骤一'), item('子步骤二')]), item('第三步')];
  const g = groupLists(blocks); assert.equal(g.length, 1); assert.equal(g[0].start, 1); assert.equal(g[0].blocks.length, 3);
  const nested = groupLists(g[0].blocks[1].children); assert.equal(nested[0].start, 1); assert.equal(nested[0].blocks.length, 2);
});
test('显式重启、中断和列表类型切换保留正确语义', () => {
  const g = groupLists([item('一'), item('二'), item('重启', { start: 5 }), item('六'), { type: 'paragraph', content: '说明' }, item('新列表'), { type: 'bulletListItem', content: '项目' }]);
  assert.deepEqual(g.map((x) => x.kind === 'list' ? [x.type, x.start, x.blocks.length] : 'block'), [['numberedListItem',1,2],['numberedListItem',5,2],'block',['numberedListItem',1,1],['bulletListItem',1,1]]);
});
