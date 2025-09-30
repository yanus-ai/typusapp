const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Investigate credit issues for a specific user
 */
async function investigateUserCredits(email) {
  console.log(`🔍 Investigating credit issues for user: ${email}`);
  console.log('=' .repeat(80));

  try {
    // 1. Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscription: true,
        creditHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }

    console.log(`👤 User Info:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.fullName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log();

    // 2. Check for multiple subscriptions
    const allSubscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Subscription Analysis:`);
    console.log(`   Total Subscriptions Found: ${allSubscriptions.length}`);
    
    if (allSubscriptions.length > 1) {
      console.log(`   ⚠️  MULTIPLE SUBSCRIPTIONS DETECTED!`);
    }

    allSubscriptions.forEach((sub, index) => {
      console.log(`   
   Subscription #${index + 1}:`);
      console.log(`     ID: ${sub.id}`);
      console.log(`     Plan: ${sub.planType}`);
      console.log(`     Status: ${sub.status}`);
      console.log(`     Credits: ${sub.credits}`);
      console.log(`     Stripe Sub ID: ${sub.stripeSubscriptionId || 'None'}`);
      console.log(`     Created: ${sub.createdAt}`);
      console.log(`     Period: ${sub.currentPeriodStart} to ${sub.currentPeriodEnd}`);
    });

    // 3. Analyze credit transactions
    console.log(`\n💰 Credit Transaction History (Last 20):`);
    
    const totalCreditsAdded = user.creditHistory
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalCreditsUsed = user.creditHistory
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    console.log(`   Total Credits Added: ${totalCreditsAdded}`);
    console.log(`   Total Credits Used: ${totalCreditsUsed}`);
    console.log(`   Net Credits: ${totalCreditsAdded - totalCreditsUsed}`);
    console.log(`   Current Subscription Credits: ${user.subscription?.credits || 0}`);

    user.creditHistory.forEach((tx, index) => {
      const sign = tx.amount >= 0 ? '+' : '';
      console.log(`   ${index + 1}. ${sign}${tx.amount} credits - ${tx.type} - ${tx.description || 'No description'} (${tx.createdAt.toLocaleString()})`);
    });

    // 4. Check for webhook/Stripe issues
    console.log(`\n🔗 Stripe Integration Check:`);
    if (user.subscription?.stripeSubscriptionId) {
      console.log(`   Stripe Subscription ID: ${user.subscription.stripeSubscriptionId}`);
      console.log(`   Stripe Customer ID: ${user.subscription.stripeCustomerId || 'None'}`);
    } else {
      console.log(`   ⚠️  No Stripe subscription ID found`);
    }

    // 5. Summary and recommendations
    console.log(`\n📋 SUMMARY:`);
    if (allSubscriptions.length > 1) {
      console.log(`   🚨 ISSUE: Multiple subscriptions detected - this explains the extra credits!`);
      console.log(`   💡 SOLUTION: Merge/cleanup subscriptions and recalculate credits`);
    }

    const expectedCredits = allSubscriptions
      .filter(sub => sub.status === 'ACTIVE')
      .reduce((sum, sub) => sum + (sub.planType === 'BASIC' ? 1000 : 0), 0);
    
    console.log(`   Expected Credits (Basic Plan): 1000`);
    console.log(`   Actual Credits: ${user.subscription?.credits || 0}`);
    
    if (user.subscription?.credits > 1000) {
      console.log(`   🚨 OVERAGE: ${user.subscription.credits - 1000} extra credits detected`);
    }

  } catch (error) {
    console.error('❌ Error investigating credits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Find and cleanup duplicate subscriptions
 */
async function cleanupDuplicateSubscriptions(userId) {
  console.log(`🧹 Cleaning up duplicate subscriptions for user ID: ${userId}`);
  
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (subscriptions.length <= 1) {
      console.log('✅ No duplicate subscriptions found');
      return;
    }

    console.log(`Found ${subscriptions.length} subscriptions. Keeping the most recent one.`);
    
    // Keep the first (most recent) subscription
    const keepSubscription = subscriptions[0];
    const duplicateIds = subscriptions.slice(1).map(sub => sub.id);
    
    console.log(`Keeping subscription ID: ${keepSubscription.id}`);
    console.log(`Deleting subscription IDs: ${duplicateIds.join(', ')}`);
    
    // Delete duplicate subscriptions
    await prisma.subscription.deleteMany({
      where: {
        id: { in: duplicateIds }
      }
    });

    // Reset credits to correct amount
    const correctCredits = getCorrectCreditAllocation(keepSubscription.planType);
    await prisma.subscription.update({
      where: { id: keepSubscription.id },
      data: { credits: correctCredits }
    });

    console.log(`✅ Cleanup complete. Credits reset to ${correctCredits} for ${keepSubscription.planType} plan`);
    
  } catch (error) {
    console.error('❌ Error cleaning up subscriptions:', error);
  }
}

function getCorrectCreditAllocation(planType) {
  const CREDIT_ALLOCATION = {
    FREE: 100,
    BASIC: 1000,
    PRO: 10000,
    ENTERPRISE: 100000,
  };
  return CREDIT_ALLOCATION[planType] || 100;
}

// Export for use in other scripts
module.exports = {
  investigateUserCredits,
  cleanupDuplicateSubscriptions
};

// Run investigation if called directly
if (require.main === module) {
  const email = process.argv[2];
  if (!email) {
    console.log('Usage: node creditInvestigation.js <email>');
    console.log('Example: node creditInvestigation.js talhazia49@gmail.com');
    process.exit(1);
  }
  
  investigateUserCredits(email);
}