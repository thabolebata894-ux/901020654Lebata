import { useEffect, useState } from 'react';
import { api } from '../api';
import BookCover from '../components/BookCover';

const emptyForm = { title: '', author: '', genre: '', isbn: '', quantity: 0 };

export default function Books() {
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState({ error: '', success: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setBooks(await api.getBooks());
    } catch (e) {
      setMsg((m) => ({ ...m, error: e.message }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setError = (error) => setMsg({ error, success: '' });
  const setSuccess = (success) => setMsg({ error: '', success });

  const submit = async (e) => {
    e.preventDefault();
    const qty = Number(form.quantity);
    if (![form.title, form.author, form.genre, form.isbn].every((v) => String(v).trim())) return setError('Please fill in title, author, genre, and ISBN.');
    if (!Number.isInteger(qty) || qty < 0) return setError('Quantity must be a whole number 0 or greater.');
    try {
      const payload = { ...form, title: form.title.trim(), author: form.author.trim(), genre: form.genre.trim(), isbn: form.isbn.trim(), quantity: qty };
      if (editingId) { await api.updateBook(editingId, payload); setSuccess('Book updated successfully.'); }
      else { await api.addBook(payload); setSuccess('Book added successfully.'); }
      setForm(emptyForm); setEditingId(null); await load();
    } catch (e2) { setError(e2.message); }
  };

  const edit = (book) => { setEditingId(book.id); setForm({ title: book.title, author: book.author, genre: book.genre, isbn: book.isbn, quantity: book.quantity }); setMsg({ error: '', success: '' }); };
  const remove = async (id) => {
    if (!confirm('Delete this book?')) return;
    try { await api.deleteBook(id); setSuccess('Book deleted.'); await load(); } catch (e) { setError(e.message); }
  };

  return (
    <section className="page">
      <h2>Book Management</h2>
      <p>Add, update, or remove books from the library collection.</p>
      {msg.error && <p className="error">{msg.error}</p>}
      {msg.success && <p className="success">{msg.success}</p>}
      <form className="panel form-grid" onSubmit={submit}>
        <h3>{editingId ? 'Update Book' : 'Add New Book'}</h3>
        {['title', 'author', 'genre', 'isbn'].map((name) => (
          <label key={name}>{name[0].toUpperCase() + name.slice(1)}<input name={name} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} required /></label>
        ))}
        <label>{editingId ? 'Quantity' : 'Initial Quantity'}<input type="number" min="0" step="1" name="quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required /></label>
        <div className="actions">
          <button className="btn" type="submit">{editingId ? 'Save Changes' : 'Add Book'}</button>
          {editingId && <button type="button" className="btn secondary" onClick={() => { setEditingId(null); setForm(emptyForm); setMsg({ error: '', success: '' }); }}>Cancel</button>}
        </div>
      </form>

      <h3>Books</h3>
      {loading ? <p className="loading">Loading...</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cover</th><th>Title</th><th>Author</th><th>Genre</th><th>ISBN</th><th>Qty</th><th>Actions</th></tr></thead>
            <tbody>
              {books.length === 0 ? <tr><td colSpan="7">No books found.</td></tr> : books.map((b) => (
                <tr key={b.id}>
                  <td><BookCover isbn={b.isbn} title={b.title} size="S" /></td>
                  <td>{b.title}</td><td>{b.author}</td><td>{b.genre}</td><td>{b.isbn}</td><td>{b.quantity}</td>
                  <td className="actions-cell"><div className="actions"><button className="btn small" onClick={() => edit(b)}>Update</button><button className="btn small danger" onClick={() => remove(b.id)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
