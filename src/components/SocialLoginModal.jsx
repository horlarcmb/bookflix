import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGoogle, FaApple, FaTimes, FaUser, FaEnvelope, FaChevronRight } from 'react-icons/fa';

export default function SocialLoginModal({ isOpen, onClose, onLogin, provider }) {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');

  const handleSelectDefault = (name, email) => {
    try {
      onLogin(name, email);
    } catch (err) {
      setError(err.message || 'Social login failed');
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail || !customName) {
      setError('Please fill in both name and email.');
      return;
    }
    if (!customEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    
    try {
      onLogin(customName, customEmail);
    } catch (err) {
      setError(err.message || 'Social login failed');
    }
  };

  const isGoogle = provider?.toLowerCase() === 'google';
  const providerColor = isGoogle ? '#4285F4' : '#ffffff';
  const providerIcon = isGoogle ? <FaGoogle size={24} color="#4285F4" /> : <FaApple size={24} color="#ffffff" />;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="social-modal-overlay">
          <motion.div 
            className="social-modal-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Close Button */}
            <button className="social-modal-close" onClick={onClose} aria-label="Close">
              <FaTimes />
            </button>

            {/* Header */}
            <div className="social-modal-header">
              <div className="social-modal-icon-wrapper">
                {providerIcon}
              </div>
              <h2 className="social-modal-title">
                Continue with {provider}
              </h2>
              <p className="social-modal-subtitle">
                Choose a simulated profile or type your email.
              </p>
            </div>

            {error && (
              <div style={{ 
                background: 'rgba(229, 9, 20, 0.15)', 
                border: '1px solid var(--accent)', 
                padding: '12px', 
                borderRadius: 'var(--radius-md)', 
                color: '#ff4e50', 
                fontSize: '0.85rem', 
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* Quick Accounts List */}
            <div className="social-accounts-list">
              {/* Admin Account Option */}
              <button
                type="button"
                className="social-account-item"
                onClick={() => handleSelectDefault('Horlarcmb', 'horlarcmb@gmail.com')}
              >
                <div className="social-account-info">
                  <div className="social-account-avatar admin">
                    H
                  </div>
                  <div className="social-account-details">
                    <div className="social-account-name">
                      Horlarcmb
                      <span className="social-account-badge">Admin</span>
                    </div>
                    <div className="social-account-email">horlarcmb@gmail.com</div>
                  </div>
                </div>
                <FaChevronRight style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }} />
              </button>

              {/* Guest Account Option */}
              <button
                type="button"
                className="social-account-item"
                onClick={() => handleSelectDefault('Guest Reader', 'guest@gmail.com')}
              >
                <div className="social-account-info">
                  <div className="social-account-avatar guest">
                    G
                  </div>
                  <div className="social-account-details">
                    <div className="social-account-name">Guest Reader</div>
                    <div className="social-account-email">guest@gmail.com</div>
                  </div>
                </div>
                <FaChevronRight style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }} />
              </button>
            </div>

            <div className="social-modal-divider">
              Or use another account
            </div>

            {/* Custom Input Form */}
            <form onSubmit={handleCustomSubmit} className="social-form">
              <div className="social-input-wrapper">
                <FaUser className="social-input-icon" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="social-input"
                  required
                />
              </div>

              <div className="social-input-wrapper">
                <FaEnvelope className="social-input-icon" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="social-input"
                  required
                />
              </div>

              <button
                type="submit"
                className="social-submit-btn"
                style={{
                  background: providerColor,
                  color: isGoogle ? '#ffffff' : '#000000',
                  boxShadow: isGoogle ? '0 0 15px rgba(66, 133, 244, 0.3)' : '0 0 15px rgba(255, 255, 255, 0.2)'
                }}
              >
                Sign In with {provider}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
