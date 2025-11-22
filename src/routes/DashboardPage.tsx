import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { boardService, resourceService } from '../services/api';
import { calculateBoardCompletion } from '../utils/analyticsUtils';
import type { Board, Resource } from '../types';
import { AddBoardModal } from '../components/Dashboard/AddBoardModal';
import { EditBoardModal } from '../components/Dashboard/EditBoardModal';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [resourceMap, setResourceMap] = useState<Record<string, Resource[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      loadBoards();
    }
  }, [authLoading, user]);

  const loadBoards = async () => {
    try {
      const res = await boardService.getAll();
      setBoards(res.data);

      const resourcesMap: Record<string, Resource[]> = {};
      for (const board of res.data) {
        const resRes = await resourceService.getByBoard(board.id);
        resourcesMap[board.id] = resRes.data;
      }
      setResourceMap(resourcesMap);
    } catch (err) {
      console.error('Error loading boards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBoard = async (board: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('Submitting board:', board);
      const response = await boardService.create(board);
      console.log('Board created:', response.data);
      const newBoardId = response.data.id;
      setShowAddModal(false);
      // Redirect to the new board
      navigate(`/board/${newBoardId}`);
    } catch (err: any) {
      console.error('Error adding board:', err);
      alert(`Error: ${err.response?.data?.error || err.message || 'Failed to create board'}`);
    }
  };

  const handleUpdateBoard = async (updates: Partial<Board>) => {
    if (!editingBoard) return;
    try {
      await boardService.update(editingBoard.id, updates);
      await loadBoards();
      setEditingBoard(null);
    } catch (err) {
      console.error('Error updating board:', err);
    }
  };

  const handleDeleteBoard = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this board?')) return;
    try {
      await boardService.delete(id);
      await loadBoards();
    } catch (err) {
      console.error('Error deleting board:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your boards...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400">Please log in to view your boards</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">My Boards</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Organize and track your learning progress</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 btn-primary"
        >
          <Plus size={20} />
          New Board
        </button>
      </div>

      {/* Boards Grid */}
      {boards.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">No boards yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first board to get started</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            Create First Board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => {
            const resources = resourceMap[board.id] || [];
            const completion = calculateBoardCompletion(resources);

            return (
              <div key={board.id} className="card-elevated p-6 space-y-4 group">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex-1">{board.title}</h3>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => setEditingBoard(board)}
                      className="p-2 hover:bg-yellow-400/20 rounded-lg transition"
                      title="Edit board"
                    >
                      <Edit2 size={18} className="text-yellow-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteBoard(board.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition"
                      title="Delete board"
                    >
                      <Trash2 size={18} className="text-red-500" />
                    </button>
                  </div>
                </div>

                {board.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">{board.description}</p>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{resources.length} resources</span>
                    <span className="font-semibold text-yellow-400">{completion}% Complete</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${completion}%` }}
                    ></div>
                  </div>
                </div>

                <Link
                  to={`/board/${board.id}`}
                  className="block w-full text-center py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition"
                >
                  Open Board
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddBoardModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddBoard}
        />
      )}

      {editingBoard && (
        <EditBoardModal
          board={editingBoard}
          onClose={() => setEditingBoard(null)}
          onUpdate={handleUpdateBoard}
        />
      )}
    </div>
  );
}
