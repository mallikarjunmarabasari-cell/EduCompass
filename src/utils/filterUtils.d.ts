export interface FilterState {
  query?: string;
  category?: string;
  status?: string;
  tags?: string[];
}

export function hasActiveFilters(filters?: FilterState): boolean;
export function clearFilters(): FilterState;
