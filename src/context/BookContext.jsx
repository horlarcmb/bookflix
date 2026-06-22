/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { catalogContainer } from '../data/recommendations';

const BookContext = createContext(null);

export function BookProvider({ children }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  // Keep recommendations engine in sync with dynamic catalog
  useEffect(() => {
    catalogContainer.books = catalog;
  }, [catalog]);

  // Helper helper to get headers with JWT token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('bookflix_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // Load backend catalog on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/books');
        if (res.ok) {
          const booksList = await res.json();
          setCatalog(booksList);
        } else {
          console.error('Failed to load books catalog from server');
        }
      } catch (e) {
        console.error('Failed to load books catalog from server api', e);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const uploadBook = async (metadata, content) => {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ metadata, content })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to save content on server.');
    }
    
    // Add to catalog state
    setCatalog(prev => {
      const filtered = prev.filter(b => b.id !== metadata.id);
      return [...filtered, data];
    });
    
    return data;
  };

  const updateBook = async (id, metadata, content) => {
    const numericId = parseInt(id);
    const res = await fetch(`/api/books/${numericId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ metadata, content })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update content on server.');
    }
    
    // Update in catalog state
    setCatalog(prev => {
      const filtered = prev.filter(b => b.id !== numericId);
      return [...filtered, data];
    });
    
    return data;
  };

  const deleteBook = async (id) => {
    const numericId = parseInt(id);
    const res = await fetch(`/api/books/${numericId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to delete content on server.');
    }
    
    // Remove from catalog state
    setCatalog(prev => prev.filter(b => b.id !== numericId));
  };

  const getBookById = (id) => {
    const numericId = parseInt(id);
    return catalog.find(b => b.id === numericId);
  };

  const searchBooks = (query) => {
    if (!query) return catalog;
    const q = query.toLowerCase();
    return catalog.filter(b =>
      b && (
        (b.title && typeof b.title === 'string' && b.title.toLowerCase().includes(q)) ||
        (b.author && typeof b.author === 'string' && b.author.toLowerCase().includes(q)) ||
        (b.genre && Array.isArray(b.genre) && b.genre.some(g => g && typeof g === 'string' && g.toLowerCase().includes(q))) ||
        (b.tags && Array.isArray(b.tags) && b.tags.some(t => t && typeof t === 'string' && t.toLowerCase().includes(q))) ||
        (b.type && typeof b.type === 'string' && b.type.toLowerCase().includes(q))
      )
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
    const res = await fetch(`/api/books/${numericId}/content`, {
      headers: getAuthHeaders()
    });
    
    if (res.status === 404) return null;
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch content from server.');
    }
    
    return data;
  };

  const value = {
    catalog,
    loading,
    uploadBook,
    updateBook,
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
