import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Share2 } from 'lucide-react';
import { boardService, resourceService, tagService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Board, Resource, SearchFilters, Tag } from '../types';
import { ResourceColumn } from '../components/Board/ResourceColumn';
import { AddResourceModal } from '../components/Board/AddResourceModal';
import { ShareSettingsModal } from '../components/Board/ShareSettingsModal';
import { SearchBar, FilterPanel } from '../components/Search';
import { applyResourceFilters, getEmptyStateMessage, hasActiveFilters } from '../utils/filterUtils';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
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
    if (boardId && !authLoading && user) {
      Promise.all([loadBoard(), loadTags()]).catch((err) => {
        console.error('Error loading board or tags:', err);
      });
    }
  }, [boardId, authLoading, user]);

  // Apply filters whenever filters or resources change
  useEffect(() => {
    console.log('🎯 useEffect triggered: applyFilters');
    applyFilters();
  }, [filters, resources]);

  const loadBoard = async () => {
    if (!boardId) return;
    try {
      setLoading(true);
      const [boardRes, resRes] = await Promise.all([
        boardService.getById(boardId),
        resourceService.getByBoard(boardId),
      ]);

      setBoard(boardRes.data || null);

      const resourcesWithTags = (resRes.data || []).map((resource) => ({
        ...resource,
        tags: Array.isArray(resource.tags) ? resource.tags : resource.tags || [],
      }));

      console.log('📦 Loaded resources with tags:', resourcesWithTags.length);
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
    const result = applyResourceFilters(resources, filters);
    console.log('🔍 Applied filters. Resources count:', resources.length);
    console.log('🔍 Current filters:', filters);
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
    setResources((prev) =>
      prev.map((r) => (r.id === resourceId ? { ...r, status: newStatus } : r)),
    );

    try {
      await resourceService.update(resourceId, { status: newStatus });
    } catch (err) {
      console.error('Error updating status:', err);
      await loadBoard();
    }
  };

  const handleProgressChange = async (resourceId: string, progress: number) => {
    setResources((prev) =>
      prev.map((r) => (r.id === resourceId ? { ...r, progress } : r)),
    );

    try {
      await resourceService.update(resourceId, { progress });
    } catch (err) {
      console.error('Error updating progress:', err);
      await loadBoard();
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await resourceService.delete(resourceId);
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
      setFilteredResources((prev) => prev.filter((r) => r.id !== resourceId));
    } catch (err) {
      console.error('Error deleting resource:', err);
      await loadBoard();
    }
  };

  const handleUpdateResource = async (resourceId: string, updates: Partial<Resource>) => {
    setResources((prev) =>
      prev.map((r) => (r.id === resourceId ? { ...r, ...updates } : r)),
    );

    try {
      await resourceService.update(resourceId, updates);
    } catch (err) {
      console.error('Error updating resource:', err);
      await loadBoard();
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
    setSearchMode(hasActiveFilters(newFilters));
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
  const hasActiveSearchFilters = searchMode || Object.keys(filters).length > 0;

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
      <div className="space-y-3">
        <SearchBar onSearch={handleSearch} query={filters.query || ''} />

        {(searchMode || Object.keys(filters).length > 0) && resources.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300">
            <span>
              Showing {filteredResources.length} of {resources.length} resources
              {filters.query && <span className="ml-2 text-blue-600 dark:text-blue-400">for “{filters.query}”</span>}
            </span>
            {hasActiveFilters(filters) && (
              <button
                onClick={() => {
                  setFilters({});
                  setSearchMode(false);
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
            emptyMessage={getEmptyStateMessage({ hasResources: resources.length > 0, hasActiveFilters: hasActiveSearchFilters })}
          />
          <ResourceColumn
            title="In Progress"
            resources={inProgressResources}
            columnStatus="in-progress"
            onStatusChange={handleStatusChange}
            onProgressChange={handleProgressChange}
            onDelete={handleDeleteResource}
            onUpdate={handleUpdateResource}
            emptyMessage={getEmptyStateMessage({ hasResources: resources.length > 0, hasActiveFilters: hasActiveSearchFilters })}
          />
          <ResourceColumn
            title="Completed"
            resources={completedResources}
            columnStatus="completed"
            onStatusChange={handleStatusChange}
            onProgressChange={handleProgressChange}
            onDelete={handleDeleteResource}
            onUpdate={handleUpdateResource}
            emptyMessage={getEmptyStateMessage({ hasResources: resources.length > 0, hasActiveFilters: hasActiveSearchFilters })}
          />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No resources match your search criteria
          </p>
          <button
            onClick={() => {
              setFilters({});
              setSearchMode(false);
            }}
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
