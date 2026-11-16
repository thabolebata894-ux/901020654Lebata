import { NavLink, useNavigate } from 'react-router-dom';

export default function Layout({ user, onLogout, theme, onToggleTheme, children }) {
  const navigate = useNavigate();
  const handleLogout = () => { onLogout(); navigate('/login'); };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <h1 className="brand">Library Manager</h1>
          <p className="subtitle">Book, stock, transaction, and user management</p>
        </div>
        <div className="topbar-actions">
          <button className="btn secondary theme-toggle" onClick={onToggleTheme} title="Toggle light/dark mode">
            {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
          </button>
          {user && (
            <div className="user-chip">
              <span>{user.name} ({user.role})</span>
              <button className="btn secondary" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </header>
      {user && (
        <nav className="nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/books">Book Management</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/users">User Management</NavLink>
        </nav>
      )}
      <main className="content">{children}</main>
    </div>
  );
}
