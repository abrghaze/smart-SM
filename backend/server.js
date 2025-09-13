const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS configuration - CRITICAL for frontend communication (MUST BE FIRST)
app.use(cors({
  origin: [
    'http://localhost:3000',  // Local development
    'http://frontend:80',     // Docker frontend container
    'http://frontend:3000',   // Docker frontend container (alternative)
    'https://yourdomain.com'  // Production domain
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware (after CORS to avoid conflicts)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting - increased for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/users', require('./routes/users'));
app.use('/api/skill-requests', require('./routes/skillRequests'));
app.use('/api/objectives', require('./routes/objectives'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/search', require('./routes/search'));
app.use('/api/files', require('./routes/files'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/job-titles', require('./routes/jobTitles'));
app.use('/api/job-title-objectives', require('./routes/jobTitleObjectives'));

// Role-specific routes
app.use('/api/manager', require('./routes/manager'));
app.use('/api/employee', require('./routes/employee'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Validation error', 
      errors: err.details 
    });
  }
  
  if (err.name === 'MulterError') {
    return res.status(400).json({ 
      message: 'File upload error', 
      error: err.message 
    });
  }
  
  res.status(500).json({ 
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Import cleanup utilities
const { runCleanup } = require('./utils/cleanup');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(` API Base URL: http://localhost:${PORT}/api`);
  console.log(`🧹 Auto-cleanup scheduled to run every hour`);
  
  // Run initial cleanup on startup
  try {
    runCleanup();
  } catch (error) {
    console.error('❌ Error running initial cleanup:', error);
  }
  
  // Schedule cleanup to run every hour
  setInterval(() => {
    try {
      runCleanup();
    } catch (error) {
      console.error('❌ Error running scheduled cleanup:', error);
    }
  }, 60 * 60 * 1000);

  // Start scheduled jobs for notifications
  const CronService = require('./services/cronService');
  CronService.startScheduledJobs();

  // Start late objectives monitoring service
  const LateObjectivesService = require('./services/lateObjectivesService');
  LateObjectivesService.start();
});

module.exports = app;
