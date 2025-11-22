import { useState } from 'react';
import { X } from 'lucide-react';
import type { Board } from '../../types';

interface AddBoardModalProps {
  onClose: () => void;
  onAdd: (board: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function AddBoardModal({ onClose, onAdd }: AddBoardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Board title is required');
      return;
    }

    setLoading(true);
    try {
      const boardData: any = {
        title: title.trim(),
      };

      if (description.trim()) boardData.description = description.trim();
      if (scheduleTime) boardData.scheduleTime = scheduleTime;

      console.log('Creating board with data:', boardData);
      await onAdd(boardData);
    } catch (error) {
      console.error('Error creating board:', error);
      alert('Failed to create board. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Board</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Board Title */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Board Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Data Structures & Algorithms"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a brief description of this board..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none h-20"
            />
          </div>

          {/* Schedule Timer */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              ⏰ Schedule Study Time
            </label>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Optional: Set a reminder for when to study this board</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
