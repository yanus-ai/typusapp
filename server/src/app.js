const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
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
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'https://app.prai.vision'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(morgan('dev'));
app.use(passport.initialize());

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ 
      status: 'ok', 
      database: 'connected',
      environment: process.env.NODE_ENV,
      domain: process.env.DOMAIN || 'localhost',
      ssl: process.env.NODE_ENV === 'production' && process.env.SSL_CERT ? 'enabled' : 'disabled',
      certExist: fs.existsSync(process.env.SSL_CERT),
      keyExist: fs.existsSync(process.env.SSL_KEY),
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api', routes);

// Error handling middleware
app.use(handlePrismaErrors);
app.use(errorHandler);

// Enhanced server creation logic with better error handling
const createServer = () => {
  if (process.env.NODE_ENV === 'production') {
    // For production on EC2 with certbot SSL
    if (process.env.SSL_CERT && process.env.SSL_KEY) {
      try {
        // Check if certificates exist and are readable
        if (!fs.existsSync(process.env.SSL_CERT)) {
          throw new Error(`SSL certificate not found: ${process.env.SSL_CERT}`);
        }
        if (!fs.existsSync(process.env.SSL_KEY)) {
          throw new Error(`SSL private key not found: ${process.env.SSL_KEY}`);
        }

        const options = {
          key: fs.readFileSync(process.env.SSL_KEY),
          cert: fs.readFileSync(process.env.SSL_CERT)
        };
        
        console.log('🔒 Creating HTTPS server with SSL certificates');
        console.log(`   📜 Certificate: ${process.env.SSL_CERT}`);
        console.log(`   🔑 Private Key: ${process.env.SSL_KEY}`);
        return https.createServer(options, app);
      } catch (error) {
        console.error('❌ Failed to load SSL certificates:', error.message);
        console.log('🔄 Falling back to HTTP server');
        return http.createServer(app);
      }
    } else {
      console.log('⚠️ Production mode but no SSL certificates configured, using HTTP');
      return http.createServer(app);
    }
  } else {
    console.log('🌐 Creating HTTP server for development');
    return http.createServer(app);
  }
};

const server = createServer();

// Initialize WebSocket service
webSocketService.initialize(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
  
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏠 Domain: ${process.env.DOMAIN || 'localhost'}`);
  
  // Smart URL detection
  if (process.env.NODE_ENV === 'production' && process.env.DOMAIN) {
    const protocol = process.env.SSL_CERT ? 'https' : 'http';
    const wsProtocol = process.env.SSL_CERT ? 'wss' : 'ws';
    console.log(`🌐 Production API: ${protocol}://${process.env.DOMAIN}/api`);
    console.log(`📡 Production WebSocket: ${wsProtocol}://${process.env.DOMAIN}/ws`);
    console.log(`🔍 Health check: ${protocol}://${process.env.DOMAIN}/api/health`);
  } else {
    console.log(`🌐 Local API: http://localhost:${PORT}/api`);
    console.log(`📡 Local WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;