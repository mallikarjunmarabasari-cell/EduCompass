export function hasActiveFilters(filters = {}) {
  return Boolean(
    filters.query ||
    filters.category ||
    filters.status ||
    (filters.tags && filters.tags.length > 0),
  );
}

export function clearFilters() {
  return {};
}

export function getEmptyStateMessage({ hasResources, hasActiveFilters }) {
  if (!hasResources) {
    return 'No resources yet';
  }

  if (hasActiveFilters) {
    return 'No resources match the current filters in this stage';
  }

  return 'No resources in this stage yet';
}
