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
  
  // Calculate expiration date based on billing cycle
  const now = new Date();
  const expiresAt = new Date(now);
  if (billingCycle === 'MONTHLY') {
    expiresAt.setMonth(now.getMonth() + 1);
  } else {
    expiresAt.setFullYear(now.getFullYear() + 1);
  }
  
  // Update user subscription
  await prisma.subscription.update({
    where: { userId },
    data: {
      planType,
      status: 'ACTIVE',
      credits: CREDIT_ALLOCATION[planType],
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      billingCycle,
      paymentFailedAttempts: 0,
      lastPaymentFailureDate: null,
    },
  });
  
  // Record credit transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
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
  
  // Get current subscription
  const userSubscription = await getUserSubscription(userId);
  if (!userSubscription) {
    console.error('Subscription not found for user', userId);
    return;
  }
  
  // Increment failed attempts
  await prisma.subscription.update({
    where: { userId },
    data: {
      paymentFailedAttempts: userSubscription.paymentFailedAttempts + 1,
      lastPaymentFailureDate: new Date(),
      status: 'PAST_DUE',
    },
  });
  
  // If max attempts reached, cancel subscription
  if (userSubscription.paymentFailedAttempts >= 2) { // 3 attempts total (initial + 2 retries)
    await downgradeToFree(userId);
  }
}

/**
 * Downgrade user to free plan
 * @param {string} userId - The user ID
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
  
  // Calculate expiration date based on billing cycle
  const now = new Date();
  const expiresAt = new Date(now);
  if (billingCycle === 'MONTHLY') {
    expiresAt.setMonth(now.getMonth() + 1);
  } else {
    expiresAt.setFullYear(now.getFullYear() + 1);
  }
  
  // Update subscription with new period and reset credits
  await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'ACTIVE',
      credits: CREDIT_ALLOCATION[planType],
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      paymentFailedAttempts: 0,
      lastPaymentFailureDate: null,
    },
  });
  
  // Record credit transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: CREDIT_ALLOCATION[planType],
      type: 'SUBSCRIPTION_CREDIT',
      status: 'COMPLETED',
      description: `${planType} plan renewal credit allocation (${billingCycle.toLowerCase()})`,
      expiresAt,
    },
  });
}

module.exports = {
  createFreeSubscription,
  getUserSubscription,
  createCheckoutSession,
  handleSubscriptionCreated,
  handlePaymentFailed,
  handleSubscriptionRenewed,
  downgradeToFree,
  CREDIT_ALLOCATION,
};