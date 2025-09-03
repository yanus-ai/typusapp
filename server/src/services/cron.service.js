const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const subscriptionService = require('./subscriptions.service');

const prisma = new PrismaClient();

/**
 * Allocate monthly credits for yearly subscription users
 * Runs on the 1st of every month at 2 AM
 */
async function allocateMonthlyCreditsForYearlyPlans() {
  console.log('🔄 Starting monthly credit allocation for yearly plans...');
  
  try {
    // Get all active yearly subscriptions
    const yearlySubscriptions = await prisma.subscription.findMany({
      where: {
        billingCycle: 'YEARLY',
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: { id: true, email: true, isStudent: true }
        }
      }
    });

    console.log(`📊 Found ${yearlySubscriptions.length} active yearly subscriptions`);

    let successCount = 0;
    let errorCount = 0;

    // Process each subscription
    for (const subscription of yearlySubscriptions) {
      try {
        const userId = subscription.userId;
        const planType = subscription.planType;
        const subscriptionStart = subscription.currentPeriodStart || subscription.createdAt;
        const now = new Date();
        
        // Calculate which month this is in the yearly cycle
        const cycleMonth = subscriptionService.calculateCreditCycleMonth(subscriptionStart, now);
        
        // Skip if this is beyond the 12-month cycle
        if (cycleMonth > 12) {
          console.log(`⚠️ User ${userId} is beyond 12-month cycle (month ${cycleMonth}), skipping`);
          continue;
        }
        
        // Simple approach: Check if credits allocated this calendar month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const creditExists = await subscriptionService.creditAllocationExists(
          userId, 
          planType, 
          monthStart
        );
        
        if (creditExists) {
          console.log(`✅ Credits already allocated for user ${userId} this month, skipping`);
          continue;
        }
        
        // Check if it's been 30+ days since last credit allocation
        const lastCredit = await prisma.creditTransaction.findFirst({
          where: {
            userId: userId,
            type: 'SUBSCRIPTION_CREDIT',
            status: 'COMPLETED',
            amount: { gt: 0 }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        if (lastCredit) {
          const daysSinceLastCredit = Math.floor((now - lastCredit.createdAt) / (1000 * 60 * 60 * 24));
          if (daysSinceLastCredit < 30) {
            console.log(`⏰ User ${userId} last credit was ${daysSinceLastCredit} days ago, need 30+ days`);
            continue;
          }
        }
        
        // Get appropriate credit allocation
        const useEducationalCredits = subscription.isEducational || subscription.user.isStudent;
        const creditAmount = subscriptionService.getCreditAllocation ? 
          subscriptionService.getCreditAllocation(planType, useEducationalCredits) :
          subscriptionService.CREDIT_ALLOCATION[planType];
        
        // First, expire all previous subscription credits before allocating new ones
        const expiredCredits = subscriptionService.expirePreviousSubscriptionCredits(userId, prisma);
        
        // Set expiration to end of next month
        const creditsExpiresAt = new Date(now);
        creditsExpiresAt.setMonth(now.getMonth() + 1);
        creditsExpiresAt.setDate(0); // Last day of next month
        
        // Create credit transaction
        await prisma.creditTransaction.create({
          data: {
            userId: userId,
            amount: creditAmount,
            type: 'SUBSCRIPTION_CREDIT',
            status: 'COMPLETED',
            description: `${planType} plan monthly credit allocation - Month ${cycleMonth}/12 (yearly billing - cron)`,
            expiresAt: creditsExpiresAt,
          },
        });
        
        console.log(`✅ Expired ${expiredCredits} old credits, allocated ${creditAmount} new credits to user ${userId} (${planType}, month ${cycleMonth}/12)`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error allocating credits for user ${subscription.userId}:`, error);
        errorCount++;
      }
    }
    
    console.log(`🎉 Monthly credit allocation completed: ${successCount} success, ${errorCount} errors`);
    
  } catch (error) {
    console.error('❌ Error in monthly credit allocation cron job:', error);
  }
}

/**
 * Initialize all cron jobs
 */
function initializeCronJobs() {
  console.log('⏰ Initializing cron jobs...');
  
  // Monthly credit allocation for yearly plans
  // Runs every 5 minutes for testing
  cron.schedule('*/5 * * * *', () => {
    console.log(`🕐 [${new Date().toISOString()}] Running monthly credit allocation cron job...`);
    allocateMonthlyCreditsForYearlyPlans();
  }, {
    timezone: 'UTC'
  });
  
  console.log('✅ Cron jobs initialized - running every 5 minutes');
}

/**
 * Manual trigger for testing (call this endpoint to test immediately)
 */
async function triggerMonthlyAllocation() {
  console.log('🧪 Manual trigger: Monthly credit allocation');
  await allocateMonthlyCreditsForYearlyPlans();
}

module.exports = {
  initializeCronJobs,
  allocateMonthlyCreditsForYearlyPlans,
  triggerMonthlyAllocation
};