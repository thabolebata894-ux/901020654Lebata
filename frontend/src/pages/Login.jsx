import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const LIBRARY_IMAGE = 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80';

export default function Login({ onLogin }) {
  const [membershipId, setMembershipId] = useState('ADMIN001');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login({ membershipId, password });
      onLogin(data.user);
      navigate('/');
    } catch (e2) {
      setError(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-wrap">
      <div className="login-shell">
        <div className="login-visual">
          <img src={LIBRARY_IMAGE} alt="Library interior" />
          <div className="login-visual-overlay">
            <h2>Library Manager</h2>
            <p>Manage books, stock, transactions, and users in a calm, organized space.</p>
          </div>
        </div>
        <form className="panel login-form" onSubmit={submit}>
          <h2>Sign in</h2>
          <p>Access your library dashboard.</p>
          {error && <p className="error">{error}</p>}
          <label>Membership ID
            <input value={membershipId} onChange={(e) => setMembershipId(e.target.value)} required />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
          <p className="hint">Default admin: <code>ADMIN001</code> / <code>admin123</code></p>
        </form>
      </div>
    </section>
  );
}
