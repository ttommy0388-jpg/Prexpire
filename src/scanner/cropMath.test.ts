import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cropForFrame } from './cropMath.ts';

test('portrait phone, 3:4 photo, centred frame', () => {
  // 390x844 view; a 3024x4032 photo is scaled by 844/4032 and cropped left and right.
  const r = cropForFrame({ width: 390, height: 844 }, { x: 25, y: 340, width: 340, height: 150 }, { width: 3024, height: 4032 }, 0);
  assert.ok(r);
  const scale = 844 / 4032;
  const offsetX = (3024 * scale - 390) / 2;
  assert.equal(r.x, Math.round((25 + offsetX) / scale));
  assert.equal(r.y, Math.round(340 / scale));
  assert.ok(Math.abs(r.width - 340 / scale) <= 1);
  // The crop is centred horizontally in the photo, like the frame on screen.
  assert.ok(Math.abs(r.x + r.width / 2 - 1512) <= 2);
});

test('padding is clamped to the photo', () => {
  const r = cropForFrame({ width: 400, height: 400 }, { x: 0, y: 0, width: 400, height: 400 }, { width: 1000, height: 1000 });
  assert.deepEqual(r, { x: 0, y: 0, width: 1000, height: 1000 });
});

test('mismatched orientation returns null so the whole photo is read', () => {
  assert.equal(cropForFrame({ width: 390, height: 844 }, { x: 0, y: 0, width: 100, height: 50 }, { width: 4032, height: 3024 }), null);
});
