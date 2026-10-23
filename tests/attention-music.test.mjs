import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATTENTION_REFERENCE_ID, attentionTrack } from '../shared/attention-music.mjs';

const document = { id: ATTENTION_REFERENCE_ID, kind: 'reference', title: 'Attention Is All Your Need' };
const file = './assets/audio/attention-all-you-need-is-love.mp3';
const assets = { [file]: './assets/attention-all-you-need-is-love-example.mp3' };

test('音乐彩蛋仅在原论文词条显示，不影响其他文章、重名词条或 Valhalla', () => {
  assert.equal(attentionTrack(document, assets)?.title, 'All You Need Is Love');
  assert.equal(attentionTrack({ ...document, title: 'Attention Is All You Need' }, assets)?.artist, 'The Beatles');
  for (const other of [undefined, {}, { ...document, id: 'different-id' }, { ...document, kind: 'document' }, { ...document, section: 'valhalla' }]) assert.equal(attentionTrack(other, assets), null);
});

test('收到指定音频前不显示空播放器，构建后的音频 URL 可用于子目录部署', () => {
  assert.equal(attentionTrack(document), null);
  assert.equal(attentionTrack(document, { './assets/audio/test.mp3': '/test.mp3' }), null);
  assert.equal(attentionTrack(document, { [file]: '' }), null);
  assert.equal(attentionTrack(document, { [file]: undefined }), null);
  assert.equal(attentionTrack(document, assets).src, assets[file]);
  for (const extension of ['mp3', 'm4a', 'wav']) {
    const src = `./assets/song-hashed.${extension}`;
    assert.equal(attentionTrack(document, { [`./assets/audio/attention-all-you-need-is-love.${extension}`]: src }).src, src);
  }
});
