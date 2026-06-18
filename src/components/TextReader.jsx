import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiSettings, FiSun, FiMoon } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useBook } from '../context/BookContext';
import { sampleChapterContent } from '../data/books';

export default function TextReader({ book }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateBookProgress } = useAuth();
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

  // Reset progress when chapter changes
  useEffect(() => {
    setProgress(0);
    window.scrollTo({ top: 0 });
    // Update URL query parameters silently
    navigate(`/read/${book.id}?ch=${currentChapter}`, { replace: true });
  }, [currentChapter]);

  // Generate dynamic, realistic content if chapter isn't the first, or for general books
  const getDynamicContent = () => {
    if (currentChapter === 1 && sampleChapterContent[1]) {
      return sampleChapterContent[1].content;
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
    </div>
  );
}
