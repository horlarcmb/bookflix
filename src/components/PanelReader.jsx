import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiChevronLeft } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useBook } from '../context/BookContext';

export default function PanelReader({ book }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateBookProgress } = useAuth();
  const { fetchBookContent } = useBook();
  
  // Parse initial chapter from query parameters
  const searchParams = new URLSearchParams(location.search);
  const initialChapter = parseInt(searchParams.get('ch')) || 1;

  const [readingMode, setReadingMode] = useState(book.type === 'Manhwa' ? 'scroll' : 'page'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentChapter, setCurrentChapter] = useState(initialChapter);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [direction, setDirection] = useState('rtl'); // 'rtl' right-to-left or 'ltr'
  
  const [contentData, setContentData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Helper to count pages
  const getPagesCount = () => {
    if (contentData && contentData.pages) {
      return contentData.pages.length;
    }
    return 5; // default mock count
  };

  const [prevChapter, setPrevChapter] = useState(currentChapter);
  if (currentChapter !== prevChapter) {
    setPrevChapter(currentChapter);
    setCurrentPage(1);
  }

  // Load content from IndexedDB on mount/book change
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
        console.error('Failed to load custom panels', err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [book.id]);

  // Sync scroll/page progress back to context
  useEffect(() => {
    if (loading) return;
    const total = getPagesCount();
    const progressPercent = Math.round((currentPage / total) * 100);
    updateBookProgress(book.id, currentChapter, progressPercent);
  }, [currentPage, currentChapter, loading, contentData]);

  // Reset page and sync URL when chapter changes
  useEffect(() => {
    navigate(`/read/${book.id}?ch=${currentChapter}`, { replace: true });
  }, [currentChapter]);

  // Generate dynamic mockup panels for default books
  const getMockPanels = () => {
    const pages = [];
    const storyThemes = {
      Naruto: [
        { title: "Shadow Clone Practice", desc: "Naruto stands on the training field, sweating. 'Just watch me, I will master this!'", dialogue: "SHADOW CLONE JUTSU!" },
        { title: "Rival Confrontation", desc: "Sasuke sits on a tree limb, looking down coldly. Sakura cheers from below.", dialogue: "Hmph, loser..." },
        { title: "First Mission", desc: "Kakashi instructs the team. Naruto runs ahead excitedly.", dialogue: "We're Ninja now!" },
      ],
      "One Piece": [
        { title: "The Great Ocean", desc: "Luffy stands at the prow of the Going Merry, pointing forward.", dialogue: "I'm gonna be King of the Pirates!" },
        { title: "Straw Hat Crew", desc: "Zoro sleeps, Nami navigates, and Usopp spins a wild tale.", dialogue: "Oi, Luffy, storm ahead!" },
        { title: "Island of Wonders", desc: "A colossal skull-shaped island appears on the horizon.", dialogue: "Adventure awaits!" },
      ],
      "Attack on Titan": [
        { title: "The Outer Wall", desc: "A shadow looms over the 50-meter Wall Maria. People look up in horror.", dialogue: "It's... it's a Titan!" },
        { title: "Eren's Oath", desc: "Eren watches the city burn, tears streaming down his face.", dialogue: "I will wipe them all out!" },
        { title: "Counterattack", desc: "Soldiers fly through the air using omni-directional maneuver gear.", dialogue: "Engage! Target the nape!" },
      ],
      "Solo Leveling": [
        { title: "The Double Dungeon", desc: "A gigantic stone statue holds a stone tablet, eyes glowing blue.", dialogue: "Run... this isn't a normal dungeon!" },
        { title: "Awakening", desc: "Sung Jinwoo lies on an altar, surrounded by system windows.", dialogue: "[System: You have re-awakened.]" },
        { title: "The Shadow Monarch", desc: "Jinwoo raises his dagger. Black shadows rise behind him.", dialogue: "ARISE." },
      ],
      default: [
        { title: "Establishing Shot", desc: "The dark moon rises over a city of towers.", dialogue: "Here it begins..." },
        { title: "The Awakening", desc: "The protagonist discovers an ancient artifact glowing in their hand.", dialogue: "What is this power?!" },
        { title: "First Battle", desc: "A dynamic clash of blades under the starlight.", dialogue: "Take this!" },
      ]
    };

    const bookTheme = storyThemes[book.title] || storyThemes.default;

    for (let p = 1; p <= 5; p++) {
      const pageTheme = bookTheme[(p - 1) % bookTheme.length];
      pages.push({
        pageNumber: p,
        title: pageTheme.title,
        description: pageTheme.desc,
        dialogue: pageTheme.dialogue,
        coverUsed: book.cover || '/covers/cyber_nexus.png',
        gradient: book.gradient || 'linear-gradient(135deg, #111 0%, #222 100%)',
      });
    }
    return pages;
  };

  const getPagesList = () => {
    if (contentData && contentData.pages) {
      // Filter pages for current chapter if chapterNumber exists, otherwise default to all pages
      const chapterPages = contentData.pages.filter(p => p.chapterNumber === currentChapter);
      if (chapterPages.length > 0) return chapterPages;
      return contentData.pages;
    }
    return getMockPanels();
  };

  const pages = getPagesList();

  const handleNextPage = () => {
    if (currentPage < pages.length) {
      setCurrentPage(prev => prev + 1);
    } else if (currentChapter < book.chapters) {
      setCurrentChapter(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else if (currentChapter > 1) {
      setCurrentChapter(prev => prev - 1);
      // Wait for contentData load is not required since pages list is synced
    }
  };

  if (loading) {
    return (
      <div className="reader-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#050505' }}>
        <div style={{ color: '#888' }}>Loading panels...</div>
      </div>
    );
  }

  return (
    <div className={`reader-container panel-reader ${readingMode}-mode`} style={{ paddingTop: 0, background: '#050505' }}>
      
      {/* Header Toolbar */}
      <div className={`reader-toolbar ${!toolbarVisible ? 'hidden' : ''}`} style={{ background: 'rgba(10, 10, 10, 0.95)', borderBottom: '1px solid #222', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/book/${book.id}`)}>
            <FiChevronLeft /> Info
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{book.title} — Ch. {currentChapter} {pages[currentPage - 1]?.title ? `(${pages[currentPage - 1].title})` : ''}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Zoom:</span>
            <input 
              type="range" 
              min="50" 
              max="150" 
              value={zoomLevel} 
              onChange={(e) => setZoomLevel(parseInt(e.target.value))} 
              style={{ width: '80px', padding: 0, height: '4px' }}
            />
            <span>{zoomLevel}%</span>
          </div>

          {/* Reading Mode Selector */}
          <div style={{ display: 'flex', gap: '4px', border: '1px solid #333', borderRadius: 'var(--radius-md)', padding: '2px' }}>
            <button 
              className={`btn btn-ghost btn-sm ${readingMode === 'page' ? 'active' : ''}`} 
              onClick={() => setReadingMode('page')}
              style={{ padding: '4px 8px', fontSize: '0.8rem', background: readingMode === 'page' ? 'var(--accent)' : 'transparent', color: '#fff' }}
            >
              Page
            </button>
            <button 
              className={`btn btn-ghost btn-sm ${readingMode === 'scroll' ? 'active' : ''}`} 
              onClick={() => setReadingMode('scroll')}
              style={{ padding: '4px 8px', fontSize: '0.8rem', background: readingMode === 'scroll' ? 'var(--accent)' : 'transparent', color: '#fff' }}
            >
              Scroll
            </button>
          </div>

          {/* Direction toggle for Page mode */}
          {readingMode === 'page' && (
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => setDirection(prev => prev === 'rtl' ? 'ltr' : 'rtl')}
              style={{ fontSize: '0.8rem', border: '1px solid #333', padding: '4px 8px' }}
            >
              {direction === 'rtl' ? 'RTL' : 'LTR'}
            </button>
          )}

          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Page {currentPage} of {pages.length}</span>
        </div>
      </div>

      {/* Reader Main Space */}
      <div 
        className="reader-viewport" 
        onClick={() => setToolbarVisible(prev => !prev)}
        style={{ 
          display: 'flex', 
          flexDirection: readingMode === 'scroll' ? 'column' : 'row', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          padding: '80px 20px',
          overflowY: readingMode === 'scroll' ? 'auto' : 'hidden'
        }}
      >
        {readingMode === 'scroll' ? (
          /* ==========================================
             VERTICAL WEBTOON SCROLL FORMAT
             ========================================== */
          <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '12px', transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}>
            {pages.map((page, i) => (
              <div key={i} style={{ width: '100%' }}>
                {page.imageBase64 ? (
                  // Custom uploaded page image
                  <div style={{ position: 'relative', width: '100%' }}>
                    {page.title && (
                      <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.75)', color: '#fff', border: '1px solid #333', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, zIndex: 10 }}>
                        {page.title}
                      </div>
                    )}
                    <img 
                      src={page.imageBase64} 
                      alt={page.title || `Page ${i + 1}`} 
                      style={{ width: '100%', height: 'auto', display: 'block', border: '2px solid #222', borderRadius: '4px', boxShadow: '0 8px 20px rgba(0,0,0,0.8)' }} 
                    />
                  </div>
                ) : (
                  // Fallback Mock Drawing layout
                  <div 
                    className="webtoon-panel"
                    style={{
                      background: '#121212',
                      border: '3px solid #222',
                      borderRadius: '6px',
                      padding: '30px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '15px'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: i % 2 === 0 ? '2fr 1fr' : '1fr 2fr', gap: '12px', height: '220px' }}>
                      <div style={{ 
                        position: 'relative', borderRadius: '4px', border: '2px solid #fff', overflow: 'hidden',
                        background: page.gradient, backgroundImage: `url(${page.coverUsed})`, backgroundSize: 'cover', backgroundPosition: 'center',
                        filter: 'grayscale(100%) contrast(140%)' 
                      }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
                        <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: '#000', padding: '4px 8px', border: '1px solid #fff', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          PANEL {i * 2 + 1}
                        </div>
                      </div>
                      
                      <div style={{ 
                        borderRadius: '4px', border: '2px solid #fff', background: '#1a1a1a', padding: '10px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative'
                      }}>
                        <div style={{ background: '#fff', color: '#000', borderRadius: '50%', padding: '12px', fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', lineHeight: '1.2' }}>
                          "{page.dialogue}"
                        </div>
                      </div>
                    </div>
                    <div style={{ background: '#000', border: '1px solid #333', borderRadius: '4px', padding: '12px', color: '#ccc', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      <strong>Panel {i * 2 + 2}:</strong> {page.description}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* End of Chapter */}
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              <h3>End of Chapter {currentChapter}</h3>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (currentChapter < book.chapters) {
                    setCurrentChapter(prev => prev + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                style={{ marginTop: '15px' }}
                disabled={currentChapter === book.chapters}
              >
                Next Chapter
              </button>
            </div>
          </div>
        ) : (
          /* ==========================================
             PAGE-BY-PAGE SLIDING FORMAT
             ========================================== */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div 
              className="manga-page-view"
              style={{
                width: '100vw',
                maxWidth: '650px',
                height: '80vh',
                maxHeight: '750px',
                background: '#121212',
                border: '4px solid #fff',
                borderRadius: '8px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: pages[currentPage - 1]?.imageBase64 ? '0px' : '24px', // Full bleeding for uploaded pages
                overflow: 'hidden',
                transform: `scale(${zoomLevel / 100})`,
                transition: 'transform var(--transition-base)'
              }}
            >
              {pages[currentPage - 1]?.imageBase64 ? (
                // Render uploaded image directly covering the viewport
                <img 
                  src={pages[currentPage - 1].imageBase64} 
                  alt={`Page ${currentPage}`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                />
              ) : (
                // Fallback Mock layout
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '0.8rem' }}>
                    <span>PAGE {currentPage} / {pages.length}</span>
                    <span>{book.title} — CH. {currentChapter}</span>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', justifyContent: 'center', margin: '20px 0' }}>
                    <div style={{ 
                      flex: 1.5, border: '3px solid #fff', borderRadius: '4px',
                      background: pages[currentPage - 1].gradient, backgroundImage: `url(${pages[currentPage - 1].coverUsed})`, backgroundSize: 'cover', backgroundPosition: 'center',
                      filter: 'grayscale(100%) contrast(140%) brightness(80%)', position: 'relative', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
                    }}>
                      <div style={{
                        position: 'absolute', top: '20%', left: direction === 'rtl' ? '10%' : 'auto', right: direction === 'ltr' ? '10%' : 'auto',
                        background: '#fff', color: '#000', border: '2px solid #000', borderRadius: '24px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 900,
                        transform: 'rotate(-4deg)', boxShadow: '3px 3px 0 #000'
                      }}>
                        {pages[currentPage - 1].dialogue}
                      </div>
                    </div>

                    <div style={{ flex: 1, border: '3px solid #fff', borderRadius: '4px', background: '#000', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '0.9rem', fontStyle: 'italic', color: '#ccc', lineHeight: '1.4' }}>
                        {pages[currentPage - 1].description}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: '10px', color: '#555', fontSize: '0.75rem' }}>
                    READING DIRECTION: {direction === 'rtl' ? '← SWIPE LEFT' : 'SWIPE RIGHT →'}
                  </div>
                </>
              )}
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '10px' }}>
              <button 
                className="btn btn-outline" 
                onClick={direction === 'rtl' ? handleNextPage : handlePrevPage}
                style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Previous
              </button>
              
              <div style={{ display: 'flex', gap: '6px' }}>
                {pages.map((_, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setCurrentPage(idx + 1)}
                    style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: currentPage === idx + 1 ? 'var(--accent)' : '#333',
                      border: 'none', padding: 0
                    }}
                  />
                ))}
              </div>

              <button 
                className="btn btn-outline" 
                onClick={direction === 'rtl' ? handlePrevPage : handleNextPage}
                style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
