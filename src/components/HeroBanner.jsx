import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlay, FiPlus } from 'react-icons/fi';
import { FaFire } from 'react-icons/fa';
import { getFeaturedBooks } from '../data/books';

export default function HeroBanner() {
  const [activeSlide, setActiveSlide] = useState(0);
  const navigate = useNavigate();
  const featured = getFeaturedBooks().slice(0, 5);

  useEffect(() => {
    if (featured.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % featured.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featured.length]);

  if (featured.length === 0) return null;

  const currentBook = featured[activeSlide];

  return (
    <div className="hero-banner">
      {featured.map((book, index) => (
        <div key={book.id} className={`hero-slide ${index === activeSlide ? 'active' : ''}`}>
          <div
            className="hero-bg"
            style={{
              backgroundImage: book.cover ? `url(${book.cover})` : undefined,
              background: !book.cover ? book.gradient : undefined,
            }}
          />
          <div className="hero-gradient" />
          <motion.div
            className="hero-content"
            key={activeSlide}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="hero-badge">
              <FaFire /> {book.type === 'Manga' || book.type === 'Manhwa' ? 'Top Manga' : 'Featured'}
            </span>
            <h1 className="hero-title">{book.title}</h1>
            <div className="hero-meta">
              <span className="rating">★ {book.rating}</span>
              <span className="dot" />
              <span>{book.genre.join(' • ')}</span>
              <span className="dot" />
              <span>{book.chapters} Chapters</span>
              <span className="dot" />
              <span>{book.status}</span>
            </div>
            <p className="hero-synopsis">{book.synopsis}</p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate(`/read/${book.id}`)}>
                <FiPlay /> Read Now
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => navigate(`/book/${book.id}`)}>
                <FiPlus /> More Info
              </button>
            </div>
          </motion.div>
        </div>
      ))}
      <div className="hero-dots">
        {featured.map((_, index) => (
          <button
            key={index}
            className={`hero-dot ${index === activeSlide ? 'active' : ''}`}
            onClick={() => setActiveSlide(index)}
          />
        ))}
      </div>
    </div>
  );
}
