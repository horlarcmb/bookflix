import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function ForgotPasswordPage() {
  const { forgotPasswordRequest, forgotPasswordVerify } = useAuth();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [receivedOtp, setReceivedOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await forgotPasswordRequest(email);
      if (data && data.code) {
        setReceivedOtp(data.code);
      }
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to request password reset. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the verification code.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await forgotPasswordVerify(email, otp, newPassword);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check the verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ paddingTop: 0 }}>
      <div className="auth-bg" />
      <motion.div className="auth-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/" className="navbar-logo" style={{ display: 'block', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>BookFlix</Link>
        
        {error && (
          <div style={{ background: 'rgba(229, 9, 20, 0.15)', border: '1px solid var(--accent)', padding: '12px', borderRadius: 'var(--radius-md)', color: '#ff4e50', fontSize: '0.9rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            <h1>Reset Password</h1>
            <p className="subtitle">Enter your email and we'll send you a 6-digit reset code</p>
            <form className="auth-form" onSubmit={handleRequestReset}>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Enter Reset Code</h1>
            <p className="subtitle">Enter the 6-digit verification code and your new password</p>

            {receivedOtp && (
              <div style={{
                background: 'rgba(70, 211, 105, 0.1)',
                border: '1px dashed var(--success)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--success)',
                fontSize: '0.85rem',
                marginBottom: '16px',
                textAlign: 'center',
                fontWeight: 600
              }}>
                🔑 Verification Code: {receivedOtp}
              </div>
            )}

            <form className="auth-form" onSubmit={handleVerifyReset}>
              <div className="form-group">
                <label>6-Digit Code</label>
                <input 
                  type="text" 
                  maxLength="6"
                  placeholder="123456" 
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  required
                  disabled={loading}
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem', fontWeight: 'bold' }}
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  placeholder="Min. 8 characters" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password" 
                  placeholder="Confirm new password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Resetting...' : 'Verify & Reset Password'}
              </button>
            </form>
            <button 
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => { setStep(1); setError(''); }}
              disabled={loading}
            >
              Back
            </button>
          </>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>🎉</div>
            <h1>Password Reset Successful</h1>
            <p className="subtitle">Your password has been successfully updated. You can now log in with your new credentials.</p>
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
