const { PrismaClient } = require('@prisma/client');
const { getStripeProductsAndPrices } = require('../utils/stripeSetup');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const prisma = new PrismaClient();

// Credit allocation by plan type
const CREDIT_ALLOCATION = {
  FREE: 100,
  BASIC: 1000,
  PRO: 10000,
  ENTERPRISE: 100000,
};

/**
 * Create a free subscription for a new user
 * @param {string} userId - The user ID
 * @param {Object} tx - Optional Prisma transaction object
 */
const createFreeSubscription = async (userId, tx = prisma) => {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  
  // Create Stripe customer first
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.fullName,
    metadata: { userId }
  });
  
  // Calculate expiration date (1 month from now)
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(now.getMonth() + 1);
  
  // Create subscription record
  const subscription = await tx.subscription.create({
    data: {
      userId,
      planType: 'FREE',
      status: 'ACTIVE',
      credits: 100, // Free plan credits
      stripeCustomerId: customer.id,
      currentPeriodStart: now,
      currentPeriodEnd: expiresAt,
      billingCycle: 'MONTHLY',
    },
  });
  
  // Record initial credit transaction
  await tx.creditTransaction.create({
    data: {
      userId,
      amount: 100,
      type: 'SUBSCRIPTION_CREDIT',
      status: 'COMPLETED',
      description: 'Initial free plan credit allocation',
      expiresAt,
    },
  });
  
  return subscription;
};

/**
 * Get subscription details for a user
 * @param {string} userId - The user ID
 */
async function getUserSubscription(userId) {
  return prisma.subscription.findUnique({
    where: { userId },
  });
}

/**
 * Create a checkout session for subscription upgrade
 * @param {string} userId - The user ID
 * @param {string} planType - The plan type (BASIC, PRO, ENTERPRISE)
 * @param {string} billingCycle - The billing cycle (MONTHLY, YEARLY)
 * @param {string} successUrl - URL to redirect on success
 * @param {string} cancelUrl - URL to redirect on cancel
 */
async function createCheckoutSession(userId, planType, billingCycle, successUrl, cancelUrl) {
  // Validate plan type
  if (!['BASIC', 'PRO', 'ENTERPRISE'].includes(planType)) {
    throw new Error('Invalid plan type');
  }
  
  // Validate billing cycle
  if (!['MONTHLY', 'YEARLY'].includes(billingCycle)) {
    throw new Error('Invalid billing cycle');
  }
  
  // Get user subscription
  const subscription = await getUserSubscription(userId);
  if (!subscription) throw new Error('Subscription not found');
  
  // Prevent duplicate subscriptions for same plan
  if (subscription.planType === planType && subscription.status === 'ACTIVE') {
    throw new Error(`You already have an active ${planType} plan`);
  }
  
  // Handle existing subscription for immediate plan changes with proration
  if (subscription.stripeSubscriptionId && subscription.status === 'ACTIVE' && subscription.planType !== 'FREE') {
    // For existing paid subscriptions, use direct subscription update with proration
    console.log('Updating existing subscription with proration');
    const updatedSubscription = await updateSubscriptionWithProration(userId, planType, billingCycle);
    
    // Return a mock session object since we don't need checkout for subscription updates
    return {
      id: 'direct_update_' + Date.now(),
      url: successUrl + '?updated=true', // Redirect directly to success page
      mode: 'subscription_update'
    };
  }
  
  // Get products and prices from Stripe
  const productMap = await getStripeProductsAndPrices();
  if (!productMap[planType] || !productMap[planType].prices[billingCycle]) {
    throw new Error('Stripe product or price not found');
  }
  
  const priceId = productMap[planType].prices[billingCycle];
  
  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    customer: subscription.stripeCustomerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    subscription_data: {
      metadata: {
        userId,
        planType,
        billingCycle,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  
  return session;
}

/**
 * Handle successful subscription
 * @param {Object} event - Stripe webhook event
 */
async function handleSubscriptionCreated(event) {
  const subscription = event.data.object;
  const { userId, planType, billingCycle } = subscription.metadata;
  
  if (!userId || !planType || !billingCycle) {
    console.error('Missing metadata in subscription', subscription.id);
    return;
  }
  
  // Convert userId to integer
  const userIdInt = parseInt(userId, 10);
  if (isNaN(userIdInt)) {
    console.error('Invalid userId in metadata', userId);
    return;
  }
  
  // Calculate expiration date based on billing cycle
  const now = new Date();
  const expiresAt = new Date(now);
  if (billingCycle === 'MONTHLY') {
    expiresAt.setMonth(now.getMonth() + 1);
  } else {
    expiresAt.setFullYear(now.getFullYear() + 1);
  }
  
  // Parse Stripe dates (they come in seconds, convert to milliseconds)
  const periodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : now;
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : expiresAt;
  
  // Check if this subscription update already processed to prevent duplicates
  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId: userIdInt }
  });
  
  if (existingSubscription && existingSubscription.stripeSubscriptionId === subscription.id) {
    console.log(`⚠️ Webhook already processed for subscription ${subscription.id}, skipping duplicate`);
    return;
  }
  
  // Update user subscription (reset credits to plan amount to prevent accumulation)
  await prisma.subscription.update({
    where: { userId: userIdInt },
    data: {
      planType,
      status: 'ACTIVE',
      credits: CREDIT_ALLOCATION[planType], // Always reset to plan amount
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      billingCycle,
      paymentFailedAttempts: 0,
      lastPaymentFailureDate: null,
    },
  });
  
  // Record credit transaction
  await prisma.creditTransaction.create({
    data: {
      userId: userIdInt,
      amount: CREDIT_ALLOCATION[planType],
      type: 'SUBSCRIPTION_CREDIT',
      status: 'COMPLETED',
      description: `${planType} plan credit allocation (${billingCycle.toLowerCase()})`,
      expiresAt,
    },
  });
}

/**
 * Handle payment failure
 * @param {Object} event - Stripe webhook event
 */
async function handlePaymentFailed(event) {
  const invoice = event.data.object;
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const { userId } = subscription.metadata;
  
  if (!userId) {
    console.error('Missing userId in subscription metadata', subscription.id);
    return;
  }
  
  // Convert userId to integer
  const userIdInt = parseInt(userId, 10);
  if (isNaN(userIdInt)) {
    console.error('Invalid userId in metadata', userId);
    return;
  }
  
  // Get current subscription
  const userSubscription = await getUserSubscription(userIdInt);
  if (!userSubscription) {
    console.error('Subscription not found for user', userId);
    return;
  }
  
  // Increment failed attempts
  await prisma.subscription.update({
    where: { userId: userIdInt },
    data: {
      paymentFailedAttempts: userSubscription.paymentFailedAttempts + 1,
      lastPaymentFailureDate: new Date(),
      status: 'PAST_DUE',
    },
  });
  
  // If max attempts reached, cancel subscription
  if (userSubscription.paymentFailedAttempts >= 2) { // 3 attempts total (initial + 2 retries)
    await downgradeToFree(userIdInt);
  }
}

/**
 * Downgrade user to free plan
 * @param {number} userId - The user ID (integer)
 */
async function downgradeToFree(userId) {
  const subscription = await getUserSubscription(userId);
  if (!subscription) throw new Error('Subscription not found');
  
  // If there's an active Stripe subscription, cancel it
  if (subscription.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } catch (error) {
      console.error('Error canceling Stripe subscription', error);
    }
  }
  
  // Calculate expiration date (1 month from now)
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(now.getMonth() + 1);
  
  // Update subscription to FREE
  await prisma.subscription.update({
    where: { userId },
    data: {
      planType: 'FREE',
      status: 'ACTIVE',
      credits: CREDIT_ALLOCATION.FREE,
      stripeSubscriptionId: null,
      currentPeriodStart: now,
      currentPeriodEnd: expiresAt,
      billingCycle: 'MONTHLY',
      paymentFailedAttempts: 0,
      lastPaymentFailureDate: null,
    },
  });
  
  // Record credit transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: CREDIT_ALLOCATION.FREE,
      type: 'SUBSCRIPTION_CREDIT',
      status: 'COMPLETED',
      description: 'Downgrade to free plan credit allocation',
      expiresAt,
    },
  });
}

/**
 * Handle subscription renewal
 * @param {Object} event - Stripe webhook event
 */
async function handleSubscriptionRenewed(event) {
  const invoice = event.data.object;
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const { userId, planType, billingCycle } = subscription.metadata;
  
  if (!userId || !planType || !billingCycle) {
    console.error('Missing metadata in subscription', subscription.id);
    return;
  }
  
  // Convert userId to integer
  const userIdInt = parseInt(userId, 10);
  if (isNaN(userIdInt)) {
    console.error('Invalid userId in metadata', userId);
    return;
  }
  
  // Calculate expiration date based on billing cycle
  const now = new Date();
  const expiresAt = new Date(now);
  if (billingCycle === 'MONTHLY') {
    expiresAt.setMonth(now.getMonth() + 1);
  } else {
    expiresAt.setFullYear(now.getFullYear() + 1);
  }
  
  // Parse Stripe dates (they come in seconds, convert to milliseconds)
  const periodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : now;
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : expiresAt;
  
  // Update subscription with new period and reset credits
  await prisma.subscription.update({
    where: { userId: userIdInt },
    data: {
      status: 'ACTIVE',
      credits: CREDIT_ALLOCATION[planType],
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      paymentFailedAttempts: 0,
      lastPaymentFailureDate: null,
    },
  });
  
  // Record credit transaction
  await prisma.creditTransaction.create({
    data: {
      userId: userIdInt,
      amount: CREDIT_ALLOCATION[planType],
      type: 'SUBSCRIPTION_CREDIT',
      status: 'COMPLETED',
      description: `${planType} plan renewal credit allocation (${billingCycle.toLowerCase()})`,
      expiresAt,
    },
  });
}

/**
 * Deduct credits from user's subscription
 * @param {string} userId - The user ID
 * @param {number} amount - Amount of credits to deduct
 * @param {string} description - Description for the transaction
 * @param {Object} tx - Optional Prisma transaction object
 * @param {string} type - Credit transaction type (IMAGE_TWEAK, IMAGE_REFINE, etc.)
 * @returns {Object} Updated subscription with new credit balance
 */
async function deductCredits(userId, amount, description, tx = prisma, type = 'IMAGE_TWEAK') {
  if (!userId || !amount || amount <= 0) {
    throw new Error('Invalid parameters for credit deduction');
  }

  // Get current subscription
  const subscription = await tx.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  if (subscription.status !== 'ACTIVE') {
    throw new Error('Subscription is not active');
  }

  // Check if user has enough available credits (from credit transactions)
  const now = new Date();
  const activeCredits = await tx.creditTransaction.aggregate({
    where: {
      userId: userId,
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

  const availableCredits = activeCredits._sum.amount || 0;
  if (availableCredits < amount) {
    throw new Error('Insufficient credits');
  }

  // Record credit transaction (DO NOT update subscription.credits - keep it as plan allocation)
  await tx.creditTransaction.create({
    data: {
      userId,
      amount: -amount, // Negative amount for deduction
      type: type, // Use the provided transaction type
      status: 'COMPLETED',
      description,
    },
  });

  return subscription; // Return original subscription (not modified)
}

/**
 * Refund credits to user's subscription
 * @param {string} userId - The user ID
 * @param {number} amount - Amount of credits to refund
 * @param {string} description - Description for the transaction
 * @param {Object} tx - Optional Prisma transaction object
 * @returns {Object} Updated subscription with new credit balance
 */
async function refundCredits(userId, amount, description, tx = prisma) {
  if (!userId || !amount || amount <= 0) {
    throw new Error('Invalid parameters for credit refund');
  }

  // Get current subscription
  const subscription = await tx.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  // Record credit transaction (DO NOT modify subscription.credits)
  await tx.creditTransaction.create({
    data: {
      userId,
      amount: amount, // Positive amount for refund
      type: 'GENERATION_REFUND',
      status: 'COMPLETED',
      description,
    },
  });

  return subscription; // Return original subscription (not modified)
}

/**
 * Update existing subscription with immediate proration
 * @param {number} userId - The user ID
 * @param {string} newPlanType - The new plan type
 * @param {string} newBillingCycle - The new billing cycle
 */
async function updateSubscriptionWithProration(userId, newPlanType, newBillingCycle) {
  const subscription = await getUserSubscription(userId);
  if (!subscription || !subscription.stripeSubscriptionId) {
    throw new Error('No active subscription found to update');
  }

  // Get the new price ID
  const { getStripeProductsAndPrices } = require('../utils/stripeSetup');
  const productMap = await getStripeProductsAndPrices();
  const newPriceId = productMap[newPlanType]?.prices[newBillingCycle];
  
  if (!newPriceId) {
    throw new Error('Price not found for the selected plan');
  }

  try {
    // Get the current subscription from Stripe to get the subscription item ID
    const currentStripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    const subscriptionItemId = currentStripeSubscription.items.data[0].id;

    // Update the subscription with proration
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: subscriptionItemId,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations', // This enables immediate proration
        billing_cycle_anchor: 'unchanged', // Keep current billing cycle
        metadata: {
          userId: userId.toString(),
          planType: newPlanType,
          billingCycle: newBillingCycle,
        },
      }
    );

    // Update our database record immediately
    const userIdInt = parseInt(userId, 10);
    await prisma.subscription.update({
      where: { userId: userIdInt },
      data: {
        planType: newPlanType,
        status: 'ACTIVE',
        credits: CREDIT_ALLOCATION[newPlanType],
        billingCycle: newBillingCycle,
        currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
      },
    });

    // Record credit transaction for the plan change
    await prisma.creditTransaction.create({
      data: {
        userId: userIdInt,
        amount: CREDIT_ALLOCATION[newPlanType],
        type: 'SUBSCRIPTION_CREDIT',
        status: 'COMPLETED',
        description: `Plan updated to ${newPlanType} (${newBillingCycle.toLowerCase()}) with proration`,
        expiresAt: new Date(updatedSubscription.current_period_end * 1000),
      },
    });

    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription with proration:', error);
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
}

module.exports = {
  createFreeSubscription,
  getUserSubscription,
  createCheckoutSession,
  updateSubscriptionWithProration,
  handleSubscriptionCreated,
  handlePaymentFailed,
  handleSubscriptionRenewed,
  downgradeToFree,
  deductCredits,
  refundCredits,
  CREDIT_ALLOCATION,
};