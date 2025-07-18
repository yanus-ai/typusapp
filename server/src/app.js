const express = require('express');
const https = require('https');
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
app.use(express.json());
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

// Create server (HTTP for local, HTTPS for production)
const server = process.env.NODE_ENV === 'production' 
  ? https.createServer(app)  // If you have SSL certs
  : http.createServer(app);   // For ngrok, HTTP is fine

// Initialize WebSocket service
webSocketService.initialize(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Log the correct WebSocket URL
  const protocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';
  const domain = process.env.DOMAIN || 'localhost';
  console.log(`📡 WebSocket available at ${protocol}://${domain}:${PORT}/ws`);
});

module.exports = app;