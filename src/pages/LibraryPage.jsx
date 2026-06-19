import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useBook } from '../context/BookContext';
import BookCard from '../components/BookCard';

export default function LibraryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getBookById } = useBook();
  const [activeTab, setActiveTab] = useState('all');

  if (!user) {
    navigate('/login');
    return null;
  }

  // Get books saved in the user's readingList
  const savedBooks = (user.readingList || []).map(id => getBookById(id)).filter(Boolean);

  const getTabBooks = () => {
    switch (activeTab) {
      case 'reading': 
        // Filter saved books that are present in reading history
        return savedBooks.filter(b => user.readHistory?.[b.id] !== undefined);
      case 'completed': 
        // Filter books with 100% reading progress
        return savedBooks.filter(b => user.readHistory?.[b.id]?.progress >= 100);
      case 'manga': 
        return savedBooks.filter(b => ['Manga', 'Manhwa', 'Webtoon'].includes(b.type));
      case 'novels': 
        return savedBooks.filter(b => ['Novel', 'Light Novel', 'Textbook', 'Research', 'School Book'].includes(b.type));
      default: 
        return savedBooks;
    }
  };

  const tabs = [
    { id: 'all', label: 'All Saved' },
    { id: 'reading', label: 'Currently Reading' },
    { id: 'completed', label: 'Completed' },
    { id: 'manga', label: 'Manga & Manhwa' },
    { id: 'novels', label: 'Novels & Textbooks' }
  ];

  const currentBooks = getTabBooks();

  return (
    <div className="page-content">
      <div className="container" style={{ paddingTop: 'var(--space-xl)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 'var(--space-lg)' }}>My Library</h1>

          <div className="library-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`library-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {currentBooks.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <div className="empty-state-icon">📚</div>
              <h3>No books in this shelf</h3>
              <p>Explore our library and bookmark books to add them here</p>
              <Link to="/browse" className="btn btn-primary" style={{ marginTop: 'var(--space-md)', display: 'inline-block' }}>Browse Books</Link>
            </div>
          ) : (
            <div className="library-grid">
              {currentBooks.map(book => (
                <div key={book.id} style={{ position: 'relative' }}>
                  <BookCard book={book} />
                  
                  {/* Show progress overlay on currently reading shelf */}
                  {user.readHistory?.[book.id] !== undefined && (
                    <div style={{
                      position: 'absolute', bottom: '52px', left: 0, right: 0, height: '4px',
                      background: 'var(--bg-tertiary)', borderRadius: '2px', margin: '0 4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%', background: 'var(--accent)', borderRadius: '2px',
                        width: `${user.readHistory[book.id].progress}%`
                      }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
