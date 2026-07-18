export function hasActiveFilters(filters = {}) {
  if (!filters) return false;
  const query = typeof filters.query === "string" ? filters.query.trim() : "";
  const hasQuery = query.length > 0;
  const hasCategory = !!(filters.category && String(filters.category).trim());
  const hasStatus = !!filters.status;
  const hasTags = Array.isArray(filters.tags) && filters.tags.length > 0;
  return hasQuery || hasCategory || hasStatus || hasTags;
}

export function applyResourceFilters(resources = [], filters = {}) {
  let result = [...resources];

  if (filters.query) {
    const query = filters.query.toLowerCase();
    result = result.filter((resource) => {
      const searchableText = [
        resource.title,
        resource.description || "",
        resource.url || "",
        ...(resource.urls || []),
        ...(Array.isArray(resource.tags)
          ? resource.tags.map((tag) =>
              typeof tag === "string" ? tag : tag.name,
            )
          : []),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }

  if (filters.category) {
    result = result.filter(
      (resource) => resource.category === filters.category,
    );
  }

  if (filters.status) {
    result = result.filter((resource) => resource.status === filters.status);
  }

  if (filters.tags && filters.tags.length > 0) {
    result = result.filter((resource) => {
      if (!resource.tags || resource.tags.length === 0) return false;

      const resourceTagNames = resource.tags
        .map((tag) => (typeof tag === "string" ? tag : tag?.name))
        .filter(Boolean)
        .map((tagName) => tagName.trim());

      return filters.tags.some((filterTag) =>
        resourceTagNames.some(
          (resourceTagName) =>
            resourceTagName.toLowerCase() === filterTag.toLowerCase(),
        ),
      );
    });
  }

  return result;
}

export function clearFilters() {
  // Return an explicit empty filter shape so UI controls are reset predictably
  return {
    query: "",
    tags: [],
    category: undefined,
    status: undefined,
  };
}

export function getEmptyStateMessage({ hasResources, hasActiveFilters }) {
  if (!hasResources) {
    return "No resources yet";
  }

  if (hasActiveFilters) {
    return "No resources match the current filters in this stage";
  }

  return "No resources in this stage yet";
}
