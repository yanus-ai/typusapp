const { PrismaClient } = require('@prisma/client');
const sessionService = require('../services/session.service');

// Check if Prisma Client is up to date
const prisma = new PrismaClient();

// Verify sessionId field exists before proceeding
async function verifySchema() {
  try {
    // Try to query with sessionId to verify it exists
    await prisma.generationBatch.findFirst({
      where: { sessionId: null },
      select: { id: true }
    });
    console.log('✅ Schema verified - sessionId field exists');
    return true;
  } catch (error) {
    if (error.message && error.message.includes('Unknown argument `sessionId`')) {
      console.error('❌ ERROR: Prisma Client is out of date!');
      console.error('Please run: npx prisma generate');
      console.error('Then run this script again.');
      return false;
    }
    // Other errors are fine (like no batches found)
    return true;
  }
}

async function main() {
  console.log('🔄 Starting batch migration to sessions...');
  
  // Verify schema is up to date
  const schemaValid = await verifySchema();
  if (!schemaValid) {
    await prisma.$disconnect();
    process.exit(1);
  }
  
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true }
    });

    console.log(`Found ${users.length} users to process`);

    let totalSessionsCreated = 0;
    let totalBatchesMigrated = 0;

    for (const user of users) {
      console.log(`\n📦 Processing user ${user.id}...`);
      const result = await sessionService.migrateExistingBatchesToSessions(user.id);
      totalSessionsCreated += result.sessionsCreated;
      totalBatchesMigrated += result.batchesMigrated;
      console.log(`✅ User ${user.id}: ${result.sessionsCreated} sessions, ${result.batchesMigrated} batches`);
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`Total sessions created: ${totalSessionsCreated}`);
    console.log(`Total batches migrated: ${totalBatchesMigrated}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

