import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Share2 } from 'lucide-react';
import { boardService, resourceService, tagService } from '../services/api';
import type { Board, Resource, SearchFilters, Tag } from '../types';
import { ResourceColumn } from '../components/Board/ResourceColumn';
import { AddResourceModal } from '../components/Board/AddResourceModal';
import { ShareSettingsModal } from '../components/Board/ShareSettingsModal';
import { SearchBar, FilterPanel } from '../components/Search';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchMode, setSearchMode] = useState(false);

  useEffect(() => {
    if (boardId) {
      loadBoard();
      loadTags();
    }
  }, [boardId]);

  // Apply filters whenever filters or resources change
  useEffect(() => {
    console.log('🎯 useEffect triggered: applyFilters');
    applyFilters();
  }, [filters, resources]);

  const loadBoard = async () => {
    if (!boardId) return;
    try {
      const boardRes = await boardService.getAll();
      const foundBoard = boardRes.data.find((b) => b.id === boardId);
      setBoard(foundBoard || null);

      const resRes = await resourceService.getByBoard(boardId);
      console.log('📦 Raw resources from API:', resRes.data.length);
      
      // Load tags for each resource
      const resourcesWithTags = await Promise.all(
        resRes.data.map(async (resource) => {
          try {
            const tagsRes = await resourceService.getTags(resource.id);
            console.log(`🏷️ Tags for "${resource.title}":`, tagsRes.data);
            return {
              ...resource,
              tags: tagsRes.data || [],
            };
          } catch (err) {
            console.error(`Error loading tags for resource ${resource.id}:`, err);
            return {
              ...resource,
              tags: [],
            };
          }
        })
      );
      
      console.log('✅ Resources with tags loaded:', resourcesWithTags.length);
      setResources(resourcesWithTags);
      setFilteredResources(resourcesWithTags);
    } catch (err) {
      console.error('Error loading board:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const tagsRes = await tagService.getAll();
      setAllTags(tagsRes.data);
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  const applyFilters = () => {
    let result = resources;
    console.log('🔍 Starting filter. Resources count:', resources.length);
    console.log('🔍 Current filters:', filters);

    // Apply text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const beforeCount = result.length;
      result = result.filter((r) => {
        const matches = 
          r.title.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.url.toLowerCase().includes(query);
        if (matches) {
          console.log(`✅ Matched: ${r.title}`);
        }
        return matches;
      });
      console.log(`📝 Text search: ${beforeCount} → ${result.length}`);
    }

    // Apply category filter
    if (filters.category) {
      const beforeCount = result.length;
      result = result.filter((r) => r.category === filters.category);
      console.log(`📂 Category filter: ${beforeCount} → ${result.length}`);
    }

    // Apply status filter
    if (filters.status) {
      const beforeCount = result.length;
      result = result.filter((r) => r.status === filters.status);
      console.log(`✔️ Status filter: ${beforeCount} → ${result.length}`);
    }

    // Apply tag filters - check if resource has any of the selected tags
    if (filters.tags && filters.tags.length > 0) {
      const beforeCount = result.length;
      result = result.filter((r) => {
        if (!r.tags || r.tags.length === 0) return false;
        
        // Handle both Tag objects and string tags
        const resourceTagNames = r.tags.map((t) => 
          typeof t === 'string' ? t : t.name
        );
        
        // Check if any of the filter tags match resource tags
        return filters.tags!.some((filterTag) => 
          resourceTagNames.includes(filterTag)
        );
      });
      console.log(`🏷️ Tag filter: ${beforeCount} → ${result.length}`);
    }

    console.log('✅ Final filtered resources:', result.length);
    setFilteredResources(result);
  };

  const handleAddResource = async (resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'boardId'>) => {
    if (!boardId) return;
    try {
      await resourceService.create(boardId, {
        ...resource,
        boardId,
      } as Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>);
      await loadBoard();
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding resource:', err);
    }
  };

  const handleStatusChange = async (resourceId: string, newStatus: Resource['status']) => {
    try {
      // Optimistic update - update local state immediately
      setResources(prev => 
        prev.map(r => r.id === resourceId ? { ...r, status: newStatus } : r)
      );
      
      // Then persist to database
      await resourceService.update(resourceId, { status: newStatus });
      
      // Verify the change was saved correctly
      await loadBoard();
    } catch (err) {
      console.error('Error updating status:', err);
      // Reload on error to revert optimistic update
      await loadBoard();
    }
  };

  const handleProgressChange = async (resourceId: string, progress: number) => {
    try {
      await resourceService.update(resourceId, { progress });
      await loadBoard();
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await resourceService.delete(resourceId);
      await loadBoard();
    } catch (err) {
      console.error('Error deleting resource:', err);
    }
  };

  const handleUpdateResource = async (resourceId: string, updates: Partial<Resource>) => {
    try {
      await resourceService.update(resourceId, updates);
      await loadBoard();
    } catch (err) {
      console.error('Error updating resource:', err);
    }
  };

  const handleSearch = (query: string) => {
    console.log('🔎 Search query entered:', query);
    setFilters((prev) => ({
      ...prev,
      query: query || undefined,
    }));
    setSearchMode(!!query);
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const handleTagSelect = (tagName: string) => {
    setFilters((prev) => {
      const currentTags = prev.tags || [];
      const newTags = currentTags.includes(tagName)
        ? currentTags.filter((t) => t !== tagName)
        : [...currentTags, tagName];
      return {
        ...prev,
        tags: newTags.length > 0 ? newTags : undefined,
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading board...</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="text-center py-16">
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">Board not found</p>
        <button
          onClick={() => navigate('/boards')}
          className="btn-primary"
        >
          Back to Boards
        </button>
      </div>
    );
  }

  const todoResources = filteredResources.filter((r) => r.status === 'todo');
  const inProgressResources = filteredResources.filter((r) => r.status === 'in-progress');
  const completedResources = filteredResources.filter((r) => r.status === 'completed');

  console.log('📊 Column breakdown:', {
    filtered: filteredResources.length,
    todo: todoResources.length,
    inProgress: inProgressResources.length,
    completed: completedResources.length,
  });

  const topTags = allTags.slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <button
            onClick={() => navigate('/boards')}
            className="flex items-center gap-2 text-yellow-400 hover:text-yellow-500 mb-4 transition"
          >
            <ArrowLeft size={20} />
            Back to Boards
          </button>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{board.title}</h1>
          {board.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">{board.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium"
            title="Share this board"
          >
            <Share2 size={20} />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 btn-primary"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Resource</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <SearchBar onSearch={handleSearch} />

        {/* Result count when filtering */}
        {(searchMode || Object.keys(filters).length > 0) && resources.length > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Found {filteredResources.length} of {resources.length} resources
            {Object.keys(filters).length > 0 && (
              <button
                onClick={() => setFilters({ query: undefined })}
                className="ml-4 text-blue-600 hover:text-blue-800 underline text-xs"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filters - Optional side panel */}
      {(searchMode || Object.keys(filters).length > 0) && resources.length > 0 && (
        <div className="mb-4">
          <FilterPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            tagSuggestions={topTags}
            onTagSelect={handleTagSelect}
          />
        </div>
      )}

      {/* Kanban Board */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ResourceColumn
            title="To Do"
            resources={todoResources}
            columnStatus="todo"
            onStatusChange={handleStatusChange}
            onProgressChange={handleProgressChange}
            onDelete={handleDeleteResource}
            onUpdate={handleUpdateResource}
          />
          <ResourceColumn
            title="In Progress"
            resources={inProgressResources}
            columnStatus="in-progress"
            onStatusChange={handleStatusChange}
            onProgressChange={handleProgressChange}
            onDelete={handleDeleteResource}
            onUpdate={handleUpdateResource}
          />
          <ResourceColumn
            title="Completed"
            resources={completedResources}
            columnStatus="completed"
            onStatusChange={handleStatusChange}
            onProgressChange={handleProgressChange}
            onDelete={handleDeleteResource}
            onUpdate={handleUpdateResource}
          />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No resources match your search criteria
          </p>
          <button
            onClick={() => setFilters({ query: undefined })}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddResourceModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddResource}
        />
      )}

      {/* Share Modal */}
      {showShareModal && boardId && (
        <ShareSettingsModal
          boardId={boardId}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
