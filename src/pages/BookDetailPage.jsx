import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiStar, FiEye, FiBook, FiHeart, FiPlay, FiCheck, FiUsers } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import ContentRow from '../components/ContentRow';
import { useBook } from '../context/BookContext';
import { 
  getContentBasedRecommendations, 
  getCollaborativeRecommendations, 
  classifyBook, 
  getWhyYoullLove 
} from '../data/recommendations';
import { useEffect } from 'react';

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getBookById, fetchBookContent } = useBook();
  const book = getBookById(id);
  const { user, toggleSaveBook, setBookRating } = useAuth();
  
  const [ratingHover, setRatingHover] = useState(null);
  const [customContent, setCustomContent] = useState(null);
  const [, setLoadingContent] = useState(false);

  useEffect(() => {
    async function loadContent() {
      if (!book) return;
      setLoadingContent(true);
      try {
        const content = await fetchBookContent(book.id);
        if (content) {
          setCustomContent(content);
        } else {
          setCustomContent(null);
        }
      } catch (e) {
        console.error('Failed to load custom contents', e);
      } finally {
        setLoadingContent(false);
      }
    }
    loadContent();
  }, [book, id]);

  if (!book) {
    return (
      <div className="page-content">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <h3>Book not found</h3>
            <p>The book you're looking for doesn't exist</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Go Home</button>
          </div>
        </div>
      </div>
    );
  }

  const isSaved = user?.readingList?.includes(book.id) || false;
  const userRating = user?.ratings?.[book.id] || 0;

  const handleSaveToggle = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    toggleSaveBook(book.id);
  };

  const handleRatingClick = (rating) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setBookRating(book.id, rating);
  };

  const similar = getContentBasedRecommendations(book.id, 10);
  const alsoLiked = getCollaborativeRecommendations(book.id, 10);
  const classification = classifyBook(book);
  const reasons = getWhyYoullLove(book);

  const formatReadCount = (count) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(0) + 'K';
    return count;
  };

  return (
    <div className="page-content book-detail">
      <div className="book-detail-hero">
        <div className="book-detail-bg" style={{
          backgroundImage: book.cover ? `url(${book.cover})` : undefined,
          background: !book.cover ? book.gradient : undefined,
        }} />
        <div className="book-detail-gradient" />
        <motion.div className="book-detail-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="book-detail-cover">
            {book.cover ? (
              <img src={book.cover} alt={book.title} />
            ) : (
              <div className="book-card-gradient-cover" style={{ background: book.gradient, aspectRatio: '2/3' }}>
                <span className="cover-title" style={{ fontSize: '1.4rem' }}>{book.title}</span>
                <span className="cover-author">{book.author}</span>
              </div>
            )}
          </div>
          <div className="book-detail-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1>{book.title}</h1>
              {book.isAIGenerated && (
                <span className="badge badge-ai" style={{ background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)', padding: '6px 12px', border: '1px solid #4facfe' }}>
                  🤖 AI Generated
                </span>
              )}
            </div>
            <p className="author">by {book.author}</p>
            <div className="book-detail-meta">
              <span className="book-detail-meta-item">
                <FiStar color="var(--gold)" /> <span className="rating-value">{book.rating}</span>
              </span>
              <span className="book-detail-meta-item">
                <FiEye /> <span className="value">{formatReadCount(book.readCount)} reads</span>
              </span>
              <span className="book-detail-meta-item">
                <FiBook /> <span className="value">{book.chapters} chapters</span>
              </span>
              <span className="book-detail-meta-item">
                <span className="value">{book.type}</span>
              </span>
              <span className="book-detail-meta-item">
                <span className={`badge ${book.status === 'Completed' ? 'badge-new' : 'badge-type'}`}>{book.status}</span>
              </span>
            </div>
            <div className="book-detail-tags">
              {book.genre.map(g => <span key={g} className="tag">{g}</span>)}
              {book.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginTop: '16px' }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate(`/read/${book.id}`)}>
                <FiPlay /> Read Now
              </button>
              <button className={`btn ${isSaved ? 'btn-primary' : 'btn-secondary'} btn-lg`} onClick={handleSaveToggle}>
                <FiHeart fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Saved in Library' : 'Add to Library'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="book-detail-body">
        
        {/* AI Disclaimer Box */}
        {book.isAIGenerated && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            marginBottom: 'var(--space-xl)',
            color: 'var(--text-secondary)'
          }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00d2fe', marginBottom: '8px' }}>
              <span>🤖</span> AI Author Disclosure & Warning
            </h4>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
              This work is entirely generated by AI algorithm models. Character names, settings, events, and plots are outputs of digital systems. Read with awareness of its non-human origin and experimental storytelling techniques.
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-2xl)', marginBottom: 'var(--space-2xl)' }}>
          <div>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Synopsis</h3>
            <p className="book-detail-synopsis">{book.synopsis}</p>

            {/* User Rating Controls */}
            <div style={{ 
              margin: '30px 0', 
              padding: '20px', 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius-lg)' 
            }}>
              <h4 style={{ marginBottom: '10px' }}>Your Rating</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span 
                    key={star}
                    style={{ cursor: 'pointer', fontSize: '1.6rem' }}
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setRatingHover(star)}
                    onMouseLeave={() => setRatingHover(null)}
                  >
                    <FiStar 
                      fill={star <= (ratingHover || userRating) ? 'var(--gold)' : 'none'} 
                      color={star <= (ratingHover || userRating) ? 'var(--gold)' : 'var(--text-muted)'} 
                    />
                  </span>
                ))}
                <span style={{ marginLeft: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {userRating > 0 ? `You rated this ${userRating} / 5 stars` : 'Tap to rate'}
                </span>
              </div>
            </div>

            {/* Chapter List */}
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Chapters</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {customContent ? (
                customContent.chapters ? (
                  // Custom Text Novel Chapters
                  customContent.chapters.map((ch, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        border: '1px solid var(--border)'
                      }}
                      onClick={() => navigate(`/read/${book.id}?ch=${idx + 1}`)}
                    >
                      <span>{ch.title || `Chapter ${idx + 1}`}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Read Now →</span>
                    </motion.div>
                  ))
                ) : (
                  // Custom Manga / Manhwa Chapters
                  Array.from({ length: book.chapters || 1 }, (_, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        border: '1px solid var(--border)'
                      }}
                      onClick={() => navigate(`/read/${book.id}?ch=${i + 1}`)}
                    >
                      <span>Chapter {i + 1}: Story Panel</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Read Now →</span>
                    </motion.div>
                  ))
                )
              ) : (
                // Fallback / Default Books
                Array.from({ length: Math.min(book.chapters, 10) }, (_, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      border: '1px solid var(--border)'
                    }}
                    onClick={() => navigate(`/read/${book.id}`)}
                  >
                    <span>Chapter {i + 1}: {i === 0 ? 'The Beginning' : `Part ${i + 1}`}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Read Now →</span>
                  </motion.div>
                ))
              )}
              {book.chapters > 10 && (
                <p style={{ color: 'var(--text-muted)', padding: '12px', textAlign: 'center' }}>
                  + {book.chapters - 10} more chapters
                </p>
              )}
            </div>
          </div>

          {/* AI Insights Sidebar */}
          <div>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)'
            }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)', color: 'var(--accent)' }}>
                <FiStar /> Why You'll Love This
              </h4>
              {reasons.map((reason, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <FiCheck color="var(--success)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{reason}</span>
                </div>
              ))}
            </div>

            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)'
            }}>
              <h4 style={{ marginBottom: 'var(--space-md)' }}>AI Classification</h4>
              {Object.entries(classification).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Language</span>
                <span style={{ fontWeight: 600 }}>{book.language}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Pages</span>
                <span style={{ fontWeight: 600 }}>{book.pages}</span>
              </div>
            </div>
          </div>
        </div>

        <ContentRow title="Users Who Read This Also Liked" icon={<FiUsers />} books={alsoLiked} />
        <ContentRow title="Similar Books" icon={<FiBook />} books={similar} />
      </div>
    </div>
  );
}
