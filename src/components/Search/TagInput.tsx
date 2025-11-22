import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { Tag } from '../../types';

interface TagInputProps {
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  suggestions?: Tag[];
  placeholder?: string;
  maxTags?: number;
}

export function TagInput({
  tags,
  onTagsChange,
  suggestions = [],
  placeholder = 'Add tags (press Enter)...',
  maxTags = 10,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Tag[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (input.trim()) {
      const filtered = suggestions.filter(
        (tag) =>
          tag.name.toLowerCase().includes(input.toLowerCase()) &&
          !tags.some((t) => t.id === tag.id)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [input, suggestions, tags]);

  const handleAddTag = (tag: Tag) => {
    if (tags.length < maxTags && !tags.some((t) => t.id === tag.id)) {
      onTagsChange([...tags, tag]);
      setInput('');
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  const handleRemoveTag = (tagId: number) => {
    onTagsChange(tags.filter((t) => t.id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      // If there are filtered suggestions, add the first one
      if (filteredSuggestions.length > 0) {
        handleAddTag(filteredSuggestions[0]);
      } else {
        // Create a new tag
        const newTag: Tag = {
          id: -Math.random(),
          name: input.trim(),
        };
        handleAddTag(newTag);
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1].id);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
          >
            <span>#{tag.name}</span>
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="text-blue-600 hover:text-blue-900"
              aria-label={`Remove ${tag.name} tag`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => input && setShowSuggestions(true)}
          placeholder={tags.length < maxTags ? placeholder : `Maximum ${maxTags} tags reached`}
          disabled={tags.length >= maxTags}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredSuggestions.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleAddTag(tag)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between"
              >
                <span className="text-sm">#{tag.name}</span>
                {(tag as any).usage_count && (
                  <span className="text-xs text-gray-500">({(tag as any).usage_count})</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          {tags.length}/{maxTags} tags
        </p>
      )}
    </div>
  );
}
