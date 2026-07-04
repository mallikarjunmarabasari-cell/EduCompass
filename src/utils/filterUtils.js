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
