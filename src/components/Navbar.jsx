import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiMenu, FiBell, FiUser, FiSettings, FiLogOut, FiBookOpen, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onNotificationToggle, notificationCount }) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Get user initial for avatar
  const getInitial = () => {
    if (!user || !user.name) return 'U';
    return user.name.charAt(0).toUpperCase();
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">BookFlix</Link>

        <div className="navbar-nav">
          <Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link>
          <Link to="/browse" className={isActive('/browse') && !location.search.includes('Manga') ? 'active' : ''}>Browse</Link>
          <Link to="/browse?type=Manga" className={location.search.includes('Manga') ? 'active' : ''}>Manga</Link>
          <Link to="/library" className={isActive('/library') ? 'active' : ''}>My Library</Link>
        </div>

        <div className="navbar-actions">
          <form className={`navbar-search ${searchOpen ? 'open' : ''}`} onSubmit={handleSearch}>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search books, manga..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="navbar-search-btn"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (!searchOpen) setTimeout(() => searchRef.current?.focus(), 300);
              }}
            >
              <FiSearch />
            </button>
          </form>

          <button className="notification-btn" onClick={onNotificationToggle}>
            <FiBell />
            {notificationCount > 0 && (
              <span className="notification-badge">{notificationCount}</span>
            )}
          </button>

          {user ? (
            <div style={{ position: 'relative' }}>
              <div className="user-avatar" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                {getInitial()}
              </div>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{
                    position: 'absolute', top: '120%', right: 0, width: 200,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '8px', zIndex: 100,
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  <div style={{ padding: '8px 12px', fontSize: '0.85rem', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                    <div style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                  </div>
                  <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px' }}>
                    <FiUser /> Profile
                  </Link>
                  <Link to="/library" onClick={() => setUserMenuOpen(false)} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px' }}>
                    <FiBookOpen /> My Library
                  </Link>
                  {user && user.isAdmin && (
                    <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px' }}>
                      <FiSettings /> Admin
                    </Link>
                  )}
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                  <button onClick={() => { setUserMenuOpen(false); handleSignOut(); }} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--accent)', padding: '8px 12px' }}>
                    <FiLogOut /> Sign Out
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
              Sign In
            </Link>
          )}

          <button className="btn btn-ghost mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <FiMenu />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="mobile-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            
            <motion.div
              className="mobile-menu-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <div className="mobile-menu-header">
                <span className="navbar-logo" onClick={() => { setMobileMenuOpen(false); navigate('/'); }}>BookFlix</span>
                <button className="btn btn-ghost btn-icon" onClick={() => setMobileMenuOpen(false)}>
                  <FiX style={{ fontSize: '1.2rem' }} />
                </button>
              </div>
              <div className="mobile-menu-links">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className={isActive('/') ? 'active' : ''}>Home</Link>
                <Link to="/browse" onClick={() => setMobileMenuOpen(false)} className={isActive('/browse') && !location.search.includes('Manga') ? 'active' : ''}>Browse</Link>
                <Link to="/browse?type=Manga" onClick={() => setMobileMenuOpen(false)} className={location.search.includes('Manga') ? 'active' : ''}>Manga</Link>
                <Link to="/library" onClick={() => setMobileMenuOpen(false)} className={isActive('/library') ? 'active' : ''}>My Library</Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
