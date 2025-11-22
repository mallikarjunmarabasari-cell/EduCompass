import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, AlertCircle } from 'lucide-react';
import { shareService } from '../services/shareService';
import { resourceService } from '../services/api';
import type { Board, Resource } from '../types';
import { ResourceColumn } from '../components/Board/ResourceColumn';

interface SharedBoardData {
  board: Board;
  share: {
    id: string;
    email: string;
    permissionLevel: 'read' | 'edit';
    createdAt: string;
  };
}

export function SharedBoardPage() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const [boardData, setBoardData] = useState<SharedBoardData | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (shareToken) {
      loadSharedBoard();
    }
  }, [shareToken]);

  const loadSharedBoard = async () => {
    try {
      setLoading(true);
      // Try to fetch using shareToken
      const response = await shareService.getSharedBoard(shareToken || '');
      setBoardData(response.data);
      
      // Load resources for this board
      if (response.data.board.id) {
        const resourceRes = await resourceService.getByBoard(response.data.board.id);
        setResources(resourceRes.data);
      }
    } catch (err: any) {
      console.error('Error loading shared board:', err);
      setError(err.response?.data?.error || 'Failed to load shared board');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (resourceId: string, newStatus: Resource['status']) => {
    // Only allow if user has edit permission
    if (boardData?.share.permissionLevel !== 'edit') {
      setError('You do not have permission to edit this resource');
      return;
    }
    
    try {
      await resourceService.update(resourceId, { status: newStatus });
      await loadSharedBoard();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update resource');
    }
  };

  const handleProgressChange = async (resourceId: string, progress: number) => {
    // Only allow if user has edit permission
    if (boardData?.share.permissionLevel !== 'edit') {
      setError('You do not have permission to edit this resource');
      return;
    }

    try {
      await resourceService.update(resourceId, { progress });
      await loadSharedBoard();
    } catch (err) {
      console.error('Error updating progress:', err);
      setError('Failed to update progress');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading shared board...</p>
        </div>
      </div>
    );
  }

  if (error || !boardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertCircle size={48} className="mx-auto text-red-500" />
          <div>
            <p className="text-xl text-gray-900 dark:text-white font-semibold mb-2">
              {error || 'Unable to access this board'}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The share link may be invalid or expired
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition font-medium"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredResources = resources.filter((r) =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todoResources = filteredResources.filter((r) => r.status === 'todo');
  const inProgressResources = filteredResources.filter((r) => r.status === 'in-progress');
  const completedResources = filteredResources.filter((r) => r.status === 'completed');

  const isReadOnly = boardData.share.permissionLevel === 'read';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-yellow-400 hover:text-yellow-500 transition"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{boardData.board.title}</h1>
            {isReadOnly && (
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 border border-blue-500 rounded-full">
                <Lock size={14} className="text-blue-500" />
                <span className="text-xs font-medium text-blue-500">Read Only</span>
              </div>
            )}
          </div>
          {boardData.board.description && (
            <p className="text-gray-600 dark:text-gray-400">{boardData.board.description}</p>
          )}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Shared with you as: <span className="font-medium">{boardData.share.email}</span>
          </div>
        </div>
      </div>

      {/* Permission Notice */}
      {isReadOnly && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-3">
          <Lock size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-700 dark:text-blue-300">Read-Only Access</p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              You have read-only access to this board. To make changes, request edit access from the board owner.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search resources by title or URL..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          disabled={isReadOnly}
        />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ResourceColumn
          title="To Do"
          resources={todoResources}
          columnStatus="todo"
          onStatusChange={handleStatusChange}
          onProgressChange={handleProgressChange}
          onDelete={() => {
            if (isReadOnly) {
              setError('You do not have permission to delete resources');
            }
          }}
          onUpdate={() => {
            if (isReadOnly) {
              setError('You do not have permission to edit resources');
            }
          }}
          isReadOnly={isReadOnly}
        />
        <ResourceColumn
          title="In Progress"
          resources={inProgressResources}
          columnStatus="in-progress"
          onStatusChange={handleStatusChange}
          onProgressChange={handleProgressChange}
          onDelete={() => {
            if (isReadOnly) {
              setError('You do not have permission to delete resources');
            }
          }}
          onUpdate={() => {
            if (isReadOnly) {
              setError('You do not have permission to edit resources');
            }
          }}
          isReadOnly={isReadOnly}
        />
        <ResourceColumn
          title="Completed"
          resources={completedResources}
          columnStatus="completed"
          onStatusChange={handleStatusChange}
          onProgressChange={handleProgressChange}
          onDelete={() => {
            if (isReadOnly) {
              setError('You do not have permission to delete resources');
            }
          }}
          onUpdate={() => {
            if (isReadOnly) {
              setError('You do not have permission to edit resources');
            }
          }}
          isReadOnly={isReadOnly}
        />
      </div>
    </div>
  );
}
