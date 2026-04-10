import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    if (user) {
      // Redirect to dashboard
      navigate('/boards');
    } else if (error) {
      // Show error and redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [user, error, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin inline-block w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full mb-4"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Completing sign in...</h2>
        <p className="text-gray-400">Please wait while we authenticate you.</p>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-gray-400 text-xs mt-2">Redirecting to login...</p>
          </div>
        )}
      </div>
    </div>
  );
}
