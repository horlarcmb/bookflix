import { createContext, useContext, useState, useEffect } from 'react';
import { books as defaultBooks } from '../data/books';
import { getAllCustomBooks, saveCustomBook, deleteCustomBook, getCustomBookContent } from '../services/db';
import { catalogContainer } from '../data/recommendations';

const BookContext = createContext(null);

export function BookProvider({ children }) {
  const [catalog, setCatalog] = useState(defaultBooks);
  const [loading, setLoading] = useState(true);

  // Keep recommendations engine in sync with dynamic catalog
  useEffect(() => {
    catalogContainer.books = catalog;
  }, [catalog]);

  // Load custom books on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        const customList = await getAllCustomBooks();
        setCatalog([...defaultBooks, ...customList]);
      } catch (e) {
        console.error('Failed to load custom books catalog', e);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const uploadBook = async (metadata, content) => {
    // Save to IndexedDB
    await saveCustomBook(metadata, content);
    
    // Add to catalog state
    setCatalog(prev => {
      // If book already exists, overwrite it, else append
      const filtered = prev.filter(b => b.id !== metadata.id);
      return [...filtered, metadata];
    });
  };

  const deleteBook = async (id) => {
    const numericId = parseInt(id);
    await deleteCustomBook(numericId);
    
    // Remove from catalog state
    setCatalog(prev => prev.filter(b => b.id !== numericId));
  };

  const getBookById = (id) => {
    const numericId = parseInt(id);
    return catalog.find(b => b.id === numericId);
  };

  const searchBooks = (query) => {
    const q = query.toLowerCase();
    return catalog.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.genre.some(g => g.toLowerCase().includes(q)) ||
      b.tags.some(t => t.toLowerCase().includes(q)) ||
      b.type.toLowerCase().includes(q)
    );
  };

  // Dynamic selector functions bound to the active database catalog state
  const getFeaturedBooks = () => catalog.filter(b => b.featured);
  
  const getTrendingBooks = () => 
    [...catalog].sort((a, b) => b.readCount - a.readCount).slice(0, 15);
    
  const getNewReleases = () => 
    [...catalog].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).slice(0, 15);
    
  const getTopManga = () => 
    catalog.filter(b => ['Manga', 'Manhwa', 'Webtoon'].includes(b.type)).sort((a, b) => b.readCount - a.readCount).slice(0, 15);
    
  const getTopRated = () => 
    [...catalog].sort((a, b) => b.rating - a.rating).slice(0, 15);
    
  const getPremiumBooks = () => catalog.filter(b => b.premium);
  
  const getAIGeneratedBooks = () => catalog.filter(b => b.isAIGenerated);
  
  const getTextbooks = () => catalog.filter(b => ['Textbook', 'School Book', 'Research'].includes(b.type));
  
  const getLightNovels = () => catalog.filter(b => b.type === 'Light Novel');
  
  const getBooksByGenre = (genre) => {
    if (genre === 'AI-Generated') {
      return catalog.filter(b => b.isAIGenerated);
    }
    return catalog.filter(b => b.genre.includes(genre));
  };

  const fetchBookContent = async (bookId) => {
    const numericId = parseInt(bookId);
    // If ID is within static defaultBooks range, return null (use default mocks)
    if (defaultBooks.some(b => b.id === numericId)) {
      return null;
    }
    return await getCustomBookContent(numericId);
  };

  const value = {
    catalog,
    loading,
    uploadBook,
    deleteBook,
    getBookById,
    searchBooks,
    getFeaturedBooks,
    getTrendingBooks,
    getNewReleases,
    getTopManga,
    getTopRated,
    getPremiumBooks,
    getAIGeneratedBooks,
    getTextbooks,
    getLightNovels,
    getBooksByGenre,
    fetchBookContent
  };

  return (
    <BookContext.Provider value={value}>
      {!loading && children}
    </BookContext.Provider>
  );
}

export function useBook() {
  const context = useContext(BookContext);
  if (!context) {
    throw new Error('useBook must be used within a BookProvider');
  }
  return context;
}
