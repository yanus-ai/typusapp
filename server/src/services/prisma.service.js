const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Always use DATABASE_URL with pgbouncer for connection pooling
let dbUrl = process.env.DATABASE_URL;

// Ensure SSL mode is set for Supabase
if (!dbUrl.includes('sslmode=')) {
  dbUrl += dbUrl.includes('?') ? '&sslmode=require' : '?sslmode=require';
}

console.log('Using database URL:', dbUrl.replace(/:[^:@]+@/, ':****@'));

// Create a singleton instance of PrismaClient with optimized connection pooling
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

// Connection management methods with retries
const connectPrisma = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      console.log('Database connection established successfully');

      // Setup reconnection handling
      prisma.$on('disconnect', () => {
        console.log('Database disconnected, attempting to reconnect...');
        setTimeout(() => connectPrisma(1), 5000);
      });
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