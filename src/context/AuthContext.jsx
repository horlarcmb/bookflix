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
    
    // Seed default admin account if users list is empty
    async function seedAdmin() {
      const users = JSON.parse(localStorage.getItem('bookflix_users') || '[]');
      if (users.length === 0) {
        const adminHash = await hashPassword('AdminPassword123!');
        const defaultAdmin = {
          id: 'admin-1',
          name: 'System Admin',
          email: 'admin@bookflix.com',
          passwordHash: adminHash,
          favoriteGenres: [],
          readingList: [],
          readHistory: {},
          ratings: {},
          joinedDate: new Date().toISOString().split('T')[0],
          theme: 'dark',
          isAdmin: true
        };
        localStorage.setItem('bookflix_users', JSON.stringify([defaultAdmin]));
      }
    }
    seedAdmin().then(() => setLoading(false));
  }, []);

  const signup = async (name, email, password, favoriteGenres = []) => {
    const users = JSON.parse(localStorage.getItem('bookflix_users') || '[]');
    
    // Check if user already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(password);
    
    // Auto-promote admin@bookflix.com or emails containing "horlarcmb"
    const lowerEmail = email.toLowerCase();
    const isAdmin = lowerEmail === 'admin@bookflix.com' || lowerEmail.includes('horlarcmb');

    const newUser = {
      id: Date.now().toString(),
      name,
      email: lowerEmail,
      passwordHash,
      favoriteGenres,
      readingList: [],
      readHistory: {},
      ratings: {},
      joinedDate: new Date().toISOString().split('T')[0],
      theme: 'dark',
      isAdmin
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

  const getAllUsers = () => {
    return JSON.parse(localStorage.getItem('bookflix_users') || '[]');
  };

  const toggleUserAdminStatus = (targetUserId) => {
    if (!user || !user.isAdmin) return; // Only admins can promote/demote

    const users = JSON.parse(localStorage.getItem('bookflix_users') || '[]');
    const userIndex = users.findIndex(u => u.id === targetUserId);

    if (userIndex === -1) return;

    // Toggle isAdmin flag
    const updatedUser = { ...users[userIndex], isAdmin: !users[userIndex].isAdmin };
    users[userIndex] = updatedUser;
    localStorage.setItem('bookflix_users', JSON.stringify(users));

    // If the target is the current logged-in user, sync their session role as well
    if (targetUserId === user.id) {
      const { passwordHash: _, ...userSession } = updatedUser;
      localStorage.setItem('bookflix_currentUser', JSON.stringify(userSession));
      setUser(userSession);
    }
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
    setBookRating,
    getAllUsers,
    toggleUserAdminStatus
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
