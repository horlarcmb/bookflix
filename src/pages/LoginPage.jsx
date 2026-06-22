import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [syncStep, setSyncStep] = useState(0);

  useEffect(() => {
    if (!showExplanationModal) return;
    
    const t1 = setTimeout(() => setSyncStep(2), 500);
    const t2 = setTimeout(() => setSyncStep(3), 1000);
    const t3 = setTimeout(() => setSyncStep(4), 1500);
    const t4 = setTimeout(() => setSyncStep(5), 2000);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [showExplanationModal]);

  const handleEnterApp = () => {
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      setSyncStep(1);
      setShowExplanationModal(true);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ paddingTop: 0 }}>
      <div className="auth-bg" />
      <motion.div 
        className="auth-card" 
        initial={{ opacity: 0, y: 30, scale: 0.95 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <Link to="/" className="navbar-logo" style={{ display: 'block', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          BookFlix
        </Link>
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to continue your reading journey</p>

        {error && (
          <div style={{ 
            background: 'rgba(229, 9, 20, 0.15)', 
            border: '1px solid var(--accent)', 
            padding: '12px', 
            borderRadius: 'var(--radius-md)', 
            color: '#ff4e50', 
            fontSize: '0.9rem', 
            marginBottom: '16px' 
          }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              placeholder="you@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
            />
          </div>
          <div className="form-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <input type="checkbox" style={{ width: 'auto' }} /> Remember me
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <button 
            type="submit" 
            className="btn btn-primary btn-lg" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>


        <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign Up</Link>
        </p>
      </motion.div>

      <AnimatePresence>
        {showExplanationModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: '#000000',
                backdropFilter: 'blur(10px)',
                zIndex: 9999
              }}
            />
            
            <div style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: 'var(--space-md)'
            }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{
                  width: '95%',
                  maxWidth: '460px',
                  background: 'rgba(20, 20, 20, 0.85)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-2xl)',
                  boxShadow: 'var(--shadow-xl), 0 0 30px rgba(229, 9, 20, 0.1)',
                  backdropFilter: 'blur(20px)',
                textAlign: 'left'
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, marginBottom: 'var(--space-sm)', color: 'var(--text-primary)' }}>
                Welcome to Book<span style={{ color: 'var(--accent)' }}>Flix</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-xl)', lineHeight: '1.6' }}>
                We're initializing your secure streaming session. Here's exactly what's happening in the background:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: 'var(--space-2xl)' }}>
                {/* Step 1: Authentication */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', opacity: syncStep >= 1 ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: syncStep > 1 ? 'rgba(70,211,105,0.15)' : syncStep === 1 ? 'rgba(229,9,20,0.1)' : 'rgba(255,255,255,0.03)',
                    border: syncStep > 1 ? '1px solid var(--success)' : syncStep === 1 ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: syncStep > 1 ? 'var(--success)' : syncStep === 1 ? 'var(--accent)' : 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {syncStep > 1 ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : syncStep === 1 ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
                    ) : '1'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Session Authentication</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>Verifying your credentials and securing the connection via a JWT authorization token.</p>
                  </div>
                </div>

                {/* Step 2: Library Sync */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', opacity: syncStep >= 2 ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: syncStep > 2 ? 'rgba(70,211,105,0.15)' : syncStep === 2 ? 'rgba(229,9,20,0.1)' : 'rgba(255,255,255,0.03)',
                    border: syncStep > 2 ? '1px solid var(--success)' : syncStep === 2 ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: syncStep > 2 ? 'var(--success)' : syncStep === 2 ? 'var(--accent)' : 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {syncStep > 2 ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : syncStep === 2 ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
                    ) : '2'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Library & Progress Sync</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>Retrieving your reading history, completed chapters, and saved bookmarks from database files.</p>
                  </div>
                </div>

                {/* Step 3: Telemetry */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', opacity: syncStep >= 3 ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: syncStep > 3 ? 'rgba(70,211,105,0.15)' : syncStep === 3 ? 'rgba(229,9,20,0.1)' : 'rgba(255,255,255,0.03)',
                    border: syncStep > 3 ? '1px solid var(--success)' : syncStep === 3 ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: syncStep > 3 ? 'var(--success)' : syncStep === 3 ? 'var(--accent)' : 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {syncStep > 3 ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : syncStep === 3 ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
                    ) : '3'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Activity Telemetry Dispatcher</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>Initializing real-time event logging to capture page views, search queries, and content reads.</p>
                  </div>
                </div>

                {/* Step 4: AI Recommendations */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', opacity: syncStep >= 4 ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: syncStep > 4 ? 'rgba(70,211,105,0.15)' : syncStep === 4 ? 'rgba(229,9,20,0.1)' : 'rgba(255,255,255,0.03)',
                    border: syncStep > 4 ? '1px solid var(--success)' : syncStep === 4 ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: syncStep > 4 ? 'var(--success)' : syncStep === 4 ? 'var(--accent)' : 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {syncStep > 4 ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : syncStep === 4 ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
                    ) : '4'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>AI Recommendation Calibration</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>Calibrating content similarity graphs and mapping genres to your personal library.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleEnterApp}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={syncStep < 5}
              >
                {syncStep < 5 ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg>
                    Synchronizing BookFlix...
                  </>
                ) : 'Enter BookFlix'}
              </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
