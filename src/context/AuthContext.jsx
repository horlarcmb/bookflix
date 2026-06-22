/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper helper to get headers with JWT token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('bookflix_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    async function loadCurrentUser() {
      const token = localStorage.getItem('bookflix_token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch('/api/auth/me', {
          headers: getAuthHeaders()
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          localStorage.setItem('bookflix_currentUser', JSON.stringify(userData));
        } else {
          // Token expired or invalid
          localStorage.removeItem('bookflix_token');
          localStorage.removeItem('bookflix_currentUser');
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to load user from backend API', err);
        // Fallback to local session cache if server offline
        const storedUser = localStorage.getItem('bookflix_currentUser');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setLoading(false);
      }
    }
    loadCurrentUser();
  }, []);

  const signupRequest = async (name, email, password, favoriteGenres = [], isAdmin = false) => {
    const res = await fetch('/api/auth/signup-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, favoriteGenres, isAdmin })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Signup request failed.');
    }
    return data;
  };

  const signupVerify = async (email, code) => {
    const res = await fetch('/api/auth/signup-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Verification failed.');
    }
    
    localStorage.setItem('bookflix_token', data.token);
    localStorage.setItem('bookflix_currentUser', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const forgotPasswordRequest = async (email) => {
    const res = await fetch('/api/auth/reset-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Reset request failed.');
    }
    return data;
  };

  const forgotPasswordVerify = async (email, code, newPassword) => {
    const res = await fetch('/api/auth/reset-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Reset verification failed.');
    }
    return data;
  };

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed.');
    }
    
    localStorage.setItem('bookflix_token', data.token);
    localStorage.setItem('bookflix_currentUser', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('bookflix_token');
    localStorage.removeItem('bookflix_currentUser');
    setUser(null);
  };

  const updateProfile = async (updates) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update profile.');
    }
    
    localStorage.setItem('bookflix_currentUser', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const toggleSaveBook = async (bookId) => {
    const res = await fetch('/api/auth/toggle-save', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ bookId })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to toggle save.');
    }
    
    localStorage.setItem('bookflix_currentUser', JSON.stringify(data.user));
    setUser(data.user);
    return data.saved;
  };

  const updateBookProgress = async (bookId, chapter, progressVal) => {
    const res = await fetch('/api/auth/progress', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ bookId, chapter, progress: progressVal })
    });
    
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('bookflix_currentUser', JSON.stringify(data));
      setUser(data);
    }
  };

  const setBookRating = async (bookId, rating) => {
    const res = await fetch('/api/auth/rate', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ bookId, rating })
    });
    
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('bookflix_currentUser', JSON.stringify(data));
      setUser(data);
    }
  };

  const getAllUsers = async () => {
    const res = await fetch('/api/auth/users', {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch users.');
    }
    return data;
  };

  const toggleUserAdminStatus = async (targetUserId) => {
    const res = await fetch(`/api/auth/users/${targetUserId}/admin`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to toggle role.');
    }
    return data.user;
  };

  const value = {
    user,
    loading,
    login,
    signupRequest,
    signupVerify,
    forgotPasswordRequest,
    forgotPasswordVerify,
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
