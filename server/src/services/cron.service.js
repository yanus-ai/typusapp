const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const subscriptionService = require('./subscriptions.service');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bigmailerService = require('./bigmailer.service');

const prisma = new PrismaClient();

// BigMailer list ID for incomplete checkouts
const INCOMPLETE_CHECKOUT_LIST_ID = process.env.BIGMAILER_INCOMPLETE_CHECKOUT_LIST_ID;
const INCOMPLETE_CHECKOUT_LIST_ID_GERMAN = process.env.BIGMAILER_INCOMPLETE_DE_CHECKOUT_LIST_ID;

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

        await prisma.user.update({
          where: { id: userId },
          data: { remainingCredits: { increment: creditAmount } }
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

  // Delete unverified users
  // Runs daily at midnight UTC (0 0 * * *)
  cron.schedule('0 0 * * *', () => {
    console.log(`🕐 [${new Date().toISOString()}] Running unverified users cleanup cron job...`);
    deleteUnverifiedUsers();
  }, {
    timezone: 'UTC'
  });

  // Process incomplete checkouts
  // Runs every hour at minute 0
  cron.schedule('0 * * * *', () => {
    console.log(`🕐 [${new Date().toISOString()}] Running incomplete checkout processing cron job...`);
    processIncompleteCheckouts();
  }, {
    timezone: 'UTC'
  });

  console.log('✅ Cron jobs initialized - credit allocation every 5 minutes, unverified users cleanup daily at midnight, incomplete checkouts every hour');
}

/**
 * Process incomplete checkout sessions and add to BigMailer
 * Runs every hour to catch users who abandoned checkout
 */
async function processIncompleteCheckouts() {
  console.log('🛒 Starting incomplete checkout processing...');

  try {
    // Get checkout sessions from Stripe that are incomplete
    // We'll look for sessions created in the last 30 days that are still open or expired
    const oneHourAgo = Math.floor((Date.now() - 60 * 60 * 1000) / 1000);
    
    console.log(`📅 Looking for checkout sessions created after ${new Date(oneHourAgo * 1000).toISOString()}`);

    let allSessions = [];
    
    // Get open sessions (incomplete)
    console.log('🔍 Fetching open checkout sessions...');
    let hasMore = true;
    let startingAfter = null;
    while (hasMore) {
      const params = {
        limit: 100,
        created: { gte: oneHourAgo },
      };

      if (startingAfter) {
        params.starting_after = startingAfter;
      }

      const sessions = await stripe.checkout.sessions.list(params);
      
      // Filter for open or expired sessions only
      const incompleteSessions = sessions.data.filter(s => 
        s.status === 'open' || s.status === 'expired'
      );
      
      allSessions = allSessions.concat(incompleteSessions);
      
      console.log(`  Found ${sessions.data.length} total sessions, ${incompleteSessions.length} incomplete (open/expired)`);
      
      hasMore = sessions.has_more;
      if (sessions.data.length > 0) {
        startingAfter = sessions.data[sessions.data.length - 1].id;
      }
    }

    console.log(`📊 Total incomplete checkout sessions found: ${allSessions.length}`);

    // Log sample session for debugging
    if (allSessions.length > 0) {
      const sample = allSessions[0];
      console.log('📋 Sample session:', {
        id: sample.id,
        mode: sample.mode,
        status: sample.status,
        payment_status: sample.payment_status,
        metadata: sample.metadata,
        customer: sample.customer
      });
    }

    // Filter for subscription checkouts only (not credit top-ups)
    const subscriptionSessions = allSessions.filter(session => {
      // Must be subscription mode
      if (session.mode !== 'subscription') {
        return false;
      }
      
      // Must have userId in metadata (either directly or in subscription_data metadata)
      const userId = session.metadata?.userId || 
                     session.subscription_data?.metadata?.userId;
      
      if (!userId) {
        return false;
      }
      
      // Exclude credit top-ups (they have type: 'credit_topup' in metadata)
      if (session.metadata?.type === 'credit_topup') {
        return false;
      }
      
      // Must be incomplete (payment_status should be unpaid or null)
      // Status should be open or expired
      return true;
    });

    console.log(`📊 Found ${subscriptionSessions.length} subscription checkout sessions after filtering`);
    
    // Log details of filtered sessions for debugging
    if (subscriptionSessions.length > 0) {
      console.log('📋 Subscription sessions details:');
      subscriptionSessions.slice(0, 5).forEach((session, idx) => {
        console.log(`  ${idx + 1}. Session ${session.id}:`, {
          status: session.status,
          payment_status: session.payment_status,
          userId: session.metadata?.userId || session.subscription_data?.metadata?.userId,
          planType: session.metadata?.planType || session.subscription_data?.metadata?.planType,
          billingCycle: session.metadata?.billingCycle || session.subscription_data?.metadata?.billingCycle
        });
      });
    }

    if (subscriptionSessions.length === 0) {
      console.log('✅ No incomplete subscription checkouts to process');
      return;
    }

    // Track processed users to avoid duplicates
    const processedUserIds = new Set();
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process each session
    for (const session of subscriptionSessions) {
      try {
        // Get metadata from either session.metadata or subscription_data.metadata
        const metadata = session.metadata || session.subscription_data?.metadata || {};
        const userId = parseInt(metadata.userId);
        const planType = metadata.planType;
        const billingCycle = metadata.billingCycle;
        const isEducational = metadata.isEducational === 'true';
        
        if (!userId || isNaN(userId)) {
          console.log(`⚠️ Invalid userId for session ${session.id}, skipping`);
          skippedCount++;
          continue;
        }

        // Get user from database
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            fullName: true,
            language: true
          }
        });

        if (!user) {
          console.log(`⚠️ User ${userId} not found for session ${session.id}, skipping`);
          skippedCount++;
          continue;
        }

        // Skip if we've already processed this user in this run
        if (processedUserIds.has(userId)) {
          console.log(`ℹ️ User ${userId} already processed in this run, skipping session ${session.id}`);
          skippedCount++;
          continue;
        }

        // Verify the session is actually incomplete by checking payment_status
        // If payment_status is 'paid', the session was completed
        if (session.payment_status === 'paid') {
          console.log(`ℹ️ Session ${session.id} has payment_status 'paid', skipping (already completed)`);
          skippedCount++;
          continue;
        }
        
        // Check if a subscription was created from this session (means it was completed)
        if (session.subscription) {
          console.log(`ℹ️ Session ${session.id} has subscription ${session.subscription}, skipping (already completed)`);
          skippedCount++;
          continue;
        }

        // Check if user already has an active subscription (they might have completed checkout via another session)
        const existingSubscription = await prisma.subscription.findUnique({
          where: { userId: userId },
          select: { status: true, stripeSubscriptionId: true }
        });

        if (existingSubscription && existingSubscription.status === 'ACTIVE') {
          console.log(`ℹ️ User ${userId} already has active subscription, skipping session ${session.id}`);
          skippedCount++;
          continue;
        }

        // Mark user as processed
        processedUserIds.add(userId);

        // Prepare custom fields for BigMailer
        const customFields = {
          PLAN_TYPE: planType || 'Unknown',
          BILLING_CYCLE: billingCycle || 'Unknown',
          IS_EDUCATIONAL: isEducational ? 'true' : 'false',
          CHECKOUT_SESSION_ID: session.id,
          CHECKOUT_CREATED_AT: new Date(session.created * 1000).toISOString()
        };

        // Add plan details if available
        if (planType) {
          customFields.INTENDED_PLAN = `${planType}${isEducational ? ' (Educational)' : ''}`;
        }

        // Add to BigMailer
        const result = await bigmailerService.addContactToList(
          {
            email: user.email,
            fullName: user.fullName || ''
          },
          user.language === 'de' ? INCOMPLETE_CHECKOUT_LIST_ID_GERMAN : INCOMPLETE_CHECKOUT_LIST_ID,
          customFields
        );

        if (result.success) {
          console.log(`✅ Added user ${userId} (${user.email}) to BigMailer incomplete checkout list`);
          successCount++;
        } else {
          console.error(`❌ Failed to add user ${userId} to BigMailer:`, result.error);
          errorCount++;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing checkout session ${session.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`🎉 Incomplete checkout processing completed: ${successCount} added, ${skippedCount} skipped, ${errorCount} errors`);

  } catch (error) {
    console.error('❌ Error in incomplete checkout processing cron job:', error);
  }
}

/**
 * Delete unverified email addresses
 * Runs daily at midnight UTC
 */
async function deleteUnverifiedUsers() {
  console.log('🗑️ Starting cleanup of unverified email addresses...');

  try {
    // Calculate the cutoff date (7 days ago)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log(`📅 Looking for unverified users created before: ${sevenDaysAgo.toISOString()}`);

    // Find users where email is not verified AND created more than 7 days ago
    const unverifiedUsers = await prisma.user.findMany({
      where: {
        emailVerified: false,
        createdAt: {
          lt: sevenDaysAgo
        }
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        fullName: true
      }
    });

    console.log(`📊 Found ${unverifiedUsers.length} unverified users older than 7 days`);

    if (unverifiedUsers.length === 0) {
      console.log('✅ No unverified users older than 7 days found');
      return;
    }

    let deletedCount = 0;
    let errorCount = 0;

    // Delete each unverified user
    for (const user of unverifiedUsers) {
      try {
        const daysSinceCreation = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));
        console.log(`🗑️ Deleting unverified user: ${user.email} (ID: ${user.id}), created: ${user.createdAt} (${daysSinceCreation} days ago)`);

        await prisma.user.delete({
          where: { id: user.id }
        });

        deletedCount++;
        console.log(`✅ Successfully deleted user ${user.email}`);

      } catch (error) {
        console.error(`❌ Error deleting user ${user.email} (ID: ${user.id}):`, error);
        errorCount++;
      }
    }

    console.log(`🎉 Unverified users cleanup completed: ${deletedCount} deleted, ${errorCount} errors`);

  } catch (error) {
    console.error('❌ Error in unverified users cleanup cron job:', error);
  }
}

/**
 * Manual trigger for testing (call this endpoint to test immediately)
 */
async function triggerMonthlyAllocation() {
  console.log('🧪 Manual trigger: Monthly credit allocation');
  await allocateMonthlyCreditsForYearlyPlans();
}

/**
 * Manual trigger for testing unverified user deletion
 */
async function triggerUnverifiedUserCleanup() {
  console.log('🧪 Manual trigger: Unverified user cleanup');
  await deleteUnverifiedUsers();
}

module.exports = {
  initializeCronJobs,
  allocateMonthlyCreditsForYearlyPlans,
  triggerMonthlyAllocation,
  deleteUnverifiedUsers,
  triggerUnverifiedUserCleanup,
  processIncompleteCheckouts
};