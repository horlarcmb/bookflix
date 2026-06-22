import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiBarChart2, FiBook, FiUsers, FiUpload, FiTrash2, FiX, FiCheck 
} from 'react-icons/fi';
import { useBook } from '../context/BookContext';
import { useAuth } from '../context/AuthContext';
import { GENRES, CONTENT_TYPES } from '../data/books';

const generateBookId = () => Date.now();

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const { catalog, uploadBook, updateBook, deleteBook } = useBook();
  const { user: currentUser, getAllUsers, toggleUserAdminStatus } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Analytics & Telemetry States
  const [telemetryLogs, setTelemetryLogs] = useState([]);

  const handleEditClick = (book) => {
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setSynopsis(book.synopsis || '');
    setType(book.type);
    setRating(book.rating.toString());
    setStatus(book.status || 'Completed');
    setSelectedGenres(book.genre || []);
    setTags(book.tags ? book.tags.join(', ') : '');
    setCoverBase64(book.cover || '');
    setUploadedContent(null);
    setParsingStatus('');
    setIsEditOpen(true);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('bookflix_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const loadAnalyticsData = async () => {
    try {
      const headers = getAuthHeaders();
      const telRes = await fetch('/api/admin/telemetry', { headers });
      if (telRes.ok) {
        const logs = await telRes.json();
        const filteredLogs = logs.filter(log => !['subscribe', 'withdrawal', 'bank_link'].includes(log.eventType));
        setTelemetryLogs(filteredLogs);
      }
    } catch (err) {
      console.error('Error fetching analytics dashboard data:', err);
    }
  };

  // Fetch users and analytics data on component mount
  useEffect(() => {
    const initData = async () => {
      try {
        const list = await getAllUsers();
        setUsersList(list);
      } catch (err) {
        console.error('Failed to fetch users in Admin panel', err);
      }
      await loadAnalyticsData();
    };
    initData();

    // Set up real-time polling every 5 seconds
    const interval = setInterval(() => {
      loadAnalyticsData();
    }, 5000);

    return () => clearInterval(interval);
  }, [getAllUsers]);

  // Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [type, setType] = useState('Novel');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [tags, setTags] = useState('');
  const [rating, setRating] = useState('4.5');
  const [status, setStatus] = useState('Completed');
  const [coverBase64, setCoverBase64] = useState('');
  const [uploadedContent, setUploadedContent] = useState(null);
  const [parsingStatus, setParsingStatus] = useState('');

  const sidebarItems = [
    { id: 'overview', icon: <FiBarChart2 />, label: 'Overview' },
    { id: 'content', icon: <FiBook />, label: 'Content' },
    { id: 'users', icon: <FiUsers />, label: 'Users' }
  ];

  const totalUsers = usersList.length;
  const totalBooks = catalog.length;

  const stats = [
    { icon: <FiUsers />, label: 'Total Users', value: totalUsers.toString(), change: 'Real-time', positive: true, color: 'rgba(79,172,254,0.2)', iconColor: '#4facfe' },
    { icon: <FiBook />, label: 'Total Books', value: totalBooks.toString(), change: 'Catalog Size', positive: true, color: 'rgba(229,9,20,0.2)', iconColor: '#E50914' },
  ];

  const filteredBooks = catalog.filter(book => 
    book.title.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
    book.genre.some(g => g.toLowerCase().includes(bookSearchQuery.toLowerCase()))
  );

  const contentFormat = ['Manga', 'Manhwa', 'Webtoon', 'Light Novel'].includes(type) ? 'panels' : 'text';

  // Toggle Genre checks
  const handleGenreToggle = (genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  // Convert Cover file to Base64
  const handleCoverFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Process Novel text file (.txt)
  const handleTextFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setParsingStatus('Parsing text file...');
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      
      // Auto-split text into chapters by matching headers (e.g. Chapter I, Chapter 1, PART I, Book I, Prologue, etc.)
      const chapterSplitRegex = /(?=^(?:(?:Chapter|Part|Book|Section)\s+(?:[ivxlcdm\d]+|[0-9]+)|Prologue|Epilogue|Preface|Introduction)\b)/mi;
      const rawChunks = text.split(chapterSplitRegex);
      
      let tempChapters = [];
      rawChunks.forEach((chunk) => {
        const trimmed = chunk.trim();
        if (!trimmed) return;
        
        const lines = trimmed.split('\n');
        const chTitle = lines[0] ? lines[0].trim() : '';
        const chContent = lines.slice(1).join('\n\n').trim();
        
        tempChapters.push({ title: chTitle, content: chContent });
      });

      // Merge tiny headers (like "PART I" or empty/intro segments) into the next chapter's title to keep text clean and avoid empty chapters
      let parsedChapters = [];
      for (let i = 0; i < tempChapters.length; i++) {
        const current = tempChapters[i];
        if (current.content.length < 150 && i + 1 < tempChapters.length) {
          const next = tempChapters[i + 1];
          next.title = current.title + (current.content ? ' — ' + current.content : '') + ': ' + next.title;
        } else if (current.title || current.content) {
          if (!current.title) {
            current.title = `Chapter ${parsedChapters.length + 1}`;
          }
          parsedChapters.push(current);
        }
      }
      
      if (parsedChapters.length === 0) {
        parsedChapters = [{
          title: 'Chapter 1: Initial Part',
          content: text.trim()
        }];
      }
      
      setUploadedContent({ chapters: parsedChapters });
      setParsingStatus(`Parsed successfully! Loaded ${parsedChapters.length} chapters.`);
    };
    reader.onerror = () => {
      setParsingStatus('Error reading file.');
    };
    reader.readAsText(file);
  };

  // Process Manga page images
  const handleMangaImages = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setParsingStatus(`Processing ${files.length} images...`);
    
    // Sort files by name to ensure pages flow in correct order
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    
    try {
      const pagePromises = files.map((file, idx) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              pageNumber: idx + 1,
              imageBase64: reader.result,
              dialogue: `Page ${idx + 1} Dialogue`,
              description: `Story scenes on page ${idx + 1}`
            });
          };
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(file);
        });
      });
      
      const pages = await Promise.all(pagePromises);
      setUploadedContent({ pages });
      setParsingStatus(`Successfully loaded ${pages.length} panels/pages!`);
    } catch (err) {
      console.error(err);
      setParsingStatus('Error converting images.');
    }
  };

  // Save Book Handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!title || !author || !coverBase64 || !uploadedContent) {
      alert('Please fill in all required fields and upload cover + content file.');
      return;
    }

    const newBookId = generateBookId();
    const count = contentFormat === 'text' 
      ? (uploadedContent.chapters?.length || 1) 
      : (uploadedContent.pages?.length || 1);

    const metadata = {
      id: newBookId,
      title,
      author,
      cover: coverBase64,
      gradient: null,
      genre: selectedGenres.length > 0 ? selectedGenres : ['Fiction'],
      type,
      contentFormat,
      rating: parseFloat(rating) || 4.5,
      synopsis,
      chapters: count,
      status,
      language: 'English',
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      readCount: 0,
      premium: false,
      featured: false,
      isAIGenerated: type === 'AI Novel' || selectedGenres.includes('AI-Generated'),
      dateAdded: new Date().toISOString().split('T')[0],
      pages: contentFormat === 'text' ? Math.round(count * 12) : count,
      publisher: 'User Self-Publish'
    };

    try {
      await uploadBook(metadata, uploadedContent);
      setSuccessMsg(`"${title}" uploaded successfully!`);
      
      // Reset Form State
      setTitle('');
      setAuthor('');
      setSynopsis('');
      setSelectedGenres([]);
      setTags('');
      setCoverBase64('');
      setUploadedContent(null);
      setParsingStatus('');
      
      // Close Modal
      setTimeout(() => {
        setSuccessMsg('');
        setIsUploadOpen(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to save content to server database.');
    }
  };

  // Deletion Handler
  const handleDeleteBook = async (id, titleStr) => {
    if (window.confirm(`Are you sure you want to delete "${titleStr}"?`)) {
      await deleteBook(id);
    }
  };

  // Edit Submission Handler
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBook) return;
    if (!title || !author || !coverBase64) {
      alert('Please fill in all required fields and upload cover.');
      return;
    }

    let count = editingBook.chapters;
    if (uploadedContent) {
      count = contentFormat === 'text' 
        ? (uploadedContent.chapters?.length || 1) 
        : (uploadedContent.pages?.length || 1);
    }

    const updatedMetadata = {
      ...editingBook,
      title,
      author,
      cover: coverBase64,
      genre: selectedGenres.length > 0 ? selectedGenres : ['Fiction'],
      type,
      contentFormat: uploadedContent ? contentFormat : editingBook.contentFormat,
      rating: parseFloat(rating) || 4.5,
      synopsis,
      chapters: count,
      status,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      isAIGenerated: type === 'AI Novel' || selectedGenres.includes('AI-Generated'),
      pages: uploadedContent ? (contentFormat === 'text' ? Math.round(count * 12) : count) : editingBook.pages
    };

    try {
      await updateBook(editingBook.id, updatedMetadata, uploadedContent);
      setSuccessMsg(`"${title}" updated successfully!`);
      
      // Reset Form State
      setTitle('');
      setAuthor('');
      setSynopsis('');
      setSelectedGenres([]);
      setTags('');
      setCoverBase64('');
      setUploadedContent(null);
      setParsingStatus('');
      setEditingBook(null);
      
      // Close Modal
      setTimeout(() => {
        setSuccessMsg('');
        setIsEditOpen(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to update content on server database.');
    }
  };

  // Line chart SVG will be rendered as a standalone component outside of render to keep render pure

  return (
    <div className="page-content">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div style={{ padding: '0 var(--space-xl)', marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Admin Panel</h3>
          </div>
          {sidebarItems.map(item => (
            <div
              key={item.id}
              className={`admin-sidebar-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.icon} <span>{item.label}</span>
            </div>
          ))}
        </aside>

        <main className="admin-main">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={activeSection}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>
              {activeSection === 'overview' && 'Dashboard Overview'}
              {activeSection === 'content' && 'Content Management'}
              {activeSection === 'users' && 'User Management'}
              {activeSection === 'revenue' && 'Revenue Analytics'}
            </h2>

            {/* Stats Cards */}
            {activeSection === 'overview' && (
              <>
                <div className="stats-grid">
                  {stats.map((stat, i) => (
                    <motion.div key={i} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                      <div className="stat-card-header">
                        <div className="stat-card-icon" style={{ background: stat.color, color: stat.iconColor }}>{stat.icon}</div>
                      </div>
                      <div className="stat-card-value">{stat.value}</div>
                      <div className="stat-card-label">{stat.label}</div>
                      <div className={`stat-card-change ${stat.positive ? 'positive' : 'negative'}`}>
                        {stat.change} from last month
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Charts */}
                <div className="charts-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="chart-card">
                    <div className="chart-card-header">
                      <span className="chart-card-title">Daily Active Users (Cumulative)</span>
                    </div>
                    <div className="chart-container"><LineChart usersList={usersList} /></div>
                  </div>
                </div>

                {/* Real-time Activity logs */}
                <div className="admin-table-wrapper" style={{ marginTop: 'var(--space-xl)' }}>
                  <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Live Activity Feed</h3>
                    <span style={{ fontSize: '0.85rem', color: '#46d369', background: 'rgba(70,211,105,0.1)', padding: '2px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#46d369', display: 'inline-block' }} /> Live
                    </span>
                  </div>
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Event</th><th>User</th><th>Details</th><th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {telemetryLogs.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                              No activity logged yet.
                            </td>
                          </tr>
                        ) : (
                          telemetryLogs.map((log) => {
                            const formattedTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            return (
                              <tr key={log._id || log.timestamp}>
                                <td>
                                  <span style={{ 
                                    padding: '2px 8px', 
                                    borderRadius: '4px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 600, 
                                    textTransform: 'uppercase',
                                    background: log.eventType === 'registration' ? 'rgba(79,172,254,0.15)' : 'rgba(255,255,255,0.06)',
                                    color: log.eventType === 'registration' ? '#4facfe' : 'var(--text-secondary)'
                                  }}>
                                    {log.eventType.replace('_', ' ')}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 500 }}>{log.userEmail || 'Anonymous'}</td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                  {log.eventType === 'page_view' && `Visited ${log.metadata.path}`}
                                  {log.eventType === 'book_read' && `Read ${log.metadata.bookTitle} (Ch. ${log.metadata.chapter}, ${log.metadata.progress}%)`}
                                  {log.eventType === 'registration' && `Registered new account`}
                                  {log.eventType === 'login' && `Logged in`}
                                </td>
                                <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{formattedTime}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Content Management Section */}
            {activeSection === 'content' && (
              <div style={{ marginTop: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <input
                    type="text"
                    placeholder="Search books by title, author, or genre..."
                    value={bookSearchQuery}
                    onChange={e => setBookSearchQuery(e.target.value)}
                    style={{ flex: 1, padding: '10px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                  />
                  <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
                    <FiUpload /> Upload New Content
                  </button>
                </div>

                {/* Table list of all books */}
                <div className="admin-table-wrapper" style={{ marginTop: '20px' }}>
                  <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1rem' }}>Catalog Content</h3>
                  </div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th><th>Author</th><th>Type</th><th>Rating</th><th>Chapters</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBooks.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                            No books found matching search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredBooks.map(book => (
                          <tr key={book.id}>
                            <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: 36, height: 48, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#222' }}>
                                {book.cover && <img src={book.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                              </div>
                              <span style={{ fontWeight: 500 }}>{book.title}</span>
                            </td>
                            <td style={{ color: 'var(--text-tertiary)' }}>{book.author}</td>
                            <td><span className="badge badge-type">{book.type}</span></td>
                            <td><span style={{ color: 'var(--gold)' }}>★ {book.rating}</span></td>
                            <td>{book.chapters}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  className="btn btn-outline btn-sm"
                                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', padding: '2px 8px', fontSize: '0.8rem' }}
                                  onClick={() => handleEditClick(book)}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="btn btn-ghost btn-sm" 
                                  style={{ color: 'var(--error)', padding: '2px 8px', fontSize: '0.8rem' }}
                                  onClick={() => handleDeleteBook(book.id, book.title)}
                                >
                                  <FiTrash2 /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* User List Management Section */}
            {activeSection === 'users' && (
              <div className="admin-table-wrapper" style={{ marginTop: 'var(--space-lg)' }}>
                <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '1rem' }}>Registered Users</h3>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u, i) => (
                      <tr key={u.id}>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${(i * 70) % 360}, 75%, 45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
                            {u.name ? u.name[0].toUpperCase() : 'U'}
                          </div>
                          <span style={{ fontWeight: 500 }}>{u.name} {u.id === currentUser?.id && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>(You)</span>}</span>
                        </td>
                        <td style={{ color: 'var(--text-tertiary)' }}>{u.email}</td>
                        <td>
                          <span className={`badge ${u.isAdmin ? 'badge-new' : 'badge-type'}`} style={{ background: u.isAdmin ? 'linear-gradient(135deg, #e50914 0%, #ff4e50 100%)' : 'rgba(255,255,255,0.06)' }}>
                            {u.isAdmin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-tertiary)' }}>{u.joinedDate || 'N/A'}</td>
                        <td>
                          {u.id === currentUser?.id ? (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Self-protection</span>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ 
                                color: u.isAdmin ? 'var(--error)' : 'var(--success)', 
                                padding: '4px 8px',
                                border: '1px solid currentColor',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to ${u.isAdmin ? 'revoke admin permissions from' : 'grant admin permissions to'} ${u.name}?`)) {
                                  try {
                                    await toggleUserAdminStatus(u.id);
                                    // Refresh the list from the server
                                    const refreshed = await getAllUsers();
                                    setUsersList(refreshed);
                                  } catch {
                                    alert('Failed to toggle admin status.');
                                  }
                                }
                              }}
                            >
                              {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}



          </motion.div>
        </main>
      </div>

      {/* Upload Overlay Modal */}
      <AnimatePresence>
        {isUploadOpen && (
          <>
            <motion.div 
              onClick={() => setIsUploadOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1999 }}
            />
            
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              style={{ 
                position: 'fixed', top: '5%', left: '50%', x: '-50%',
                width: '90%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', zIndex: 2000,
                boxShadow: 'var(--shadow-xl)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h2>Upload Content</h2>
                <button className="btn btn-ghost" onClick={() => setIsUploadOpen(false)}><FiX /></button>
              </div>

              {successMsg ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(70,211,105,0.2)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 20px' }}>
                    <FiCheck />
                  </div>
                  <h3>Success!</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>{successMsg}</p>
                </div>
              ) : (
                <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Title *</label>
                      <input type="text" placeholder="e.g. My Hero Academia" value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Author *</label>
                      <input type="text" placeholder="e.g. Kohei Horikoshi" value={author} onChange={e => setAuthor(e.target.value)} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Synopsis *</label>
                    <textarea 
                      placeholder="Write a brief overview of the plot..." 
                      value={synopsis} 
                      onChange={e => setSynopsis(e.target.value)} 
                      rows="3" 
                      required 
                      style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', resize: 'none', color: '#fff' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Type *</label>
                      <select 
                        value={type} 
                        onChange={e => { setType(e.target.value); setUploadedContent(null); setParsingStatus(''); }}
                        style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                      >
                        {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Rating *</label>
                      <input type="number" step="0.1" min="1.0" max="5.0" value={rating} onChange={e => setRating(e.target.value)} required />
                    </div>

                    <div className="form-group">
                      <label>Status *</label>
                      <select 
                        value={status} 
                        onChange={e => setStatus(e.target.value)}
                        style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                      >
                        <option value="Completed">Completed</option>
                        <option value="Ongoing">Ongoing</option>
                      </select>
                    </div>
                  </div>

                  {/* Genre Checkbox Panel */}
                  <div className="form-group">
                    <label style={{ marginBottom: '8px', display: 'block' }}>Categories / Genres * (Select at least 1)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '90px', overflowY: 'auto', border: '1px solid var(--border)', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)' }}>
                      {GENRES.map(g => (
                        <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', width: 'calc(33% - 4px)', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedGenres.includes(g)} 
                            onChange={() => handleGenreToggle(g)}
                            style={{ width: 'auto' }}
                          />
                          {g}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Tags (Comma separated)</label>
                    <input type="text" placeholder="e.g. Hero, Shonen, Action" value={tags} onChange={e => setTags(e.target.value)} />
                  </div>

                  {/* Cover File Upload */}
                  <div className="form-group" style={{ border: '1px dashed var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--bg-tertiary)' }}>
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      {coverBase64 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <img src={coverBase64} alt="Preview" style={{ width: '40px', height: '54px', objectFit: 'cover', borderRadius: '2px' }} />
                          <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>Cover Image Selected ✓</span>
                        </div>
                      ) : (
                        <>
                          <FiUpload style={{ fontSize: '1.5rem', marginBottom: '4px', color: 'var(--text-tertiary)' }} />
                          <div style={{ fontSize: '0.85rem' }}>Upload Cover Image * (PNG/JPG)</div>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleCoverFile} style={{ display: 'none' }} required={!coverBase64} />
                    </label>
                  </div>

                  {/* Dynamic File Upload based on ContentFormat */}
                  <div className="form-group" style={{ border: '1px dashed var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--bg-tertiary)' }}>
                    {contentFormat === 'text' ? (
                      <label style={{ cursor: 'pointer', display: 'block' }}>
                        <FiBook style={{ fontSize: '1.5rem', marginBottom: '4px', color: 'var(--text-tertiary)' }} />
                        <div style={{ fontSize: '0.85rem' }}>Upload Novel Text File * (.txt)</div>
                        <input type="file" accept=".txt" onChange={handleTextFile} style={{ display: 'none' }} required />
                      </label>
                    ) : (
                      <label style={{ cursor: 'pointer', display: 'block' }}>
                        <FiUpload style={{ fontSize: '1.5rem', marginBottom: '4px', color: 'var(--text-tertiary)' }} />
                        <div style={{ fontSize: '0.85rem' }}>Upload Manga Page Images * (Select Multiple files)</div>
                        <input type="file" accept="image/*" multiple onChange={handleMangaImages} style={{ display: 'none' }} required />
                      </label>
                    )}
                    
                    {parsingStatus && (
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: 600, color: parsingStatus.includes('successfully') ? 'var(--success)' : 'var(--warning)' }}>
                        {parsingStatus}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button className="btn btn-outline" type="button" style={{ flex: 1 }} onClick={() => setIsUploadOpen(false)}>Cancel</button>
                    <button 
                      className="btn btn-primary" 
                      type="submit" 
                      style={{ flex: 2 }}
                      disabled={!coverBase64 || !uploadedContent}
                    >
                      Publish
                    </button>
                  </div>

                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Overlay Modal */}
      <AnimatePresence>
        {isEditOpen && editingBook && (
          <>
            <motion.div 
              onClick={() => { setIsEditOpen(false); setEditingBook(null); }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1999 }}
            />
            
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              style={{ 
                position: 'fixed', top: '5%', left: '50%', x: '-50%',
                width: '90%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', zIndex: 2000,
                boxShadow: 'var(--shadow-xl)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h2>Edit Book Details</h2>
                <button className="btn btn-ghost" onClick={() => { setIsEditOpen(false); setEditingBook(null); }}><FiX /></button>
              </div>

              {successMsg ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(70,211,105,0.2)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 20px' }}>
                    <FiCheck />
                  </div>
                  <h3>Success!</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>{successMsg}</p>
                </div>
              ) : (
                <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Title *</label>
                      <input type="text" placeholder="e.g. My Hero Academia" value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Author *</label>
                      <input type="text" placeholder="e.g. Kohei Horikoshi" value={author} onChange={e => setAuthor(e.target.value)} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Synopsis *</label>
                    <textarea 
                      placeholder="Write a brief overview of the plot..." 
                      value={synopsis} 
                      onChange={e => setSynopsis(e.target.value)} 
                      rows="3" 
                      required 
                      style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', resize: 'none', color: '#fff' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Type *</label>
                      <select 
                        value={type} 
                        onChange={e => { setType(e.target.value); setUploadedContent(null); setParsingStatus(''); }}
                        style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                      >
                        {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Rating *</label>
                      <input type="number" step="0.1" min="1.0" max="5.0" value={rating} onChange={e => setRating(e.target.value)} required />
                    </div>

                    <div className="form-group">
                      <label>Status *</label>
                      <select 
                        value={status} 
                        onChange={e => setStatus(e.target.value)}
                        style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#fff' }}
                      >
                        <option value="Completed">Completed</option>
                        <option value="Ongoing">Ongoing</option>
                      </select>
                    </div>
                  </div>

                  {/* Genre Checkbox Panel */}
                  <div className="form-group">
                    <label style={{ marginBottom: '8px', display: 'block' }}>Categories / Genres * (Select at least 1)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '90px', overflowY: 'auto', border: '1px solid var(--border)', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)' }}>
                      {GENRES.map(g => (
                        <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', width: 'calc(33% - 4px)', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedGenres.includes(g)} 
                            onChange={() => handleGenreToggle(g)}
                            style={{ width: 'auto' }}
                          />
                          {g}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Tags (Comma separated)</label>
                    <input type="text" placeholder="e.g. Hero, Shonen, Action" value={tags} onChange={e => setTags(e.target.value)} />
                  </div>

                  {/* Cover File Upload */}
                  <div className="form-group" style={{ border: '1px dashed var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--bg-tertiary)' }}>
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      {coverBase64 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <img src={coverBase64} alt="Preview" style={{ width: '40px', height: '54px', objectFit: 'cover', borderRadius: '2px' }} />
                          <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>Cover Image Selected ✓</span>
                        </div>
                      ) : (
                        <>
                          <FiUpload style={{ fontSize: '1.5rem', marginBottom: '4px', color: 'var(--text-tertiary)' }} />
                          <div style={{ fontSize: '0.85rem' }}>Upload Cover Image * (PNG/JPG)</div>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleCoverFile} style={{ display: 'none' }} />
                    </label>
                  </div>

                  {/* Optional File Upload to replace content */}
                  <div className="form-group" style={{ border: '1px dashed var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--bg-tertiary)' }}>
                    {editingBook.contentFormat === 'text' ? (
                      <label style={{ cursor: 'pointer', display: 'block' }}>
                        <FiBook style={{ fontSize: '1.5rem', marginBottom: '4px', color: 'var(--text-tertiary)' }} />
                        <div style={{ fontSize: '0.85rem' }}>Replace Novel Text File (Optional, .txt)</div>
                        <input type="file" accept=".txt" onChange={handleTextFile} style={{ display: 'none' }} />
                      </label>
                    ) : (
                      <label style={{ cursor: 'pointer', display: 'block' }}>
                        <FiUpload style={{ fontSize: '1.5rem', marginBottom: '4px', color: 'var(--text-tertiary)' }} />
                        <div style={{ fontSize: '0.85rem' }}>Replace Manga Page Images (Optional, Select Multiple)</div>
                        <input type="file" accept="image/*" multiple onChange={handleMangaImages} style={{ display: 'none' }} />
                      </label>
                    )}
                    
                    {parsingStatus && (
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: 600, color: parsingStatus.includes('successfully') ? 'var(--success)' : 'var(--warning)' }}>
                        {parsingStatus}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button className="btn btn-outline" type="button" style={{ flex: 1 }} onClick={() => { setIsEditOpen(false); setEditingBook(null); }}>Cancel</button>
                    <button 
                      className="btn btn-primary" 
                      type="submit" 
                      style={{ flex: 2 }}
                    >
                      Save Changes
                    </button>
                  </div>

                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function LineChart({ usersList }) {
  const monthlySignups = Array(12).fill(0);
  
  usersList.forEach(u => {
    if (u.joinedDate) {
      const dateObj = new Date(u.joinedDate);
      if (!isNaN(dateObj.getTime())) {
        const monthIndex = dateObj.getMonth();
        monthlySignups[monthIndex] += 1;
      }
    }
  });

  const chartData = [];
  let cumulative = 0;
  for (let i = 0; i < 12; i++) {
    cumulative += monthlySignups[i];
    chartData.push(cumulative);
  }

  const maxVal = Math.max(...chartData, 5);
  const chartWidth = 600;
  const chartHeight = 250;

  const points = chartData.map((val, i) => {
    const x = (i / (chartData.length - 1)) * chartWidth;
    const y = chartHeight - (val / maxVal) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${chartHeight} ${points} ${chartWidth},${chartHeight}`;

  return (
    <svg width="100%" height={chartHeight + 20} viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(79,172,254,0.3)" />
          <stop offset="100%" stopColor="rgba(79,172,254,0)" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#lineGrad)" />
      <polyline points={points} fill="none" stroke="#4facfe" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {chartData.map((val, i) => {
        const x = (i / (chartData.length - 1)) * chartWidth;
        const y = chartHeight - (val / maxVal) * chartHeight;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill="#4facfe" stroke="#141414" strokeWidth="2" />
            <text x={x} y={y - 8} textAnchor="middle" fill="#b3b3b3" fontSize="9">{val}</text>
          </g>
        );
      })}
    </svg>
  );
}

