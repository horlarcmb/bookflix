import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setSent(true);
  };

  return (
    <div className="auth-page" style={{ paddingTop: 0 }}>
      <div className="auth-bg" />
      <motion.div className="auth-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/" className="navbar-logo" style={{ display: 'block', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>BookFlix</Link>
        {!sent ? (
          <>
            <h1>Reset Password</h1>
            <p className="subtitle">Enter your email and we'll send you a reset link</p>
            {error && (
              <div style={{ background: 'rgba(229, 9, 20, 0.15)', border: '1px solid var(--accent)', padding: '12px', borderRadius: 'var(--radius-md)', color: '#ff4e50', fontSize: '0.9rem', marginBottom: '16px' }}>
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
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>Send Reset Link</button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>📧</div>
            <h1>Check Your Email</h1>
            <p className="subtitle">We've sent a password reset link to <strong>{email}</strong></p>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 'var(--space-lg)', display: 'inline-block' }}>Back to Login</Link>
          </div>
        )}
        <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Remember your password? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}
