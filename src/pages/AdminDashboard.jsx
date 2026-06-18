import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiBarChart2, FiBook, FiUsers, FiDollarSign, 
  FiTrendingUp, FiCreditCard, FiUpload, FiEdit, FiTrash2, FiX, FiCheck 
} from 'react-icons/fi';
import { useBook } from '../context/BookContext';
import { useAuth } from '../context/AuthContext';
import { GENRES, CONTENT_TYPES } from '../data/books';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const { catalog, uploadBook, deleteBook } = useBook();
  const { user: currentUser, getAllUsers, toggleUserAdminStatus } = useAuth();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [type, setType] = useState('Novel');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [tags, setTags] = useState('');
  const [rating, setRating] = useState('4.5');
  const [status, setStatus] = useState('Completed');
  const [premium, setPremium] = useState(false);
  const [coverBase64, setCoverBase64] = useState('');
  const [uploadedContent, setUploadedContent] = useState(null);
  const [parsingStatus, setParsingStatus] = useState('');

  const sidebarItems = [
    { id: 'overview', icon: <FiBarChart2 />, label: 'Overview' },
    { id: 'content', icon: <FiBook />, label: 'Content' },
    { id: 'users', icon: <FiUsers />, label: 'Users' },
    { id: 'revenue', icon: <FiDollarSign />, label: 'Revenue' },
  ];

  const stats = [
    { icon: <FiUsers />, label: 'Total Users', value: '124,892', change: '+12.5%', positive: true, color: 'rgba(79,172,254,0.2)', iconColor: '#4facfe' },
    { icon: <FiCreditCard />, label: 'Active Subs', value: '89,341', change: '+8.2%', positive: true, color: 'rgba(70,211,105,0.2)', iconColor: '#46d369' },
    { icon: <FiDollarSign />, label: 'Revenue', value: '$94,523', change: '+15.3%', positive: true, color: 'rgba(255,215,0,0.2)', iconColor: '#FFD700' },
    { icon: <FiTrendingUp />, label: 'Daily Signups', value: '2,847', change: '+5.1%', positive: true, color: 'rgba(229,9,20,0.2)', iconColor: '#E50914' },
  ];

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
      
      // Auto-split text into chapters by matching headers
      const chapterSplitRegex = /(?=Chapter \d+|CHAPTER \d+|Chapter [0-9]+)/gi;
      const rawChapters = text.split(chapterSplitRegex);
      
      let parsedChapters = [];
      
      if (rawChapters.length <= 1) {
        // Fallback if no specific Chapter markers exist
        parsedChapters = [{
          title: 'Chapter 1: Initial Part',
          content: text.trim()
        }];
      } else {
        parsedChapters = rawChapters.map((rawCh, idx) => {
          const lines = rawCh.trim().split('\n');
          const chTitle = lines[0] ? lines[0].trim() : `Chapter ${idx + 1}`;
          const chContent = lines.slice(1).join('\n\n').trim();
          return { title: chTitle, content: chContent };
        }).filter(ch => ch.content.length > 0);
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

    const newBookId = Date.now();
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
      premium,
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
      alert('Failed to save content to local storage db.');
    }
  };

  // Deletion Handler
  const handleDeleteBook = async (id, titleStr) => {
    if (window.confirm(`Are you sure you want to delete "${titleStr}"?`)) {
      await deleteBook(id);
    }
  };

  // Mini bar chart SVG
  const BarChart = () => {
    const data = [45, 52, 49, 63, 58, 71, 65, 78, 72, 85, 82, 90];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const maxVal = Math.max(...data);
    const chartHeight = 250;
    const barWidth = 35;
    const gap = 15;

    return (
      <svg width="100%" height={chartHeight + 40} viewBox={`0 0 ${(barWidth + gap) * data.length} ${chartHeight + 40}`}>
        {data.map((val, i) => {
          const barHeight = (val / maxVal) * chartHeight;
          const x = i * (barWidth + gap);
          const y = chartHeight - barHeight;
          return (
            <g key={i}>
              <defs>
                <linearGradient id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E50914" />
                  <stop offset="100%" stopColor="#ff4e50" />
                </linearGradient>
              </defs>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} fill={`url(#barGrad${i})`} opacity={0.8} />
              <text x={x + barWidth / 2} y={chartHeight + 20} textAnchor="middle" fill="#808080" fontSize="10">{months[i]}</text>
              <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fill="#b3b3b3" fontSize="10">${val}k</text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Line chart SVG
  const LineChart = () => {
    const data = [3200, 3500, 3100, 4200, 3800, 4500, 4100, 5200, 4800, 5600, 5200, 6100];
    const maxVal = Math.max(...data);
    const chartWidth = 600;
    const chartHeight = 250;

    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * chartWidth;
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
        {data.map((val, i) => {
          const x = (i / (data.length - 1)) * chartWidth;
          const y = chartHeight - (val / maxVal) * chartHeight;
          return <circle key={i} cx={x} cy={y} r="4" fill="#4facfe" stroke="#141414" strokeWidth="2" />;
        })}
      </svg>
    );
  };

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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
                  <div className="chart-card">
                    <div className="chart-card-header">
                      <span className="chart-card-title">Monthly Revenue</span>
                    </div>
                    <div className="chart-container"><BarChart /></div>
                  </div>
                  <div className="chart-card">
                    <div className="chart-card-header">
                      <span className="chart-card-title">Daily Active Users</span>
                    </div>
                    <div className="chart-container"><LineChart /></div>
                  </div>
                </div>
              </>
            )}

            {/* Content Management Section */}
            {activeSection === 'content' && (
              <div style={{ marginTop: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <h3>Library Content</h3>
                  <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
                    <FiUpload /> Upload New Content
                  </button>
                </div>

                {/* Table list of custom books */}
                <div className="admin-table-wrapper" style={{ marginTop: '20px' }}>
                  <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1rem' }}>User Uploaded Content</h3>
                  </div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th><th>Author</th><th>Type</th><th>Rating</th><th>Chapters</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalog.filter(b => b.publisher === 'User Self-Publish').length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                            No custom books uploaded yet. Click "Upload New Content" to add books locally!
                          </td>
                        </tr>
                      ) : (
                        catalog.filter(b => b.publisher === 'User Self-Publish').map(book => (
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
                              <button 
                                className="btn btn-ghost btn-sm" 
                                style={{ color: 'var(--error)' }}
                                onClick={() => handleDeleteBook(book.id, book.title)}
                              >
                                <FiTrash2 /> Delete
                              </button>
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
                      <th>User</th><th>Email</th><th>Role</th><th>Premium status</th><th>Joined</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getAllUsers().map((u, i) => (
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
                        <td>
                          <span className={`badge ${u.premium ? 'badge-premium' : 'badge-type'}`}>
                            {u.premium ? 'Premium' : 'Standard'}
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
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to ${u.isAdmin ? 'revoke admin permissions from' : 'grant admin permissions to'} ${u.name}?`)) {
                                  toggleUserAdminStatus(u.id);
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

            {/* Revenue Analytics Section */}
            {activeSection === 'revenue' && (
              <div className="admin-table-wrapper" style={{ marginTop: 'var(--space-lg)' }}>
                <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '1rem' }}>Revenue Analytics</h3>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Plan</th><th>Active Subscriptions</th><th>Monthly Revenue</th><th>Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Premium Plan (Monthly)</td>
                      <td>42,391</td>
                      <td>$254,346</td>
                      <td style={{ color: 'var(--success)' }}>+12.4%</td>
                    </tr>
                    <tr>
                      <td>Premium Plan (Annual)</td>
                      <td>46,950</td>
                      <td>$1,126,800</td>
                      <td style={{ color: 'var(--success)' }}>+8.9%</td>
                    </tr>
                    <tr>
                      <td>Ad-Supported (Standard)</td>
                      <td>35,551</td>
                      <td>$35,551</td>
                      <td style={{ color: 'var(--warning)' }}>-1.2%</td>
                    </tr>
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
                <h2>Upload Local Content</h2>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'center' }}>
                    <div className="form-group">
                      <label>Tags (Comma separated)</label>
                      <input type="text" placeholder="e.g. Hero, Shonen, Action" value={tags} onChange={e => setTags(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <input 
                        type="checkbox" 
                        id="premium-checkbox" 
                        checked={premium} 
                        onChange={e => setPremium(e.target.checked)}
                        style={{ width: 'auto' }} 
                      />
                      <label htmlFor="premium-checkbox" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>PRO Premium</label>
                    </div>
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
                      Publish Locally
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
