import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBook, FiClock, FiEdit, FiCheck } from 'react-icons/fi';
import { FaFire } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useBook } from '../context/BookContext';
import { GENRES } from '../data/books';
import BookCard from '../components/BookCard';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { getBookById } = useBook();
  
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [genres, setGenres] = useState(user?.favoriteGenres || []);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSaveProfile = () => {
    updateProfile({ name, favoriteGenres: genres });
    setEditing(false);
  };

  const toggleGenre = (genre) => {
    setGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  // Resolve recently read books from Auth state
  const getRecentlyRead = () => {
    const history = Object.entries(user.readHistory || {});
    // Sort by updatedAt descending
    history.sort((a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt));
    
    return history.map(([bookId, progressInfo]) => {
      const bookObj = getBookById(bookId);
      if (!bookObj) return null;
      return {
        ...bookObj,
        progressPercent: progressInfo.progress,
        currentChapter: progressInfo.chapter
      };
    }).filter(Boolean);
  };

  const recentlyRead = getRecentlyRead();

  return (
    <div className="page-content">
      <div className="container" style={{ paddingTop: 'var(--space-xl)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          
          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-avatar">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    style={{ maxWidth: '300px', padding: '6px 12px' }} 
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveProfile}><FiCheck /> Save</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>{user.name}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                </>
              )}
              
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                <span className="badge badge-type">Standard Plan</span>
                <span className="badge badge-type">Joined {user.joinedDate}</span>
              </div>
            </div>
            {!editing && (
              <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" onClick={() => setEditing(true)}>
                  <FiEdit /> Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* Edit Genres if editing */}
          {editing && (
            <div style={{ margin: '20px 0', background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: '10px' }}>Favorite Genres (Select at least 3)</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {GENRES.map(g => (
                  <button 
                    key={g} 
                    className={`filter-chip ${genres.includes(g) ? 'active' : ''}`}
                    onClick={() => toggleGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Profile Stats */}
          <div className="profile-stats">
            {[
              { value: recentlyRead.length.toString(), label: 'Books Active', icon: <FiBook /> },
              { value: (recentlyRead.length * 4.2).toFixed(1) + ' hrs', label: 'Est. Read Time', icon: <FiClock /> },
              { value: '14', label: 'Day Streak', icon: <FaFire /> },
            ].map((stat, i) => (
              <motion.div key={i} className="profile-stat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="profile-stat-value">{stat.value}</div>
                <div className="profile-stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Reading History */}
          <h3 style={{ marginBottom: 'var(--space-md)' }}>Recently Read</h3>
          {recentlyRead.length === 0 ? (
            <div style={{ padding: '40px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>You haven't read any books yet.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/browse')} style={{ marginTop: '12px' }}>Start Reading</button>
            </div>
          ) : (
            <div className="library-grid" style={{ marginBottom: 'var(--space-2xl)' }}>
              {recentlyRead.map(book => (
                <div key={book.id} style={{ position: 'relative' }}>
                  <BookCard book={book} />
                  <div style={{
                    position: 'absolute', bottom: '52px', left: 0, right: 0, height: '4px',
                    background: 'var(--bg-tertiary)', borderRadius: '2px', margin: '0 4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%', background: 'var(--accent)', borderRadius: '2px',
                      width: `${book.progressPercent}%`
                    }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '4px' }}>
                    Ch. {book.currentChapter} ({book.progressPercent}%)
                  </div>
                </div>
              ))}
            </div>
          )}


        </motion.div>
      </div>
    </div>
  );
}
