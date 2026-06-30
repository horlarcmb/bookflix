const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdmZip = require('adm-zip');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure SMTP transport with environment variables, defaulting to Gmail setup
const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'bookflix.platform@gmail.com', // default helper user
    pass: process.env.SMTP_PASS || ''
  }
});

const sendEmail = async (to, subject, text, html) => {
  const mailOptions = {
    from: process.env.SMTP_USER ? `"BookFlix" <${process.env.SMTP_USER}>` : '"BookFlix" <noreply@bookflix.com>',
    to,
    subject,
    text,
    html
  };

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await smtpTransport.sendMail(mailOptions);
      console.log(`[MAIL] Email sent successfully to ${to}`);
      return true;
    } catch (err) {
      console.error(`[MAIL] Error sending email via SMTP:`, err);
    }
  }

  // Fallback console print with visual box
  console.log(`\n==================================================`);
  console.log(`[MAIL FALLBACK] To: ${to}`);
  console.log(`[MAIL FALLBACK] Subject: ${subject}`);
  console.log(`[MAIL FALLBACK] Body:\n${text}`);
  console.log(`==================================================\n`);
  return false;
};
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
const FEEDBACKS_FILE = path.join(DATA_DIR, 'feedbacks.json');
const REPORTS_FILE = path.join(DATA_DIR, 'feedback_reports.json');
const DECISIONS_FILE = path.join(DATA_DIR, 'product_decisions.json');
const ENG_TASKS_FILE = path.join(DATA_DIR, 'engineering_tasks.json');
const MARKETING_FILE = path.join(DATA_DIR, 'marketing_campaigns.json');
const CONTENT_POSTS_FILE = path.join(DATA_DIR, 'content_posts.json');
const SOCIAL_FILE = path.join(DATA_DIR, 'social_metrics.json');
const ANALYTICS_REPORTS_FILE = path.join(DATA_DIR, 'analytics_reports.json');
const MASTER_FILE = path.join(DATA_DIR, 'master_decisions.json');

// Ensure database files exist
// Server-side OTP memory caches for verification
const signupOTPMap = new Map(); // email -> { name, email, password, favoriteGenres, isAdmin, otp, expires }
const resetOTPMap = new Map();  // email -> { otp, expires }

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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
initJsonFile(FEEDBACKS_FILE, []);
initJsonFile(REPORTS_FILE, []);
initJsonFile(DECISIONS_FILE, []);
initJsonFile(ENG_TASKS_FILE, []);
initJsonFile(MARKETING_FILE, []);
initJsonFile(CONTENT_POSTS_FILE, []);
initJsonFile(SOCIAL_FILE, []);
initJsonFile(ANALYTICS_REPORTS_FILE, []);
initJsonFile(MASTER_FILE, []);

// Helper DB Read/Write Functions with In-Memory Caching & Asynchronous Disk Writes
const dbCache = {};

const readDB = (filePath) => {
  if (dbCache[filePath] === undefined) {
    if (fs.existsSync(filePath)) {
      try {
        dbCache[filePath] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (err) {
        console.error(`[DB CACHE] Error parsing JSON from ${filePath}, resetting:`, err);
        dbCache[filePath] = filePath === CONTENTS_FILE ? {} : [];
      }
    } else {
      dbCache[filePath] = filePath === CONTENTS_FILE ? {} : [];
    }
  }
  // Return deep copy to prevent mutations of cache
  return JSON.parse(JSON.stringify(dbCache[filePath]));
};

const writeDB = (filePath, data) => {
  // Update memory cache instantly (O(1) synchronous update)
  dbCache[filePath] = JSON.parse(JSON.stringify(data));

  // Write to disk asynchronously to prevent blocking the event loop
  fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
    if (err) {
      console.error(`[DB CACHE] Failed to write database file ${filePath} asynchronously:`, err);
    }
  });
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
  planId: { type: String, default: 'free' },
  totalReadTime: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  lastReadDate: { type: String, default: '' }
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
    title: { type: String, default: null },
    imageBase64: String,
    dialogue: String,
    description: String,
    chapterNumber: { type: Number, default: 1 }
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

const FeedbackSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, default: null },
  userEmail: { type: String, default: null },
  text: { type: String, required: true },
  category: { type: String, default: 'Pending' },
  sentiment: { type: String, default: 'Neutral' },
  priority: { type: String, default: 'medium' },
  rating: { type: Number, default: null },
  status: { type: String, default: 'Pending' },
  timestamp: { type: Date, default: Date.now }
});

const FeedbackReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  totalProcessed: { type: Number, required: true },
  sentimentDistribution: { type: mongoose.Schema.Types.Mixed, default: {} },
  bugsIdentified: { type: [mongoose.Schema.Types.Mixed], default: [] },
  featureRequests: { type: [mongoose.Schema.Types.Mixed], default: [] },
  actionableSummary: { type: String, required: true }
});

const ProductDecisionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  growthImpact: { type: Number, default: 5 },
  retentionImpact: { type: Number, default: 5 },
  viralityPotential: { type: Number, default: 5 },
  effortScore: { type: Number, default: 5 },
  priority: { type: String, default: 'medium' }, // low, medium, high, critical
  status: { type: String, default: 'Proposed' }, // Proposed, Backlog, In Progress, Completed
  engineeringTasks: { type: [String], default: [] },
  timestamp: { type: Date, default: Date.now }
});

const EngineeringTaskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'UI' }, // UI, Performance, AI Summaries, AI Librarian
  status: { type: String, default: 'Proposed' }, // Proposed, In Progress, Completed
  timestamp: { type: Date, default: Date.now }
});

const MarketingCampaignSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  channel: { type: String, default: 'TikTok' }, // TikTok, Instagram, WhatsApp, X, Telegram
  status: { type: String, default: 'Planned' }, // Planned, Active, Completed
  timestamp: { type: Date, default: Date.now }
});

const ContentPostSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  platform: { type: String, default: 'X' }, // X, Instagram, TikTok, WhatsApp, Telegram, AdCopy
  status: { type: String, default: 'Draft' }, // Draft, Scheduled, Published
  timestamp: { type: Date, default: Date.now }
});

const SocialMetricSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  postTitle: { type: String, required: true },
  platform: { type: String, default: 'X' }, // X, Instagram, TikTok, WhatsApp, Telegram
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  saves: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  installs: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

const AnalyticsReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  growthKpis: { type: mongoose.Schema.Types.Mixed, default: {} },
  engagementKpis: { type: mongoose.Schema.Types.Mixed, default: {} },
  retentionKpis: { type: mongoose.Schema.Types.Mixed, default: {} },
  marketingKpis: { type: mongoose.Schema.Types.Mixed, default: {} },
  growthReport: { type: String, default: '' },
  retentionReport: { type: String, default: '' },
  weaknessReport: { type: String, default: '' },
  recommendations: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const MasterDecisionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  systemHealth: { type: mongoose.Schema.Types.Mixed, default: {} },
  priorityRanking: { type: Array, default: [] },
  executionRoadmap: { type: Array, default: [] },
  strategicDecisions: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const FeedbackModel = mongoose.model('Feedback', FeedbackSchema);
const FeedbackReportModel = mongoose.model('FeedbackReport', FeedbackReportSchema);
const ProductDecisionModel = mongoose.model('ProductDecision', ProductDecisionSchema);
const EngineeringTaskModel = mongoose.model('EngineeringTask', EngineeringTaskSchema);
const MarketingCampaignModel = mongoose.model('MarketingCampaign', MarketingCampaignSchema);
const ContentPostModel = mongoose.model('ContentPost', ContentPostSchema);
const SocialMetricModel = mongoose.model('SocialMetric', SocialMetricSchema);
const AnalyticsReportModel = mongoose.model('AnalyticsReportRecord', AnalyticsReportSchema);
const MasterDecisionModel = mongoose.model('MasterDecisionRecord', MasterDecisionSchema);

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
      const allowedKeys = ['name', 'favoriteGenres', 'theme', 'premium', 'planId', 'isAdmin', 'readingList', 'readHistory', 'ratings', 'totalReadTime', 'currentStreak', 'lastReadDate'];
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
      
      const allowedKeys = ['name', 'favoriteGenres', 'theme', 'premium', 'planId', 'isAdmin', 'readingList', 'readHistory', 'ratings', 'totalReadTime', 'currentStreak', 'lastReadDate'];
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
  },

  getFeedbacks: async () => {
    if (useMongo) {
      return await FeedbackModel.find({}).sort({ timestamp: -1 }).lean();
    } else {
      return readDB(FEEDBACKS_FILE);
    }
  },

  createFeedback: async (feedbackData) => {
    if (useMongo) {
      const fb = new FeedbackModel(feedbackData);
      await fb.save();
      return fb.toObject();
    } else {
      const feedbacks = readDB(FEEDBACKS_FILE);
      feedbacks.push(feedbackData);
      writeDB(FEEDBACKS_FILE, feedbacks);
      return feedbackData;
    }
  },

  updateFeedback: async (id, updates) => {
    if (useMongo) {
      return await FeedbackModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    } else {
      const feedbacks = readDB(FEEDBACKS_FILE);
      const idx = feedbacks.findIndex(f => f.id === id);
      if (idx === -1) return null;
      feedbacks[idx] = { ...feedbacks[idx], ...updates };
      writeDB(FEEDBACKS_FILE, feedbacks);
      return feedbacks[idx];
    }
  },

  getFeedbackReports: async () => {
    if (useMongo) {
      return await FeedbackReportModel.find({}).sort({ timestamp: -1 }).lean();
    } else {
      return readDB(REPORTS_FILE);
    }
  },

  createFeedbackReport: async (reportData) => {
    if (useMongo) {
      const rep = new FeedbackReportModel(reportData);
      await rep.save();
      return rep.toObject();
    } else {
      const reports = readDB(REPORTS_FILE);
      reports.push(reportData);
      writeDB(REPORTS_FILE, reports);
      return reportData;
    }
  },

  getProductDecisions: async () => {
    if (useMongo) {
      return await ProductDecisionModel.find({}).sort({ timestamp: -1 }).lean();
    } else {
      return readDB(DECISIONS_FILE);
    }
  },

  createProductDecision: async (decisionData) => {
    if (useMongo) {
      const decision = new ProductDecisionModel(decisionData);
      await decision.save();
      return decision.toObject();
    } else {
      const decisions = readDB(DECISIONS_FILE);
      decisions.push(decisionData);
      writeDB(DECISIONS_FILE, decisions);
      return decisionData;
    }
  },

  updateProductDecision: async (id, updates) => {
    if (useMongo) {
      return await ProductDecisionModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    } else {
      const decisions = readDB(DECISIONS_FILE);
      const idx = decisions.findIndex(d => d.id === id);
      if (idx === -1) return null;
      decisions[idx] = { ...decisions[idx], ...updates };
      writeDB(DECISIONS_FILE, decisions);
      return decisions[idx];
    }
  },

  clearProductDecisions: async () => {
    if (useMongo) {
      await ProductDecisionModel.deleteMany({});
      return true;
    } else {
      writeDB(DECISIONS_FILE, []);
      return true;
    }
  },

  getEngineeringTasks: async () => {
    if (useMongo) {
      return await EngineeringTaskModel.find({}).sort({ timestamp: -1 }).lean();
    } else {
      return readDB(ENG_TASKS_FILE);
    }
  },

  createEngineeringTask: async (taskData) => {
    if (useMongo) {
      const task = new EngineeringTaskModel(taskData);
      await task.save();
      return task.toObject();
    } else {
      const tasks = readDB(ENG_TASKS_FILE);
      tasks.push(taskData);
      writeDB(ENG_TASKS_FILE, tasks);
      return taskData;
    }
  },

  updateEngineeringTask: async (id, updates) => {
    if (useMongo) {
      return await EngineeringTaskModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    } else {
      const tasks = readDB(ENG_TASKS_FILE);
      const idx = tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;
      tasks[idx] = { ...tasks[idx], ...updates };
      writeDB(ENG_TASKS_FILE, tasks);
      return tasks[idx];
    }
  },

  clearEngineeringTasks: async () => {
    if (useMongo) {
      await EngineeringTaskModel.deleteMany({});
      return true;
    } else {
      writeDB(ENG_TASKS_FILE, []);
      return true;
    }
  },

  getMarketingCampaigns: async () => {
    if (useMongo) {
      return await MarketingCampaignModel.find({}).sort({ timestamp: -1 }).lean();
    } else {
      return readDB(MARKETING_FILE);
    }
  },

  createMarketingCampaign: async (campaignData) => {
    if (useMongo) {
      const campaign = new MarketingCampaignModel(campaignData);
      await campaign.save();
      return campaign.toObject();
    } else {
      const campaigns = readDB(MARKETING_FILE);
      campaigns.push(campaignData);
      writeDB(MARKETING_FILE, campaigns);
      return campaignData;
    }
  },

  updateMarketingCampaign: async (id, updates) => {
    if (useMongo) {
      return await MarketingCampaignModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    } else {
      const campaigns = readDB(MARKETING_FILE);
      const idx = campaigns.findIndex(c => c.id === id);
      if (idx === -1) return null;
      campaigns[idx] = { ...campaigns[idx], ...updates };
      writeDB(MARKETING_FILE, campaigns);
      return campaigns[idx];
    }
  },

  clearMarketingCampaigns: async () => {
    if (useMongo) {
      await MarketingCampaignModel.deleteMany({});
      return true;
    } else {
      writeDB(MARKETING_FILE, []);
      return true;
    }
  },

  getContentPosts: async () => {
    if (useMongo) {
      return await ContentPostModel.find({}).sort({ timestamp: -1 }).lean();
    } else {
      return readDB(CONTENT_POSTS_FILE);
    }
  },

  createContentPost: async (postData) => {
    if (useMongo) {
      const post = new ContentPostModel(postData);
      await post.save();
      return post.toObject();
    } else {
      const posts = readDB(CONTENT_POSTS_FILE);
      posts.push(postData);
      writeDB(CONTENT_POSTS_FILE, posts);
      return postData;
    }
  },

  updateContentPost: async (id, updates) => {
    if (useMongo) {
      return await ContentPostModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    } else {
      const posts = readDB(CONTENT_POSTS_FILE);
      const idx = posts.findIndex(p => p.id === id);
      if (idx === -1) return null;
      posts[idx] = { ...posts[idx], ...updates };
      writeDB(CONTENT_POSTS_FILE, posts);
      return posts[idx];
    }
  },

  clearContentPosts: async () => {
    if (useMongo) {
      await ContentPostModel.deleteMany({});
      return true;
    } else {
      writeDB(CONTENT_POSTS_FILE, []);
      return true;
    }
  },

  getSocialMetrics: async () => {
    if (useMongo) {
      return await SocialMetricModel.find({}).sort({ timestamp: -1 }).lean();
    } else {
      return readDB(SOCIAL_FILE);
    }
  },

  createSocialMetric: async (metricData) => {
    if (useMongo) {
      const metric = new SocialMetricModel(metricData);
      await metric.save();
      return metric.toObject();
    } else {
      const metrics = readDB(SOCIAL_FILE);
      metrics.push(metricData);
      writeDB(SOCIAL_FILE, metrics);
      return metricData;
    }
  },

  updateSocialMetric: async (id, updates) => {
    if (useMongo) {
      return await SocialMetricModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    } else {
      const metrics = readDB(SOCIAL_FILE);
      const idx = metrics.findIndex(m => m.id === id);
      if (idx === -1) return null;
      metrics[idx] = { ...metrics[idx], ...updates };
      writeDB(SOCIAL_FILE, metrics);
      return metrics[idx];
    }
  },

  clearSocialMetrics: async () => {
    if (useMongo) {
      await SocialMetricModel.deleteMany({});
      return true;
    } else {
      writeDB(SOCIAL_FILE, []);
      return true;
    }
  },

  getAnalyticsReports: async () => {
    if (useMongo) {
      return await AnalyticsReportModel.find({}).sort({ timestamp: -1 }).lean();
    } else {
      return readDB(ANALYTICS_REPORTS_FILE);
    }
  },

  createAnalyticsReport: async (reportData) => {
    if (useMongo) {
      const report = new AnalyticsReportModel(reportData);
      await report.save();
      return report.toObject();
    } else {
      const reports = readDB(ANALYTICS_REPORTS_FILE);
      reports.push(reportData);
      writeDB(ANALYTICS_REPORTS_FILE, reports);
      return reportData;
    }
  },

  clearAnalyticsReports: async () => {
    if (useMongo) {
      await AnalyticsReportModel.deleteMany({});
      return true;
    } else {
      writeDB(ANALYTICS_REPORTS_FILE, []);
      return true;
    }
  },

  getMasterDecisions: async () => {
    if (useMongo) {
      return await MasterDecisionModel.find({}).sort({ timestamp: -1 }).lean();
    } else {
      return readDB(MASTER_FILE);
    }
  },

  createMasterDecision: async (decisionData) => {
    if (useMongo) {
      const decision = new MasterDecisionModel(decisionData);
      await decision.save();
      return decision.toObject();
    } else {
      const decisions = readDB(MASTER_FILE);
      decisions.push(decisionData);
      writeDB(MASTER_FILE, decisions);
      return decisionData;
    }
  },

  clearMasterDecisions: async () => {
    if (useMongo) {
      await MasterDecisionModel.deleteMany({});
      return true;
    } else {
      writeDB(MASTER_FILE, []);
      return true;
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
        planId: 'premium',
        totalReadTime: 0,
        currentStreak: 0,
        lastReadDate: ''
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

// --- OTP ENDPOINTS ---

// Signup Request (OTP Generation)
app.post('/api/auth/signup-request', async (req, res) => {
  const { name, email, password, favoriteGenres, isAdmin } = req.body;
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

    const otp = generateOTP();
    const expires = Date.now() + 15 * 60 * 1000; // 15 mins

    const userIsAdmin = trimmedEmail === 'rahmanridwanidowu@gmail.com';

    signupOTPMap.set(trimmedEmail, {
      name: trimmedName,
      email: trimmedEmail,
      password,
      favoriteGenres: favoriteGenres || [],
      isAdmin: isAdmin || userIsAdmin,
      otp,
      expires
    });

    console.log(`[VERIFICATION] Signup OTP generated for ${trimmedEmail}: ${otp}`);

    const emailSubject = "Verify your BookFlix Account 📚";
    const emailBody = `Hello ${trimmedName},\n\nThank you for signing up to BookFlix!\n\nYour account verification code is: ${otp}\n\nThis code expires in 15 minutes.\n\nHappy reading!\nThe BookFlix Team`;
    const emailHtml = `<h3>Hello ${trimmedName},</h3><p>Thank you for signing up to BookFlix!</p><p>Your account verification code is: <strong style="font-size: 1.2rem; background: #f5f5f5; padding: 4px 8px; border-radius: 4px;">${otp}</strong></p><p>This code expires in 15 minutes.</p><p>Happy reading!<br/>The BookFlix Team</p>`;
    
    // Send email asynchronously without blocking API response
    sendEmail(trimmedEmail, emailSubject, emailBody, emailHtml);

    res.status(200).json({ 
      message: 'Verification code generated.', 
      email: trimmedEmail,
      code: otp 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during signup request' });
  }
});

// Signup Verify
app.post('/api/auth/signup-verify', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ message: 'Email and verification code are required' });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const request = signupOTPMap.get(trimmedEmail);

  if (!request) {
    return res.status(400).json({ message: 'No pending registration request found for this email' });
  }

  if (request.otp !== code.trim()) {
    return res.status(400).json({ message: 'Invalid verification code' });
  }

  if (Date.now() > request.expires) {
    signupOTPMap.delete(trimmedEmail);
    return res.status(400).json({ message: 'Verification code has expired. Please sign up again.' });
  }

  try {
    const existingUser = await db.findUserByEmail(trimmedEmail);
    if (existingUser) {
      signupOTPMap.delete(trimmedEmail);
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(request.password, salt);

    const newUser = {
      id: Date.now().toString(),
      name: request.name,
      email: request.email,
      passwordHash,
      favoriteGenres: request.favoriteGenres,
      readingList: [],
      readHistory: {},
      ratings: {},
      joinedDate: new Date().toISOString().split('T')[0],
      theme: 'dark',
      isAdmin: request.isAdmin,
      premium: request.isAdmin,
      planId: request.isAdmin ? 'premium' : 'free',
      totalReadTime: 0,
      currentStreak: 0,
      lastReadDate: ''
    };

    const created = await db.createUser(newUser);
    signupOTPMap.delete(trimmedEmail);

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
    res.status(500).json({ message: 'Server error during signup verification' });
  }
});

// Forgot Password Request (OTP Generation)
app.post('/api/auth/reset-request', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const trimmedEmail = email.trim().toLowerCase();

  try {
    const user = await db.findUserByEmail(trimmedEmail);
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const otp = generateOTP();
    const expires = Date.now() + 15 * 60 * 1000; // 15 mins

    resetOTPMap.set(trimmedEmail, {
      otp,
      expires
    });

    console.log(`[VERIFICATION] Password reset OTP generated for ${trimmedEmail}: ${otp}`);

    const emailSubject = "Reset your BookFlix Password 🔒";
    const emailBody = `Hello,\n\nYou requested a password reset for your BookFlix account.\n\nYour password reset code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, please ignore this email.\n\nBest,\nThe BookFlix Team`;
    const emailHtml = `<h3>Hello,</h3><p>You requested a password reset for your BookFlix account.</p><p>Your password reset code is: <strong style="font-size: 1.2rem; background: #f5f5f5; padding: 4px 8px; border-radius: 4px;">${otp}</strong></p><p>This code expires in 15 minutes.</p><p>If you did not request this, please ignore this email.</p><p>Best,<br/>The BookFlix Team</p>`;
    
    sendEmail(trimmedEmail, emailSubject, emailBody, emailHtml);

    res.status(200).json({ 
      message: 'Password reset code generated.', 
      email: trimmedEmail,
      code: otp 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
});

// Forgot Password Verify
app.post('/api/auth/reset-verify', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: 'Email, code, and new password are required' });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const request = resetOTPMap.get(trimmedEmail);

  if (!request) {
    return res.status(400).json({ message: 'No pending password reset request found for this email' });
  }

  if (request.otp !== code.trim()) {
    return res.status(400).json({ message: 'Invalid verification code' });
  }

  if (Date.now() > request.expires) {
    resetOTPMap.delete(trimmedEmail);
    return res.status(400).json({ message: 'Verification code has expired. Please try again.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long' });
  }

  try {
    const user = await db.findUserByEmail(trimmedEmail);
    if (!user) {
      resetOTPMap.delete(trimmedEmail);
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    if (useMongo) {
      await UserModel.findOneAndUpdate({ email: trimmedEmail }, { $set: { passwordHash } });
    } else {
      const users = readDB(USERS_FILE);
      const idx = users.findIndex(u => u.email === trimmedEmail);
      if (idx !== -1) {
        users[idx].passwordHash = passwordHash;
        writeDB(USERS_FILE, users);
      }
    }

    resetOTPMap.delete(trimmedEmail);

    // Log telemetry
    await db.logTelemetry({
      userId: user.id,
      userEmail: user.email,
      eventType: 'password_reset',
      metadata: { email: user.email },
      timestamp: new Date()
    });

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during password verification' });
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

// Track Reading Time & Update Daily Streak
app.post('/api/auth/track-time', authenticateToken, async (req, res) => {
  const { bookId, duration } = req.body;
  if (!bookId || duration === undefined) {
    return res.status(400).json({ message: 'Book ID and duration are required' });
  }

  const numericId = parseInt(bookId);
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const prevTime = user.totalReadTime || 0;
    const newTime = prevTime + parseInt(duration);

    let currentStreak = user.currentStreak || 0;
    let lastReadDate = user.lastReadDate || '';
    const todayStr = new Date().toISOString().split('T')[0];

    if (!lastReadDate) {
      currentStreak = 1;
    } else if (lastReadDate !== todayStr) {
      const lastDate = new Date(lastReadDate);
      const todayDate = new Date(todayStr);
      const diffTime = todayDate - lastDate;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak += 1;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }
    lastReadDate = todayStr;

    const updated = await db.updateUser(req.user.id, {
      totalReadTime: newTime,
      currentStreak,
      lastReadDate
    });

    const { passwordHash: _, ...userSession } = updated;

    // Log telemetry
    await db.logTelemetry({
      userId: user.id,
      userEmail: user.email,
      eventType: 'read_session',
      metadata: { bookId: numericId, duration: parseInt(duration) },
      timestamp: new Date()
    });

    res.json(userSession);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error tracking reading time' });
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

// Get Public Activity Logs (For notifications panel)
app.get('/api/activities', authenticateToken, async (req, res) => {
  try {
    const logs = await db.getTelemetry();
    // Filter out page_view to show only meaningful activities
    const activities = logs
      .filter(l => l.eventType !== 'page_view')
      .slice(-30)
      .reverse(); // get latest 30
    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- FEEDBACK AGENT API ENDPOINTS ---

const runFeedbackAgent = (feedbackTextList) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'ai-system', 'agents', 'feedback_agent.py')]);
    let dataStr = '';
    let errorStr = '';

    pythonProcess.stdout.on('data', (data) => {
      dataStr += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorStr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Feedback Agent exited with code ${code}. Error: ${errorStr}`));
      }
      try {
        resolve(JSON.parse(dataStr));
      } catch (e) {
        reject(new Error(`Failed to parse Feedback Agent JSON output: ${e.message}. Raw output: ${dataStr}`));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(feedbackTextList));
    pythonProcess.stdin.end();
  });
};

// Submit Feedback
app.post('/api/feedback', async (req, res) => {
  const { text, category: userCategory, rating } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ message: 'Feedback text is required' });
  }

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
      // Ignore invalid tokens for anonymous feedback submission
    }
  }

  try {
    const newFb = {
      id: 'fb-' + Date.now(),
      userId,
      userEmail,
      text: text.trim(),
      category: userCategory || 'Pending',
      sentiment: 'Neutral',
      priority: 'medium',
      rating: rating ? parseInt(rating) : null,
      status: 'Pending',
      timestamp: new Date()
    };

    const saved = await db.createFeedback(newFb);

    // Trigger AI analysis inline
    try {
      const analysis = await runFeedbackAgent([text.trim()]);
      let category = userCategory || 'General';
      let sentiment = 'Neutral';
      let priority = 'medium';

      if (analysis.sentiment_distribution) {
        const dist = analysis.sentiment_distribution;
        if (dist.positive > dist.negative && dist.positive > dist.neutral) sentiment = 'Positive';
        else if (dist.negative > dist.positive && dist.negative > dist.neutral) sentiment = 'Negative';
      }

      if (!userCategory) {
        if (analysis.bugs_identified && analysis.bugs_identified.length > 0) category = 'Bugs';
        else if (analysis.feature_requests && analysis.feature_requests.length > 0) {
          const feat = analysis.feature_requests[0].feature.toLowerCase();
          if (feat.includes('ui') || feat.includes('font') || feat.includes('layout') || feat.includes('overlap')) {
            category = 'UI Issues';
          } else {
            category = 'Feature Requests';
          }
        }
      }

      if (analysis.bugs_identified && analysis.bugs_identified.length > 0) {
        priority = analysis.bugs_identified[0].priority || 'medium';
      } else if (analysis.feature_requests && analysis.feature_requests.length > 0) {
        priority = analysis.feature_requests[0].priority || 'medium';
      }

      const updated = await db.updateFeedback(saved.id, {
        category,
        sentiment,
        priority: priority.toLowerCase(),
        status: 'Analyzed'
      });

      res.status(201).json({ feedback: updated, analysis });
    } catch (aiErr) {
      console.error('[FeedbackAgent] Inline analysis failed:', aiErr);
      res.status(201).json({ feedback: saved, error: 'AI Analysis queued' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save feedback' });
  }
});

// Get Feedbacks List
app.get('/api/feedback', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await db.getFeedbacks();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch feedback list' });
  }
});

// Analyze Pending Feedbacks Batch
app.post('/api/feedback/analyze-batch', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await db.getFeedbacks();
    const pendingList = list.filter(f => f.status === 'Pending' || f.category === 'Pending');
    
    if (pendingList.length === 0) {
      return res.json({ message: 'No pending feedback to analyze' });
    }

    const texts = pendingList.map(f => f.text);
    const analysis = await runFeedbackAgent(texts);

    // Save report
    const newReport = {
      id: 'rep-' + Date.now(),
      timestamp: new Date(),
      totalProcessed: pendingList.length,
      sentimentDistribution: analysis.sentiment_distribution || {},
      bugsIdentified: analysis.bugs_identified || [],
      featureRequests: analysis.feature_requests || [],
      actionableSummary: analysis.actionable_summary || 'No summary generated.'
    };

    const savedReport = await db.createFeedbackReport(newReport);

    // Update statuses
    for (const fb of pendingList) {
      let category = 'General';
      let sentiment = 'Neutral';

      if (analysis.bugs_identified && analysis.bugs_identified.some(b => fb.text.toLowerCase().includes(b.description.toLowerCase().substring(0, 15)))) {
        category = 'Bugs';
      } else if (analysis.feature_requests && analysis.feature_requests.some(f => fb.text.toLowerCase().includes(f.feature.toLowerCase().substring(0, 15)))) {
        category = 'Feature Requests';
      }

      await db.updateFeedback(fb.id, {
        category,
        sentiment,
        status: 'Analyzed'
      });
    }

    res.json(savedReport);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to execute batch feedback analysis' });
  }
});

// Get Feedback Reports
app.get('/api/feedback/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reports = await db.getFeedbackReports();
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch feedback reports' });
  }
});

// Get Consolidated Dynamic Feedback Report
app.get('/api/feedback/report', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await db.getFeedbacks();
    const total = list.length;
    if (total === 0) {
      return res.json({
        totalProcessed: 0,
        sentimentSummary: { positive: 0, neutral: 0, negative: 0 },
        topComplaints: [],
        mostRequestedFeatures: [],
        urgentIssues: []
      });
    }

    const sentimentCounts = { Positive: 0, Neutral: 0, Negative: 0 };
    const categoryCounts = {};
    const urgentIssues = [];

    list.forEach(fb => {
      const sent = fb.sentiment || 'Neutral';
      sentimentCounts[sent] = (sentimentCounts[sent] || 0) + 1;

      const cat = fb.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      const priority = (fb.priority || 'medium').toLowerCase();
      if (priority === 'critical' || priority === 'high') {
        urgentIssues.push({
          id: fb.id,
          text: fb.text,
          category: fb.category,
          priority: fb.priority,
          timestamp: fb.timestamp
        });
      }
    });

    const sentimentSummary = {
      positive: Math.round((sentimentCounts.Positive / total) * 100),
      neutral: Math.round((sentimentCounts.Neutral / total) * 100),
      negative: Math.round((sentimentCounts.Negative / total) * 100)
    };

    const topComplaints = list
      .filter(fb => fb.category === 'Bugs' || fb.category === 'Performance Issues')
      .slice(0, 5)
      .map(fb => ({ text: fb.text, priority: fb.priority }));

    const mostRequestedFeatures = list
      .filter(fb => fb.category === 'Feature Requests')
      .slice(0, 5)
      .map(fb => ({ text: fb.text, rating: fb.rating }));

    res.json({
      totalProcessed: total,
      sentimentSummary,
      topComplaints,
      mostRequestedFeatures,
      urgentIssues: urgentIssues.slice(0, 5)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate feedback report' });
  }
});

// --- PRODUCT AGENT API ENDPOINTS ---

const runProductAgent = (payload) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'ai-system', 'agents', 'product_agent.py')]);
    let dataStr = '';
    let errorStr = '';

    pythonProcess.stdout.on('data', (data) => {
      dataStr += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorStr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Product Agent exited with code ${code}. Error: ${errorStr}`));
      }
      try {
        resolve(JSON.parse(dataStr));
      } catch (e) {
        reject(new Error(`Failed to parse Product Agent output: ${e.message}. Raw output: ${dataStr}`));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();
  });
};

// Get Product Decisions / Roadmap List
app.get('/api/admin/product/decisions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await db.getProductDecisions();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch product decisions' });
  }
});

// Update Product Decision Status / Tasks
app.put('/api/admin/product/decisions/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, title, description, priority, growthImpact, retentionImpact, viralityPotential, effortScore, engineeringTasks } = req.body;

  try {
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (growthImpact !== undefined) updates.growthImpact = parseInt(growthImpact);
    if (retentionImpact !== undefined) updates.retentionImpact = parseInt(retentionImpact);
    if (viralityPotential !== undefined) updates.viralityPotential = parseInt(viralityPotential);
    if (effortScore !== undefined) updates.effortScore = parseInt(effortScore);
    if (engineeringTasks !== undefined) updates.engineeringTasks = engineeringTasks;

    const updated = await db.updateProductDecision(id, updates);
    if (!updated) {
      return res.status(404).json({ message: 'Decision item not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update decision item' });
  }
});

// Trigger Product Agent Analyze Roadmap Task
app.post('/api/admin/product/analyze', authenticateToken, requireAdmin, async (req, res) => {
  const { goals } = req.body;
  try {
    const feedbacks = await db.getFeedbacks();
    const logs = await db.getTelemetry();
    const users = await db.getUsers();

    // Compute metrics
    const dau = users.length;
    const mau = Math.round(dau * 1.5);
    const pageViews = logs.filter(l => l.eventType === 'page_view').length;
    const reads = logs.filter(l => l.eventType === 'book_read').length;

    const analyticsData = {
      dau,
      mau,
      retention_rate: 85,
      churn_rate: 15,
      total_logs: logs.length,
      page_views: pageViews,
      reading_events: reads,
      average_session_seconds: 350
    };

    const payload = {
      feedbacks: feedbacks.slice(0, 100), // restrict limit
      analytics: analyticsData,
      goals: goals || "Maximize viral acquisition, signups, referrals, quote sharing, and audio summary integrations."
    };

    const analysis = await runProductAgent(payload);

    // Save recommendations as Proposed ProductDecisions
    const savedDecisions = [];
    const recommendationsList = analysis.improvement_opportunities || analysis.feature_recommendations || [];
    
    if (recommendationsList && Array.isArray(recommendationsList)) {
      // Clear old Proposed items to avoid double duplicates
      const currentDecisions = await db.getProductDecisions();
      
      if (useMongo) {
        await ProductDecisionModel.deleteMany({ status: 'Proposed' });
      } else {
        const remaining = currentDecisions.filter(d => d.status !== 'Proposed');
        writeDB(DECISIONS_FILE, remaining);
      }

      for (let i = 0; i < recommendationsList.length; i++) {
        const item = recommendationsList[i];
        const newDecision = {
          id: 'dec-' + Date.now() + '-' + i,
          title: item.feature || item.title || 'New AI Recommendation',
          description: item.description || item.justification || 'No description provided.',
          growthImpact: parseInt(item.growthImpact || item.growth) || 5,
          retentionImpact: parseInt(item.retentionImpact || item.retention) || 5,
          viralityPotential: parseInt(item.viralityPotential || item.virality) || 5,
          effortScore: parseInt(item.effortScore || item.effort) || 5,
          priority: item.priority || 'medium',
          status: 'Proposed',
          engineeringTasks: item.engineeringTasks || item.tasks || [],
          timestamp: new Date()
        };

        const saved = await db.createProductDecision(newDecision);
        savedDecisions.push(saved);
      }
    }

    res.json({
      weaknessReport: analysis.product_audit_report || analysis.weakness_report || 'No weaknesses analyzed.',
      recommendations: savedDecisions,
      milestones: analysis.roadmap_milestones || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to run Product Agent analysis: ' + err.message });
  }
});

// --- ENGINEERING AGENT API ENDPOINTS ---

const runEngineeringAgent = (payload) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'ai-system', 'agents', 'engineering_agent.py')]);
    let dataStr = '';
    let errorStr = '';

    pythonProcess.stdout.on('data', (data) => {
      dataStr += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorStr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Engineering Agent exited with code ${code}. Error: ${errorStr}`));
      }
      try {
        resolve(JSON.parse(dataStr));
      } catch (e) {
        reject(new Error(`Failed to parse Engineering Agent output: ${e.message}. Raw output: ${dataStr}`));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();
  });
};

// Get Engineering Tasks
app.get('/api/admin/engineering/tasks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await db.getEngineeringTasks();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch engineering tasks' });
  }
});

// Update Engineering Task Status
app.put('/api/admin/engineering/tasks/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, title, description, category } = req.body;

  try {
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;

    const updated = await db.updateEngineeringTask(id, updates);
    if (!updated) {
      return res.status(404).json({ message: 'Engineering task not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update engineering task' });
  }
});

// Trigger Engineering Audit
app.post('/api/admin/engineering/audit', authenticateToken, requireAdmin, async (req, res) => {
  const { goals } = req.body;
  try {
    const decisions = await db.getProductDecisions();
    const logs = await db.getTelemetry();

    const payload = {
      recommendations: decisions,
      analytics: {
        latency_averages: 320,
        logs_count: logs.length
      },
      goals: goals || "Redesign Toolbar UI components, debounce progress saves, and add pre-cached summary routes."
    };

    const analysis = await runEngineeringAgent(payload);

    // Save execution tasks as Proposed
    const savedTasks = [];
    if (analysis.execution_tasks && Array.isArray(analysis.execution_tasks)) {
      const currentTasks = await db.getEngineeringTasks();
      
      if (useMongo) {
        await EngineeringTaskModel.deleteMany({ status: 'Proposed' });
      } else {
        const remaining = currentTasks.filter(t => t.status !== 'Proposed');
        writeDB(ENG_TASKS_FILE, remaining);
      }

      for (let i = 0; i < analysis.execution_tasks.length; i++) {
        const item = analysis.execution_tasks[i];
        const newTask = {
          id: 'eng-task-' + Date.now() + '-' + i,
          title: item.title || 'Refactor Code Module',
          description: item.description || 'No description provided.',
          category: item.category || 'UI',
          status: 'Proposed',
          timestamp: new Date()
        };

        const saved = await db.createEngineeringTask(newTask);
        savedTasks.push(saved);
      }
    }

    res.json({
      auditReport: analysis.engineering_audit_report || 'No audit report.',
      weaknessesReport: analysis.technical_weaknesses_report || 'No weaknesses report.',
      roadmap: analysis.implementation_roadmap || [],
      plan: analysis.code_improvement_plan || 'No improvement plan.',
      tasks: savedTasks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to execute Engineering Agent audit: ' + err.message });
  }
});

// --- MARKETING AGENT API ENDPOINTS ---

const runMarketingAgent = (payload) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'ai-system', 'agents', 'marketing_agent.py')]);
    let dataStr = '';
    let errorStr = '';

    pythonProcess.stdout.on('data', (data) => {
      dataStr += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorStr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Marketing Agent exited with code ${code}. Error: ${errorStr}`));
      }
      try {
        resolve(JSON.parse(dataStr));
      } catch (e) {
        reject(new Error(`Failed to parse Marketing Agent output: ${e.message}. Raw output: ${dataStr}`));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();
  });
};

// Get Campaigns
app.get('/api/admin/marketing/campaigns', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await db.getMarketingCampaigns();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
});

// Update Campaign Status
app.put('/api/admin/marketing/campaigns/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, title, description, channel } = req.body;

  try {
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (channel !== undefined) updates.channel = channel;

    const updated = await db.updateMarketingCampaign(id, updates);
    if (!updated) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update campaign' });
  }
});

// Trigger Marketing Audit
app.post('/api/admin/marketing/analyze', authenticateToken, requireAdmin, async (req, res) => {
  const { goals } = req.body;
  try {
    const logs = await db.getTelemetry();
    const feedbacks = await db.getFeedbacks();

    const payload = {
      analytics: {
        dau: logs.filter(l => l.eventType === 'login').length || 10,
        logs_count: logs.length
      },
      feedbacks: feedbacks.slice(0, 50),
      goals: goals || "Increase installs and signups for students on TikTok, and book reader engagement on Instagram."
    };

    const analysis = await runMarketingAgent(payload);

    // Save campaign ideas as Planned
    const savedCampaigns = [];
    if (analysis.campaign_ideas && Array.isArray(analysis.campaign_ideas)) {
      const currentCampaigns = await db.getMarketingCampaigns();
      
      if (useMongo) {
        await MarketingCampaignModel.deleteMany({ status: 'Planned' });
      } else {
        const remaining = currentCampaigns.filter(c => c.status !== 'Planned');
        writeDB(MARKETING_FILE, remaining);
      }

      for (let i = 0; i < analysis.campaign_ideas.length; i++) {
        const item = analysis.campaign_ideas[i];
        const newCampaign = {
          id: 'camp-' + Date.now() + '-' + i,
          title: item.title || 'New AI Campaign',
          description: item.description || 'No description provided.',
          channel: item.channel || 'TikTok',
          status: 'Planned',
          timestamp: new Date()
        };

        const saved = await db.createMarketingCampaign(newCampaign);
        savedCampaigns.push(saved);
      }
    }

    res.json({
      growthStrategy: analysis.growth_strategy || 'No growth strategy.',
      channelStrategy: analysis.channel_strategy || 'No channel strategy.',
      acquisitionPlan: analysis.user_acquisition_plan || 'No acquisition plan.',
      experiments: analysis.growth_experiments || [],
      campaigns: savedCampaigns
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to run Marketing Agent analysis: ' + err.message });
  }
});

// --- CONTENT AGENT API ENDPOINTS ---

const runContentAgent = (payload) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'ai-system', 'agents', 'content_agent.py')]);
    let dataStr = '';
    let errorStr = '';

    pythonProcess.stdout.on('data', (data) => {
      dataStr += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorStr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Content Agent exited with code ${code}. Error: ${errorStr}`));
      }
      try {
        resolve(JSON.parse(dataStr));
      } catch (e) {
        reject(new Error(`Failed to parse Content Agent output: ${e.message}. Raw output: ${dataStr}`));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();
  });
};

// Get Content Posts
app.get('/api/admin/content/posts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await db.getContentPosts();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch content posts' });
  }
});

// Update Content Post Status / Body
app.put('/api/admin/content/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, title, body, platform } = req.body;

  try {
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (body !== undefined) updates.body = body;
    if (platform !== undefined) updates.platform = platform;

    const updated = await db.updateContentPost(id, updates);
    if (!updated) {
      return res.status(404).json({ message: 'Content post not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update content post' });
  }
});

// Trigger Content Strategy Analysis
app.post('/api/admin/content/analyze', authenticateToken, requireAdmin, async (req, res) => {
  const { goals } = req.body;
  try {
    const logs = await db.getTelemetry();
    const feedbacks = await db.getFeedbacks();

    const payload = {
      analytics: {
        reads_count: logs.filter(l => l.eventType === 'book_read').length || 10,
        logs_count: logs.length
      },
      feedbacks: feedbacks.slice(0, 50),
      goals: goals || "Create viral TikTok video layouts, Twitter book review templates, and WhatsApp study group sharing invite cards."
    };

    const analysis = await runContentAgent(payload);

    // Save promotional posts as Draft
    const savedPosts = [];
    if (analysis.promotional_posts && Array.isArray(analysis.promotional_posts)) {
      const currentPosts = await db.getContentPosts();
      
      if (useMongo) {
        await ContentPostModel.deleteMany({ status: 'Draft' });
      } else {
        const remaining = currentPosts.filter(p => p.status !== 'Draft');
        writeDB(CONTENT_POSTS_FILE, remaining);
      }

      for (let i = 0; i < analysis.promotional_posts.length; i++) {
        const item = analysis.promotional_posts[i];
        const newPost = {
          id: 'post-' + Date.now() + '-' + i,
          title: item.title || 'New AI Copy Draft',
          body: item.body || 'No text content provided.',
          platform: item.platform || 'X',
          status: 'Draft',
          timestamp: new Date()
        };

        const saved = await db.createContentPost(newPost);
        savedPosts.push(saved);
      }
    }

    res.json({
      strategy: analysis.content_strategy || 'No content strategy.',
      ideas: analysis.daily_content_ideas || [],
      calendar: analysis.weekly_calendar || [],
      hooks: analysis.viral_hooks || [],
      posts: savedPosts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to run Content Agent analysis: ' + err.message });
  }
});

// --- SOCIAL AGENT API ENDPOINTS ---

const runSocialAgent = (payload) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'ai-system', 'agents', 'social_agent.py')]);
    let dataStr = '';
    let errorStr = '';

    pythonProcess.stdout.on('data', (data) => {
      dataStr += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorStr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Social Agent exited with code ${code}. Error: ${errorStr}`));
      }
      try {
        resolve(JSON.parse(dataStr));
      } catch (e) {
        reject(new Error(`Failed to parse Social Agent output: ${e.message}. Raw output: ${dataStr}`));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();
  });
};

// Get Social Metrics
app.get('/api/admin/social/metrics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await db.getSocialMetrics();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch social metrics' });
  }
});

// Update Social Metric
app.put('/api/admin/social/metrics/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { likes, comments, shares, saves, clicks, installs } = req.body;

  try {
    const updates = {};
    if (likes !== undefined) updates.likes = parseInt(likes);
    if (comments !== undefined) updates.comments = parseInt(comments);
    if (shares !== undefined) updates.shares = parseInt(shares);
    if (saves !== undefined) updates.saves = parseInt(saves);
    if (clicks !== undefined) updates.clicks = parseInt(clicks);
    if (installs !== undefined) updates.installs = parseInt(installs);

    const updated = await db.updateSocialMetric(id, updates);
    if (!updated) {
      return res.status(404).json({ message: 'Social metric record not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update social metric record' });
  }
});

// Trigger Social Analysis
app.post('/api/admin/social/analyze', authenticateToken, requireAdmin, async (req, res) => {
  const { goals } = req.body;
  try {
    const posts = await db.getContentPosts();
    const logs = await db.getTelemetry();

    const payload = {
      posts: posts.slice(0, 50),
      analytics: {
        total_logs: logs.length,
        book_reads: logs.filter(l => l.eventType === 'book_read').length
      },
      goals: goals || "Optimize posting schedules and track installs conversion rates across channels."
    };

    const analysis = await runSocialAgent(payload);

    // Save metrics
    const savedMetrics = [];
    if (analysis.social_performance_metrics && Array.isArray(analysis.social_performance_metrics)) {
      const currentMetrics = await db.getSocialMetrics();
      
      if (useMongo) {
        await SocialMetricModel.deleteMany({});
      } else {
        writeDB(SOCIAL_FILE, []);
      }

      for (let i = 0; i < analysis.social_performance_metrics.length; i++) {
        const item = analysis.social_performance_metrics[i];
        const newMetric = {
          id: 'metric-' + Date.now() + '-' + i,
          postTitle: item.postTitle || 'Social Post Topic',
          platform: item.platform || 'X',
          likes: parseInt(item.likes) || 0,
          comments: parseInt(item.comments) || 0,
          shares: parseInt(item.shares) || 0,
          saves: parseInt(item.saves) || 0,
          clicks: parseInt(item.clicks) || 0,
          installs: parseInt(item.installs) || 0,
          timestamp: new Date()
        };

        const saved = await db.createSocialMetric(newMetric);
        savedMetrics.push(saved);
      }
    }

    res.json({
      publishingStrategy: analysis.publishing_strategy || 'No publishing strategy.',
      postingSchedule: analysis.posting_schedule || [],
      engagementReports: analysis.engagement_reports || 'No engagement reports.',
      metrics: savedMetrics
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to run Social Agent analysis: ' + err.message });
  }
});

// --- ANALYTICS AGENT API ENDPOINTS ---

const runAnalyticsAgent = (payload) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'ai-system', 'agents', 'analytics_agent.py')]);
    let dataStr = '';
    let errorStr = '';

    pythonProcess.stdout.on('data', (data) => {
      dataStr += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorStr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Analytics Agent exited with code ${code}. Error: ${errorStr}`));
      }
      try {
        resolve(JSON.parse(dataStr));
      } catch (e) {
        reject(new Error(`Failed to parse Analytics Agent output: ${e.message}. Raw output: ${dataStr}`));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();
  });
};

// Get Analytics Reports
app.get('/api/admin/analytics/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await db.getAnalyticsReports();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch analytics reports' });
  }
});

// Trigger Analytics Audit
app.post('/api/admin/analytics/analyze', authenticateToken, requireAdmin, async (req, res) => {
  const { goals } = req.body;
  try {
    const users = await db.getUsers();
    const catalog = await db.getCatalog();
    const telemetry = await db.getTelemetry();
    const socialMetrics = await db.getSocialMetrics();
    const feedbacks = await db.getFeedbacks();

    const payload = {
      users_count: users.length,
      books_count: catalog.length,
      telemetry: telemetry.slice(0, 100),
      social_metrics: socialMetrics.slice(0, 50),
      feedbacks: feedbacks.slice(0, 50),
      goals: goals || "Optimize KPIs and growth strategies for student users."
    };

    const analysis = await runAnalyticsAgent(payload);

    // Save report
    const newReport = {
      id: 'report-' + Date.now(),
      growthKpis: analysis.growth_kpis || {},
      engagementKpis: analysis.engagement_kpis || {},
      retentionKpis: analysis.retention_kpis || {},
      marketingKpis: analysis.marketing_kpis || {},
      growthReport: analysis.growth_report || '',
      retentionReport: analysis.retention_report || '',
      weaknessReport: analysis.weakness_report || '',
      recommendations: analysis.recommendations || '',
      timestamp: new Date()
    };

    // Clear old records to keep only recent audits
    if (useMongo) {
      await AnalyticsReportModel.deleteMany({});
    } else {
      writeDB(ANALYTICS_REPORTS_FILE, []);
    }

    const savedReport = await db.createAnalyticsReport(newReport);

    res.json(savedReport);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to run Analytics Agent: ' + err.message });
  }
});

// --- MASTER COORDINATOR & ORCHESTRATION ENDPOINTS ---

const runMasterAgent = (payload) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'ai-system', 'agents', 'master_agent.py')]);
    let dataStr = '';
    let errorStr = '';

    pythonProcess.stdout.on('data', (data) => {
      dataStr += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorStr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Master Agent exited with code ${code}. Error: ${errorStr}`));
      }
      try {
        resolve(JSON.parse(dataStr));
      } catch (e) {
        reject(new Error(`Failed to parse Master Agent output: ${e.message}. Raw output: ${dataStr}`));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();
  });
};

const runOrchestrator = (payload) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'ai-system', 'orchestrator.py')]);
    let dataStr = '';
    let errorStr = '';

    pythonProcess.stdout.on('data', (data) => {
      dataStr += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorStr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Orchestrator exited with code ${code}. Error: ${errorStr}`));
      }
      try {
        resolve(JSON.parse(dataStr));
      } catch (e) {
        reject(new Error(`Failed to parse Orchestrator output: ${e.message}. Raw output: ${dataStr}`));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();
  });
};

// Get Master Decisions
app.get('/api/admin/master/decisions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await db.getMasterDecisions();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch master decisions' });
  }
});

// Trigger Master Coordinator Analysis
app.post('/api/admin/master/analyze', authenticateToken, requireAdmin, async (req, res) => {
  const { goals } = req.body;
  try {
    const feedbacks = await db.getFeedbacks();
    const decisions = await db.getProductDecisions();
    const engTasks = await db.getEngineeringTasks();
    const campaigns = await db.getMarketingCampaigns();
    const posts = await db.getContentPosts();
    const socialMetrics = await db.getSocialMetrics();
    const analyticsReports = await db.getAnalyticsReports();

    const payload = {
      feedback_report: feedbacks.slice(0, 30),
      product_decisions: decisions.slice(0, 30),
      engineering_tasks: engTasks.slice(0, 30),
      marketing_campaigns: campaigns.slice(0, 30),
      content_strategy: posts.slice(0, 30),
      social_metrics: socialMetrics.slice(0, 30),
      analytics_insights: analyticsReports[0] || {}
    };

    const analysis = await runMasterAgent(payload);

    // Save master decision record
    const newDecision = {
      id: 'decision-' + Date.now(),
      systemHealth: analysis.system_health || {},
      priorityRanking: analysis.priority_ranking || [],
      executionRoadmap: analysis.execution_roadmap || [],
      strategicDecisions: analysis.strategic_decisions || '',
      timestamp: new Date()
    };

    if (useMongo) {
      await MasterDecisionModel.deleteMany({});
    } else {
      writeDB(MASTER_FILE, []);
    }

    const savedDecision = await db.createMasterDecision(newDecision);

    res.json(savedDecision);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to run Master Agent: ' + err.message });
  }
});

// Trigger Cascading Orchestrator Pipeline
app.post('/api/admin/orchestrate/run', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const feedbacks = await db.getFeedbacks();
    const logs = await db.getTelemetry();
    const users = await db.getUsers();
    const catalog = await db.getCatalog();

    const payload = {
      feedbacks: feedbacks.map(f => f.text || f.feedbackText || ''),
      analytics: {
        total_logs: logs.length,
        reads_count: logs.filter(l => l.eventType === 'book_read').length
      },
      users_count: users.length,
      books_count: catalog.length
    };

    const fullCascadeResult = await runOrchestrator(payload);

    // Save the final master output to Master Decisions database
    const masterAnalysis = fullCascadeResult.master;
    const newDecision = {
      id: 'decision-' + Date.now(),
      systemHealth: masterAnalysis.system_health || {},
      priorityRanking: masterAnalysis.priority_ranking || [],
      executionRoadmap: masterAnalysis.execution_roadmap || [],
      strategicDecisions: masterAnalysis.strategic_decisions || '',
      timestamp: new Date()
    };

    if (useMongo) {
      await MasterDecisionModel.deleteMany({});
    } else {
      writeDB(MASTER_FILE, []);
    }

    const savedDecision = await db.createMasterDecision(newDecision);

    res.json({
      cascade: fullCascadeResult,
      savedDecision: savedDecision
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to run cascading orchestration: ' + err.message });
  }
});


// Helper: Clean HTML tags for text output
function cleanHtmlTags(html) {
  if (!html) return '';
  let clean = html.replace(/<(script|style).*?>[\s\S]*?<\/\1>/gi, '');
  clean = clean.replace(/<[^>]*>/g, ' ');
  clean = clean
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  // Replace multiple spaces and newlines
  clean = clean.replace(/\s+/g, ' ');
  return clean.trim();
}

// Helper: Extract EPUB cover image if available
function extractEpubCover(zip, opfXml, baseDir) {
  try {
    const coverMetaMatch = opfXml.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"/i) || 
                           opfXml.match(/<meta[^>]*content="([^"]+)"[^>]*name="cover"/i);
    let coverId = coverMetaMatch ? coverMetaMatch[1] : null;
    
    let coverHref = null;
    if (coverId) {
      const coverItemMatch = opfXml.match(new RegExp(`<item[^>]*id="${coverId}"[^>]*href="([^"]+)"`, 'i'));
      if (coverItemMatch) {
        coverHref = coverItemMatch[1];
      }
    }
    
    if (!coverHref) {
      const itemMatches = opfXml.matchAll(/<item\s+[^>]*href="([^"]+)"[^>]*media-type="image\/[^"]+"[^>]*>/gi);
      for (const m of itemMatches) {
        const href = m[1];
        if (href.toLowerCase().includes('cover')) {
          coverHref = href;
          break;
        }
      }
    }
    
    if (coverHref) {
      const fullCoverPath = baseDir ? path.join(baseDir, coverHref).replace(/\\/g, '/') : coverHref;
      const entry = zip.getEntry(fullCoverPath);
      if (entry) {
        const coverBuffer = entry.getData();
        const ext = coverHref.split('.').pop().toLowerCase();
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        return `data:${mime};base64,${coverBuffer.toString('base64')}`;
      }
    }
  } catch (e) {
    console.error('Error extracting cover:', e);
  }
  return null;
}

// Extractive NLP Summarization Model
function summarizeTextNLP(text) {
  if (!text || text.trim().length === 0) {
    return {
      summary: "This chapter has no readable text content.",
      keyPoints: ["No content available."]
    };
  }

  // Split into sentences
  const sentences = text
    .replace(/([.!?])\s*(?=[A-Z])/g, "$1|")
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 15);

  if (sentences.length <= 3) {
    return {
      summary: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
      keyPoints: sentences.length > 0 ? sentences : [text.substring(0, 100)]
    };
  }

  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been", "being",
    "in", "on", "at", "to", "for", "with", "by", "of", "from", "up", "about", "into", "over", "after",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his",
    "their", "our", "its", "this", "that", "these", "those", "have", "has", "had", "do", "does", "did",
    "can", "could", "will", "would", "shall", "should", "may", "might", "must", "then", "there", "when",
    "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "say", "says", "said", "also", "just", "like"
  ]);

  const wordFreq = {};
  const words = text.toLowerCase().match(/[a-z]{3,}/g) || [];
  for (const w of words) {
    if (!stopWords.has(w)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  const sentenceScores = sentences.map((sentence, index) => {
    const sWords = sentence.toLowerCase().match(/[a-z]{3,}/g) || [];
    let score = 0;
    for (const w of sWords) {
      if (wordFreq[w]) {
        score += wordFreq[w];
      }
    }
    const normalizedScore = sWords.length > 0 ? score / sWords.length : 0;
    return { sentence, index, score: normalizedScore };
  });

  // Pick top 4 sentences
  const topSentences = [...sentenceScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // Preserve reading order
  topSentences.sort((a, b) => a.index - b.index);
  const summaryParagraph = topSentences.map(s => s.sentence).join(" ");

  // Select 3 key bullet points
  const bulletSentences = [...sentenceScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.sentence);

  return {
    summary: summaryParagraph,
    keyPoints: bulletSentences
  };
}

// --- EPUB PARSER ENDPOINT ---
app.post('/api/admin/parse-epub', authenticateToken, requireAdmin, async (req, res) => {
  const { fileBase64, filename } = req.body;
  if (!fileBase64) {
    return res.status(400).json({ message: 'EPUB file base64 data required' });
  }

  try {
    const buffer = Buffer.from(fileBase64.split(',')[1] || fileBase64, 'base64');
    const zip = new AdmZip(buffer);
    
    // Read container.xml
    const containerEntry = zip.getEntry('META-INF/container.xml');
    if (!containerEntry) {
      return res.status(400).json({ message: 'Invalid EPUB: container.xml missing' });
    }
    const containerXml = containerEntry.getData().toString('utf8');
    
    const opfPathMatch = containerXml.match(/full-path="([^"]+)"/);
    if (!opfPathMatch) {
      return res.status(400).json({ message: 'Invalid EPUB: OPF path missing in container.xml' });
    }
    
    const opfPath = opfPathMatch[1];
    const baseDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';
    
    const opfEntry = zip.getEntry(opfPath);
    if (!opfEntry) {
      return res.status(400).json({ message: 'Invalid EPUB: OPF file missing' });
    }
    const opfXml = opfEntry.getData().toString('utf8');
    
    // Extract metadata
    const titleMatch = opfXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    const authorMatch = opfXml.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
    const title = titleMatch ? cleanHtmlTags(titleMatch[1]) : filename.replace(/\.[^/.]+$/, "");
    const author = authorMatch ? cleanHtmlTags(authorMatch[1]) : "Unknown Author";
    
    // Extract manifest items
    const manifest = {};
    const itemMatches = opfXml.matchAll(/<item\s+[^>]*id="([^"]+)"\s+[^>]*href="([^"]+)"[^>]*>/gi);
    for (const match of itemMatches) {
      manifest[match[1]] = match[2];
    }
    
    // Spine items (Reading order)
    const spineItems = [];
    const spineMatches = opfXml.matchAll(/<itemref\s+[^>]*idref="([^"]+)"[^>]*>/gi);
    for (const match of spineMatches) {
      const idref = match[1];
      const href = manifest[idref];
      if (href) {
        const fullHref = baseDir ? `${baseDir}/${href}`.replace(/\\/g, '/') : href;
        const cleanHref = fullHref.split('#')[0];
        if (!spineItems.includes(cleanHref)) {
          spineItems.push(cleanHref);
        }
      }
    }

    // Extract cover image
    const cover = extractEpubCover(zip, opfXml, baseDir);

    // Extract chapters content
    const chapters = [];
    let chapterIdx = 1;

    for (const cleanHref of spineItems) {
      const entry = zip.getEntry(cleanHref);
      if (!entry) continue;

      const htmlContent = entry.getData().toString('utf8');
      const text = cleanHtmlTags(htmlContent);
      if (text.length < 30) continue; // skip blank spine items / metadata lists

      // Find headings
      let chapterTitle = '';
      const h2Match = htmlContent.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      const h1Match = htmlContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (h2Match) {
        chapterTitle = cleanHtmlTags(h2Match[1]);
      } else if (h1Match) {
        chapterTitle = cleanHtmlTags(h1Match[1]);
      }

      if (!chapterTitle || chapterTitle.length > 80 || /^[0-9]+$/.test(chapterTitle)) {
        chapterTitle = `Chapter ${chapterIdx}`;
      }

      chapters.push({
        title: chapterTitle,
        content: text
      });
      chapterIdx++;
    }

    res.json({
      title,
      author,
      cover,
      chapters
    });
  } catch (err) {
    console.error('Error parsing EPUB:', err);
    res.status(500).json({ message: 'Failed to parse EPUB file: ' + err.message });
  }
});

// --- NLP SUMMARIZATION ENDPOINT ---
const runSummarizerAgent = (payload) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'ai-system', 'agents', 'summarizer_agent.py')]);
    let dataStr = '';
    let errorStr = '';

    pythonProcess.stdout.on('data', (data) => {
      dataStr += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorStr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Summarizer Agent exited with code ${code}. Error: ${errorStr}`));
      }
      try {
        resolve(JSON.parse(dataStr));
      } catch (e) {
        reject(new Error(`Failed to parse Summarizer Agent output: ${e.message}. Raw output: ${dataStr}`));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();
  });
};

app.post('/api/nlp/summarize', async (req, res) => {
  const { text, mode, book_id, chapter } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Text body required for summarization' });
  }

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
      // Ignore token decode errors
    }
  }

  try {
    // Log summary usage telemetry
    await db.logTelemetry({
      userId,
      userEmail,
      eventType: 'ai_summary_usage',
      metadata: { 
        bookId: book_id || "Unknown", 
        chapter: chapter || 1, 
        textLength: text.length, 
        mode: mode || 'short',
        isSelection: !book_id
      },
      timestamp: new Date()
    });

    const summaryData = await runSummarizerAgent({ text, mode: mode || 'short' });
    res.json(summaryData);
  } catch (err) {
    console.error('Error in NLP summary:', err);
    res.status(500).json({ message: 'Failed to generate NLP summary: ' + err.message });
  }
});

// --- AI LIBRARIAN AGENT HELPER & ENDPOINT ---
const { spawn } = require('child_process');

const runLibrarianAgent = (payload) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(__dirname, 'ai-system', 'agents', 'librarian_agent.py')]);
    let dataStr = '';
    let errorStr = '';

    pythonProcess.stdout.on('data', (data) => {
      dataStr += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorStr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Librarian Agent exited with code ${code}. Error: ${errorStr}`));
      }
      try {
        resolve(JSON.parse(dataStr));
      } catch (e) {
        reject(new Error(`Failed to parse Librarian Agent JSON output: ${e.message}. Raw output: ${dataStr}`));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(payload));
    pythonProcess.stdin.end();
  });
};

app.post('/api/nlp/chat', async (req, res) => {
  const { book_title, chapter_title, chapter_content, query, chat_history } = req.body;
  if (!query) {
    return res.status(400).json({ message: 'Query is required' });
  }

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
      // Ignore token decode errors
    }
  }

  try {
    // Log AI Librarian usage telemetry
    await db.logTelemetry({
      userId,
      userEmail,
      eventType: 'ai_librarian_usage',
      metadata: { 
        bookTitle: book_title || "Unknown Book", 
        chapterTitle: chapter_title || "Unknown Chapter", 
        queryLength: query.length 
      },
      timestamp: new Date()
    });

    const payload = {
      book_title: book_title || "Unknown Book",
      chapter_title: chapter_title || "Unknown Chapter",
      chapter_content: chapter_content || "",
      query: query,
      chat_history: chat_history || []
    };

    const response = await runLibrarianAgent(payload);
    res.json(response);
  } catch (err) {
    console.error('Error in Librarian Agent chat:', err);
    res.status(500).json({ message: 'Failed to query AI Librarian: ' + err.message });
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
