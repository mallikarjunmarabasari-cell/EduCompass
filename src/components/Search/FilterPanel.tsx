import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Resource, SearchFilters } from '../../types';
import { hasActiveFilters, clearFilters } from '../../utils/filterUtils';

const CATEGORIES: Resource['category'][] = ['Video', 'Notes', 'PDF', 'Practice', 'Reading', 'Code', 'Text', 'Archive'];
const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  tagSuggestions: Array<{ name: string; usage_count?: number }>;
  onTagSelect?: (tag: string) => void;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  tagSuggestions,
  onTagSelect,
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    category: true,
    status: true,
    tags: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange({
      ...filters,
      category: filters.category === category ? undefined : category,
    });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: filters.status === status ? undefined : (status as any),
    });
  };

  const handleClearFilters = () => {
    onFiltersChange(clearFilters() as SearchFilters);
    // Reset expanded sections to default when clearing filters
    setExpandedSections({
      category: true,
      status: true,
      tags: true,
    });
  };

  const activeFiltersPresent = hasActiveFilters(filters);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800">Filters</h3>
        {activeFiltersPresent && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('category')}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded px-2"
        >
          <span>Category</span>
          {expandedSections.category ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {expandedSections.category && (
          <div className="mt-2 space-y-2 pl-2">
            {CATEGORIES.map((category) => (
              <label key={category} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.category === category}
                  onChange={() => handleCategoryChange(category)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">{category}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('status')}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded px-2"
        >
          <span>Status</span>
          {expandedSections.status ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {expandedSections.status && (
          <div className="mt-2 space-y-2 pl-2">
            {STATUSES.map(({ value, label }) => (
              <label key={value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.status === value}
                  onChange={() => handleStatusChange(value)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Popular Tags */}
      {tagSuggestions.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => toggleSection('tags')}
            className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded px-2"
          >
            <span>Popular Tags</span>
            {expandedSections.tags ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {expandedSections.tags && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tagSuggestions.slice(0, 8).map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => onTagSelect?.(tag.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filters.tags?.includes(tag.name)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  #{tag.name}
                  {tag.usage_count && <span className="ml-1">({tag.usage_count})</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
