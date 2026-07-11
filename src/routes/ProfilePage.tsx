import { useEffect, useState } from 'react';
import { User, LogOut, Settings, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resourceService, boardService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, session, signOut, updateProfile } = useAuth();
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [stats, setStats] = useState({
    boards: 0,
    resources: 0,
    completed: 0,
    masteryScore: 0,
    assignmentCompletionRate: 0,
    averageProgress: 0,
    categoryBreakdown: { Video: 0, Notes: 0, PDF: 0, Practice: 0, Reading: 0, Code: 0, Text: 0, Archive: 0 },
  });
  const [tempName, setTempName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user, session]);

  const loadProfile = async () => {
    try {
      // Get user info from Supabase auth
      if (user) {
        setUserEmail(user.email || '');
        // Try to get full name from user metadata, otherwise use email
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student';
        setUserName(fullName);
        setTempName(fullName);
      } else {
        // Fallback to localStorage if not authenticated via Supabase
        const storedName = localStorage.getItem('userName');
        setUserName(storedName || 'Student');
        setTempName(storedName || 'Student');
      }

      // Load stats
      const boardsRes = await boardService.getAll();
      let totalResources = 0;
      let completedResources = 0;
      let totalProgress = 0;
      let assignmentCompletedCount = 0;
      let totalScore = 0;
      let scoredResourceCount = 0;
      const categoryBreakdown = { Video: 0, Notes: 0, PDF: 0, Practice: 0, Reading: 0, Code: 0, Text: 0, Archive: 0 };

      for (const board of boardsRes.data) {
        const resRes = await resourceService.getByBoard(board.id);
        const resources = resRes.data;
        
        totalResources += resources.length;
        
        resources.forEach((r) => {
          // Count completed (status + assignment)
          if (r.status === 'completed' && r.assignmentCompleted) {
            completedResources += 1;
          }

          // Accumulate progress
          totalProgress += r.progress || 0;

          // Count assignment completions
          if (r.assignmentCompleted) {
            assignmentCompletedCount += 1;
          }

          // Accumulate scores for mastery
          if (r.latestAssignmentScore !== undefined && r.latestAssignmentScore !== null) {
            totalScore += r.latestAssignmentScore;
            scoredResourceCount += 1;
          }

          // Tally by category
          if (r.category && categoryBreakdown.hasOwnProperty(r.category)) {
            categoryBreakdown[r.category]++;
          }
        });
      }

      const masteryScore = scoredResourceCount > 0 ? Math.round(totalScore / scoredResourceCount) : 0;
      const averageProgress = totalResources > 0 ? Math.round(totalProgress / totalResources) : 0;
      const assignmentCompletionRate = totalResources > 0 ? Math.round((assignmentCompletedCount / totalResources) * 100) : 0;

      setStats({
        boards: boardsRes.data.length,
        resources: totalResources,
        completed: completedResources,
        masteryScore,
        assignmentCompletionRate,
        averageProgress,
        categoryBreakdown,
      });
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const handleSaveName = async () => {
    if (tempName.trim()) {
      setIsSaving(true);
      try {
        // Update in Supabase
        await updateProfile(tempName);
        setUserName(tempName);
        setIsEditing(false);
      } catch (err) {
        console.error('Error saving profile:', err);
        alert('Failed to save profile. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadProfile();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Profile Header */}
      <div className="card-elevated p-8 text-center space-y-4">
        <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto">
          <User size={40} className="text-black" />
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-center"
            />
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleSaveName}
                disabled={isSaving}
                className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setTempName(userName);
                  setIsEditing(false);
                }}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{userName}</h1>
            {userEmail && <p className="text-gray-600 dark:text-gray-400">{userEmail}</p>}
            <button
              onClick={() => setIsEditing(true)}
              className="text-yellow-400 hover:text-yellow-500 transition"
            >
              Edit Profile
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-elevated p-6 text-center space-y-2">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Boards Created</p>
          <p className="text-3xl font-bold text-yellow-400">{stats.boards}</p>
        </div>
        <div className="card-elevated p-6 text-center space-y-2">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Resources Added</p>
          <p className="text-3xl font-bold text-yellow-400">{stats.resources}</p>
        </div>
        <div className="card-elevated p-6 text-center space-y-2">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Completed</p>
          <p className="text-3xl font-bold text-green-400">{stats.completed}</p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-elevated p-6 text-center space-y-2">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Mastery Score</p>
          <p className="text-3xl font-bold text-indigo-400">{stats.masteryScore}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">Weighted avg of quiz scores</p>
        </div>
        <div className="card-elevated p-6 text-center space-y-2">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Assignment Completion</p>
          <p className="text-3xl font-bold text-emerald-400">{stats.assignmentCompletionRate}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">{stats.completed} of {stats.resources} resources</p>
        </div>
      </div>

      {/* Progress & Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-elevated p-6 space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Average Progress</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 progress-bar h-3">
              <div className="progress-fill" style={{ width: `${stats.averageProgress}%` }}></div>
            </div>
            <span className="text-lg font-bold text-pink-400">{stats.averageProgress}%</span>
          </div>
        </div>
        <div className="card-elevated p-6 space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Resources by Category</p>
          <div className="space-y-2 text-xs">
            {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
              count > 0 && (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{category}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                </div>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="w-full flex items-center justify-center gap-2 py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
      >
        <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
        {isRefreshing ? 'Refreshing...' : 'Refresh Stats'}
      </button>

      {/* Settings Section */}
      <div className="card-elevated p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings size={24} />
          Preferences
        </h2>

        <div className="space-y-3 border-t border-gray-300 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-900 dark:text-white">Email Notifications</span>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-900 dark:text-white">Show Completed Resources</span>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-900 dark:text-white">Dark Mode</span>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
      >
        <LogOut size={20} />
        Logout (via Supabase Auth)
      </button>

      {/* Info */}
      <div className="card-elevated p-6 space-y-2 text-center">
        <p className="text-gray-600 dark:text-gray-400 text-sm">EduCompass v1.0.0</p>
        <p className="text-gray-600 dark:text-gray-400 text-xs">
          Master your learning journey with smart tracking & assignments
        </p>
      </div>
    </div>
  );
}
