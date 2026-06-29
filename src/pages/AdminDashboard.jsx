import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiBarChart2, FiBook, FiUsers, FiUpload, FiTrash2, FiX, FiCheck, FiCpu, FiTrendingUp, FiFileText, FiShare2, FiActivity, FiGrid 
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
    { id: 'users', icon: <FiUsers />, label: 'Users' },
    { id: 'product', icon: <FiCheck />, label: 'AI Product Roadmap' },
    { id: 'engineering', icon: <FiCpu />, label: 'AI Code Improvements' },
    { id: 'marketing', icon: <FiTrendingUp />, label: 'AI Growth Campaigns' },
    { id: 'content-strategy', icon: <FiFileText />, label: 'AI Content Strategy' },
    { id: 'social', icon: <FiShare2 />, label: 'AI Social Management' },
    { id: 'analytics-strategy', icon: <FiActivity />, label: 'AI Data Intelligence' },
    { id: 'master-control', icon: <FiGrid />, label: 'AI Master Control' }
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

            {/* AI Product Roadmap Section */}
            {activeSection === 'product' && (
              <ProductRoadmapSection />
            )}

            {/* AI Code Improvements Section */}
            {activeSection === 'engineering' && (
              <EngineeringSection />
            )}

            {/* AI Growth Campaigns Section */}
            {activeSection === 'marketing' && (
              <MarketingSection />
            )}

            {/* AI Content Strategy Section */}
            {activeSection === 'content-strategy' && (
              <ContentStrategySection />
            )}

            {/* AI Social Management Section */}
            {activeSection === 'social' && (
              <SocialSection />
            )}

            {/* AI Data Intelligence Section */}
            {activeSection === 'analytics-strategy' && (
              <AnalyticsSection />
            )}

            {/* AI Master Control Section */}
            {activeSection === 'master-control' && (
              <MasterControlSection />
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

function ProductRoadmapSection() {
  const [decisions, setDecisions] = useState([]);
  const [weakness, setWeakness] = useState('Run analysis to discover platform weaknesses and prioritize items.');
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState('');
  const [activeTab, setActiveTab] = useState('roadmap'); // 'roadmap' | 'weaknesses'

  const fetchRoadmap = async () => {
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/product/decisions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDecisions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/product/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goals })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setWeakness(data.weaknessReport);
      setMilestones(data.milestones);
      setDecisions(data.recommendations);
    } catch (err) {
      alert('Failed to analyze: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateDecisionStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch(`/api/admin/product/decisions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setDecisions(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Group decisions
  const proposed = decisions.filter(d => d.status === 'Proposed');
  const backlog = decisions.filter(d => d.status === 'Backlog');
  const inProgress = decisions.filter(d => d.status === 'In Progress');
  const completed = decisions.filter(d => d.status === 'Completed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: 'var(--space-md)' }}>
      {/* Settings & Trigger Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Configure AI Roadmap Agent</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Specify custom product goals or focus areas. The Product Agent analyzes active feedback cohorts and telemetry events to re-triage recommendations.
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Focus goals (e.g., Maximize viral acquisition, signups, referrals, quote sharing, and audio summary integrations)..."
            value={goals}
            onChange={e => setGoals(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '0.9rem',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '10px 24px', flexShrink: 0 }}
          >
            {loading ? 'Re-triaging roadmap...' : 'Trigger AI Roadmap analysis'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px' }}>
        <button
          onClick={() => setActiveTab('roadmap')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'roadmap' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'roadmap' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Product Roadmap Board
        </button>
        <button
          onClick={() => setActiveTab('weaknesses')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'weaknesses' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'weaknesses' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Weakness Reports & Milestones
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'roadmap' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', alignItems: 'start' }}>
          {/* Proposed */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Proposed</span>
              <span className="badge badge-type">{proposed.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {proposed.map(item => <RoadmapCard key={item.id} item={item} onStatusChange={updateDecisionStatus} />)}
              {proposed.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No proposed features.</div>}
            </div>
          </div>

          {/* Backlog */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Backlog</span>
              <span className="badge badge-type">{backlog.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {backlog.map(item => <RoadmapCard key={item.id} item={item} onStatusChange={updateDecisionStatus} />)}
              {backlog.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Backlog is empty.</div>}
            </div>
          </div>

          {/* In Progress */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>In Progress</span>
              <span className="badge badge-type">{inProgress.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {inProgress.map(item => <RoadmapCard key={item.id} item={item} onStatusChange={updateDecisionStatus} />)}
              {inProgress.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No active developments.</div>}
            </div>
          </div>

          {/* Completed */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Completed</span>
              <span className="badge badge-type">{completed.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {completed.map(item => <RoadmapCard key={item.id} item={item} onStatusChange={updateDecisionStatus} />)}
              {completed.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>None completed yet.</div>}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Weaknesses Card */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Product Weakness Report</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', margin: 0 }}>
              {weakness}
            </p>
          </div>

          {/* Milestones Card */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Roadmap Milestones</h3>
            {milestones.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', margin: 0 }}>Run the roadmap analysis to generate prioritized phases.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {milestones.map((m, idx) => (
                  <div key={idx} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '16px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 600 }}>{m.name}</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {m.deliverables && m.deliverables.map((d, dIdx) => <li key={dIdx} style={{ marginBottom: '4px' }}>{d}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoadmapCard({ item, onStatusChange }) {
  const [tasksOpen, setTasksOpen] = useState(false);

  const getPriorityColor = (p) => {
    switch (p.toLowerCase()) {
      case 'critical': return '#ff3b30';
      case 'high': return '#ff9500';
      case 'medium': return '#ffcc00';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
        <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</h5>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: getPriorityColor(item.priority),
          background: 'rgba(255,255,255,0.03)',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {item.priority}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
        {item.description}
      </p>

      {/* Scores indicator mapping new Growth Metrics */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: '0.75rem', color: 'var(--text-tertiary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
        <span>🚀 Growth: <strong>{item.growthImpact || 5}</strong></span>
        <span>🎭 Retention: <strong>{item.retentionImpact || 5}</strong></span>
        <span>🔥 Virality: <strong>{item.viralityPotential || 5}</strong></span>
        <span>🛠️ Effort: <strong>{item.effortScore || 5}</strong></span>
      </div>

      {/* Tasks dropdown */}
      {item.engineeringTasks && item.engineeringTasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => setTasksOpen(!tasksOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              alignSelf: 'flex-start',
              padding: 0,
              fontFamily: 'inherit'
            }}
          >
            {tasksOpen ? 'Hide Engineering Tasks' : `Show Engineering Tasks (${item.engineeringTasks.length})`}
          </button>
          {tasksOpen && (
            <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {item.engineeringTasks.map((t, idx) => <li key={idx} style={{ marginBottom: '2px' }}>{t}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Status Transition controls */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
        {item.status !== 'Proposed' && (
          <button
            onClick={() => {
              const prevs = { 'Backlog': 'Proposed', 'In Progress': 'Backlog', 'Completed': 'In Progress' };
              onStatusChange(item.id, prevs[item.status]);
            }}
            style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px', flex: 1, fontFamily: 'inherit' }}
          >
            ← Back
          </button>
        )}
        {item.status !== 'Completed' && (
          <button
            onClick={() => {
              const nexts = { 'Proposed': 'Backlog', 'Backlog': 'In Progress', 'In Progress': 'Completed' };
              onStatusChange(item.id, nexts[item.status]);
            }}
            style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px', flex: 1, fontFamily: 'inherit' }}
          >
            Advance →
          </button>
        )}
      </div>
    </div>
  );
}

function EngineeringSection() {
  const [tasks, setTasks] = useState([]);
  const [auditReport, setAuditReport] = useState('Run codebase audit to discover technical weaknesses.');
  const [weaknesses, setWeaknesses] = useState('');
  const [roadmap, setRoadmap] = useState([]);
  const [plan, setPlan] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'audit'

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/engineering/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAudit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/engineering/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goals })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setAuditReport(data.auditReport);
      setWeaknesses(data.weaknessesReport);
      setRoadmap(data.roadmap);
      setPlan(data.plan);
      setTasks(data.tasks);
    } catch (err) {
      alert('Failed to run engineering audit: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch(`/api/admin/engineering/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Group tasks
  const proposed = tasks.filter(t => t.status === 'Proposed');
  const inProgress = tasks.filter(t => t.status === 'In Progress');
  const completed = tasks.filter(t => t.status === 'Completed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: 'var(--space-md)' }}>
      {/* Configuration Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Configure AI Engineering Agent</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Direct the Engineering Agent to focus on specific code optimization targets (e.g. Redesign reader selectors, reduce flat-file save clashes).
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Focus targets (e.g., Fix reader overlaps, debounce bookmark progress commits, Cache summaries)..."
            value={goals}
            onChange={e => setGoals(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '0.9rem',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleAudit}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '10px 24px', flexShrink: 0 }}
          >
            {loading ? 'Executing Code Audit...' : 'Trigger AI Code Audit'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px' }}>
        <button
          onClick={() => setActiveTab('tasks')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'tasks' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'tasks' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Engineering Task Board
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'audit' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Audit Reports & Technical Weaknesses
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'tasks' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', alignItems: 'start' }}>
          {/* Proposed */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Proposed Improvement Tickets</span>
              <span className="badge badge-type">{proposed.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {proposed.map(t => <EngineeringTaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />)}
              {proposed.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No proposed improvement tasks.</div>}
            </div>
          </div>

          {/* In Progress */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>In Active Development</span>
              <span className="badge badge-type">{inProgress.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {inProgress.map(t => <EngineeringTaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />)}
              {inProgress.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No active dev tasks.</div>}
            </div>
          </div>

          {/* Completed */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Completed Refactors</span>
              <span className="badge badge-type">{completed.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {completed.map(t => <EngineeringTaskCard key={t.id} task={t} onStatusChange={handleStatusChange} />)}
              {completed.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>None resolved yet.</div>}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Audit report */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Engineering Audit Summary</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
              {auditReport}
            </p>
          </div>

          {/* Technical weaknesses */}
          {weaknesses && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600, color: '#ff3b30' }}>Technical Weaknesses Report</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
                {weaknesses}
              </p>
            </div>
          )}

          {/* Code improvement plan */}
          {plan && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Code Improvement Plan</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
                {plan}
              </p>
            </div>
          )}

          {/* Implementation Roadmap */}
          {roadmap.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Implementation Roadmap</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {roadmap.map((m, idx) => (
                  <div key={idx} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: '16px' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 600 }}>{m.phase}</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {m.tasks && m.tasks.map((t, tIdx) => <li key={tIdx} style={{ marginBottom: '4px' }}>{t}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EngineeringTaskCard({ task, onStatusChange }) {
  const getCategoryColor = (cat) => {
    switch (cat.toUpperCase()) {
      case 'UI': return 'var(--accent)';
      case 'PERFORMANCE': return '#4facfe';
      case 'AI SUMMARIES': return '#46d369';
      case 'AI LIBRARIAN': return '#ffcc00';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
        <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</h5>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: getCategoryColor(task.category),
          background: 'rgba(255,255,255,0.03)',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {task.category}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
        {task.description}
      </p>

      {/* Progress transitions */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
        {task.status !== 'Proposed' && (
          <button
            onClick={() => {
              const prevs = { 'In Progress': 'Proposed', 'Completed': 'In Progress' };
              onStatusChange(task.id, prevs[task.status]);
            }}
            style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px', flex: 1, fontFamily: 'inherit' }}
          >
            ← Back
          </button>
        )}
        {task.status !== 'Completed' && (
          <button
            onClick={() => {
              const nexts = { 'Proposed': 'In Progress', 'In Progress': 'Completed' };
              onStatusChange(task.id, nexts[task.status]);
            }}
            style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px', flex: 1, fontFamily: 'inherit' }}
          >
            Advance →
          </button>
        )}
      </div>
    </div>
  );
}

function MarketingSection() {
  const [campaigns, setCampaigns] = useState([]);
  const [strategy, setStrategy] = useState('Run AI Growth analysis to formulate marketing strategies.');
  const [channelStrategy, setChannelStrategy] = useState('');
  const [acquisitionPlan, setAcquisitionPlan] = useState('');
  const [experiments, setExperiments] = useState([]);
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' | 'strategy'

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/marketing/campaigns', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/marketing/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goals })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setStrategy(data.growthStrategy);
      setChannelStrategy(data.channelStrategy);
      setAcquisitionPlan(data.acquisitionPlan);
      setExperiments(data.experiments);
      setCampaigns(data.campaigns);
    } catch (err) {
      alert('Failed to execute growth analysis: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch(`/api/admin/marketing/campaigns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Group campaigns
  const planned = campaigns.filter(c => c.status === 'Planned');
  const active = campaigns.filter(c => c.status === 'Active');
  const completed = campaigns.filter(c => c.status === 'Completed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: 'var(--space-md)' }}>
      {/* Configuration Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Configure AI Growth Strategist</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Specify acquisition objectives or focus channels (e.g. TikTok study hacks threads, referral loops, WhatsApp studies sharing hooks).
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Focus campaigns (e.g., Target TikTok study influencers, WhatsApp quote share loop)..."
            value={goals}
            onChange={e => setGoals(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '0.9rem',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '10px 24px', flexShrink: 0 }}
          >
            {loading ? 'Analyzing Growth Ops...' : 'Trigger AI Growth Strategy'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px' }}>
        <button
          onClick={() => setActiveTab('campaigns')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'campaigns' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'campaigns' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Growth Campaigns board
        </button>
        <button
          onClick={() => setActiveTab('strategy')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'strategy' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'strategy' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Acquisition & Channel Strategies
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'campaigns' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', alignItems: 'start' }}>
          {/* Planned */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Planned Campaigns</span>
              <span className="badge badge-type">{planned.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {planned.map(c => <MarketingCampaignCard key={c.id} campaign={c} onStatusChange={handleStatusChange} />)}
              {planned.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No campaigns planned.</div>}
            </div>
          </div>

          {/* Active */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Active Experiments</span>
              <span className="badge badge-type">{active.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {active.map(c => <MarketingCampaignCard key={c.id} campaign={c} onStatusChange={handleStatusChange} />)}
              {active.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No active campaigns.</div>}
            </div>
          </div>

          {/* Completed */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Completed Campaigns</span>
              <span className="badge badge-type">{completed.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {completed.map(c => <MarketingCampaignCard key={c.id} campaign={c} onStatusChange={handleStatusChange} />)}
              {completed.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>None completed yet.</div>}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Growth Strategy */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Growth Strategy</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
              {strategy}
            </p>
          </div>

          {/* Channel Strategy */}
          {channelStrategy && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Channel Strategy</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
                {channelStrategy}
              </p>
            </div>
          )}

          {/* Acquisition Plan */}
          {acquisitionPlan && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>User Acquisition Plan</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
                {acquisitionPlan}
              </p>
            </div>
          )}

          {/* Growth Experiments */}
          {experiments.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Growth Experiments</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {experiments.map((e, idx) => <li key={idx} style={{ marginBottom: '6px' }}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MarketingCampaignCard({ campaign, onStatusChange }) {
  const getChannelColor = (chan) => {
    switch (chan.toLowerCase()) {
      case 'tiktok': return '#ff0050';
      case 'instagram': return '#c13584';
      case 'whatsapp': return '#25d366';
      case 'x': return '#ffffff';
      case 'telegram': return '#0088cc';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
        <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{campaign.title}</h5>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: getChannelColor(campaign.channel),
          background: 'rgba(255,255,255,0.03)',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {campaign.channel}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
        {campaign.description}
      </p>

      {/* Progress transitions */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
        {campaign.status !== 'Planned' && (
          <button
            onClick={() => {
              const prevs = { 'Active': 'Planned', 'Completed': 'Active' };
              onStatusChange(campaign.id, prevs[campaign.status]);
            }}
            style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px', flex: 1, fontFamily: 'inherit' }}
          >
            ← Back
          </button>
        )}
        {campaign.status !== 'Completed' && (
          <button
            onClick={() => {
              const nexts = { 'Planned': 'Active', 'Active': 'Completed' };
              onStatusChange(campaign.id, nexts[campaign.status]);
            }}
            style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px', flex: 1, fontFamily: 'inherit' }}
          >
            Advance →
          </button>
        )}
      </div>
    </div>
  );
}

function ContentStrategySection() {
  const [posts, setPosts] = useState([]);
  const [strategy, setStrategy] = useState('Run AI Content analysis to formulate content pillars.');
  const [ideas, setIdeas] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [hooks, setHooks] = useState([]);
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('drafts'); // 'drafts' | 'calendar' | 'strategy'

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/content/posts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/content/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goals })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setStrategy(data.strategy);
      setIdeas(data.ideas);
      setCalendar(data.calendar);
      setHooks(data.hooks);
      setPosts(data.posts);
    } catch (err) {
      alert('Failed to execute content analysis: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch(`/api/admin/content/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Group posts
  const drafts = posts.filter(p => p.status === 'Draft');
  const scheduled = posts.filter(p => p.status === 'Scheduled');
  const published = posts.filter(p => p.status === 'Published');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: 'var(--space-md)' }}>
      {/* Configuration Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Configure AI Content Strategist</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Specify content topics or platforms focus (e.g. TikTok video hooks, Twitter threads, WhatsApp study hacks, or promotional campaigns).
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Focus copy targets (e.g., Biology midterms summaries TikTok, X books threads)..."
            value={goals}
            onChange={e => setGoals(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '0.9rem',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '10px 24px', flexShrink: 0 }}
          >
            {loading ? 'Generating Copy...' : 'Trigger AI Copy Generation'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px' }}>
        <button
          onClick={() => setActiveTab('drafts')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'drafts' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'drafts' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Draft Promotional Copies
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'calendar' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'calendar' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Weekly Content Calendar
        </button>
        <button
          onClick={() => setActiveTab('strategy')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'strategy' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'strategy' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Pillars, Strategy & Viral Hooks
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'drafts' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', alignItems: 'start' }}>
          {/* Drafts */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Copy Drafts</span>
              <span className="badge badge-type">{drafts.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {drafts.map(p => <ContentPostCard key={p.id} post={p} onStatusChange={handleStatusChange} />)}
              {drafts.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No drafts generated.</div>}
            </div>
          </div>

          {/* Scheduled */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Scheduled Posts</span>
              <span className="badge badge-type">{scheduled.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scheduled.map(p => <ContentPostCard key={p.id} post={p} onStatusChange={handleStatusChange} />)}
              {scheduled.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No posts scheduled.</div>}
            </div>
          </div>

          {/* Published */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Published Campaign Logs</span>
              <span className="badge badge-type">{published.length}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {published.map(p => <ContentPostCard key={p.id} post={p} onStatusChange={handleStatusChange} />)}
              {published.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>None published yet.</div>}
            </div>
          </div>
        </div>
      ) : activeTab === 'calendar' ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>Weekly Calendar Schedule</h3>
          {calendar.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', margin: 0 }}>Run the content strategist to generate weekly schedule tables.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {calendar.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', gap: '16px' }}>
                  <div style={{ width: '100px', fontWeight: 700, color: 'var(--accent)' }}>{item.day}</div>
                  <div style={{ width: '120px', color: 'var(--text-muted)' }}><span className="badge badge-type">{item.topic}</span></div>
                  <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.task}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Strategy */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Social Content Strategy</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
              {strategy}
            </p>
          </div>

          {/* Daily Ideas */}
          {ideas.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Daily content ideas</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {ideas.map((e, idx) => <li key={idx} style={{ marginBottom: '6px' }}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Viral Hooks */}
          {hooks.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600, color: '#ff3b30' }}>Viral Hooks List</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {hooks.map((e, idx) => <li key={idx} style={{ marginBottom: '6px' }}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContentPostCard({ post, onStatusChange }) {
  const getPlatformColor = (plat) => {
    switch (plat.toLowerCase()) {
      case 'x': return '#ffffff';
      case 'instagram': return '#c13584';
      case 'tiktok': return '#ff0050';
      case 'whatsapp': return '#25d366';
      case 'telegram': return '#0088cc';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
        <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{post.title}</h5>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          color: getPlatformColor(post.platform),
          background: 'rgba(255,255,255,0.03)',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {post.platform}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
        {post.body}
      </p>

      {/* Progress transitions */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
        {post.status !== 'Draft' && (
          <button
            onClick={() => {
              const prevs = { 'Scheduled': 'Draft', 'Published': 'Scheduled' };
              onStatusChange(post.id, prevs[post.status]);
            }}
            style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px', flex: 1, fontFamily: 'inherit' }}
          >
            ← Back
          </button>
        )}
        {post.status !== 'Published' && (
          <button
            onClick={() => {
              const nexts = { 'Draft': 'Scheduled', 'Scheduled': 'Published' };
              onStatusChange(post.id, nexts[post.status]);
            }}
            style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px', flex: 1, fontFamily: 'inherit' }}
          >
            Advance →
          </button>
        )}
      </div>
    </div>
  );
}

function SocialSection() {
  const [metrics, setMetrics] = useState([]);
  const [strategy, setStrategy] = useState('Run AI Social analysis to configure publishing strategies.');
  const [schedule, setSchedule] = useState([]);
  const [report, setReport] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'schedule' | 'strategy'

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/social/metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/social/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goals })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setStrategy(data.publishingStrategy);
      setSchedule(data.postingSchedule);
      setReport(data.engagementReports);
      setMetrics(data.metrics);
    } catch (err) {
      alert('Failed to execute social analysis: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCounts = async (id, updatedFields) => {
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch(`/api/admin/social/metrics/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(prev => prev.map(m => m.id === id ? data : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: 'var(--space-md)' }}>
      {/* Configuration Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Configure AI Social Manager</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Direct the Social Agent to optimize publishing schedules and track conversion metrics (installs, clicks, shares) across platforms.
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Focus parameters (e.g., Increase TikTok study clips, optimize X thread slots)..."
            value={goals}
            onChange={e => setGoals(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '0.9rem',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '10px 24px', flexShrink: 0 }}
          >
            {loading ? 'Analyzing Engagement...' : 'Trigger AI Engagement Analysis'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px' }}>
        <button
          onClick={() => setActiveTab('metrics')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'metrics' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'metrics' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Social Conversion Metrics
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'schedule' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'schedule' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Automated Posting Schedule
        </button>
        <button
          onClick={() => setActiveTab('strategy')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'strategy' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'strategy' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Publishing Strategy & Reports
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'metrics' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {metrics.map(m => (
              <SocialMetricCard key={m.id} metric={m} onUpdate={handleUpdateCounts} />
            ))}
            {metrics.length === 0 && (
              <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No active social metrics records. Trigger the AI Strategy to populate mock entries.
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'schedule' ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>Social Posting Schedule</h3>
          {schedule.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', margin: 0 }}>Run the social manager to generate scheduled post timecards.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {schedule.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '80px', fontWeight: 700, color: 'var(--accent)' }}>{item.time}</div>
                  <div style={{ width: '100px' }}><span className="badge badge-type">{item.platform}</span></div>
                  <div style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 500 }}>{item.postTitle}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Strategy */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Publishing Strategy</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
              {strategy}
            </p>
          </div>

          {/* Engagement Reports */}
          {report && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Engagement & sentiment insights</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
                {report}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SocialMetricCard({ metric, onUpdate }) {
  const getPlatformColor = (plat) => {
    switch (plat.toLowerCase()) {
      case 'x': return '#ffffff';
      case 'instagram': return '#c13584';
      case 'tiktok': return '#ff0050';
      case 'whatsapp': return '#25d366';
      case 'telegram': return '#0088cc';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{metric.postTitle}</h4>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: getPlatformColor(metric.platform),
          background: 'rgba(255,255,255,0.03)',
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          {metric.platform}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Likes</span>
          <strong style={{ fontSize: '0.95rem' }}>{metric.likes}</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Comments</span>
          <strong style={{ fontSize: '0.95rem' }}>{metric.comments}</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Shares</span>
          <strong style={{ fontSize: '0.95rem' }}>{metric.shares}</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Saves</span>
          <strong style={{ fontSize: '0.95rem' }}>{metric.saves}</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Clicks</span>
          <strong style={{ fontSize: '0.95rem', color: 'var(--accent)' }}>{metric.clicks}</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Installs</span>
          <strong style={{ fontSize: '0.95rem', color: '#46d369' }}>{metric.installs}</strong>
        </div>
      </div>

      {/* Button to simulate click event */}
      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
        <button
          onClick={() => onUpdate(metric.id, { clicks: metric.clicks + 10, installs: metric.installs + 1 })}
          style={{
            flex: 1,
            padding: '6px 12px',
            fontSize: '0.75rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            borderRadius: '4px',
            fontFamily: 'inherit'
          }}
        >
          Simulate Click (+10 clicks, +1 install)
        </button>
      </div>
    </div>
  );
}

function AnalyticsSection() {
  const [report, setReport] = useState(null);
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('kpis'); // 'kpis' | 'funnel' | 'insights'

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/analytics/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setReport(data[0]); // Show latest report
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/analytics/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goals })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setReport(data);
    } catch (err) {
      alert('Failed to execute analytics audit: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: 'var(--space-md)' }}>
      {/* Configuration Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Configure AI Data Strategist</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Direct the Analytics Agent to scan user activity records, retention churn signals, and acquisition leaks.
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Focus KPIs audit (e.g., Optimize D1 to D7 retention cohorts, audit TikTok CAC)..."
            value={goals}
            onChange={e => setGoals(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '0.9rem',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '10px 24px', flexShrink: 0 }}
          >
            {loading ? 'Evaluating Telemetry...' : 'Trigger AI Data Audit'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px' }}>
        <button
          onClick={() => setActiveTab('kpis')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'kpis' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'kpis' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Primary Growth & Marketing KPIs
        </button>
        <button
          onClick={() => setActiveTab('funnel')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'funnel' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'funnel' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Cohort Retention & Churn
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'insights' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'insights' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Leakage Audits & Recommendations
        </button>
      </div>

      {/* Tab Panels */}
      {!report ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          No active telemetry reports generated yet. Trigger the AI Data Audit to inspect system metrics.
        </div>
      ) : activeTab === 'kpis' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Active Installs</span>
              <h2 style={{ fontSize: '2rem', margin: '8px 0 0 0', fontWeight: 700, color: 'var(--accent)' }}>{report.growthKpis?.installs || 0}</h2>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Signups</span>
              <h2 style={{ fontSize: '2rem', margin: '8px 0 0 0', fontWeight: 700, color: '#fff' }}>{report.growthKpis?.signups || 0}</h2>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Active Readers</span>
              <h2 style={{ fontSize: '2rem', margin: '8px 0 0 0', fontWeight: 700, color: '#4facfe' }}>{report.growthKpis?.active_users || 0}</h2>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>TikTok / X CAC</span>
              <h2 style={{ fontSize: '2rem', margin: '8px 0 0 0', fontWeight: 700, color: '#46d369' }}>${report.marketingKpis?.cac_usd || 0}</h2>
            </div>
          </div>

          {/* Growth Summary */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Primary Growth Metrics Summary</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              {report.growthReport}
            </p>
          </div>
        </div>
      ) : activeTab === 'funnel' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Retention Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Day 1 Cohort</span>
              <h2 style={{ fontSize: '2.2rem', margin: '8px 0 0 0', fontWeight: 700 }}>{report.retentionKpis?.d1_retention_pct || 0}%</h2>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Day 7 Cohort</span>
              <h2 style={{ fontSize: '2.2rem', margin: '8px 0 0 0', fontWeight: 700 }}>{report.retentionKpis?.d7_retention_pct || 0}%</h2>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Day 30 Cohort</span>
              <h2 style={{ fontSize: '2.2rem', margin: '8px 0 0 0', fontWeight: 700 }}>{report.retentionKpis?.d30_retention_pct || 0}%</h2>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Monthly Churn</span>
              <h2 style={{ fontSize: '2.2rem', margin: '8px 0 0 0', fontWeight: 700, color: '#ff3b30' }}>{report.retentionKpis?.churn_rate_pct || 0}%</h2>
            </div>
          </div>

          {/* Retention Cohorts Description */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Retention & Study Engagement Report</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              {report.retentionReport}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Weakness leak audit */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600, color: '#ff3b30' }}>Detected Drop-off Leakages</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              {report.weaknessReport}
            </p>
          </div>

          {/* Recommendations */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)' }}>AI Optimization Action items</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
              {report.recommendations}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MasterControlSection() {
  const [decision, setDecision] = useState(null);
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'priorities' | 'roadmap'

  const fetchDecisions = async () => {
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/master/decisions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setDecision(data[0]); // Show latest coordinator decision
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/master/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goals })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setDecision(data);
    } catch (err) {
      alert('Failed to execute Master Agent coordinator check: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunCascade = async () => {
    setCascadeLoading(true);
    try {
      const token = localStorage.getItem('bookflix_token');
      const res = await fetch('/api/admin/orchestrate/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setDecision(data.savedDecision);
      alert('Cascading agent pipeline successfully executed!');
    } catch (err) {
      alert('Failed to run cascading pipeline orchestration: ' + err.message);
    } finally {
      setCascadeLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: 'var(--space-md)' }}>
      {/* Configuration Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Configure Master AI System Coordinator</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Manage all BookFlix AI Agents. Run a single coordination analysis or trigger the **Cascading Execution pipeline** to run all 8 agents sequentially.
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Focus directives (e.g., Focus on student viral loops, optimize engineering backlog cost)..."
            value={goals}
            onChange={e => setGoals(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '0.9rem',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || cascadeLoading}
            className="btn btn-secondary"
            style={{ padding: '10px 20px', flexShrink: 0 }}
          >
            {loading ? 'Analyzing...' : 'Run Master Check'}
          </button>
          <button
            onClick={handleRunCascade}
            disabled={loading || cascadeLoading}
            className="btn btn-primary"
            style={{ padding: '10px 24px', flexShrink: 0, background: '#4facfe', borderColor: '#4facfe' }}
          >
            {cascadeLoading ? 'Running Cascade Pipeline...' : 'Run Cascading Pipeline Trigger'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'dashboard' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Coordinated System Health
        </button>
        <button
          onClick={() => setActiveTab('priorities')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'priorities' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'priorities' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          Priority Ranking Backlog
        </button>
        <button
          onClick={() => setActiveTab('roadmap')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'roadmap' ? '2px solid var(--accent)' : 'none',
            padding: '10px 4px',
            color: activeTab === 'roadmap' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontFamily: 'inherit'
          }}
        >
          AI Coordinated Roadmap
        </button>
      </div>

      {/* Tab Panels */}
      {!decision ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          No coordinated decisions generated yet. Trigger the Master Check or Cascading Pipeline above.
        </div>
      ) : activeTab === 'dashboard' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Health Index Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Growth Index</span>
              <h2 style={{ fontSize: '2rem', margin: '8px 0 0 0', fontWeight: 700, color: 'var(--accent)' }}>{decision.systemHealth?.growth_index || 0}%</h2>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Retention Index</span>
              <h2 style={{ fontSize: '2rem', margin: '8px 0 0 0', fontWeight: 700, color: '#ff3b30' }}>{decision.systemHealth?.retention_index || 0}%</h2>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>UX Index</span>
              <h2 style={{ fontSize: '2rem', margin: '8px 0 0 0', fontWeight: 700, color: '#4facfe' }}>{decision.systemHealth?.ux_index || 0}%</h2>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Code Stability</span>
              <h2 style={{ fontSize: '2rem', margin: '8px 0 0 0', fontWeight: 700, color: '#46d369' }}>{decision.systemHealth?.code_stability_index || 0}%</h2>
            </div>
          </div>

          {/* Strategic Directive */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 600 }}>Central Strategic Directive</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
              {decision.strategicDecisions}
            </p>
          </div>
        </div>
      ) : activeTab === 'priorities' ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>Backlog Prioritization Ranking</h3>
          {decision.priorityRanking?.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', margin: 0 }}>No priorities ranked.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {decision.priorityRanking?.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', gap: '16px', alignItems: 'start' }}>
                  <div style={{ width: '40px', fontWeight: 700, color: 'var(--accent)', fontSize: '1.2rem' }}>#{item.rank}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {item.taskName}
                      <span className="badge badge-type">{item.assignedAgent}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>{item.rationale}</div>
                  </div>
                  <div style={{ width: '120px', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Impact: <strong style={{ color: item.impact === 'High' ? '#46d369' : '#fff' }}>{item.impact}</strong></span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cost: <strong style={{ color: item.cost === 'Low' ? '#4facfe' : '#fff' }}>{item.cost}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>Multi-Phase Execution Roadmap</h3>
          {decision.executionRoadmap?.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', margin: 0 }}>No roadmap compiled.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {decision.executionRoadmap?.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent)' }}></div>
                    {idx !== decision.executionRoadmap.length - 1 && <div style={{ width: '2px', flex: 1, background: 'var(--border)' }}></div>}
                  </div>
                  <div style={{ flex: 1, paddingBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>{item.phase}</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.objective}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

