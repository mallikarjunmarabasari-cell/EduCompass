export interface FilterState {
  query?: string;
  category?: string;
  status?: string;
  tags?: string[];
}

export function hasActiveFilters(filters?: FilterState): boolean;
export function applyResourceFilters(resources: Resource[], filters?: FilterState): Resource[];
export function clearFilters(): FilterState;
export function getEmptyStateMessage(options: { hasResources: boolean; hasActiveFilters: boolean }): string;
