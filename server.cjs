const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'bookflix_production_fallback_secure_key_2026_!';

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support base64 image uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Paths
const DATA_DIR = path.join(__dirname, 'server_data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BOOKS_FILE = path.join(DATA_DIR, 'books.json');
const CONTENTS_FILE = path.join(DATA_DIR, 'book_contents.json');

// Ensure database files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const initJsonFile = (filePath, defaultVal = []) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
  }
};

initJsonFile(USERS_FILE, []);
initJsonFile(BOOKS_FILE, []);
initJsonFile(CONTENTS_FILE, {});

// Helper DB Read/Write Functions
const readDB = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeDB = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Seed default admin account on startup if users db is empty
const seedAdmin = async () => {
  const users = readDB(USERS_FILE);
  if (users.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('BookFlix@Optimus2026!', salt);
    const defaultAdmin = {
      id: 'admin-1',
      name: 'Optimus',
      email: 'rahmanridwanidowu@gmail.com',
      passwordHash: adminHash,
      favoriteGenres: [],
      readingList: [],
      readHistory: {},
      ratings: {},
      joinedDate: new Date().toISOString().split('T')[0],
      theme: 'dark',
      isAdmin: true,
      premium: true,
      planId: 'premium'
    };
    users.push(defaultAdmin);
    writeDB(USERS_FILE, users);
    console.log('Seeded default admin account successfully.');
  }
};
seedAdmin();

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Authentication token required' });

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = decodedUser;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Access denied: Admin privileges required' });
  }
  next();
};

// --- AUTH ENDPOINTS ---

// Signup
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, favoriteGenres, isAdmin } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  try {
    const users = readDB(USERS_FILE);
    const lowerEmail = email.toLowerCase();
    
    if (users.some(u => u.email === lowerEmail)) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Admin access is restricted to the specific admin email
    const userIsAdmin = lowerEmail === 'rahmanridwanidowu@gmail.com';

    const newUser = {
      id: Date.now().toString(),
      name,
      email: lowerEmail,
      passwordHash,
      favoriteGenres: favoriteGenres || [],
      readingList: [],
      readHistory: {},
      ratings: {},
      joinedDate: new Date().toISOString().split('T')[0],
      theme: 'dark',
      isAdmin: userIsAdmin,
      premium: userIsAdmin, // Admins get premium by default
      planId: userIsAdmin ? 'premium' : 'free'
    };

    users.push(newUser);
    writeDB(USERS_FILE, users);

    const { passwordHash: _, ...userSession } = newUser;
    const token = jwt.sign(userSession, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: userSession });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const users = readDB(USERS_FILE);
    const lowerEmail = email.toLowerCase();
    const user = users.find(u => u.email === lowerEmail);

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const { passwordHash: _, ...userSession } = user;
    const token = jwt.sign(userSession, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: userSession });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get Current User Profile details
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const users = readDB(USERS_FILE);
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const { passwordHash: _, ...userSession } = user;
  res.json(userSession);
});

// Update Profile General Details
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  const updates = req.body;
  const users = readDB(USERS_FILE);
  const userIndex = users.findIndex(u => u.id === req.user.id);

  if (userIndex === -1) return res.status(404).json({ message: 'User not found' });

  // Update allowed keys only (excluding sensitive password/email)
  const allowedKeys = ['name', 'favoriteGenres', 'theme', 'premium', 'planId', 'isAdmin'];
  allowedKeys.forEach(key => {
    if (updates[key] !== undefined) {
      // If promoting to admin, automatically make them premium too
      if (key === 'isAdmin' && updates[key] === true) {
        users[userIndex]['premium'] = true;
        users[userIndex]['planId'] = 'premium';
      }
      users[userIndex][key] = updates[key];
    }
  });

  writeDB(USERS_FILE, users);

  const { passwordHash: _, ...userSession } = users[userIndex];
  res.json(userSession);
});

// Toggle Save Book (Library bookmarking)
app.post('/api/auth/toggle-save', authenticateToken, (req, res) => {
  const { bookId } = req.body;
  if (!bookId) return res.status(400).json({ message: 'Book ID is required' });

  const numericId = parseInt(bookId);
  const users = readDB(USERS_FILE);
  const userIndex = users.findIndex(u => u.id === req.user.id);

  if (userIndex === -1) return res.status(404).json({ message: 'User not found' });

  let readingList = users[userIndex].readingList || [];
  const isSaved = readingList.includes(numericId);

  if (isSaved) {
    readingList = readingList.filter(id => id !== numericId);
  } else {
    readingList.push(numericId);
  }

  users[userIndex].readingList = readingList;
  writeDB(USERS_FILE, users);

  const { passwordHash: _, ...userSession } = users[userIndex];
  res.json({ saved: !isSaved, user: userSession });
});

// Update Reading Progress
app.post('/api/auth/progress', authenticateToken, (req, res) => {
  const { bookId, chapter, progress } = req.body;
  if (!bookId || chapter === undefined || progress === undefined) {
    return res.status(400).json({ message: 'Book ID, chapter, and progress values are required' });
  }

  const numericId = parseInt(bookId);
  const users = readDB(USERS_FILE);
  const userIndex = users.findIndex(u => u.id === req.user.id);

  if (userIndex === -1) return res.status(404).json({ message: 'User not found' });

  const readHistory = users[userIndex].readHistory || {};
  readHistory[numericId] = {
    chapter: parseInt(chapter),
    progress: parseInt(progress),
    updatedAt: new Date().toISOString()
  };

  users[userIndex].readHistory = readHistory;
  writeDB(USERS_FILE, users);

  const { passwordHash: _, ...userSession } = users[userIndex];
  res.json(userSession);
});

// Update Book Rating
app.post('/api/auth/rate', authenticateToken, (req, res) => {
  const { bookId, rating } = req.body;
  if (!bookId || rating === undefined) {
    return res.status(400).json({ message: 'Book ID and rating value are required' });
  }

  const numericId = parseInt(bookId);
  const users = readDB(USERS_FILE);
  const userIndex = users.findIndex(u => u.id === req.user.id);

  if (userIndex === -1) return res.status(404).json({ message: 'User not found' });

  const ratings = users[userIndex].ratings || {};
  ratings[numericId] = parseInt(rating);

  users[userIndex].ratings = ratings;
  writeDB(USERS_FILE, users);

  const { passwordHash: _, ...userSession } = users[userIndex];
  res.json(userSession);
});

// List All Users (Admin only)
app.get('/api/auth/users', authenticateToken, requireAdmin, (req, res) => {
  const users = readDB(USERS_FILE);
  const sanitized = users.map(({ passwordHash: _, ...user }) => user);
  res.json(sanitized);
});

// Toggle Admin Role Status (Admin only)
app.put('/api/auth/users/:id/admin', authenticateToken, requireAdmin, (req, res) => {
  const targetId = req.params.id;
  const users = readDB(USERS_FILE);
  const targetIndex = users.findIndex(u => u.id === targetId);

  if (targetIndex === -1) return res.status(404).json({ message: 'User not found' });

  // Self role protection
  if (targetId === req.user.id) {
    return res.status(400).json({ message: 'Cannot demote yourself from Admin role' });
  }

  users[targetIndex].isAdmin = !users[targetIndex].isAdmin;
  writeDB(USERS_FILE, users);

  res.json({ message: 'Role status updated successfully', user: users[targetIndex] });
});

// --- BOOKS ENDPOINTS ---

// Get All Books metadata
app.get('/api/books', (req, res) => {
  const books = readDB(BOOKS_FILE);
  res.json(books);
});

// Upload New Book (Admin or Creator)
app.post('/api/books', authenticateToken, requireAdmin, (req, res) => {
  const { metadata, content } = req.body;
  if (!metadata || !content) {
    return res.status(400).json({ message: 'Metadata and content payloads are required' });
  }

  try {
    const books = readDB(BOOKS_FILE);
    const contents = readDB(CONTENTS_FILE);

    // Overwrite metadata if ID matches, else append
    const filteredMetadata = books.filter(b => b.id !== metadata.id);
    filteredMetadata.push(metadata);
    writeDB(BOOKS_FILE, filteredMetadata);

    // Save content
    contents[metadata.id] = {
      bookId: metadata.id,
      ...content
    };
    writeDB(CONTENTS_FILE, contents);

    res.status(201).json(metadata);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error saving book' });
  }
});

// Delete Book (Admin or Creator)
app.delete('/api/books/:id', authenticateToken, requireAdmin, (req, res) => {
  const bookId = parseInt(req.params.id);
  if (!bookId) return res.status(400).json({ message: 'Invalid Book ID' });

  try {
    const books = readDB(BOOKS_FILE);
    const contents = readDB(CONTENTS_FILE);

    const filteredMetadata = books.filter(b => b.id !== bookId);
    writeDB(BOOKS_FILE, filteredMetadata);

    if (contents[bookId]) {
      delete contents[bookId];
      writeDB(CONTENTS_FILE, contents);
    }

    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting book' });
  }
});

// Get Book Content (Chapters / Panels)
app.get('/api/books/:id/content', authenticateToken, (req, res) => {
  const bookId = parseInt(req.params.id);
  const contents = readDB(CONTENTS_FILE);
  const content = contents[bookId];

  if (!content) {
    return res.status(404).json({ message: 'Book content not found' });
  }

  res.json(content);
});

// Serve static files from the React app build if dist exists
const DIST_PATH = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(DIST_PATH, 'index.html'));
    } else {
      next();
    }
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`BookFlix backend API server listening on http://localhost:${PORT}`);
});
