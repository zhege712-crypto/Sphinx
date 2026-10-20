import test from 'node:test';
import assert from 'node:assert/strict';
import { packWordCloud } from '../shared/word-cloud-layout.mjs';

test('dense word cloud stays within its canvas and never overlaps occupied glyph cells', () => {
  const words = Array.from({ length: 60 }, (_, i) => `term${i}`);
  const sprite = (word, index, shrink) => {
    const width = Math.max(4, Math.round((index < 2 ? 30 : 14) * .8 ** shrink)), height = 5;
    return { width, height, cells: Array.from({ length: width * height }, (_, i) => [i % width, Math.floor(i / width)]) };
  };
  for (const width of [170, 400]) {
    const placements = packWordCloud(words, width, 80, sprite), occupied = new Set();
    assert.ok(placements.length > 25);
    assert.deepEqual(placements, packWordCloud(words, width, 80, sprite));
    for (const item of placements) for (const [x, y] of item.cells) {
      const px = item.x + x, py = item.y + y, key = `${px},${py}`;
      assert.ok(px >= 0 && py >= 0 && px < width && py < 80);
      assert.ok(!occupied.has(key)); occupied.add(key);
    }
  }
  assert.deepEqual(packWordCloud(words, 0, 80, sprite), []);
});
