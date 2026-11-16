import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Transactions from './pages/Transactions';
import Users from './pages/Users';
import Login from './pages/Login';
import './App.css';

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RouteTransition({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <>
      {loading && (
        <div className="route-loader" role="status" aria-live="polite">
          <div className="route-loader-card">
            <div className="route-spinner" />
            <p>Loading page...</p>
          </div>
        </div>
      )}
      <div className={loading ? 'route-content hidden' : 'route-content'}>{children}</div>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('library_user') || 'null'); } catch { return null; }
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('library_theme') || 'light');

  useEffect(() => {
    if (user) localStorage.setItem('library_user', JSON.stringify(user));
    else localStorage.removeItem('library_user');
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('library_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={() => setUser(null)} theme={theme} onToggleTheme={toggleTheme}>
        <RouteTransition>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={setUser} />} />
            <Route path="/" element={<ProtectedRoute user={user}><Dashboard /></ProtectedRoute>} />
            <Route path="/books" element={<ProtectedRoute user={user}><Books /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute user={user}><Transactions /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute user={user}><Users currentUser={user} /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
          </Routes>
        </RouteTransition>
      </Layout>
    </BrowserRouter>
  );
}
