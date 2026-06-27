import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  const { catalog, uploadBook, updateBook, deleteBook, fetchBookContent } = useBook();
  const location = useLocation();
  const { user: currentUser, getAllUsers, toggleUserAdminStatus } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
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
  const [coverBase64, setCoverBase64] = useState('');
  const [parsingStatus, setParsingStatus] = useState('');
  const [formChapters, setFormChapters] = useState([
    { id: 1, title: 'Chapter 1', content: '', pages: [] }
  ]);

  // Analytics & Telemetry States
  const [telemetryLogs, setTelemetryLogs] = useState([]);

  const handleEditClick = async (book) => {
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
    setParsingStatus('Loading existing book content...');
    setFormChapters([{ id: 1, title: 'Chapter 1', content: '', pages: [] }]);
    setIsEditOpen(true);

    try {
      const content = await fetchBookContent(book.id);
      if (content) {
        if (book.contentFormat === 'text') {
          if (content.chapters && content.chapters.length > 0) {
            const loaded = content.chapters.map((ch, idx) => ({
              id: idx + 1,
              title: ch.title || `Chapter ${idx + 1}`,
              content: ch.content || '',
              pages: []
            }));
            setFormChapters(loaded);
          } else {
            setFormChapters([{ id: 1, title: 'Chapter 1', content: '', pages: [] }]);
          }
        } else {
          if (content.pages && content.pages.length > 0) {
            const chaptersMap = {};
            content.pages.forEach(p => {
              const chNum = p.chapterNumber || 1;
              if (!chaptersMap[chNum]) {
                chaptersMap[chNum] = [];
              }
              chaptersMap[chNum].push(p);
            });
            
            const loaded = Object.keys(chaptersMap).sort((a, b) => Number(a) - Number(b)).map((chNum, idx) => {
              const pages = chaptersMap[chNum].sort((pa, pb) => pa.pageNumber - pb.pageNumber).map(p => ({
                pageNumber: p.pageNumber,
                title: p.title || `Page ${p.pageNumber}`,
                imageBase64: p.imageBase64 || '',
                dialogue: p.dialogue || '',
                description: p.description || '',
                chapterNumber: p.chapterNumber || 1
              }));
              const chapterTitle = (content.chapters && content.chapters[idx])
                ? content.chapters[idx].title
                : `Chapter ${chNum}`;
              return {
                id: idx + 1,
                title: chapterTitle,
                content: '',
                pages: pages
              };
            });
            setFormChapters(loaded);
          } else {
            setFormChapters([{ id: 1, title: 'Chapter 1', content: '', pages: [] }]);
          }
        }
        setParsingStatus('');
      } else {
        setParsingStatus('No content found on server. Starting with a blank chapter.');
      }
    } catch (err) {
      console.error('Failed to load book content:', err);
      setParsingStatus('Failed to load existing content from server. You can write new chapters.');
    }
  };

  const handleAddChapter = () => {
    setFormChapters(prev => {
      const maxId = prev.reduce((max, ch) => Math.max(max, ch.id), 0);
      return [
        ...prev,
        { id: maxId + 1, title: `Chapter ${prev.length + 1}`, content: '', pages: [] }
      ];
    });
  };

  const handleRemoveChapter = (index) => {
    setFormChapters(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateChapter = (index, field, value) => {
    setFormChapters(prev => prev.map((ch, idx) => {
      if (idx === index) {
        return { ...ch, [field]: value };
      }
      return ch;
    }));
  };

  const handleChapterFileChange = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.name.toLowerCase().endsWith('.epub')) {
      const confirmImport = window.confirm(
        `You selected an EPUB file ("${file.name}"). Would you like to import all chapters from this EPUB? This will replace the current chapters.`
      );
      if (!confirmImport) {
        e.target.value = '';
        return;
      }
      
      setParsingStatus('Uploading and parsing EPUB file...');
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        try {
          const token = localStorage.getItem('bookflix_token');
          const res = await fetch('/api/admin/parse-epub', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
              fileBase64: base64Data,
              filename: file.name
            })
          });
          
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || 'Failed to parse EPUB');
          }
          
          const data = await res.json();
          
          if (data.chapters && data.chapters.length > 0) {
            const mapped = data.chapters.map((ch, idx) => ({
              id: Date.now() + idx,
              title: ch.title || `Chapter ${idx + 1}`,
              content: ch.content || '',
              pages: []
            }));
            setFormChapters(mapped);
            setParsingStatus(`Successfully imported ${data.chapters.length} chapters from "${data.title}"!`);
          } else {
            setParsingStatus('EPUB parsed, but no chapters were found.');
          }
        } catch (err) {
          console.error(err);
          setParsingStatus(`Error: ${err.message}`);
          alert(`Failed to import EPUB: ${err.message}`);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      handleUpdateChapter(index, 'content', text.trim());
      const filename = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setFormChapters(prev => prev.map((ch, idx) => {
        if (idx === index && (!ch.title.trim() || ch.title.startsWith('Chapter '))) {
          return { ...ch, title: filename };
        }
        return ch;
      }));
    };
    reader.readAsText(file);
  };

  const handleAddPage = (chIdx) => {
    setFormChapters(prev => prev.map((ch, idx) => {
      if (idx === chIdx) {
        const pages = ch.pages || [];
        return {
          ...ch,
          pages: [
            ...pages,
            {
              pageNumber: pages.length + 1,
              title: `Page ${pages.length + 1}`,
              imageBase64: '',
              dialogue: '',
              description: ''
            }
          ]
        };
      }
      return ch;
    }));
  };

  const handleRemovePage = (chIdx, pIdx) => {
    setFormChapters(prev => prev.map((ch, idx) => {
      if (idx === chIdx) {
        const pages = ch.pages || [];
        const filtered = pages.filter((_, pindex) => pindex !== pIdx);
        const reindexed = filtered.map((p, pindex) => ({
          ...p,
          pageNumber: pindex + 1
        }));
        return { ...ch, pages: reindexed };
      }
      return ch;
    }));
  };

  const handleUpdatePage = (chIdx, pIdx, field, value) => {
    setFormChapters(prev => prev.map((ch, idx) => {
      if (idx === chIdx) {
        const pages = ch.pages || [];
        const updatedPages = pages.map((p, pindex) => {
          if (pindex === pIdx) {
            return { ...p, [field]: value };
          }
          return p;
        });
        return { ...ch, pages: updatedPages };
      }
      return ch;
    }));
  };

  const handlePageFileChange = (chIdx, pIdx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleUpdatePage(chIdx, pIdx, 'imageBase64', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleBulkPageUpload = async (chIdx, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    
    try {
      const pagePromises = files.map((file, idx) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const filename = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            resolve({
              pageNumber: idx + 1,
              title: filename,
              imageBase64: reader.result,
              dialogue: `Dialogue for page`,
              description: `Story scenes`
            });
          };
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(file);
        });
      });
      
      const newPages = await Promise.all(pagePromises);
      setFormChapters(prev => prev.map((ch, idx) => {
        if (idx === chIdx) {
          const existingPages = ch.pages || [];
          const combinedPages = [...existingPages, ...newPages].map((p, pIdx) => ({
            ...p,
            pageNumber: pIdx + 1
          }));
          return { ...ch, pages: combinedPages };
        }
        return ch;
      }));
    } catch (err) {
      console.error(err);
      alert('Error converting chapter images.');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editIdStr = params.get('edit');
    if (editIdStr && catalog.length > 0) {
      const editId = parseInt(editIdStr);
      const targetBook = catalog.find(b => b.id === editId);
      if (targetBook) {
        setTimeout(() => {
          setActiveSection('content');
          handleEditClick(targetBook);
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, catalog]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllUsers]);



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

  // Import whole EPUB file dynamically
  const handleEpubImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setParsingStatus('Uploading and parsing EPUB file...');
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      
      try {
        const token = localStorage.getItem('bookflix_token');
        const res = await fetch('/api/admin/parse-epub', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            fileBase64: base64Data,
            filename: file.name
          })
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Failed to parse EPUB');
        }
        
        const data = await res.json();
        
        // Auto-populate form
        setTitle(data.title || '');
        setAuthor(data.author || '');
        if (data.cover) {
          setCoverBase64(data.cover);
        }
        if (data.chapters && data.chapters.length > 0) {
          const mapped = data.chapters.map((ch, idx) => ({
            id: Date.now() + idx,
            title: ch.title || `Chapter ${idx + 1}`,
            content: ch.content || '',
            pages: []
          }));
          setFormChapters(mapped);
          setParsingStatus(`Successfully imported ${data.chapters.length} chapters from "${data.title}"!`);
        } else {
          setParsingStatus('EPUB parsed, but no chapters were found.');
        }
      } catch (err) {
        console.error(err);
        setParsingStatus(`Error: ${err.message}`);
        alert(`Failed to import EPUB: ${err.message}`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Book Handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!title || !author || !coverBase64) {
      alert('Please fill in all required fields and upload cover.');
      return;
    }

    if (formChapters.length === 0) {
      alert('Please add at least one chapter.');
      return;
    }

    if (contentFormat === 'text') {
      const hasInvalidChapter = formChapters.some(ch => !ch.title.trim() || !ch.content.trim());
      if (hasInvalidChapter) {
        alert('Please fill in title and content for all chapters.');
        return;
      }
    } else {
      const hasInvalidChapter = formChapters.some(ch => !ch.title.trim() || !ch.pages || ch.pages.length === 0);
      if (hasInvalidChapter) {
        alert('Please fill in title and upload page images for all chapters.');
        return;
      }
    }

    const newBookId = generateBookId();
    const count = formChapters.length;

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
      pages: contentFormat === 'text' ? Math.round(count * 12) : formChapters.reduce((sum, ch) => sum + (ch.pages?.length || 0), 0),
      publisher: 'User Self-Publish'
    };

    const finalContent = contentFormat === 'text' 
      ? {
          chapters: formChapters.map(ch => ({
            title: ch.title,
            content: ch.content
          }))
        }
      : {
          chapters: formChapters.map(ch => ({
            title: ch.title,
            content: ''
          })),
          pages: formChapters.reduce((acc, ch, chIdx) => {
            const chapterNumber = chIdx + 1;
            const pages = ch.pages || [];
            pages.forEach((p, pIdx) => {
              acc.push({
                pageNumber: pIdx + 1,
                title: p.title || `Page ${pIdx + 1}`,
                imageBase64: p.imageBase64,
                dialogue: p.dialogue || `Page ${pIdx + 1} Dialogue`,
                description: p.description || `Story scenes on page ${pIdx + 1}`,
                chapterNumber: chapterNumber
              });
            });
            return acc;
          }, [])
        };

    try {
      await uploadBook(metadata, finalContent);
      setSuccessMsg(`"${title}" uploaded successfully!`);
      
      // Reset Form State
      setTitle('');
      setAuthor('');
      setSynopsis('');
      setSelectedGenres([]);
      setTags('');
      setCoverBase64('');
      setParsingStatus('');
      setFormChapters([{ id: 1, title: 'Chapter 1', content: '', pages: [] }]);
      
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

    if (formChapters.length === 0) {
      alert('Please add at least one chapter.');
      return;
    }

    if (contentFormat === 'text') {
      const hasInvalidChapter = formChapters.some(ch => !ch.title.trim() || !ch.content.trim());
      if (hasInvalidChapter) {
        alert('Please fill in title and content for all chapters.');
        return;
      }
    } else {
      const hasInvalidChapter = formChapters.some(ch => !ch.title.trim() || !ch.pages || ch.pages.length === 0);
      if (hasInvalidChapter) {
        alert('Please fill in title and upload page images for all chapters.');
        return;
      }
    }

    const count = formChapters.length;

    const updatedMetadata = {
      ...editingBook,
      title,
      author,
      cover: coverBase64,
      genre: selectedGenres.length > 0 ? selectedGenres : ['Fiction'],
      type,
      contentFormat: contentFormat,
      rating: parseFloat(rating) || 4.5,
      synopsis,
      chapters: count,
      status,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      isAIGenerated: type === 'AI Novel' || selectedGenres.includes('AI-Generated'),
      pages: contentFormat === 'text' ? Math.round(count * 12) : formChapters.reduce((sum, ch) => sum + (ch.pages?.length || 0), 0)
    };

    const finalContent = contentFormat === 'text' 
      ? {
          chapters: formChapters.map(ch => ({
            title: ch.title,
            content: ch.content
          }))
        }
      : {
          chapters: formChapters.map(ch => ({
            title: ch.title,
            content: ''
          })),
          pages: formChapters.reduce((acc, ch, chIdx) => {
            const chapterNumber = chIdx + 1;
            const pages = ch.pages || [];
            pages.forEach((p, pIdx) => {
              acc.push({
                pageNumber: pIdx + 1,
                title: p.title || `Page ${pIdx + 1}`,
                imageBase64: p.imageBase64,
                dialogue: p.dialogue || `Page ${pIdx + 1} Dialogue`,
                description: p.description || `Story scenes on page ${pIdx + 1}`,
                chapterNumber: chapterNumber
              });
            });
            return acc;
          }, [])
        };

    try {
      await updateBook(editingBook.id, updatedMetadata, finalContent);
      setSuccessMsg(`"${title}" updated successfully!`);
      
      // Reset Form State
      setTitle('');
      setAuthor('');
      setSynopsis('');
      setSelectedGenres([]);
      setTags('');
      setCoverBase64('');
      setParsingStatus('');
      setEditingBook(null);
      setFormChapters([{ id: 1, title: 'Chapter 1', content: '', pages: [] }]);
      
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
                  <button 
                    className="btn btn-primary" 
                    onClick={() => { 
                      setFormChapters([{ id: 1, title: 'Chapter 1', content: '', pages: [] }]); 
                      setTitle('');
                      setAuthor('');
                      setSynopsis('');
                      setSelectedGenres([]);
                      setTags('');
                      setCoverBase64('');
                      setParsingStatus('');
                      setIsUploadOpen(true); 
                    }}
                  >
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
                  
                  {/* EPUB Fast Import */}
                  <div className="form-group" style={{ background: 'rgba(229,9,20,0.06)', border: '1px dashed var(--accent)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--accent)', cursor: 'pointer' }}>
                      <FiUpload style={{ marginRight: '6px' }} /> Fast Import from EPUB (.epub)
                      <input 
                        type="file" 
                        accept=".epub" 
                        onChange={handleEpubImport} 
                        style={{ display: 'none' }}
                      />
                    </label>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      Automatically extracts Title, Author, Cover, and all Chapters.
                    </div>
                  </div>

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
                        onChange={e => { 
                          setType(e.target.value); 
                          setParsingStatus(''); 
                          setFormChapters([{ id: Date.now(), title: 'Chapter 1', content: '', pages: [] }]);
                        }}
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

                  {/* Dynamic Chapters Section */}
                  <div className="chapters-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Chapters & Upload Content</h3>
                      <button 
                        type="button" 
                        className="btn btn-outline btn-sm" 
                        onClick={handleAddChapter}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
                      >
                        + Add Chapter
                      </button>
                    </div>

                    {formChapters.map((chapter, index) => (
                      <div 
                        key={chapter.id} 
                        style={{ 
                          background: 'var(--bg-tertiary)', 
                          border: '1px solid var(--border)', 
                          borderRadius: 'var(--radius-md)', 
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Chapter {index + 1}</span>
                          {formChapters.length > 1 && (
                            <button 
                              type="button" 
                              className="btn btn-ghost btn-sm" 
                              onClick={() => handleRemoveChapter(index)}
                              style={{ color: 'var(--error)', padding: '2px 8px', fontSize: '0.8rem' }}
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', alignItems: 'start' }}>
                          {/* Naming Column */}
                          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Chapter Title *</label>
                            <input 
                              type="text" 
                              placeholder={`e.g. Chapter ${index + 1}: The Beginning`} 
                              value={chapter.title} 
                              onChange={(e) => handleUpdateChapter(index, 'title', e.target.value)}
                              required 
                              style={{ 
                                width: '100%', 
                                padding: '10px', 
                                background: 'var(--bg-primary)', 
                                border: '1px solid var(--border)', 
                                borderRadius: 'var(--radius-sm)', 
                                color: '#fff' 
                              }}
                            />
                          </div>

                          {/* Upload Column */}
                          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                              {contentFormat === 'text' ? 'Content (Text)*' : 'Upload Page Images *'}
                            </label>
                            
                            {contentFormat === 'text' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <textarea 
                                  placeholder="Paste chapter text content here..." 
                                  value={chapter.content} 
                                  onChange={(e) => handleUpdateChapter(index, 'content', e.target.value)}
                                  rows="4"
                                  required
                                  style={{ 
                                    width: '100%', 
                                    padding: '10px', 
                                    background: 'var(--bg-primary)', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: 'var(--radius-sm)', 
                                    color: '#fff',
                                    resize: 'vertical'
                                  }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Or upload .txt:</span>
                                  <input 
                                    type="file" 
                                    accept=".txt" 
                                    onChange={(e) => handleChapterFileChange(index, e)}
                                    style={{ fontSize: '0.8rem', width: 'auto', background: 'transparent', border: 'none', padding: 0 }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-primary)', border: '1px dashed var(--border)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                                  <label style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                    <FiUpload /> Bulk Upload Page Images
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      multiple 
                                      onChange={(e) => handleBulkPageUpload(index, e)} 
                                      style={{ display: 'none' }} 
                                    />
                                  </label>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>(sequential naming)</span>
                                </div>

                                {/* Page List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                                  {chapter.pages && chapter.pages.map((page, pIdx) => (
                                    <div 
                                      key={pIdx} 
                                      style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: '60px 1.2fr 1.2fr auto', 
                                        gap: '8px', 
                                        alignItems: 'center', 
                                        background: 'rgba(255,255,255,0.02)', 
                                        border: '1px solid var(--border)', 
                                        padding: '8px', 
                                        borderRadius: 'var(--radius-sm)' 
                                      }}
                                    >
                                      {/* Thumbnail */}
                                      <div style={{ width: '45px', height: '60px', borderRadius: '4px', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333' }}>
                                        {page.imageBase64 ? (
                                          <img src={page.imageBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>No Image</span>
                                        )}
                                      </div>

                                      {/* Page Naming Column */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Page Title</span>
                                        <input 
                                          type="text" 
                                          placeholder="Page Title" 
                                          value={page.title || ''} 
                                          onChange={(e) => handleUpdatePage(index, pIdx, 'title', e.target.value)} 
                                          required
                                          style={{ width: '100%', padding: '4px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '0.8rem' }} 
                                        />
                                      </div>

                                      {/* Page Upload Column */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Upload Image</span>
                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          onChange={(e) => handlePageFileChange(index, pIdx, e)} 
                                          required={!page.imageBase64}
                                          style={{ fontSize: '0.75rem', width: '100%', background: 'transparent', border: 'none', padding: 0 }} 
                                        />
                                      </div>

                                      {/* Remove Button */}
                                      <button 
                                        type="button" 
                                        onClick={() => handleRemovePage(index, pIdx)} 
                                        style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '6px' }}
                                      >
                                        <FiTrash2 />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                <button 
                                  type="button" 
                                  className="btn btn-outline btn-sm" 
                                  onClick={() => handleAddPage(index)} 
                                  style={{ fontSize: '0.8rem', padding: '4px 10px', width: 'fit-content' }}
                                >
                                  + Add Page
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {parsingStatus && (
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--warning)' }}>
                      {parsingStatus}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button className="btn btn-outline" type="button" style={{ flex: 1 }} onClick={() => setIsUploadOpen(false)}>Cancel</button>
                    <button 
                      className="btn btn-primary" 
                      type="submit" 
                      style={{ flex: 2 }}
                      disabled={!coverBase64}
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
                        onChange={e => { 
                          setType(e.target.value); 
                          setParsingStatus(''); 
                          setFormChapters([{ id: Date.now(), title: 'Chapter 1', content: '', pages: [] }]);
                        }}
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

                  {/* Dynamic Chapters Section */}
                  <div className="chapters-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Chapters & Upload Content</h3>
                      <button 
                        type="button" 
                        className="btn btn-outline btn-sm" 
                        onClick={handleAddChapter}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
                      >
                        + Add Chapter
                      </button>
                    </div>

                    {formChapters.map((chapter, index) => (
                      <div 
                        key={chapter.id} 
                        style={{ 
                          background: 'var(--bg-tertiary)', 
                          border: '1px solid var(--border)', 
                          borderRadius: 'var(--radius-md)', 
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Chapter {index + 1}</span>
                          {formChapters.length > 1 && (
                            <button 
                              type="button" 
                              className="btn btn-ghost btn-sm" 
                              onClick={() => handleRemoveChapter(index)}
                              style={{ color: 'var(--error)', padding: '2px 8px', fontSize: '0.8rem' }}
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', alignItems: 'start' }}>
                          {/* Naming Column */}
                          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Chapter Title *</label>
                            <input 
                              type="text" 
                              placeholder={`e.g. Chapter ${index + 1}: The Beginning`} 
                              value={chapter.title} 
                              onChange={(e) => handleUpdateChapter(index, 'title', e.target.value)}
                              required 
                              style={{ 
                                width: '100%', 
                                padding: '10px', 
                                background: 'var(--bg-primary)', 
                                border: '1px solid var(--border)', 
                                borderRadius: 'var(--radius-sm)', 
                                color: '#fff' 
                              }}
                            />
                          </div>

                          {/* Upload Column */}
                          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                              {contentFormat === 'text' ? 'Content (Text)*' : 'Upload Page Images *'}
                            </label>
                            
                            {contentFormat === 'text' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <textarea 
                                  placeholder="Paste chapter text content here..." 
                                  value={chapter.content} 
                                  onChange={(e) => handleUpdateChapter(index, 'content', e.target.value)}
                                  rows="4"
                                  required
                                  style={{ 
                                    width: '100%', 
                                    padding: '10px', 
                                    background: 'var(--bg-primary)', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: 'var(--radius-sm)', 
                                    color: '#fff',
                                    resize: 'vertical'
                                  }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Or upload .txt:</span>
                                  <input 
                                    type="file" 
                                    accept=".txt" 
                                    onChange={(e) => handleChapterFileChange(index, e)}
                                    style={{ fontSize: '0.8rem', width: 'auto', background: 'transparent', border: 'none', padding: 0 }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-primary)', border: '1px dashed var(--border)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                                  <label style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                    <FiUpload /> Bulk Upload Page Images
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      multiple 
                                      onChange={(e) => handleBulkPageUpload(index, e)} 
                                      style={{ display: 'none' }} 
                                    />
                                  </label>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>(sequential naming)</span>
                                </div>

                                {/* Page List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                                  {chapter.pages && chapter.pages.map((page, pIdx) => (
                                    <div 
                                      key={pIdx} 
                                      style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: '60px 1.2fr 1.2fr auto', 
                                        gap: '8px', 
                                        alignItems: 'center', 
                                        background: 'rgba(255,255,255,0.02)', 
                                        border: '1px solid var(--border)', 
                                        padding: '8px', 
                                        borderRadius: 'var(--radius-sm)' 
                                      }}
                                    >
                                      {/* Thumbnail */}
                                      <div style={{ width: '45px', height: '60px', borderRadius: '4px', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333' }}>
                                        {page.imageBase64 ? (
                                          <img src={page.imageBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>No Image</span>
                                        )}
                                      </div>

                                      {/* Page Naming Column */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Page Title</span>
                                        <input 
                                          type="text" 
                                          placeholder="Page Title" 
                                          value={page.title || ''} 
                                          onChange={(e) => handleUpdatePage(index, pIdx, 'title', e.target.value)} 
                                          required
                                          style={{ width: '100%', padding: '4px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '0.8rem' }} 
                                        />
                                      </div>

                                      {/* Page Upload Column */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Upload Image</span>
                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          onChange={(e) => handlePageFileChange(index, pIdx, e)} 
                                          required={!page.imageBase64}
                                          style={{ fontSize: '0.75rem', width: '100%', background: 'transparent', border: 'none', padding: 0 }} 
                                        />
                                      </div>

                                      {/* Remove Button */}
                                      <button 
                                        type="button" 
                                        onClick={() => handleRemovePage(index, pIdx)} 
                                        style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '6px' }}
                                      >
                                        <FiTrash2 />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                <button 
                                  type="button" 
                                  className="btn btn-outline btn-sm" 
                                  onClick={() => handleAddPage(index)} 
                                  style={{ fontSize: '0.8rem', padding: '4px 10px', width: 'fit-content' }}
                                >
                                  + Add Page
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {parsingStatus && (
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--warning)' }}>
                      {parsingStatus}
                    </div>
                  )}

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

