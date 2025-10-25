const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// For local development, prefer DIRECT_URL to avoid pgbouncer issues
let dbUrl = process.env.NODE_ENV === 'development' && process.env.DIRECT_URL
  ? process.env.DIRECT_URL
  : process.env.DATABASE_URL;

// Ensure SSL mode is set for Supabase
if (!dbUrl.includes('sslmode=')) {
  dbUrl += dbUrl.includes('?') ? '&sslmode=require' : '?sslmode=require';
}

console.log('Using database URL:', dbUrl.replace(/:[^:@]+@/, ':****@'));

// Create a singleton instance of PrismaClient with optimized connection pooling
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['error', 'warn'] 
    : ['error'],
  datasources: {
    db: {
      url: dbUrl
    }
  },
  // Optimize connection pooling settings
  __internal: {
    engine: {
      connectionLimit: process.env.NODE_ENV === 'development' ? 5 : 10,
      poolTimeout: 20000,
      idleTimeout: 300000,
      retry: {
        max: 3,
        backoff: {
          min: 1000,
          max: 5000,
          factor: 2
        }
      }
    }
  }
});

// Connection management methods with retries
const connectPrisma = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      console.log('Database connected successfully');
      
      // Add error handler for runtime disconnects
      prisma.$on('error', (e) => {
        console.error('Prisma error event:', e);
        if (e.code === 'P1001' || e.code === 'P1017') {
          console.log('Attempting to reconnect...');
          setTimeout(() => connectPrisma(1), 5000);
        }
      });
      
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${attempt}/${retries} failed:`, error);
      if (attempt === retries) {
        return false;
      }
      // Wait before retrying, with exponential backoff
      await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 10000)));
    }
  }
  return false;
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