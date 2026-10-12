const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('../backend/routes/auth');
const worklogRoutes = require('../backend/routes/worklogs');
const worktypeRoutes = require('../backend/routes/worktypes');
const adminRoutes = require('../backend/routes/admin');
const WorkType = require('../backend/models/WorkType');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Default work types to seed on first run
const DEFAULT_WORK_TYPES = [
  { name: 'Development', description: 'Feature development, coding, implementation', order: 1 },
  { name: 'Debugging', description: 'Fixing bugs, investigating and resolving issues', order: 2 },
  { name: 'QA', description: 'Quality assurance, testing, test case execution', order: 3 },
  { name: 'Documentation', description: 'Writing technical docs, wikis, runbooks', order: 4 },
  { name: 'DevOps Task', description: 'CI/CD, deployments, infra, pipeline work', order: 5 },
  { name: 'Internal Meeting', description: 'Team syncs, standups, internal discussions', order: 6 },
  { name: 'Client Meeting', description: 'Client calls, demos, external discussions', order: 7 },
  { name: 'Support', description: 'Handling support tickets and user queries', order: 8 },
  { name: 'Requirement Gathering', description: 'Collecting and analysing requirements', order: 9 },
  { name: 'Impact Analysis', description: 'Analysing impact of changes or new features', order: 10 },
  { name: 'KT Session', description: 'Knowledge transfer — receiving from team', order: 11 },
  { name: 'Provide Training', description: 'Conducting training or KT for others', order: 12 },
  { name: 'Training Session', description: 'Attending training, learning, self-study', order: 13 },
  { name: 'Interview', description: 'Taking or attending technical/HR interviews', order: 14 },
];

async function seedWorkTypes() {
  try {
    const count = await WorkType.countDocuments();
    if (count === 0) {
      const defaults = DEFAULT_WORK_TYPES.map(wt => ({ ...wt, isDefault: true, isActive: true }));
      await WorkType.insertMany(defaults);
      console.log(`✅ Seeded ${defaults.length} default work types on Vercel.`);
    }
  } catch (err) {
    console.error('WorkType seeding error:', err.message);
  }
}

// Serverless Mongoose Connection Pooling
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://rahulsharma:DTG2cpGxBtACkl8W@cluster0.5pxqvi6.mongodb.net/worklog-platform?retryWrites=true&w=majority';

    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(uri, opts).then(async (mongooseInstance) => {
      console.log('Mongoose connected to MongoDB (Vercel Serverless Pool).');
      await seedWorkTypes();
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Database Connection Middleware for Serverless
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('Database connection failed:', err);
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/worklogs', worklogRoutes);
app.use('/api/worktypes', worktypeRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    platform: 'Vercel Serverless Function',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Export Express app for Vercel Serverless Runtime
module.exports = app;
