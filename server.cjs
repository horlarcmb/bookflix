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
const mongoose = require('mongoose');
const DATA_DIR = path.join(__dirname, 'server_data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BOOKS_FILE = path.join(DATA_DIR, 'books.json');
const CONTENTS_FILE = path.join(DATA_DIR, 'book_contents.json');
const TELEMETRY_FILE = path.join(DATA_DIR, 'telemetry.json');

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
initJsonFile(TELEMETRY_FILE, []);

// Helper DB Read/Write Functions
const readDB = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeDB = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// --- MONGODB CONNECTION SETUP ---
const MONGODB_URI = process.env.MONGODB_URI;
let useMongo = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB successfully.');
      useMongo = true;
      seedAdmin();
    })
    .catch(err => {
      console.error('Error connecting to MongoDB, falling back to JSON storage:', err);
      useMongo = false;
      seedAdmin();
    });
} else {
  console.log('MONGODB_URI not set. Running with local JSON database files.');
  useMongo = false;
  setTimeout(() => seedAdmin(), 100);
}

// --- MONGOOSE SCHEMAS & MODELS ---
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  favoriteGenres: { type: [String], default: [] },
  readingList: { type: [Number], default: [] },
  readHistory: { type: Map, of: new mongoose.Schema({
    chapter: Number,
    progress: Number,
    updatedAt: String
  }, { _id: false }), default: {} },
  ratings: { type: Map, of: Number, default: {} },
  joinedDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  theme: { type: String, default: 'dark' },
  isAdmin: { type: Boolean, default: false },
  premium: { type: Boolean, default: false },
  planId: { type: String, default: 'free' }
});

const BookSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  cover: { type: String, required: true },
  gradient: { type: String, default: null },
  genre: { type: [String], default: ['Fiction'] },
  type: { type: String, required: true },
  contentFormat: { type: String, required: true },
  rating: { type: Number, default: 4.5 },
  synopsis: { type: String, required: true },
  chapters: { type: Number, default: 0 },
  status: { type: String, default: 'Completed' },
  language: { type: String, default: 'English' },
  tags: { type: [String], default: [] },
  readCount: { type: Number, default: 0 },
  premium: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  isAIGenerated: { type: Boolean, default: false },
  dateAdded: { type: String, default: () => new Date().toISOString().split('T')[0] },
  pages: { type: Number, default: 0 },
  publisher: { type: String, default: 'User Self-Publish' }
});

const BookContentSchema = new mongoose.Schema({
  bookId: { type: Number, required: true, unique: true },
  chapters: { type: [new mongoose.Schema({
    title: String,
    content: String
  }, { _id: false })] },
  pages: { type: [new mongoose.Schema({
    pageNumber: Number,
    imageBase64: String,
    dialogue: String,
    description: String
  }, { _id: false })] }
});

const UserModel = mongoose.model('User', UserSchema);
const BookModel = mongoose.model('Book', BookSchema);
const BookContentModel = mongoose.model('BookContent', BookContentSchema);

const TelemetrySchema = new mongoose.Schema({
  userId: { type: String, default: null },
  userEmail: { type: String, default: null },
  eventType: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  planId: { type: String, default: null },
  bankDetails: { type: mongoose.Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: Date.now }
});

const SystemSettingsSchema = new mongoose.Schema({
  balance: { type: Number, default: 0.00 },
  bankDetails: {
    bankName: { type: String, default: null },
    accountNumber: { type: String, default: null },
    routingNumber: { type: String, default: null },
    holderName: { type: String, default: null }
  }
});

const TelemetryModel = mongoose.model('Telemetry', TelemetrySchema);
const TransactionModel = mongoose.model('Transaction', TransactionSchema);
const SystemSettingsModel = mongoose.model('SystemSettings', SystemSettingsSchema);

// --- DATABASE ABSTRACTION LAYER ---
const db = {
  getUsers: async () => {
    if (useMongo) {
      return await UserModel.find({}).lean();
    } else {
      return readDB(USERS_FILE);
    }
  },

  findUserByEmail: async (email) => {
    const lowerEmail = email.toLowerCase();
    if (useMongo) {
      return await UserModel.findOne({ email: lowerEmail }).lean();
    } else {
      const users = readDB(USERS_FILE);
      return users.find(u => u.email === lowerEmail) || null;
    }
  },

  findUserById: async (id) => {
    if (useMongo) {
      return await UserModel.findOne({ id }).lean();
    } else {
      const users = readDB(USERS_FILE);
      return users.find(u => u.id === id) || null;
    }
  },

  createUser: async (userData) => {
    if (useMongo) {
      const user = new UserModel(userData);
      await user.save();
      return user.toObject();
    } else {
      const users = readDB(USERS_FILE);
      users.push(userData);
      writeDB(USERS_FILE, users);
      return userData;
    }
  },

  updateUser: async (id, updates) => {
    if (useMongo) {
      const updateData = {};
      const allowedKeys = ['name', 'favoriteGenres', 'theme', 'premium', 'planId', 'isAdmin', 'readingList', 'readHistory', 'ratings'];
      allowedKeys.forEach(k => {
        if (updates[k] !== undefined) {
          updateData[k] = updates[k];
        }
      });
      return await UserModel.findOneAndUpdate({ id }, { $set: updateData }, { new: true }).lean();
    } else {
      const users = readDB(USERS_FILE);
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      
      const allowedKeys = ['name', 'favoriteGenres', 'theme', 'premium', 'planId', 'isAdmin', 'readingList', 'readHistory', 'ratings'];
      allowedKeys.forEach(key => {
        if (updates[key] !== undefined) {
          if (key === 'isAdmin' && updates[key] === true) {
            users[idx]['premium'] = true;
            users[idx]['planId'] = 'premium';
          }
          users[idx][key] = updates[key];
        }
      });
      writeDB(USERS_FILE, users);
      return users[idx];
    }
  },

  getBooks: async () => {
    if (useMongo) {
      return await BookModel.find({}).lean();
    } else {
      return readDB(BOOKS_FILE);
    }
  },

  saveBook: async (metadata, content) => {
    if (useMongo) {
      await BookModel.findOneAndDelete({ id: metadata.id });
      const book = new BookModel(metadata);
      await book.save();

      await BookContentModel.findOneAndDelete({ bookId: metadata.id });
      const bookContent = new BookContentModel({
        bookId: metadata.id,
        ...content
      });
      await bookContent.save();
      return metadata;
    } else {
      const books = readDB(BOOKS_FILE);
      const contents = readDB(CONTENTS_FILE);

      const filteredMetadata = books.filter(b => b.id !== metadata.id);
      filteredMetadata.push(metadata);
      writeDB(BOOKS_FILE, filteredMetadata);

      contents[metadata.id] = {
        bookId: metadata.id,
        ...content
      };
      writeDB(CONTENTS_FILE, contents);
      return metadata;
    }
  },

  updateBook: async (id, metadataUpdates, contentUpdates) => {
    if (useMongo) {
      let book = await BookModel.findOne({ id });
      if (!book) return null;
      Object.assign(book, metadataUpdates);
      await book.save();

      if (contentUpdates) {
        let bookContent = await BookContentModel.findOne({ bookId: id });
        if (!bookContent) {
          bookContent = new BookContentModel({ bookId: id, ...contentUpdates });
        } else {
          Object.assign(bookContent, contentUpdates);
        }
        await bookContent.save();
      }
      return book.toObject();
    } else {
      const books = readDB(BOOKS_FILE);
      const idx = books.findIndex(b => b.id === id);
      if (idx === -1) return null;

      books[idx] = { ...books[idx], ...metadataUpdates };
      writeDB(BOOKS_FILE, books);

      if (contentUpdates) {
        const contents = readDB(CONTENTS_FILE);
        contents[id] = { ...contents[id], ...contentUpdates };
        writeDB(CONTENTS_FILE, contents);
      }
      return books[idx];
    }
  },

  deleteBook: async (id) => {
    if (useMongo) {
      await BookModel.findOneAndDelete({ id });
      await BookContentModel.findOneAndDelete({ bookId: id });
      return true;
    } else {
      const books = readDB(BOOKS_FILE);
      const contents = readDB(CONTENTS_FILE);

      const filteredMetadata = books.filter(b => b.id !== id);
      writeDB(BOOKS_FILE, filteredMetadata);

      if (contents[id]) {
        delete contents[id];
        writeDB(CONTENTS_FILE, contents);
      }
      return true;
    }
  },

  getBookContent: async (id) => {
    if (useMongo) {
      return await BookContentModel.findOne({ bookId: id }).lean();
    } else {
      const contents = readDB(CONTENTS_FILE);
      return contents[id] || null;
    }
  },

  logTelemetry: async (eventData) => {
    if (useMongo) {
      const log = new TelemetryModel(eventData);
      await log.save();
      return log.toObject();
    } else {
      const logs = readDB(TELEMETRY_FILE);
      const newLog = { ...eventData, timestamp: new Date().toISOString() };
      logs.push(newLog);
      writeDB(TELEMETRY_FILE, logs);
      return newLog;
    }
  },

  getTelemetry: async () => {
    if (useMongo) {
      return await TelemetryModel.find({}).sort({ timestamp: -1 }).limit(100).lean();
    } else {
      const logs = readDB(TELEMETRY_FILE);
      return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 100);
    }
  }
};

// Seed default admin account on startup if users db is empty
const seedAdmin = async () => {
  try {
    const users = await db.getUsers();
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
      await db.createUser(defaultAdmin);
      console.log('Seeded default admin account successfully.');
    }
  } catch (err) {
    console.error('Error seeding admin:', err);
  }
};

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
  const { name, email, password, favoriteGenres } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  // Backend Field Validation
  if (trimmedName.length === 0) {
    return res.status(400).json({ message: 'Name cannot be empty' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  try {
    const existingUser = await db.findUserByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userIsAdmin = trimmedEmail === 'rahmanridwanidowu@gmail.com';

    const newUser = {
      id: Date.now().toString(),
      name: trimmedName,
      email: trimmedEmail,
      passwordHash,
      favoriteGenres: favoriteGenres || [],
      readingList: [],
      readHistory: {},
      ratings: {},
      joinedDate: new Date().toISOString().split('T')[0],
      theme: 'dark',
      isAdmin: userIsAdmin,
      premium: userIsAdmin,
      planId: userIsAdmin ? 'premium' : 'free'
    };

    const created = await db.createUser(newUser);
    const { passwordHash: _, ...userSession } = created;
    const token = jwt.sign(userSession, JWT_SECRET, { expiresIn: '7d' });

    // Log telemetry
    await db.logTelemetry({
      userId: created.id,
      userEmail: created.email,
      eventType: 'registration',
      metadata: { name: created.name },
      timestamp: new Date()
    });

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

  const trimmedEmail = email.trim().toLowerCase();

  // Backend Field Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  try {
    const user = await db.findUserByEmail(trimmedEmail);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const { passwordHash: _, ...userSession } = user;
    const token = jwt.sign(userSession, JWT_SECRET, { expiresIn: '7d' });

    // Log telemetry
    await db.logTelemetry({
      userId: user.id,
      userEmail: user.email,
      eventType: 'login',
      metadata: { name: user.name },
      timestamp: new Date()
    });

    res.json({ token, user: userSession });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get Current User Profile details
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { passwordHash: _, ...userSession } = user;
    res.json(userSession);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Profile General Details
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const updates = req.body;
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (updates.isAdmin === true) {
      updates.premium = true;
      updates.planId = 'premium';
    }

    // Detect plan changes and record revenue
    if (updates.planId && updates.planId !== user.planId) {
      let price = 0;
      if (updates.planId === 'standard') price = 1.00;
      else if (updates.planId === 'premium') price = 2.00;

      if (price > 0) {
        const settings = await db.getSystemSettings();
        const nextBalance = parseFloat((settings.balance + price).toFixed(2));
        await db.updateSystemSettings({ balance: nextBalance });

        // Record payment transaction
        const txId = 'tx-p-' + Date.now();
        await db.createTransaction({
          id: txId,
          userId: user.id,
          userEmail: user.email,
          type: 'payment',
          amount: price,
          planId: updates.planId,
          timestamp: new Date()
        });

        // Log telemetry
        await db.logTelemetry({
          userId: user.id,
          userEmail: user.email,
          eventType: 'subscribe',
          metadata: { planId: updates.planId, amount: price },
          timestamp: new Date()
        });
      }
    }

    const updated = await db.updateUser(req.user.id, updates);
    const { passwordHash: _, ...userSession } = updated;
    res.json(userSession);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Toggle Save Book (Library bookmarking)
app.post('/api/auth/toggle-save', authenticateToken, async (req, res) => {
  const { bookId } = req.body;
  if (!bookId) return res.status(400).json({ message: 'Book ID is required' });

  const numericId = parseInt(bookId);
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let readingList = user.readingList || [];
    const isSaved = readingList.includes(numericId);

    if (isSaved) {
      readingList = readingList.filter(id => id !== numericId);
    } else {
      readingList.push(numericId);
    }

    const updated = await db.updateUser(req.user.id, { readingList });
    const { passwordHash: _, ...userSession } = updated;
    res.json({ saved: !isSaved, user: userSession });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Reading Progress
app.post('/api/auth/progress', authenticateToken, async (req, res) => {
  const { bookId, chapter, progress } = req.body;
  if (!bookId || chapter === undefined || progress === undefined) {
    return res.status(400).json({ message: 'Book ID, chapter, and progress values are required' });
  }

  const numericId = parseInt(bookId);
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const readHistory = user.readHistory || {};
    const newHistory = { ...readHistory };
    newHistory[numericId] = {
      chapter: parseInt(chapter),
      progress: parseInt(progress),
      updatedAt: new Date().toISOString()
    };

    const updated = await db.updateUser(req.user.id, { readHistory: newHistory });
    const { passwordHash: _, ...userSession } = updated;

    // Get book title for logging
    const books = await db.getBooks();
    const bookObj = books.find(b => b.id === numericId);
    const bookTitle = bookObj ? bookObj.title : `Book #${numericId}`;

    // Log telemetry
    await db.logTelemetry({
      userId: user.id,
      userEmail: user.email,
      eventType: 'book_read',
      metadata: { bookId: numericId, bookTitle, chapter: parseInt(chapter), progress: parseInt(progress) },
      timestamp: new Date()
    });

    res.json(userSession);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Book Rating
app.post('/api/auth/rate', authenticateToken, async (req, res) => {
  const { bookId, rating } = req.body;
  if (!bookId || rating === undefined) {
    return res.status(400).json({ message: 'Book ID and rating value are required' });
  }

  const numericId = parseInt(bookId);
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ratings = user.ratings || {};
    const newRatings = { ...ratings };
    newRatings[numericId] = parseInt(rating);

    const updated = await db.updateUser(req.user.id, { ratings: newRatings });
    const { passwordHash: _, ...userSession } = updated;
    res.json(userSession);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// List All Users (Admin only)
app.get('/api/auth/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.getUsers();
    const sanitized = users.map(({ passwordHash: _, ...user }) => user);
    res.json(sanitized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle Admin Role Status (Admin only)
app.put('/api/auth/users/:id/admin', authenticateToken, requireAdmin, async (req, res) => {
  const targetId = req.params.id;
  try {
    const users = await db.getUsers();
    const target = users.find(u => u.id === targetId);

    if (!target) return res.status(404).json({ message: 'User not found' });

    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'Cannot demote yourself from Admin role' });
    }

    const nextIsAdmin = !target.isAdmin;
    const updated = await db.updateUser(targetId, { isAdmin: nextIsAdmin });

    res.json({ message: 'Role status updated successfully', user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- BOOKS ENDPOINTS ---

// Get All Books metadata
app.get('/api/books', async (req, res) => {
  try {
    const books = await db.getBooks();
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching books' });
  }
});

// Upload New Book (Admin or Creator)
app.post('/api/books', authenticateToken, requireAdmin, async (req, res) => {
  const { metadata, content } = req.body;
  if (!metadata || !content) {
    return res.status(400).json({ message: 'Metadata and content payloads are required' });
  }

  try {
    const saved = await db.saveBook(metadata, content);
    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error saving book' });
  }
});

// Update Book (Admin or Creator)
app.put('/api/books/:id', authenticateToken, requireAdmin, async (req, res) => {
  const bookId = parseInt(req.params.id);
  if (!bookId) return res.status(400).json({ message: 'Invalid Book ID' });

  const { metadata, content } = req.body;
  try {
    const updated = await db.updateBook(bookId, metadata || {}, content);
    if (!updated) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating book' });
  }
});

// Delete Book (Admin or Creator)
app.delete('/api/books/:id', authenticateToken, requireAdmin, async (req, res) => {
  const bookId = parseInt(req.params.id);
  if (!bookId) return res.status(400).json({ message: 'Invalid Book ID' });

  try {
    await db.deleteBook(bookId);
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting book' });
  }
});

// Get Book Content (Chapters / Panels)
app.get('/api/books/:id/content', authenticateToken, async (req, res) => {
  const bookId = parseInt(req.params.id);
  try {
    const content = await db.getBookContent(bookId);
    if (!content) {
      return res.status(404).json({ message: 'Book content not found' });
    }
    res.json(content);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- TELEMETRY & WITHDRAWAL API ENDPOINTS ---

// Log event (public event tracker)
app.post('/api/telemetry/event', async (req, res) => {
  const { eventType, metadata } = req.body;
  if (!eventType) return res.status(400).json({ message: 'Event type required' });

  // Try to decode user if auth header exists (non-blocking)
  let userId = null;
  let userEmail = null;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
      userEmail = decoded.email;
    } catch (e) {
      // Ignore token decode errors for anonymous telemetry
    }
  }

  try {
    const log = await db.logTelemetry({
      userId,
      userEmail,
      eventType,
      metadata: metadata || {},
      timestamp: new Date()
    });
    res.status(201).json(log);
  } catch (err) {
    console.error('Error logging telemetry event:', err);
    res.status(500).json({ message: 'Failed to log event' });
  }
});

// Get Activity Logs (Admin only)
app.get('/api/admin/telemetry', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await db.getTelemetry();
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
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
