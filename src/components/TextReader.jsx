import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiSettings, FiSun, FiMoon, FiVolume2, FiPlay, FiPause, FiSquare, FiX, FiActivity, FiCpu } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useBook } from '../context/BookContext';
import { sampleChapterContent } from '../data/books';

export default function TextReader({ book }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateBookProgress, trackReadingTime } = useAuth();
  const { fetchBookContent } = useBook();
  
  // Parse initial chapter from query parameters (e.g. ?ch=3)
  const searchParams = new URLSearchParams(location.search);
  const initialChapter = parseInt(searchParams.get('ch')) || 1;

  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(18);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [currentChapter, setCurrentChapter] = useState(initialChapter);
  
  const [contentData, setContentData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [prevChapter, setPrevChapter] = useState(currentChapter);
  if (currentChapter !== prevChapter) {
    setPrevChapter(currentChapter);
    setProgress(0);
    setAiSummary(null);
    setVoicePlaying(false);
    setVoicePaused(false);
  }

  // AI Chapter Summary & TTS voice states
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [voicePaused, setVoicePaused] = useState(false);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const utteranceRef = useRef(null);

  const [summaryMode, setSummaryMode] = useState('short');
  const [selectedText, setSelectedText] = useState('');

  // Track text selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection().toString().trim();
      setSelectedText(selection);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // AI Librarian Q&A Drawer States
  const [librarianOpen, setLibrarianOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { 
      sender: 'assistant', 
      text: "Hello! I am your AI Librarian. Ask me anything about this chapter, key concepts, or characters!", 
      suggestions: ["What is the main conflict?", "Who are the key characters?", "Summarize this chapter."] 
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, librarianOpen]);

  const handleSendMessage = async (textToSend) => {
    const queryStr = textToSend || chatQuery;
    if (!queryStr.trim()) return;

    const userMsg = { sender: 'user', text: queryStr.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatQuery("");
    setChatLoading(true);

    try {
      const res = await fetch('/api/nlp/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_title: book.title,
          chapter_title: getChapterTitle(),
          chapter_content: getChapterText(),
          query: queryStr.trim(),
          chat_history: chatMessages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
        })
      });

      if (!res.ok) throw new Error('Failed to get response');
      const data = await res.json();
      
      const assistantMsg = { 
        sender: 'assistant', 
        text: data.response, 
        suggestions: data.suggested_questions || [] 
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: "I'm sorry, I was unable to connect to the library archives. Please try again.", 
        suggestions: ["Try asking again", "What is the main conflict?"] 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Clear speech when switching chapters or unmounting
  useEffect(() => {
    const synth = synthRef.current;
    if (synth) {
      synth.cancel();
    }
    return () => {
      if (synth) {
        synth.cancel();
      }
    };
  }, [currentChapter]);

  const handleSummarizeChapter = async (forceText = null) => {
    const textToSummarize = forceText || selectedText || getChapterText();
    const isSelection = !!(forceText || selectedText);

    if (aiSummary && !isSelection) {
      setAiSummary(null);
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      setVoicePlaying(false);
      setVoicePaused(false);
      return;
    }

    setAiLoading(true);
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/nlp/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          text: textToSummarize,
          mode: summaryMode,
          book_id: book.id,
          chapter: currentChapter
        })
      });

      if (!res.ok) throw new Error('Failed to generate summary');
      const data = await res.json();
      setAiSummary({
        ...data,
        isSelection,
        mode: summaryMode
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate AI summary.');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePlayVoiceSummary = () => {
    if (!aiSummary || !aiSummary.summary || !synthRef.current) return;

    if (voicePlaying && voicePaused) {
      synthRef.current.resume();
      setVoicePaused(false);
      return;
    }

    if (voicePlaying) {
      synthRef.current.pause();
      setVoicePaused(true);
      return;
    }

    synthRef.current.cancel();

    const textToSpeak = `Summary of ${getChapterTitle()}. ${aiSummary.summary} Key points are: ${aiSummary.keyPoints.join('. ')}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;

    const voices = synthRef.current.getVoices();
    const premiumVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google')) ||
                        voices.find(v => v.lang.startsWith('en')) ||
                        voices[0];

    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }

    utterance.rate = 0.95;

    utterance.onend = () => {
      setVoicePlaying(false);
      setVoicePaused(false);
    };

    utterance.onerror = () => {
      setVoicePlaying(false);
      setVoicePaused(false);
    };

    setVoicePlaying(true);
    setVoicePaused(false);
    synthRef.current.speak(utterance);
  };

  const handleStopVoice = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setVoicePlaying(false);
    setVoicePaused(false);
  };

  const articleRef = useRef(null);

  // Load custom content on mount/book change
  useEffect(() => {
    async function loadContent() {
      setLoading(true);
      try {
        const content = await fetchBookContent(book.id);
        if (content) {
          setContentData(content);
        } else {
          setContentData(null);
        }
      } catch (err) {
        console.error('Failed to load text book content', err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [book.id]);

  // Track scrolling progress
  useEffect(() => {
    const handleScroll = () => {
      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight - winHeight;
      if (docHeight <= 0) return;
      const scrolled = (window.scrollY / docHeight) * 100;
      setProgress(Math.min(scrolled, 100));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync scroll percentage back to context
  useEffect(() => {
    if (loading) return;
    updateBookProgress(book.id, currentChapter, Math.round(progress));
  }, [progress, currentChapter, loading]);

  // Track actual active reading duration in seconds
  useEffect(() => {
    let accumulatedSeconds = 0;
    const interval = setInterval(() => {
      if (!document.hidden) {
        accumulatedSeconds += 10;
        if (accumulatedSeconds >= 10) {
          trackReadingTime(book.id, accumulatedSeconds);
          accumulatedSeconds = 0;
        }
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      if (accumulatedSeconds > 0) {
        trackReadingTime(book.id, accumulatedSeconds);
      }
    };
  }, [book.id, trackReadingTime]);

  // Reset progress when chapter changes
  useEffect(() => {
    window.scrollTo({ top: 0 });
    // Update URL query parameters silently
    navigate(`/read/${book.id}?ch=${currentChapter}`, { replace: true });
  }, [currentChapter]);

  // Generate dynamic, realistic content if chapter isn't the first, or for general books
  const getDynamicContent = () => {
    if (currentChapter === 1 && sampleChapterContent[book.id]) {
      return sampleChapterContent[book.id].content;
    }
    
    // Generate paragraphs
    return [
      `As the morning mist clung to the valleys, the shadows of the ancient citadel seemed to stretch infinitely. Kaelith pulled her cloak tighter around her armor. The violet fire in her eyes pulsed softly, echoing the heartbeat of the crystal throne. It was quiet, but it was the silence before a gathering storm.`,
      `"You shouldn't be traveling in this state," Raven warned, keeping his stride exactly half a pace behind hers. "The council will not welcome an heir who commands shadow-fire. They will call you a demon."`,
      `"Let them," Kaelith replied, not looking back. "The crown does not seek their permission. It commands their compliance."`,
      `They crossed the silent fields of Valdris, moving toward the eastern gate. The bell tolls had ceased, but the guards were already locking down the border posts. Torches flickered on the battlements, casting long, nervous silhouettes across the stone walls.`,
      `Suddenly, a low vibration shuddered through the earth. From the forest canopy, birds erupted in a frenzied panic. A crack of light, bright and jagged, split the northern horizon. The Shadow Guard was no longer just searching; they were summoning.`
    ].join('\n\n');
  };

  if (loading) {
    return (
      <div className="reader-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading book content...</div>
      </div>
    );
  }

  // Resolve current chapter details
  const getChapterTitle = () => {
    if (contentData && contentData.chapters && contentData.chapters[currentChapter - 1]) {
      return contentData.chapters[currentChapter - 1].title || `Chapter ${currentChapter}`;
    }
    if (currentChapter === 1 && sampleChapterContent[book.id]) {
      return sampleChapterContent[book.id].title;
    }
    return `Chapter ${currentChapter}: ${currentChapter === 1 ? 'The Awakening' : 'Pursuit'}`;
  };

  const getChapterText = () => {
    if (contentData && contentData.chapters && contentData.chapters[currentChapter - 1]) {
      return contentData.chapters[currentChapter - 1].content;
    }
    return getDynamicContent();
  };

  const themeClass = theme === 'light' ? 'light-mode' : theme === 'sepia' ? 'sepia-mode' : '';

  return (
    <div className={`reader-container ${themeClass}`} style={{ paddingTop: 0, minHeight: '100vh', transition: 'background-color var(--transition-base), color var(--transition-base)' }}>
      {/* Progress Bar */}
      <div className="reader-progress" style={{ width: `${progress}%` }} />

      {/* Toolbar */}
      <div className={`reader-toolbar ${!toolbarVisible ? 'hidden' : ''}`} style={{ background: theme === 'dark' ? 'rgba(10,10,10,0.95)' : theme === 'sepia' ? '#f4ecd8' : '#ffffff', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/book/${book.id}`)}>
            <FiChevronLeft /> Back
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{book.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{Math.round(progress)}% read</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setSettingsOpen(!settingsOpen)}>
            <FiSettings />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <div className={`reader-settings ${settingsOpen ? 'open' : ''}`} style={{ background: theme === 'dark' ? 'var(--bg-card)' : theme === 'sepia' ? '#eedfae' : '#f9f9f9', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="reader-settings-group">
          <div className="reader-settings-label">Font Size</div>
          <div className="font-size-controls">
            <button onClick={() => setFontSize(Math.max(14, fontSize - 2))}>A-</button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: '0.9rem' }}>{fontSize}px</span>
            <button onClick={() => setFontSize(Math.min(28, fontSize + 2))}>A+</button>
          </div>
        </div>
        <div className="reader-settings-group">
          <div className="reader-settings-label">Theme</div>
          <div className="theme-toggle-group">
            <button className={`theme-toggle-btn dark ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
              <FiMoon /> Dark
            </button>
            <button className={`theme-toggle-btn light ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
              <FiSun /> Light
            </button>
            <button className={`theme-toggle-btn sepia ${theme === 'sepia' ? 'active' : ''}`} onClick={() => setTheme('sepia')}>
              Sepia
            </button>
          </div>
        </div>
      </div>

      {/* Reader Body */}
      <div className={`reader-body ${themeClass}`} style={{ fontSize: `${fontSize}px` }} onClick={() => setToolbarVisible(!toolbarVisible)}>
        {/* Textbook details badge if applicable */}
        {['Textbook', 'School Book', 'Research'].includes(book.type) && (
          <div className="textbook-badge" style={{ display: 'inline-block', fontSize: '0.85rem', padding: '6px 12px', background: 'var(--info)', color: '#fff', borderRadius: '4px', marginBottom: 'var(--space-md)', fontWeight: 600 }}>
            🎓 ACADEMIC REFERENCE: {book.publisher}
          </div>
        )}
        
        {book.isAIGenerated && (
          <div className="ai-badge" style={{ display: 'inline-block', fontSize: '0.85rem', padding: '6px 12px', background: 'linear-gradient(135deg, #00d2fe, #4facfe)', color: '#fff', borderRadius: '4px', marginBottom: 'var(--space-md)', fontWeight: 600 }}>
            🤖 AI AUTHOR DISCLOSURE: Synthesized Narrative
          </div>
        )}

        {/* AI smart tools panel trigger */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => handleSummarizeChapter()}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 16px', 
              fontSize: '0.8rem',
              borderRadius: '20px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #e50914, #ff4e50)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(229, 9, 20, 0.2)',
              cursor: 'pointer'
            }}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <>
                <FiActivity style={{ animation: 'spin 1s linear infinite' }} />
                Generating...
              </>
            ) : (
              <>
                <span>⚡ Summarize Chapter</span>
              </>
            )}
          </button>

          <select
            value={summaryMode}
            onChange={e => setSummaryMode(e.target.value)}
            style={{
              background: theme === 'dark' ? 'rgba(30, 30, 30, 0.85)' : '#fff',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '0.8rem',
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="short">Short Summary</option>
            <option value="detailed">Detailed Summary</option>
            <option value="key_insights">Key Insights</option>
          </select>

          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setLibrarianOpen(true)}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 16px', 
              fontSize: '0.8rem',
              borderRadius: '20px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <FiCpu />
            <span>🎓 Ask AI Librarian</span>
          </button>

          {selectedText && (
            <button 
              type="button" 
              className="btn btn-primary btn-sm"
              onClick={() => handleSummarizeChapter(selectedText)}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '8px 16px', 
                fontSize: '0.8rem',
                borderRadius: '20px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #00d2fe, #4facfe)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0, 210, 254, 0.2)',
                cursor: 'pointer'
              }}
              disabled={aiLoading}
            >
              <span>⚡ Summarize Selection</span>
            </button>
          )}
        </div>

        {/* AI Summary Card */}
        {aiSummary && (
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme === 'dark' ? 'rgba(20, 20, 20, 0.85)' : theme === 'sepia' ? '#ebdcae' : '#f5f5f5',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-xl)',
              boxShadow: 'var(--shadow-md), 0 0 15px rgba(229, 9, 20, 0.05)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '0.95rem',
              lineHeight: '1.5'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
                <span>✨ {aiSummary.isSelection ? 'AI Selection Summary' : 'AI Chapter Insights'} ({aiSummary.mode ? aiSummary.mode.toUpperCase().replace('_', ' ') : 'SHORT'})</span>
              </div>
              <button 
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setAiSummary(null)}
                style={{ color: 'var(--text-tertiary)', padding: '4px' }}
              >
                <FiX />
              </button>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>Summary Abstract</h4>
              <p style={{ color: 'var(--text-primary)', margin: 0 }}>{aiSummary.summary}</p>
            </div>

            {aiSummary.keyPoints && aiSummary.keyPoints.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>Key Takeaways</h4>
                <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {aiSummary.keyPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handlePlayVoiceSummary}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: voicePlaying ? 'var(--success)' : 'var(--border)',
                  color: voicePlaying ? 'var(--success)' : 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                {voicePlaying ? (
                  voicePaused ? (
                    <><FiPlay /> Resume Audio Summary</>
                  ) : (
                    <><FiPause /> Pause Audio Summary</>
                  )
                ) : (
                  <><FiVolume2 /> Neural Voice Summary</>
                )}
              </button>

              {voicePlaying && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleStopVoice}
                  style={{ color: 'var(--error)', cursor: 'pointer' }}
                >
                  <FiSquare /> Stop
                </button>
              )}

              {voicePlaying && !voicePaused && (
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', marginLeft: '10px', height: '18px' }}>
                  <div style={{ width: '3px', height: '15px', background: 'var(--success)', borderRadius: '2px', animation: 'eq-bar 0.8s ease-in-out infinite alternate' }} />
                  <div style={{ width: '3px', height: '8px', background: 'var(--success)', borderRadius: '2px', animation: 'eq-bar 0.5s ease-in-out infinite alternate 0.2s' }} />
                  <div style={{ width: '3px', height: '18px', background: 'var(--success)', borderRadius: '2px', animation: 'eq-bar 0.7s ease-in-out infinite alternate 0.4s' }} />
                  <div style={{ width: '3px', height: '10px', background: 'var(--success)', borderRadius: '2px', animation: 'eq-bar 0.6s ease-in-out infinite alternate 0.1s' }} />
                </div>
              )}
            </div>
          </div>
        )}

        <h2 className="reader-chapter-title">{getChapterTitle()}</h2>
        <div className="reader-text" ref={articleRef}>
          {getChapterText().split('\n\n').map((paragraph, i) => (
            <p key={i} style={{ marginBottom: '1.2em', textIndent: '1.5em' }}>{paragraph}</p>
          ))}
        </div>

        {/* Chapter Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2xl) 0', borderTop: '1px solid var(--border)', marginTop: 'var(--space-2xl)' }}>
          <button 
            className="btn btn-outline" 
            onClick={() => setCurrentChapter(prev => Math.max(1, prev - 1))}
            disabled={currentChapter === 1}
          >
            <FiChevronLeft /> Previous Chapter
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={() => setCurrentChapter(prev => Math.min(book.chapters, prev + 1))}
            disabled={currentChapter === book.chapters}
          >
            Next Chapter <FiChevronRight />
          </button>
        </div>
      </div>

      {/* AI Librarian sliding drawer */}
      <div className={`librarian-drawer ${librarianOpen ? 'open' : ''}`}>
        <div className="librarian-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <FiCpu style={{ color: 'var(--accent)' }} />
            <span>AI Librarian</span>
          </div>
          <button 
            type="button"
            className="btn btn-ghost btn-sm" 
            onClick={() => setLibrarianOpen(false)}
            style={{ padding: '4px', minWidth: 'auto' }}
          >
            <FiX />
          </button>
        </div>

        <div className="librarian-chat-messages">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`librarian-message ${msg.sender}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              {msg.sender === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="librarian-suggested-questions">
                  {msg.suggestions.map((sugg, sIdx) => (
                    <button
                      key={sIdx}
                      className="librarian-suggestion-btn"
                      onClick={() => handleSendMessage(sugg)}
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {chatLoading && (
            <div className="librarian-message assistant" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <FiActivity style={{ animation: 'spin 1s linear infinite' }} />
              Consulting archives...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="librarian-chat-input-container">
          <input
            type="text"
            className="librarian-chat-input"
            placeholder="Ask about this chapter..."
            value={chatQuery}
            onChange={e => setChatQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleSendMessage()}
            style={{ borderRadius: '20px', padding: '10px 16px' }}
            disabled={chatLoading}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
