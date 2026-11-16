import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = { name: '', membershipId: '', role: 'member', password: '' };

export default function Users({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin';

  const load = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setUsers(await api.getUsers());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isAdmin]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (!form.name.trim() || !form.membershipId.trim()) {
        setError('Name and Membership ID are required.');
        return;
      }
      if (!editingId && (!form.password || form.password.length < 4)) {
        setError('Password must be at least 4 characters for new users.');
        return;
      }
      if (form.password && form.password.length < 4) {
        setError('Password must be at least 4 characters.');
        return;
      }
      const payload = { ...form, name: form.name.trim(), membershipId: form.membershipId.trim() };
      if (!payload.password) delete payload.password;
      if (editingId) {
        await api.updateUser(editingId, payload);
        setSuccess('User updated successfully.');
      } else {
        await api.addUser(payload);
        setSuccess('User added successfully.');
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e2) {
      setError(e2.message);
    }
  };

  const edit = (u) => {
    setEditingId(u.id);
    setForm({ name: u.name, membershipId: u.membershipId, role: u.role, password: '' });
    setError('');
    setSuccess('');
  };

  const remove = async (id) => {
    if (!confirm('Delete this user?')) return;
    setError('');
    setSuccess('');
    try {
      await api.deleteUser(id);
      setSuccess('User deleted.');
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!isAdmin) {
    return (
      <section>
        <h2>User Management</h2>
        <p className="panel">You are logged in as <strong>{currentUser?.name}</strong> ({currentUser?.membershipId}). Admin access is required to add, update, or delete users.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>User Management (Admin)</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <form className="panel form-grid" onSubmit={submit}>
        <h3>{editingId ? 'Update User' : 'Add New User'}</h3>
        <label>Name<input name="name" value={form.name} onChange={onChange} required /></label>
        <label>Membership ID<input name="membershipId" value={form.membershipId} onChange={onChange} required /></label>
        <label>Role
          <select name="role" value={form.role} onChange={onChange}>
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <label>Password<input type="password" name="password" value={form.password} onChange={onChange} placeholder={editingId ? 'Leave blank to keep current' : 'Set a password (min 4 chars)'} /></label>
        <div className="actions">
          <button className="btn" type="submit">{editingId ? 'Save Changes' : 'Add User'}</button>
          {editingId && <button type="button" className="btn secondary" onClick={() => { setEditingId(null); setForm(emptyForm); setError(''); setSuccess(''); }}>Cancel</button>}
        </div>
      </form>

      <h3>Users</h3>
      {loading ? <p>Loading...</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Membership ID</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td><td>{u.membershipId}</td><td>{u.role}</td>
                  <td className="actions-cell">
                    <div className="actions">
                      <button className="btn small" onClick={() => edit(u)}>Update</button>
                      <button className="btn small danger" onClick={() => remove(u.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan="4">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
