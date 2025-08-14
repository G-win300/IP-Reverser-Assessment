const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const winston = require('winston');
require('dotenv').config();

const dbService = require('./services/database');
const ipService = require('./services/ipService');

const app = express();
const PORT = process.env.PORT || 3000;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Main endpoint
app.get('/', async (req, res) => {
  try {
    // Extract client IP
    const clientIP = ipService.extractClientIP(req);
    logger.info(`Extracted client IP: ${clientIP}`);
    
    // Reverse the IP
    const reversedIP = ipService.reverseIP(clientIP);
    logger.info(`Reversed IP: ${reversedIP}`);
    
    // Store in database
    const record = await dbService.storeReversedIP(clientIP, reversedIP);
    
    // Return response
    res.json({
      originalIP: clientIP,
      reversedIP: reversedIP,
      timestamp: record.created_at,
      message: `Your IP ${clientIP} reversed is ${reversedIP}`
    });
    
  } catch (error) {
    logger.error('Error processing request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process IP address'
    });
  }
});

// Get all stored IPs endpoint
app.get('/ips', async (req, res) => {
  try {
    const records = await dbService.getAllRecords();
    res.json(records);
  } catch (error) {
    logger.error('Error fetching records:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    await dbService.initializeDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

startServer();

module.exports = app;