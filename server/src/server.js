const app = require('./app');
const { connectPrisma, disconnectPrisma } = require('./services/prisma.service');
require('dotenv').config();

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
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check available at: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await disconnectPrisma();
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await disconnectPrisma();
  process.exit(0);
});

startServer();