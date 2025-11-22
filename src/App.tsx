import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout/Layout';
import { HomePage } from './routes/HomePage';
import { LoginPage } from './routes/LoginPage';
import { SignupPage } from './routes/SignupPage';
import { AuthCallbackPage } from './routes/AuthCallbackPage';
import { DashboardPage } from './routes/DashboardPage';
import { BoardPage } from './routes/BoardPage';
import { AnalyticsPage } from './routes/AnalyticsPage';
import { ProfilePage } from './routes/ProfilePage';
import { SharedBoardPage } from './routes/SharedBoardPage';
import './index.css';

// Protected Route Component
function ProtectedRoute({ element }: { element: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <>{element}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={user ? <Navigate to="/boards" /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/boards" /> : <SignupPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/share/:userId/:boardId/:shareToken" element={<SharedBoardPage />} />

      {/* Protected Routes */}
      <Route path="/boards" element={<ProtectedRoute element={<DashboardPage />} />} />
      <Route path="/board/:boardId" element={<ProtectedRoute element={<BoardPage />} />} />
      <Route path="/analytics" element={<ProtectedRoute element={<AnalyticsPage />} />} />
      <Route path="/profile" element={<ProtectedRoute element={<ProfilePage />} />} />

      {/* Catch All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <AppRoutes />
          </Layout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
