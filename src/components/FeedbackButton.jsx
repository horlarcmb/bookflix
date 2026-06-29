import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('bugs');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    setResult(null);

    const categoryMapping = {
      'bugs': 'Bugs',
      'feature requests': 'Feature Requests',
      'UI issues': 'UI Issues',
      'performance issues': 'Performance Issues',
      'positive feedback': 'Positive Feedback'
    };

    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          text: text,
          category: categoryMapping[category] || 'General',
          rating: rating > 0 ? rating : null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit feedback');
      }

      setResult({
        category: data.feedback.category,
        sentiment: data.feedback.sentiment,
        priority: data.feedback.priority,
        summary: data.analysis?.actionable_summary
      });
      setText('');
      setRating(0);
      setCategory('bugs');
    } catch (err) {
      console.error(err);
      alert('Error submitting feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          zIndex: 999,
          background: 'linear-gradient(135deg, var(--accent, #e50914), #ff4d4d)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '50px',
          padding: '12px 20px',
          fontSize: '0.95rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 32px rgba(229, 9, 20, 0.4)',
          cursor: 'pointer',
          fontFamily: 'inherit'
        }}
      >
        <span>💬</span>
        <span>Feedback</span>
      </motion.button>

      {/* Modal Dialog */}
      <AnimatePresence>
        {open && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(6px)'
          }}>
            {/* Modal Backdrop Click handler to close */}
            <div 
              onClick={() => { if (!submitting) { setOpen(false); setResult(null); } }} 
              style={{ position: 'absolute', width: '100%', height: '100%', cursor: 'default' }} 
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                position: 'relative',
                width: '90%',
                maxWidth: '480px',
                background: 'var(--bg-card, #1c1c1e)',
                border: '1px solid var(--border, #2c2c2e)',
                borderRadius: 'var(--radius-lg, 16px)',
                padding: '24px',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
                zIndex: 10001
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Share Your Feedback</h3>
                <button
                  onClick={() => { setOpen(false); setResult(null); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '1.4rem',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  &times;
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tell us more</label>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Encountered an issue or have a suggestion? Tell us here..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-tertiary, #2c2c2e)',
                      border: '1px solid var(--border, #3c3c3e)',
                      borderRadius: 'var(--radius-sm, 8px)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      fontSize: '0.95rem',
                      resize: 'none'
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Feedback Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--bg-tertiary, #2c2c2e)',
                        border: '1px solid var(--border, #3c3c3e)',
                        borderRadius: 'var(--radius-sm, 8px)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit'
                      }}
                    >
                      <option value="bugs">Bug Report</option>
                      <option value="feature requests">Feature Request</option>
                      <option value="UI issues">UI/UX Issue</option>
                      <option value="performance issues">Performance Issue</option>
                      <option value="positive feedback">Positive Feedback</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rating (Optional)</label>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '40px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          onClick={() => setRating(star)}
                          style={{
                            cursor: 'pointer',
                            fontSize: '1.4rem',
                            color: star <= rating ? '#FFD700' : 'var(--text-muted, #8e8e93)',
                            transition: 'color 0.2s'
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{
                    padding: '12px',
                    fontWeight: 600,
                    width: '100%',
                    marginTop: '8px'
                  }}
                >
                  {submitting ? 'Submitting & Triaging...' : 'Submit Feedback'}
                </button>
              </form>

              {/* AI Agent Analysis Output Overlay */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: '16px',
                    padding: '14px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px dashed var(--border, #2c2c2e)',
                    borderRadius: 'var(--radius-sm, 8px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: 600 }}>
                    <span>🏷️ Category: <strong>{result.category}</strong></span>
                    <span>🎭 Sentiment: <strong>{result.sentiment}</strong></span>
                    <span>⚡ Priority: <strong style={{ color: result.priority === 'critical' ? 'var(--error, #ff3b30)' : result.priority === 'high' ? 'var(--warning, #ff9500)' : 'inherit' }}>{result.priority?.toUpperCase()}</strong></span>
                  </div>
                  {result.summary && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      🤖 <em>AI Feedback Agent Triaged:</em> {result.summary}
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
