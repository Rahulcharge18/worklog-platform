const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const worklogRoutes = require('./routes/worklogs');
const worktypeRoutes = require('./routes/worktypes');
const adminRoutes = require('./routes/admin');
const WorkType = require('./models/WorkType');

const app = express();
const PORT = process.env.PORT || 5050;

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

// Seed default work types if none exist
async function seedWorkTypes() {
  const count = await WorkType.countDocuments();
  if (count === 0) {
    const defaults = DEFAULT_WORK_TYPES.map(wt => ({ ...wt, isDefault: true, isActive: true }));
    await WorkType.insertMany(defaults);
    console.log(`✅ Seeded ${defaults.length} default work types.`);
  }
}

// Dynamic Database Connection
let mongoServerInstance = null;

async function startDatabaseAndServer() {
  try {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      console.log('No MONGODB_URI found in environment.');
      console.log('Initializing local In-Memory MongoDB Server...');
      mongoServerInstance = await MongoMemoryServer.create();
      mongoUri = mongoServerInstance.getUri();
      console.log(`In-memory MongoDB started at: ${mongoUri}`);
    }

    await mongoose.connect(mongoUri);
    console.log('Mongoose connected to MongoDB.');

    // Seed defaults
    await seedWorkTypes();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/worklogs', worklogRoutes);
app.use('/api/worktypes', worktypeRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await mongoose.disconnect();
  if (mongoServerInstance) await mongoServerInstance.stop();
  process.exit(0);
});

startDatabaseAndServer();
