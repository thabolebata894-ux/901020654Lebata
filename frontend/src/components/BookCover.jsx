import { useState } from 'react';

export default function BookCover({ isbn, title, size = 'M' }) {
  const [failed, setFailed] = useState(false);
  const cleanIsbn = String(isbn || '').replace(/[^0-9Xx]/g, '');
  const src = cleanIsbn ? `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-${size}.jpg?default=false` : '';
  const small = size === 'S';

  if (!src || failed) {
    return (
      <div className={`book-cover placeholder ${small ? 'small' : ''}`} aria-label="No cover available">
        <span>{(title || 'B').slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <img
      className={`book-cover ${small ? 'small' : ''}`}
      src={src}
      alt={`${title || 'Book'} cover`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
