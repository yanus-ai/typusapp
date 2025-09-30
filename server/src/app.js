const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { prisma } = require('./services/prisma.service');
const handlePrismaErrors = require('./middleware/prisma-error.middleware');
const errorHandler = require('./middleware/error.middleware');
const passport = require('./config/passport');
const webSocketService = require('./services/websocket.service');
require('dotenv').config();

const routes = require('./routes/index');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Body parsing - exclude webhook paths that need raw body
app.use('/api', (req, res, next) => {
  // Skip body parsing for Stripe webhooks that need raw body
  if (req.path === '/webhooks/stripe' && req.method === 'POST') {
    return next();
  }
  
  // Apply JSON parsing for all other routes
  express.json({ limit: '50mb' })(req, res, next);
});

app.use(express.urlencoded({ limit: '50mb', extended: true })); // Also increase URL encoded limit
app.use(morgan('dev'));
app.use(passport.initialize());

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Import routes (uncomment as they're implemented)
// const routes = require('./routes');
app.use('/api', routes);

// Error handling middleware (order matters)
app.use(handlePrismaErrors);
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Configure server timeout for large requests
server.timeout = 300000; // 5 minutes
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds

// Initialize WebSocket server
webSocketService.initialize(server);

// Initialize image status checker cron job
const imageStatusChecker = require('./jobs/imageStatusChecker');
imageStatusChecker.start();

module.exports = { app, server };