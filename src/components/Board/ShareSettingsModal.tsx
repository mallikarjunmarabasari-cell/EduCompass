import { useState, useEffect } from 'react';
import { X, Copy, Trash2, Mail, Lock } from 'lucide-react';
import { shareService } from '../../services/shareService';
import { useAuth } from '../../context/AuthContext';

interface ShareSettingsModalProps {
  boardId: string;
  onClose: () => void;
}

interface Share {
  id: string;
  boardId: string;
  email: string;
  permissionLevel: 'read' | 'edit';
  sharedBy: string;
  shareToken: string;
  createdAt: string;
}

export function ShareSettingsModal({ boardId, onClose }: ShareSettingsModalProps) {
  const { user } = useAuth();
  const [shares, setShares] = useState<Share[]>([]);
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'read' | 'edit'>('read');
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const shareLink = user ? `${window.location.origin}/share/${user.id}/${boardId}` : '';

  useEffect(() => {
    loadShares();
  }, [boardId]);

  const loadShares = async () => {
    try {
      setLoading(true);
      const response = await shareService.getShares(boardId);
      setShares(response.data);
    } catch (err) {
      console.error('Error loading shares:', err);
      setError('Failed to load shares');
    } finally {
      setLoading(false);
    }
  };

  const handleShareBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !user) return;

    setSharing(true);
    setError('');
    setSuccess('');

    try {
      await shareService.shareBoard(boardId, email, permissionLevel, user.id || 'unknown-user');
      setSuccess(`Board shared with ${email} as ${permissionLevel}`);
      setEmail('');
      setPermissionLevel('read');
      await loadShares();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to share board');
    } finally {
      setSharing(false);
    }
  };

  const handleUpdatePermission = async (shareId: string, newLevel: 'read' | 'edit') => {
    try {
      await shareService.updateShare(boardId, shareId, newLevel);
      setSuccess('Permission updated successfully');
      await loadShares();
    } catch (err) {
      setError('Failed to update permission');
    }
  };

  const handleRevokeAccess = async (shareId: string) => {
    if (!window.confirm('Are you sure you want to revoke access?')) return;

    try {
      await shareService.revokeShare(boardId, shareId);
      setSuccess('Access revoked successfully');
      await loadShares();
    } catch (err) {
      setError('Failed to revoke access');
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy share link:', err);
      setError('Unable to copy link automatically. Please copy it manually.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Share Board</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Messages */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg text-green-600 dark:text-green-400">
              {success}
            </div>
          )}

          {/* Share Link Section */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Lock size={18} className="text-yellow-400" />
              Share Link
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg transition font-medium flex items-center gap-2"
              >
                <Copy size={16} />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Copy this link to share the board directly, or invite someone by email below.
            </p>
          </div>

          {/* Share by Email Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Mail size={18} className="text-yellow-400" />
              Share with Email
            </h3>
            <form onSubmit={handleShareBoard} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="md:col-span-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
                <select
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value as 'read' | 'edit')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="read">View Only</option>
                  <option value="edit">Can Edit</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={sharing || !email.trim()}
                className="w-full py-2 px-4 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg transition font-medium disabled:opacity-50"
              >
                {sharing ? 'Sharing...' : 'Share Board'}
              </button>
            </form>
          </div>

          {/* Current Shares */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Current Access ({shares.length})
            </h3>
            {loading ? (
              <p className="text-gray-600 dark:text-gray-400 text-sm">Loading shares...</p>
            ) : shares.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-sm">No one has access yet</p>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {share.email}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Shared on {new Date(share.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={share.permissionLevel}
                        onChange={(e) =>
                          handleUpdatePermission(share.id, e.target.value as 'read' | 'edit')
                        }
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="read">View Only</option>
                        <option value="edit">Can Edit</option>
                      </select>
                      <button
                        onClick={() => handleRevokeAccess(share.id)}
                        className="p-1 hover:bg-red-500/20 rounded transition text-red-500"
                        title="Revoke access"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
