import test from 'node:test';
import assert from 'node:assert/strict';
import { getEmptyStateMessage } from './filterUtils.js';

test('returns the correct message when a column has no resources', () => {
  assert.equal(getEmptyStateMessage({ hasResources: false, hasActiveFilters: false }), 'No resources yet');
});

test('returns a stage-specific message when the board is empty but not filtered', () => {
  assert.equal(getEmptyStateMessage({ hasResources: true, hasActiveFilters: false }), 'No resources in this stage yet');
});

test('returns a filter-specific message when the board is empty after filtering', () => {
  assert.equal(getEmptyStateMessage({ hasResources: true, hasActiveFilters: true }), 'No resources match the current filters in this stage');
});
