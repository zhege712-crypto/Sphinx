import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backgroundProps, pageBackground, backgroundImage } from '../shared/page-background.mjs';
import { sanitizeDocument, collectAssets, publicBlocks, documentText } from '../shared/document.mjs';
const id = '7a2aa112-5639-4ce1-8085-28bbd51bc82f';
test('页面背景只接受本站上传图片，限制范围并随文章发布转换路径', () => {
  const input = { type: 'pageBackground', props: { url: `/api/assets/${id}`, blur: 90, opacity: -5, positionX: 120, positionY: -10, imageOffset: 1, name: '背景' } };
  const clean = sanitizeDocument([input]);
  assert.equal(clean[0].props.blur, 30); assert.equal(clean[0].props.opacity, 0);
  assert.equal(clean[0].props.positionX, 100); assert.equal(clean[0].props.positionY, 0);
  assert.deepEqual(collectAssets(clean), [id]);
  const published = publicBlocks(clean, new Map([[id, { extension: 'jpg' }]]));
  assert.equal(published[0].props.url, `assets/${id}.jpg`);
  assert.equal(documentText(clean), '');
  for (const url of ['https://outside.example/a.jpg', 'data:image/svg+xml,test', '/api/assets/no', 'javascript:alert(1)']) assert.throws(() => backgroundProps({ url }));
  assert.throws(() => sanitizeDocument([input, input]));
  assert.throws(() => sanitizeDocument([{ type: 'paragraph', content: '', children: [input] }]));
});
test('Windows 彩蛋仅作用于该 Reference 词条，作者可永久关闭或覆盖', () => {
  assert.equal(pageBackground({ kind: 'document', title: 'Windows' }), null);
  assert.equal(pageBackground({ kind: 'reference', title: 'Windows Server' }), null);
  const windows = { kind: 'reference', title: ' Windows ', blocks: [] };
  assert.equal(backgroundImage(pageBackground(windows)), 'backgrounds/windows-bliss.jpg');
  windows.blocks = [{ type: 'pageBackground', props: { enabled: false, preset: 'windows' } }];
  assert.equal(backgroundImage(pageBackground(windows)), '');
  assert.equal(backgroundImage({ enabled: true, url: `/api/assets/${id}` }), '');
  assert.equal(backgroundImage({ enabled: true, url: `/api/assets/${id}` }, true), `/api/assets/${id}`);
  assert.equal(backgroundImage({ enabled: true, url: `assets/${id}.jpg` }), `assets/${id}.jpg`);
});
