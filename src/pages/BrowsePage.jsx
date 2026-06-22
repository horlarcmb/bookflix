import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiGrid, FiList } from 'react-icons/fi';
import { useBook } from '../context/BookContext';
import BookCard from '../components/BookCard';
import { GENRES, CONTENT_TYPES } from '../data/books';

export default function BrowsePage() {
  const location = useLocation();
  const { catalog: books, searchBooks } = useBook();

  // Helper to parse query parameters
  const getQueryParams = () => {
    return new URLSearchParams(location.search);
  };

  const params = getQueryParams();
  const initialGenre = params.get('genre') || '';
  const initialType = params.get('type') || '';
  const initialSort = params.get('sort') || 'popular';
  const initialQuery = params.get('q') || '';

  const [filteredBooks, setFilteredBooks] = useState(books);
  const [activeGenre, setActiveGenre] = useState(initialGenre);
  const [activeType, setActiveType] = useState(initialType);
  const [sortBy, setSortBy] = useState(initialSort);
  const [query, setQuery] = useState(initialQuery);
  const [viewMode, setViewMode] = useState('grid');

  // Keep state in sync with URL search params when they change
  useEffect(() => {
    const searchParams = getQueryParams();
    setActiveGenre(searchParams.get('genre') || '');
    setActiveType(searchParams.get('type') || '');
    setSortBy(searchParams.get('sort') || 'popular');
    setQuery(searchParams.get('q') || '');
  }, [location.search]);

  useEffect(() => {
    let result = Array.isArray(books) ? books.filter(Boolean) : [];

    if (query) {
      result = typeof searchBooks === 'function' ? searchBooks(query) : [];
      if (!Array.isArray(result)) result = [];
    }
    
    if (activeGenre) {
      if (activeGenre === 'AI-Generated') {
        result = result.filter(b => b && b.isAIGenerated);
      } else {
        result = result.filter(b => b && Array.isArray(b.genre) && b.genre.includes(activeGenre));
      }
    }
    
    if (activeType) {
      result = result.filter(b => b && b.type === activeType);
    }

    switch (sortBy) {
      case 'rating': 
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); 
        break;
      case 'newest': 
        result.sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)); 
        break;
      case 'trending': 
        result.sort((a, b) => (b.readCount || 0) - (a.readCount || 0)); 
        break;
      case 'az': 
        result.sort((a, b) => (a.title || '').localeCompare(b.title || '')); 
        break;
      default: 
        result.sort((a, b) => (b.readCount || 0) - (a.readCount || 0));
    }

    setFilteredBooks(result);
  }, [activeGenre, activeType, sortBy, query, books]);

  return (
    <div className="page-content">
      <div className="container" style={{ paddingTop: 'var(--space-xl)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 'var(--space-lg)' }}>
            {query ? `Search: "${query}"` : activeGenre ? activeGenre : 'Browse Library'}
          </h1>

          {/* Search Input */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <input
              type="text"
              placeholder="Search by title, author, genre..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 500 }}
            />
          </div>

          <div className="browse-layout">
            {/* Filters Sidebar */}
            <div className="browse-sidebar">
              <div className="filter-section">
                <div className="filter-title">Genre</div>
                <div className="filter-options">
                  <button className={`filter-chip ${!activeGenre ? 'active' : ''}`} onClick={() => setActiveGenre('')}>All</button>
                  {GENRES.map(g => (
                    <button 
                      key={g} 
                      className={`filter-chip ${activeGenre === g ? 'active' : ''}`} 
                      onClick={() => setActiveGenre(activeGenre === g ? '' : g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-title">Type</div>
                <div className="filter-options">
                  <button className={`filter-chip ${!activeType ? 'active' : ''}`} onClick={() => setActiveType('')}>All</button>
                  {CONTENT_TYPES.map(t => (
                    <button 
                      key={t} 
                      className={`filter-chip ${activeType === t ? 'active' : ''}`} 
                      onClick={() => setActiveType(activeType === t ? '' : t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-title">Sort By</div>
                <div className="filter-options">
                  {[
                    ['popular', 'Popular'], 
                    ['rating', 'Top Rated'], 
                    ['newest', 'Newest'], 
                    ['az', 'A-Z']
                  ].map(([val, label]) => (
                    <button 
                      key={val} 
                      className={`filter-chip ${sortBy === val ? 'active' : ''}`} 
                      onClick={() => setSortBy(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Grid/List */}
            <div className="browse-main">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                  {filteredBooks.length} results
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => setViewMode('grid')} 
                    style={{ color: viewMode === 'grid' ? 'var(--accent)' : undefined }}
                  >
                    <FiGrid />
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => setViewMode('list')} 
                    style={{ color: viewMode === 'list' ? 'var(--accent)' : undefined }}
                  >
                    <FiList />
                  </button>
                </div>
              </div>

              {filteredBooks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📚</div>
                  <h3>No books found</h3>
                  <p>Try adjusting your filters or search terms</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? "library-grid" : "library-list-view"} style={{ display: viewMode === 'list' ? 'flex' : undefined, flexDirection: viewMode === 'list' ? 'column' : undefined, gap: viewMode === 'list' ? '12px' : undefined }}>
                  {Array.isArray(filteredBooks) && filteredBooks.filter(Boolean).map(book => (
                    <BookCard key={book.id || Math.random()} book={book} showInfo={viewMode === 'grid'} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
