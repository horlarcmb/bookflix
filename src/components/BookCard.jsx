import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHeart, FiPlay, FiPlus } from 'react-icons/fi';
import { FaCrown } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

export default function BookCard({ book, showInfo = true }) {
  const navigate = useNavigate();
  const { user, toggleSaveBook } = useAuth();

  const isSaved = (user?.readingList && book?.id) ? user.readingList.includes(book.id) : false;

  const isNew = () => {
    if (!book || !book.dateAdded) return false;
    const added = new Date(book.dateAdded);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 2);
    return added > monthAgo;
  };

  const handleSaveToggle = (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    toggleSaveBook(book.id);
  };

  const handleReadClick = (e) => {
    e.stopPropagation();
    navigate(`/read/${book.id}`);
  };

  const handleCardClick = () => {
    navigate(`/book/${book.id}`);
  };

  return (
    <motion.div
      className="book-card"
      whileHover={{ scale: 1.08 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={handleCardClick}
    >
      <div className="book-card-cover">
        {book.cover ? (
          <img src={book.cover} alt={book.title} loading="lazy" />
        ) : (
          <div className="book-card-gradient-cover" style={{ background: book.gradient }}>
            <span className="cover-title">{book.title}</span>
            <span className="cover-author">{book.author}</span>
          </div>
        )}

        <div className="book-card-badges">
          {isNew() && <span className="badge badge-new">NEW</span>}
          {book.isAIGenerated && <span className="badge badge-ai" style={{ background: 'rgba(0, 210, 255, 0.8)', border: '1px solid #00f2fe' }}>🤖 AI</span>}
        </div>

        <button
          className={`book-card-bookmark ${isSaved ? 'saved' : ''}`}
          onClick={handleSaveToggle}
        >
          {isSaved ? <FiHeart fill="currentColor" /> : <FiHeart />}
        </button>

        <div className="book-card-overlay">
          <span className="overlay-title">{book.title}</span>
          <span className="overlay-author">{book.author}</span>
          <div className="overlay-meta">
            <span className="overlay-rating">★ {book.rating}</span>
            <span>{book.type}</span>
            <span>{book.chapters} ch</span>
          </div>
          <div className="overlay-actions">
            <button className="overlay-btn primary" onClick={handleReadClick}><FiPlay style={{ fontSize: '0.7rem' }} /> Read</button>
            <button className="overlay-btn secondary" onClick={handleSaveToggle}>
              {isSaved ? 'Remove' : <><FiPlus style={{ fontSize: '0.7rem' }} /> List</>}
            </button>
          </div>
        </div>
      </div>

      {showInfo && (
        <div className="book-card-info">
          <div className="book-card-title">{book.title}</div>
          <div className="book-card-author">{book.author}</div>
        </div>
      )}
    </motion.div>
  );
}
