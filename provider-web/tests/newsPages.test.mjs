import assert from 'node:assert/strict';
import test from 'node:test';
import { groupNewsBlocks } from '../src/utils/newsPages.ts';

const p = (size) => ({ size, heading: false });
const h = (size = 20) => ({ size, heading: true });

test('short article stays on one page', () => {
  assert.deepEqual(groupNewsBlocks([p(500), p(800)], 3000), [[0, 1]]);
  assert.deepEqual(groupNewsBlocks([], 3000), [[]]);
});

test('splits at paragraph boundaries once the limit is exceeded', () => {
  assert.deepEqual(groupNewsBlocks([p(1500), p(1400), p(1200), p(1000)], 3000), [[0, 1], [2, 3]]);
});

test('a heading moves to the next page together with its content', () => {
  assert.deepEqual(groupNewsBlocks([p(1500), p(1400), h(), p(1500), p(800)], 3000), [[0, 1], [2, 3, 4]]);
});

test('a single oversized paragraph is never cut', () => {
  assert.deepEqual(groupNewsBlocks([p(5000), p(1500), p(1200)], 3000), [[0], [1, 2]]);
});

test('a very short last page is merged into the previous one', () => {
  assert.deepEqual(groupNewsBlocks([p(2000), p(900), p(300)], 3000), [[0, 1, 2]]);
});
