import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { GENRES } from '../data/books';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);

  const [selectedGenres, setSelectedGenres] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
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
    if (!agree) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSignup = async () => {
    if (selectedGenres.length < 3) {
      setError('Please select at least 3 categories.');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password, selectedGenres, false);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setStep(1); // Go back to first step to fix email/credentials if conflict
    } finally {
      setLoading(false);
    }
  };

  const toggleGenre = (genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  return (
    <div className="auth-page" style={{ paddingTop: 0 }}>
      <div className="auth-bg" />
      <motion.div 
        className="auth-card" 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        style={{ maxWidth: step === 2 ? 560 : 440 }}
      >
        <Link to="/" className="navbar-logo" style={{ display: 'block', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          BookFlix
        </Link>

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

        {step === 1 ? (
          <>
            <h1>Create Account</h1>
            <p className="subtitle">Start your unlimited reading journey</p>
            <form className="auth-form" onSubmit={handleStep1Submit}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  placeholder="John Doe" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </div>
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
                  placeholder="Min. 8 characters" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', margin: '8px 0' }}>
                <input 
                  type="checkbox" 
                  id="agree-checkbox"
                  checked={agree}
                  onChange={e => setAgree(e.target.checked)}
                  style={{ width: 'auto', marginTop: '4px' }} 
                />
                <label htmlFor="agree-checkbox" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', cursor: 'pointer' }}>
                  I agree to the <Link to="/terms" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Terms of Service</Link> and <Link to="/privacy" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Privacy Policy</Link>.
                </label>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>Continue</button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign In</Link>
            </p>
          </>
        ) : (
          <>
            <h1>Pick Your Favorites</h1>
            <p className="subtitle">Select categories you enjoy (at least 3)</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: 'var(--space-lg) 0' }}>
              {GENRES.map(genre => (
                <button
                  key={genre}
                  className={`filter-chip ${selectedGenres.includes(genre) ? 'active' : ''}`}
                  onClick={() => toggleGenre(genre)}
                  style={{ fontSize: '0.9rem', padding: '10px 18px' }}
                >
                  {genre}
                </button>
              ))}
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              onClick={handleSignup}
              disabled={selectedGenres.length < 3 || loading}
            >
              {loading ? 'Creating Account...' : `Start Reading (${selectedGenres.length}/3 selected)`}
            </button>
            <button 
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => { setStep(1); setError(''); }}
            >
              Back
            </button>
          </>
        )}
      </motion.div>


    </div>
  );
}
