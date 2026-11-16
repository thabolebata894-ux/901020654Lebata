const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

async function columnExists(table, column) {
  const r = await db.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return r.rows.length > 0;
}

async function constraintExists(name) {
  const r = await db.query(`SELECT 1 FROM pg_constraint WHERE conname = $1`, [name]);
  return r.rows.length > 0;
}

async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await db.query(schema);

  // Migrations for existing databases
  if (!(await columnExists('transactions', 'user_id'))) {
    await db.query(`ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  }
  if (!(await constraintExists('books_isbn_unique'))) {
    // avoid failing if duplicates exist; try to add if possible
    try {
      await db.query(`ALTER TABLE books ADD CONSTRAINT books_isbn_unique UNIQUE (isbn)`);
    } catch (e) {
      console.warn('Could not add unique ISBN constraint:', e.message);
    }
  }

  // Hash any legacy plain-text passwords
  const users = await db.query('SELECT id, password FROM users');
  for (const u of users.rows) {
    if (u.password && !String(u.password).startsWith('$2')) {
      const hashed = await bcrypt.hash(String(u.password), 10);
      await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, u.id]);
    }
  }
}

function sanitizeUser(u) {
  return { id: u.id, name: u.name, membershipId: u.membership_id, role: u.role };
}

function parsePositiveInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`${field} must be a whole number`);
  return n;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Auth
app.post('/api/login', async (req, res) => {
  try {
    const { membershipId, password } = req.body || {};
    if (!membershipId || !password) {
      return res.status(400).json({ error: 'Membership ID and password are required' });
    }
    const result = await db.query('SELECT * FROM users WHERE membership_id = $1', [String(membershipId).trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid membership ID or password' });
    }
    const user = result.rows[0];
    const stored = String(user.password || '');
    let ok = false;
    if (stored.startsWith('$2')) {
      ok = await bcrypt.compare(String(password), stored);
    } else {
      ok = stored === String(password);
      if (ok) {
        const hashed = await bcrypt.hash(String(password), 10);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, user.id]);
      }
    }
    if (!ok) return res.status(401).json({ error: 'Invalid membership ID or password' });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Books CRUD
app.get('/api/books', async (_req, res) => {
  try {
    const result = await db.query('SELECT * FROM books ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.post('/api/books', async (req, res) => {
  try {
    const { title, author, genre, isbn, quantity } = req.body || {};
    if (!title || !author || !genre || !isbn) {
      return res.status(400).json({ error: 'Title, author, genre, and ISBN are required' });
    }
    const qty = quantity === '' || quantity == null ? 0 : Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      return res.status(400).json({ error: 'Initial quantity must be a whole number 0 or greater' });
    }
    const result = await db.query(
      'INSERT INTO books (title, author, genre, isbn, quantity) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [String(title).trim(), String(author).trim(), String(genre).trim(), String(isbn).trim(), qty]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'A book with this ISBN already exists' });
    res.status(500).json({ error: 'Failed to add book' });
  }
});

app.put('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, genre, isbn, quantity } = req.body || {};
    let qty = null;
    if (quantity !== undefined && quantity !== null && quantity !== '') {
      qty = Number(quantity);
      if (!Number.isInteger(qty) || qty < 0) {
        return res.status(400).json({ error: 'Quantity must be a whole number 0 or greater' });
      }
    }
    const result = await db.query(
      `UPDATE books SET
        title = COALESCE($1, title),
        author = COALESCE($2, author),
        genre = COALESCE($3, genre),
        isbn = COALESCE($4, isbn),
        quantity = COALESCE($5, quantity)
       WHERE id = $6 RETURNING *`,
      [
        title != null ? String(title).trim() : null,
        author != null ? String(author).trim() : null,
        genre != null ? String(genre).trim() : null,
        isbn != null ? String(isbn).trim() : null,
        qty,
        id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'A book with this ISBN already exists' });
    res.status(500).json({ error: 'Failed to update book' });
  }
});

app.delete('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM books WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Transactions
app.get('/api/transactions', async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*, b.title AS book_title,
              u.name AS member_name, u.membership_id AS member_membership_id
       FROM transactions t
       JOIN books b ON b.id = t.book_id
       LEFT JOIN users u ON u.id = t.user_id
       ORDER BY t.created_at DESC, t.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { bookId, userId, type, quantity, note } = req.body || {};
    const qty = Number(quantity);
    if (!bookId || !type || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Book, type, and a positive whole-number quantity are required' });
    }
    const normalizedType = type === 'borrow' ? 'deduct' : type === 'return' ? 'add' : type;
    if (!['add', 'deduct'].includes(normalizedType)) {
      return res.status(400).json({ error: 'Type must be add, deduct, borrow, or return' });
    }
    const txUserId = normalizedType === 'deduct' ? (userId ? Number(userId) : null) : (userId ? Number(userId) : null);

    await client.query('BEGIN');
    if (txUserId) {
      const u = await client.query('SELECT id FROM users WHERE id = $1', [txUserId]);
      if (u.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Selected member was not found' });
      }
    }
    const bookRes = await client.query('SELECT * FROM books WHERE id = $1 FOR UPDATE', [Number(bookId)]);
    if (bookRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Book not found' });
    }
    const book = bookRes.rows[0];
    let newQty = book.quantity;
    if (normalizedType === 'add') newQty += qty;
    if (normalizedType === 'deduct') {
      if (book.quantity < qty) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Not enough stock to deduct (available: ${book.quantity})` });
      }
      newQty -= qty;
    }
    await client.query('UPDATE books SET quantity = $1 WHERE id = $2', [newQty, book.id]);
    const txRes = await client.query(
      'INSERT INTO transactions (book_id, user_id, type, quantity, note) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [book.id, txUserId, type, qty, note ? String(note).trim() : null]
    );
    await client.query('COMMIT');
    res.status(201).json({ transaction: txRes.rows[0], book: { ...book, quantity: newQty } });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(err);
    res.status(500).json({ error: 'Failed to record transaction' });
  } finally {
    client.release();
  }
});

// Users CRUD
app.get('/api/users', async (_req, res) => {
  try {
    const result = await db.query('SELECT id, name, membership_id, role FROM users ORDER BY id DESC');
    res.json(result.rows.map(sanitizeUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, membershipId, role, password } = req.body || {};
    if (!name || !membershipId) {
      return res.status(400).json({ error: 'Name and Membership ID are required' });
    }
    const pw = String(password || 'password123');
    if (pw.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
    const hashed = await bcrypt.hash(pw, 10);
    const result = await db.query(
      'INSERT INTO users (name, membership_id, role, password) VALUES ($1,$2,$3,$4) RETURNING id, name, membership_id, role',
      [String(name).trim(), String(membershipId).trim(), role || 'member', hashed]
    );
    res.status(201).json(sanitizeUser(result.rows[0]));
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'Membership ID already exists' });
    res.status(500).json({ error: 'Failed to add user' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, membershipId, role, password } = req.body || {};
    let hashed = null;
    if (password !== undefined && password !== null && String(password) !== '') {
      if (String(password).length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
      hashed = await bcrypt.hash(String(password), 10);
    }
    const result = await db.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        membership_id = COALESCE($2, membership_id),
        role = COALESCE($3, role),
        password = COALESCE($4, password)
       WHERE id = $5 RETURNING id, name, membership_id, role`,
      [
        name != null ? String(name).trim() : null,
        membershipId != null ? String(membershipId).trim() : null,
        role != null ? String(role).trim() : null,
        hashed,
        id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(sanitizeUser(result.rows[0]));
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ error: 'Membership ID already exists' });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

const PORT = process.env.PORT || 5000;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize database', err);
    process.exit(1);
  });
