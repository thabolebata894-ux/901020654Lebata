CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  membership_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  password TEXT NOT NULL DEFAULT 'password123'
);

CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT NOT NULL,
  isbn TEXT NOT NULL UNIQUE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('add', 'deduct', 'borrow', 'return')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO users (name, membership_id, role, password)
VALUES ('Admin User', 'ADMIN001', 'admin', 'admin123')
ON CONFLICT (membership_id) DO NOTHING;
