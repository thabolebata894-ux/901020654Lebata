import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import BookCover from '../components/BookCover';

const LIBRARY_IMAGE = 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80';

export default function Dashboard() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getBooks().then(setBooks).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    total: books.length,
    copies: books.reduce((s, b) => s + (Number(b.quantity) || 0), 0),
    low: books.filter((b) => b.quantity < 2).length,
  }), [books]);

  if (loading) return <p className="loading">Loading books...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section className="page">
      <div className="library-banner">
        <img src={LIBRARY_IMAGE} alt="Library interior with bookshelves" />
        <div className="library-banner-overlay">
          <div>
            <h2>Welcome to the Library</h2>
            <p>Explore the collection, track availability, and manage borrowing in one place.</p>
          </div>
          <div className="hero-stats">
            <div className="stat"><span className="stat-value">{stats.total}</span><span className="stat-label">Titles</span></div>
            <div className="stat"><span className="stat-value">{stats.copies}</span><span className="stat-label">Copies</span></div>
            <div className="stat warn"><span className="stat-value">{stats.low}</span><span className="stat-label">Low stock</span></div>
          </div>
        </div>
      </div>

      <h3>Book Availability</h3>
      <p>Books with fewer than 2 copies are highlighted as low stock.</p>
      <div className="grid cards">
        {books.length === 0 ? <p>No books available yet.</p> : books.map((book, i) => (
          <div key={book.id} className={`card book-card ${book.quantity < 2 ? 'low-stock' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
            <div className="book-card-top">
              <BookCover isbn={book.isbn} title={book.title} />
              <div className="book-card-meta">
                <h3>{book.title}</h3>
                <p><strong>Author:</strong> {book.author}</p>
                <p><strong>Genre:</strong> {book.genre}</p>
                <p><strong>ISBN:</strong> {book.isbn}</p>
                <p><strong>Quantity:</strong> {book.quantity}</p>
                {book.quantity < 2 && <span className="badge">Low stock</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <h3>Availability Table</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Cover</th><th>Title</th><th>Author</th><th>Genre</th><th>ISBN</th><th>Qty</th><th>Status</th></tr></thead>
          <tbody>
            {books.length === 0 ? <tr><td colSpan="7">No data</td></tr> : books.map((book) => (
              <tr key={book.id} className={book.quantity < 2 ? 'low-stock-row' : ''}>
                <td><BookCover isbn={book.isbn} title={book.title} size="S" /></td>
                <td>{book.title}</td><td>{book.author}</td><td>{book.genre}</td><td>{book.isbn}</td>
                <td>{book.quantity}</td>
                <td><span className={`status-pill ${book.quantity < 2 ? 'low' : 'ok'}`}>{book.quantity < 2 ? 'Low stock' : 'OK'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
