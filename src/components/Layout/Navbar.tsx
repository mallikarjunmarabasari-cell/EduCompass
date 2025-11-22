import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Menu, X, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Boards', path: '/boards' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-gray-900 dark:bg-black border-b border-yellow-400/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-black group-hover:scale-110 transition">
              E
            </div>
            <span className="hidden sm:block font-bold text-white text-lg">EduCompass</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  location.pathname === item.path
                    ? 'bg-yellow-400 text-black'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                {item.name}
              </Link>
            ))}
            {user && (
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 transition flex items-center space-x-1"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-800 dark:bg-gray-800 hover:bg-gray-700 transition"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-gray-400" />}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === item.path
                    ? 'bg-yellow-400 text-black'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                {item.name}
              </Link>
            ))}
            {user && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 transition"
              >
                <span className="flex items-center space-x-2">
                  <LogOut size={16} />
                  <span>Logout</span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
