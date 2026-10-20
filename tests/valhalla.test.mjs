import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverKnowledgeSection, valhallaDocument } from '../shared/valhalla.mjs';

test('恢复旧稿仅替换当前正文，保留另一侧新稿、最新名称、标签与同步设置', () => {
  const latest = { title: '最新名称', version: 5, tags: ['新标签'], blocks: [{ content: '最新 Reference' }], valhalla: { enabled: true, blocks: [{ content: '最新 Valhalla' }] } };
  const copy = { title: '旧名称', version: 2, tags: ['旧标签'], tagDraft: '旧标签草稿', blocks: [{ content: '待恢复正文' }], referenceBlocks: [{ content: '旧 Reference' }], valhalla: { enabled: false, blocks: [{ content: '旧 Valhalla' }] } };
  for (const section of ['reference', 'valhalla']) {
    const recovered = recoverKnowledgeSection(latest, copy, section);
    assert.equal(recovered.title, latest.title);
    assert.deepEqual(recovered.tags, latest.tags);
    assert.deepEqual(recovered.referenceBlocks, latest.blocks);
    assert.deepEqual(recovered.valhalla, latest.valhalla);
    assert.deepEqual(recovered.blocks, copy.blocks);
    assert.equal(recovered.tagDraft, '');
  }
  const matching = recoverKnowledgeSection(latest, { ...copy, version: 5 }, 'reference');
  assert.equal(matching.title, copy.title); assert.equal(matching.valhalla.enabled, false);
  assert.deepEqual(matching.valhalla.blocks, latest.valhalla.blocks);
  assert.equal(latest.valhalla.enabled, true);
});

test('Valhalla 索引仅搜索评测正文，并与 Reference 使用同一词条身份', () => {
  const source = { id: 'same-id', kind: 'reference', title: '模型', blocks: [{ content: '词条正文' }], valhalla: { enabled: true, blocks: [{ type: 'paragraph', content: '测试记录' }] } };
  const evaluation = valhallaDocument(source);
  assert.equal(evaluation.id, source.id); assert.equal(evaluation.title, source.title);
  assert.equal(evaluation.text, '测试记录'); assert.equal(evaluation.section, 'valhalla');
  assert.equal(valhallaDocument({ ...source, valhalla: { enabled: true, text: '列表评测摘要' } }).text, '列表评测摘要');
});
