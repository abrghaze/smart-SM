const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const emailRoutes = require('./routes/emailRoutes');
const schedulerService = require('./services/schedulerService');
const { testEmailConfig } = require('./config/email');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Routes
app.use('/api/email', emailRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'smart-skill-matrix-email-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Smart Skill Matrix Email Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      email: '/api/email',
      testConfig: '/api/email/test-config',
      testEmail: '/api/email/test'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error(`Unhandled error: ${error.message}`, error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  schedulerService.stopAllTasks();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  schedulerService.stopAllTasks();
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Test email configuration
    const emailConfigValid = await testEmailConfig();
    if (!emailConfigValid) {
      logger.warn('⚠️ Email configuration is invalid. Please check your SMTP settings.');
    }

    app.listen(PORT, () => {
      logger.info(`📧 Email Service started on port ${PORT}`);
      logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
      logger.info(`📊 API endpoints: http://localhost:${PORT}/api/email`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`🔧 Test email: POST http://localhost:${PORT}/api/email/test`);
      }
    });
  } catch (error) {
    logger.error(`Failed to start email service: ${error.message}`);
    process.exit(1);
  }
};

startServer();



