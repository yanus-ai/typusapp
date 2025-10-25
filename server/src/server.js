require('dotenv').config();
const { app, server } = require('./app');
const { connectPrisma, disconnectPrisma } = require('./services/prisma.service');
const { initializeCronJobs } = require('./services/cron.service');
const { monitorEventLoopDelay } = require('perf_hooks');

// Track server state for graceful shutdown
let isShuttingDown = false;

// Lightweight event-loop delay monitoring to detect blocking tasks that cause
// node-cron missed executions. Logs mean delay (ms) once per minute.
try {
  const h = monitorEventLoopDelay({ resolution: 20 });
  h.enable();
  setInterval(() => {
    // mean is in nanoseconds
    const meanMs = Math.round(h.mean / 1e6);
    const maxMs = Math.round(h.max / 1e6);
    console.log(`event-loop-delay: mean=${meanMs}ms max=${maxMs}ms`);
  }, 60_000);
} catch (err) {
  console.warn('Event-loop monitor not available:', err && err.message);
}


const PORT = process.env.PORT || 3000;

// Server startup with database connection check
const startServer = async () => {
  try {
    // Ensure database is connected before starting server
    const isConnected = await connectPrisma();
    
    if (!isConnected) {
      console.error('Failed to connect to database. Server will not start.');
      process.exit(1);
    }
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket server available at ws://localhost:${PORT}/ws`);
      console.log(`🏥 Health check available at: http://localhost:${PORT}/api/health`);
     
      
      
      // Initialize cron jobs after server starts
      initializeCronJobs();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await disconnectPrisma();
    process.exit(1);
  }
};

// Handle graceful shutdown
const shutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`${signal} signal received: gracefully closing HTTP server`);
  
  try {
    // Stop accepting new connections
    server.close(() => {
      console.log('HTTP server closed');
    });
    
    // Disconnect DB (with timeout)
    const dbTimeout = setTimeout(() => {
      console.error('Database disconnect timed out after 5s');
      process.exit(1);
    }, 5000);
    
    await disconnectPrisma();
    clearTimeout(dbTimeout);
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();