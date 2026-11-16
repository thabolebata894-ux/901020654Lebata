import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Transactions() {
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ bookId: '', userId: '', type: 'add', quantity: 1, note: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [b, t, u] = await Promise.all([api.getBooks(), api.getTransactions(), api.getUsers().catch(() => [])]);
      setBooks(b);
      setTransactions(t);
      setUsers(u);
      setForm((f) => ({
        ...f,
        bookId: f.bookId || (b.length > 0 ? String(b[0].id) : ''),
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const qty = Number(form.quantity);
      if (!form.bookId) {
        setError('Please select a book.');
        return;
      }
      if (!Number.isInteger(qty) || qty <= 0) {
        setError('Quantity must be a whole number greater than 0.');
        return;
      }
      if (form.type === 'deduct' && !form.userId) {
        setError('Please select the member borrowing the book for a deduct/borrow transaction.');
        return;
      }
      await api.addTransaction({
        bookId: Number(form.bookId),
        userId: form.userId ? Number(form.userId) : null,
        type: form.type,
        quantity: qty,
        note: form.note,
      });
      setSuccess('Transaction recorded successfully.');
      setForm((f) => ({ ...f, quantity: 1, note: '', userId: f.type === 'deduct' ? f.userId : '' }));
      await load();
    } catch (e2) {
      setError(e2.message);
    }
  };

  return (
    <section>
      <h2>Transactions</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <form className="panel form-grid" onSubmit={submit}>
        <h3>Add / Deduct Stock</h3>
        <label>Book
          <select name="bookId" value={form.bookId} onChange={(e) => setForm({ ...form, bookId: e.target.value })} required>
            <option value="">Select a book</option>
            {books.map((b) => <option key={b.id} value={b.id}>{b.title} (available: {b.quantity})</option>)}
          </select>
        </label>
        <label>Type
          <select name="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="add">Add stock (arrival/return)</option>
            <option value="deduct">Deduct stock (borrowed)</option>
          </select>
        </label>
        <label>Member {form.type === 'deduct' ? '(required for borrowing)' : '(optional)'}
          <select name="userId" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
            <option value="">Select a member</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.membershipId})</option>)}
          </select>
        </label>
        <label>Quantity
          <input type="number" min="1" step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
        </label>
        <label>Note
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional note" />
        </label>
        <div className="actions"><button className="btn" type="submit">Record Transaction</button></div>
      </form>

      <h3>Transaction History</h3>
      {loading ? <p>Loading...</p> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Book</th><th>Member</th><th>Type</th><th>Quantity</th><th>Note</th></tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.created_at).toLocaleString()}</td>
                  <td>{t.book_title || t.book_id}</td>
                  <td>{t.member_name ? `${t.member_name} (${t.member_membership_id || ''})` : '-'}</td>
                  <td>{t.type}</td>
                  <td>{t.quantity}</td>
                  <td>{t.note || '-'}</td>
                </tr>
              ))}
              {transactions.length === 0 && <tr><td colSpan="6">No transactions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
