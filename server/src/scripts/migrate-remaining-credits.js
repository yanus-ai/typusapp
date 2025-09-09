const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Migration script to populate remainingCredits field for existing users
 * This calculates the current balance from CreditTransaction records and 
 * sets the remainingCredits field accordingly
 */
async function migrateRemainingCredits() {
  console.log('🔄 Starting migration to populate remainingCredits field...');
  
  try {
    // Get all users who don't have remainingCredits set (or have 0)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        remainingCredits: true
      }
    });

    console.log(`📊 Found ${users.length} users to process`);

    let processed = 0;
    let updated = 0;

    for (const user of users) {
      console.log(`🔄 Processing user ${user.id} (${user.email})...`);

      // Calculate current balance from transactions
      const now = new Date();
      const creditBalance = await prisma.creditTransaction.aggregate({
        where: {
          userId: user.id,
          status: 'COMPLETED',
          OR: [
            { expiresAt: { gt: now } },
            { expiresAt: null }
          ]
        },
        _sum: {
          amount: true
        }
      });

      const calculatedBalance = creditBalance._sum.amount || 0;
      
      // Only update if the calculated balance differs from current remainingCredits
      if (calculatedBalance !== user.remainingCredits) {
        await prisma.user.update({
          where: { id: user.id },
          data: { remainingCredits: calculatedBalance }
        });

        console.log(`✅ Updated user ${user.id}: ${user.remainingCredits} → ${calculatedBalance} credits`);
        updated++;
      } else {
        console.log(`⚪ User ${user.id} already has correct balance: ${calculatedBalance} credits`);
      }

      processed++;
    }

    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Processed: ${processed} users`);
    console.log(`📊 Updated: ${updated} users`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Verify migration results by comparing transaction balances with remainingCredits
 */
async function verifyMigration() {
  console.log('🔍 Verifying migration results...');

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        remainingCredits: true
      }
    });

    let correct = 0;
    let incorrect = 0;

    for (const user of users) {
      const now = new Date();
      const creditBalance = await prisma.creditTransaction.aggregate({
        where: {
          userId: user.id,
          status: 'COMPLETED',
          OR: [
            { expiresAt: { gt: now } },
            { expiresAt: null }
          ]
        },
        _sum: {
          amount: true
        }
      });

      const calculatedBalance = creditBalance._sum.amount || 0;

      if (calculatedBalance === user.remainingCredits) {
        correct++;
      } else {
        console.log(`❌ Mismatch for user ${user.id}: remainingCredits=${user.remainingCredits}, calculated=${calculatedBalance}`);
        incorrect++;
      }
    }

    console.log(`✅ Verification completed`);
    console.log(`📊 Correct: ${correct} users`);
    console.log(`📊 Incorrect: ${incorrect} users`);

    if (incorrect === 0) {
      console.log('🎉 All users have correct remainingCredits values!');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'verify') {
    verifyMigration();
  } else {
    migrateRemainingCredits();
  }
}

module.exports = {
  migrateRemainingCredits,
  verifyMigration
};