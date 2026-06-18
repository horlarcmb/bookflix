import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Helper function to hash passwords using SHA-256 via Web Crypto API
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load current user from localStorage on mount
    const storedUser = localStorage.getItem('bookflix_currentUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse current user', e);
        localStorage.removeItem('bookflix_currentUser');
      }
    }
    setLoading(false);
  }, []);

  const signup = async (name, email, password, favoriteGenres = []) => {
    const users = JSON.parse(localStorage.getItem('bookflix_users') || '[]');
    
    // Check if user already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(password);
    
    const newUser = {
      id: Date.now().toString(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      favoriteGenres,
      readingList: [],
      readHistory: {},
      ratings: {},
      joinedDate: new Date().toISOString().split('T')[0],
      theme: 'dark'
    };

    users.push(newUser);
    localStorage.setItem('bookflix_users', JSON.stringify(users));

    // Auto-login
    const { passwordHash: _, ...userSession } = newUser;
    localStorage.setItem('bookflix_currentUser', JSON.stringify(userSession));
    setUser(userSession);
    return userSession;
  };

  const login = async (email, password) => {
    const users = JSON.parse(localStorage.getItem('bookflix_users') || '[]');
    const userAccount = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!userAccount) {
      throw new Error('Invalid email or password.');
    }

    const inputHash = await hashPassword(password);
    if (userAccount.passwordHash !== inputHash) {
      throw new Error('Invalid email or password.');
    }

    const { passwordHash: _, ...userSession } = userAccount;
    localStorage.setItem('bookflix_currentUser', JSON.stringify(userSession));
    setUser(userSession);
    return userSession;
  };

  const logout = () => {
    localStorage.removeItem('bookflix_currentUser');
    setUser(null);
  };

  const updateProfile = (updates) => {
    if (!user) return;

    const users = JSON.parse(localStorage.getItem('bookflix_users') || '[]');
    const userIndex = users.findIndex(u => u.id === user.id);

    if (userIndex === -1) return;

    // Update in users database
    const updatedAccount = { ...users[userIndex], ...updates };
    // Prevent overriding sensitive internal flags directly if not needed, but allow valid keys
    users[userIndex] = updatedAccount;
    localStorage.setItem('bookflix_users', JSON.stringify(users));

    // Update session state (excluding passwordHash)
    const { passwordHash: _, ...userSession } = updatedAccount;
    localStorage.setItem('bookflix_currentUser', JSON.stringify(userSession));
    setUser(userSession);
  };

  const toggleSaveBook = (bookId) => {
    if (!user) return false;
    const numericId = parseInt(bookId);
    let updatedReadingList = [...(user.readingList || [])];
    
    const isSaved = updatedReadingList.includes(numericId);
    if (isSaved) {
      updatedReadingList = updatedReadingList.filter(id => id !== numericId);
    } else {
      updatedReadingList.push(numericId);
    }

    updateProfile({ readingList: updatedReadingList });
    return !isSaved;
  };

  const updateBookProgress = (bookId, chapter, progressVal) => {
    if (!user) return;
    const numericId = parseInt(bookId);
    const updatedHistory = { ...(user.readHistory || {}) };
    
    updatedHistory[numericId] = {
      chapter,
      progress: progressVal,
      updatedAt: new Date().toISOString()
    };

    updateProfile({ readHistory: updatedHistory });
  };

  const setBookRating = (bookId, rating) => {
    if (!user) return;
    const numericId = parseInt(bookId);
    const updatedRatings = { ...(user.ratings || {}) };
    updatedRatings[numericId] = rating;
    updateProfile({ ratings: updatedRatings });
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    toggleSaveBook,
    updateBookProgress,
    setBookRating
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
