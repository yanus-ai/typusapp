const { PrismaClient } = require('@prisma/client');

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
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