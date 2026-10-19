import test from 'node:test';
import assert from 'node:assert/strict';
import { imageOffset, imagePositionStyle, draggedImageOffset, resizedImageWidth, resizedBesideWidth, imageSideAt } from '../shared/image-position.mjs';
import { imageLayoutReplacement } from '../shared/image-layout.mjs';

test('image placement preserves old alignment and clamps saved positions', () => {
  assert.equal(imageOffset({ textAlignment: 'center' }), 50);
  assert.equal(imageOffset({ textAlignment: 'right' }), 100);
  assert.equal(imageOffset({ imageOffset: NaN, textAlignment: 'center' }), 50);
  assert.equal(imageOffset({ imageOffset: 500 }), 100);
  assert.deepEqual(imagePositionStyle({ previewWidth: 320, imageOffset: 25 }), {
    width: 320, maxWidth: '100%', position: 'relative', left: '25%', transform: 'translateX(-25%)', marginLeft: 0, marginRight: 0,
  });
});

test('image drags stay in free column space and full width images remain stable', () => {
  assert.equal(draggedImageOffset(25, 100, 600, 200), 50);
  assert.equal(draggedImageOffset(25, -1000, 600, 200), 0);
  assert.equal(draggedImageOffset(25, 1000, 600, 200), 100);
  assert.equal(draggedImageOffset(25, 100, 600, 600), 25);
  assert.equal(resizedImageWidth(200, 50, 1, 600), 250);
  assert.equal(resizedImageWidth(200, 50, -1, 600), 150);
  assert.equal(resizedImageWidth(200, 1000, 1, 600), 600);
  assert.equal(resizedImageWidth(200, -1000, 1, 600), 64);
  assert.equal(resizedBesideWidth(40, 100, 1, 500), 60);
  assert.equal(resizedBesideWidth(40, 1000, -1, 500), 25);
  assert.equal(imageSideAt(600, 100, 800), 'right');
  assert.equal(imageSideAt(200, 100, 800), 'left');
});

test('changing image layout retains authored children and arbitrary position', () => {
  const block = { id: 'image', type: 'image', props: { imageOffset: 24, url: '/api/assets/example' } };
  const beside = imageLayoutReplacement(block, 'image-left')[0];
  assert.equal(beside.props.imageOffset, 24);
  const stacked = imageLayoutReplacement(beside, 'right');
  assert.equal(stacked[0].props.imageOffset, 100);
  assert.equal(stacked[1].type, 'paragraph');
});
