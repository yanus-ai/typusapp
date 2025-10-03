const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

console.log(process.env.DATABASE_URL)

// Create a singleton instance of PrismaClient with optimized connection pooling
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['error', 'warn'] // Reduced logging to prevent spam
    : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Optimize connection pooling for production
  __internal: {
    engine: {
      connectionLimit: 10, // Reduced from 25 to prevent connection exhaustion
      poolTimeout: 20000, // 20 seconds timeout
      idleTimeout: 300000, // 5 minutes idle timeout
    }
  }
});

// Connection management methods
const connectPrisma = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

const disconnectPrisma = async () => {
  await prisma.$disconnect();
  console.log('Database disconnected');
};

module.exports = {
  prisma,
  connectPrisma,
  disconnectPrisma
};