import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveResourceCategory } from './linkUtils.ts';

test('prefers the inferred file category when a file upload is detected', () => {
  assert.equal(
    resolveResourceCategory({ selectedCategory: 'Reading', inferredCategory: 'Code' }),
    'Code',
  );
});

test('keeps the selected category when no file category can be inferred', () => {
  assert.equal(
    resolveResourceCategory({ selectedCategory: 'Reading', inferredCategory: null }),
    'Reading',
  );
});
