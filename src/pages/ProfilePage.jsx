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
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('bugs');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState(null);

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setSubmittingFeedback(true);
    setFeedbackResult(null);

    // Map UI category keys to database names
    const categoryMapping = {
      'bugs': 'Bugs',
      'feature requests': 'Feature Requests',
      'UI issues': 'UI Issues',
      'performance issues': 'Performance Issues',
      'positive feedback': 'Positive Feedback'
    };

    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          text: feedbackText,
          category: categoryMapping[feedbackCategory] || 'General',
          rating: feedbackRating > 0 ? feedbackRating : null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit feedback');
      }

      setFeedbackResult({
        category: data.feedback.category,
        sentiment: data.feedback.sentiment,
        priority: data.feedback.priority,
        summary: data.analysis?.actionable_summary
      });
      setFeedbackText('');
      setFeedbackRating(0);
      setFeedbackCategory('bugs');
    } catch (err) {
      console.error(err);
      alert('Error submitting feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const formatReadTime = (seconds) => {
    if (!seconds) return '0 hrs';
    const hrs = seconds / 3600;
    if (hrs < 0.1) {
      const mins = Math.round(seconds / 60);
      return `${mins} min${mins !== 1 ? 's' : ''}`;
    }
    return `${hrs.toFixed(1)} hrs`;
  };

  // Profile Stats
  const stats = [
    { value: recentlyRead.length.toString(), label: 'Books Active', icon: <FiBook /> },
    { value: formatReadTime(user.totalReadTime), label: 'Read Time', icon: <FiClock /> },
    { value: (user.currentStreak || 0).toString(), label: 'Day Streak', icon: <FaFire /> },
  ];

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
            {stats.map((stat, i) => (
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

          {/* Feedback Form */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            marginTop: 'var(--space-2xl)',
            marginBottom: 'var(--space-xl)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: '1.2rem', fontWeight: 600 }}>Help Us Improve BookFlix</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
              Got a suggestion, encountered a bug, or have ideas for new features? Submissions are analyzed in real-time by our Feedback Agent.
            </p>
            <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Describe your issue or suggestion in detail..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  resize: 'vertical'
                }}
                required
              />

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Feedback Category</label>
                  <select
                    value={feedbackCategory}
                    onChange={e => setFeedbackCategory(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit'
                    }}
                  >
                    <option value="bugs">Bug Report</option>
                    <option value="feature requests">Feature Request</option>
                    <option value="UI issues">UI/UX Issue</option>
                    <option value="performance issues">Performance Issue</option>
                    <option value="positive feedback">Positive Feedback</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Optional Rating</label>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '38px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        style={{
                          cursor: 'pointer',
                          fontSize: '1.4rem',
                          color: star <= feedbackRating ? '#FFD700' : 'var(--text-muted)',
                          transition: 'color 0.2s'
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingFeedback}
                style={{ alignSelf: 'flex-start', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {submittingFeedback ? 'Submitting & Analyzing...' : 'Submit Feedback'}
              </button>
            </form>

            {feedbackResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px dashed var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                  <span>🏷️ Category: <strong>{feedbackResult.category}</strong></span>
                  <span>🎭 Sentiment: <strong>{feedbackResult.sentiment}</strong></span>
                  <span>⚡ Priority: <strong style={{ color: feedbackResult.priority === 'critical' ? 'var(--error)' : feedbackResult.priority === 'high' ? 'var(--warning)' : 'inherit' }}>{feedbackResult.priority?.toUpperCase()}</strong></span>
                </div>
                {feedbackResult.summary && (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    🤖 <em>AI Actionable Summary:</em> {feedbackResult.summary}
                  </p>
                )}
              </motion.div>
            )}
          </div>

        </motion.div>
      </div>
    </div>
  );
}
