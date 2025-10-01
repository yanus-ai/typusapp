const { PrismaClient } = require('@prisma/client');
const { getPlanPrice } = require('../utils/plansService');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const prisma = new PrismaClient();

// Credit allocation by plan type (monthly basis)
const CREDIT_ALLOCATION = {
  STARTER: 50,
  EXPLORER: 150,
  PRO: 1000,
};

// Educational credit allocation (same as regular plans, not higher)
const EDUCATIONAL_CREDIT_ALLOCATION = {
  STARTER: 50,    // Same as regular plan
  EXPLORER: 150,  // Same as regular plan
  PRO: 1000,      // Same as regular plan
};

/**
 * Get credit allocation for a plan type based on user type
 * @param {string} planType - The plan type
 * @param {boolean} isStudent - Whether the user is a student
 * @returns {number} Credit allocation amount
 */
function getCreditAllocation(planType, isStudent = false) {
  return isStudent ? EDUCATIONAL_CREDIT_ALLOCATION[planType] : CREDIT_ALLOCATION[planType];
}

/**
 * Create a Stripe customer for a new user (no subscription yet)
 * @param {string} userId - The user ID
 * @param {Object} tx - Optional Prisma transaction object
 */
const createStripeCustomer = async (userId, tx = prisma) => {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  
  // Create Stripe customer only (user must purchase a plan)
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.fullName,
    metadata: { userId }
  });
  
  return customer;
};

/**
 * Clean up duplicate credit allocations for a user
 * @param {number} userId - The user ID
 * @returns {number} Number of duplicates removed
 */
async function cleanupDuplicateCredits(userId) {
  return await prisma.$transaction(async (tx) => {
    // Find duplicate credit allocations (same user, same day, same amount, same type)
    const duplicates = await tx.creditTransaction.findMany({
      where: {
        userId: userId,
        type: 'SUBSCRIPTION_CREDIT',
        status: 'COMPLETED',
        amount: { gt: 0 }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Group by date and amount to find true duplicates
    const grouped = new Map();
    const toDelete = [];
    
    for (const credit of duplicates) {
      const dateKey = credit.createdAt.toDateString();
      const amountKey = credit.amount;
      const key = `${dateKey}-${amountKey}`;
      
      if (grouped.has(key)) {
        // This is a duplicate, mark for deletion
        toDelete.push(credit.id);
      } else {
        // First occurrence, keep it
        grouped.set(key, credit);
      }
    }
    
    if (toDelete.length > 0) {
      await tx.creditTransaction.deleteMany({
        where: {
          id: { in: toDelete }
        }
      });
      console.log(`🧹 Cleaned up ${toDelete.length} duplicate credit allocations for user ${userId}`);
    }
    
    return toDelete.length;
  });
}

/**
 * Check if credit allocation already exists for this period
 * @param {number} userId - The user ID
 * @param {string} planType - The plan type
 * @param {Date} periodStart - Start of the billing period
 * @param {Object} tx - Prisma transaction object
 * @returns {boolean} True if credits already allocated for this period
 */
async function creditAllocationExists(userId, planType, periodStart, tx = prisma) {
  // Check if we already have a credit allocation for this period
  const existingAllocation = await tx.creditTransaction.findFirst({
    where: {
      userId: userId,
      type: 'SUBSCRIPTION_CREDIT',
      status: 'COMPLETED',
      amount: { gt: 0 }, // Positive amount (allocation, not deduction)
      createdAt: {
        gte: periodStart,
        lt: new Date(periodStart.getTime() + (32 * 24 * 60 * 60 * 1000)) // Within 32 days of period start
      },
      description: {
        contains: planType
      }
    }
  });
  
  return !!existingAllocation;
}

/**
 * Get current available credits for a user
 * @param {number} userId - The user ID
 * @param {Object} tx - Optional Prisma transaction object
 * @returns {number} Available credits
 */
async function getAvailableCredits(userId, tx = prisma) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { remainingCredits: true }
  });

  return user?.remainingCredits || 0;
}

/**
 * Check if a subscription is currently usable (active or cancelled but not yet expired)
 * @param {Object} subscription - The subscription object
 * @returns {boolean} True if subscription can be used for credit deduction
 */
function isSubscriptionUsable(subscription) {
  if (!subscription) return false;

  const now = new Date();
  const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : now;

  // Allow usage if:
  // 1. Status is ACTIVE
  // 2. Status is CANCELLED_AT_PERIOD_END and we're still before the period end
  return (
    subscription.status === 'ACTIVE' ||
    (subscription.status === 'CANCELLED_AT_PERIOD_END' && now <= periodEnd)
  );
}

/**
 * Simplified token allocation - expire old tokens and allocate new plan amount
 * @param {number} userId - The user ID
 * @param {string} planType - Plan type (STARTER, EXPLORER, PRO)
 * @param {boolean} isEducational - Is educational plan
 * @param {string} reason - Reason for allocation
 * @param {Object} tx - Optional Prisma transaction object
 * @returns {Object} Updated user
 */
async function allocateTokensForPlanChange(userId, planType, isEducational, reason, tx = prisma) {
  // 1. Get new token amount based on plan type
  const tokenAmount = isEducational ?
    EDUCATIONAL_CREDIT_ALLOCATION[planType] :
    CREDIT_ALLOCATION[planType];

  if (!tokenAmount) {
    throw new Error(`Invalid plan type: ${planType}`);
  }

  // 2. Simply set user tokens to new amount (expires old tokens)
  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: { remainingCredits: tokenAmount }
  });

  // 3. Create audit record
  await tx.creditTransaction.create({
    data: {
      userId,
      amount: tokenAmount, // New amount (not difference)
      type: 'SUBSCRIPTION_CREDIT',
      status: 'COMPLETED',
      description: `${reason}: Reset to ${tokenAmount} tokens for ${planType}${isEducational ? ' (Educational)' : ''}`,
    },
  });

  console.log(`✅ Allocated ${tokenAmount} tokens for user ${userId} - ${reason}`);
  return updatedUser;
}

/**
 * Legacy function for backward compatibility - now uses simplified logic
 */
async function resetCreditsForNewSubscription(userId, newCreditAmount, description, tx = prisma) {
  // Simply set the new credit amount
  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: { remainingCredits: newCreditAmount }
  });

  // Create audit record
  await tx.creditTransaction.create({
    data: {
      userId: userId,
      amount: newCreditAmount,
      type: 'SUBSCRIPTION_CREDIT',
      status: 'COMPLETED',
      description: description || `Token allocation: ${newCreditAmount} tokens`,
    },
  });

  console.log(`✅ Allocated ${newCreditAmount} tokens for user ${userId}`);
  return updatedUser;
}

/**
 * Calculate which credit cycle month this is for the subscription
 * @param {Date} subscriptionStart - When the subscription started
 * @param {Date} currentDate - Current date (or invoice date)
 * @returns {number} The month number (1-12 for yearly, always 1 for monthly)
 */
function calculateCreditCycleMonth(subscriptionStart, currentDate = new Date()) {
  const monthsDiff = Math.floor((currentDate.getTime() - subscriptionStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44)) + 1;
  return Math.max(1, Math.min(monthsDiff, 12)); // Cap at 12 months for yearly plans
}

/**
 * Get or create subscription from Stripe data
 * @param {Object} stripeSubscription - Stripe subscription object
 * @param {Object} tx - Prisma transaction object
 * @returns {Object} Database subscription record
 */
async function getOrCreateSubscriptionFromStripe(stripeSubscription, tx = prisma) {
  const { userId, planType, billingCycle } = stripeSubscription.metadata;
  
  if (!userId || !planType || !billingCycle) {
    throw new Error(`Missing metadata in Stripe subscription ${stripeSubscription.id}`);
  }
  
  let userIdInt = parseInt(userId, 10);
  if (isNaN(userIdInt)) {
    throw new Error(`Invalid userId in metadata: ${userId}`);
  }
  
  // Verify user exists first
  let user = await tx.user.findUnique({
    where: { id: userIdInt },
    select: { id: true, email: true }
  });
  
  // If user doesn't exist, try to find by Stripe customer email
  if (!user) {
    console.log(`⚠️ User ${userIdInt} not found, attempting to find by Stripe customer email`);
    try {
      const stripeCustomer = await stripe.customers.retrieve(stripeSubscription.customer);
      if (stripeCustomer.email) {
        const userByEmail = await tx.user.findUnique({
          where: { email: stripeCustomer.email },
          select: { id: true, email: true }
        });
        
        if (userByEmail) {
          console.log(`✅ Found correct user by email: ${userByEmail.id} (${userByEmail.email})`);
          user = userByEmail;
          userIdInt = userByEmail.id;
          
          // Update Stripe metadata with correct userId
          await stripe.customers.update(stripeSubscription.customer, {
            metadata: {
              ...stripeCustomer.metadata,
              userId: userIdInt.toString()
            }
          });
          
          await stripe.subscriptions.update(stripeSubscription.id, {
            metadata: {
              ...stripeSubscription.metadata,
              userId: userIdInt.toString()
            }
          });
          
          console.log(`✅ Updated Stripe metadata with correct userId: ${userIdInt}`);
        }
      }
    } catch (stripeError) {
      console.error('❌ Error retrieving Stripe customer:', stripeError.message);
    }
  }
  
  if (!user) {
    throw new Error(`User ${userIdInt} not found in database and no matching email found in Stripe customer`);
  }
  
  console.log(`✅ User verified: ${user.id} (${user.email})`);
  
  // Check if subscription already exists
  let subscription = await tx.subscription.findUnique({
    where: { userId: userIdInt }
  });
  
  if (!subscription || subscription.stripeSubscriptionId !== stripeSubscription.id) {
    console.log(`🔄 Creating/updating subscription for user ${userIdInt} from Stripe data`);
    
    const now = new Date();
    const creditsExpiresAt = new Date(now);
    creditsExpiresAt.setMonth(now.getMonth() + 1);
    
    const periodStart = stripeSubscription.current_period_start ? 
      new Date(stripeSubscription.current_period_start * 1000) : now;
    const periodEnd = stripeSubscription.current_period_end ? 
      new Date(stripeSubscription.current_period_end * 1000) : creditsExpiresAt;
    
    subscription = await tx.subscription.upsert({
      where: { userId: userIdInt },
      create: {
        userId: userIdInt,
        planType,
        status: 'ACTIVE',
        credits: 0, // Credits are managed through transactions, not this field
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeSubscription.customer,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        billingCycle,
        paymentFailedAttempts: 0,
        lastPaymentFailureDate: null,
      },
      update: {
        planType,
        status: 'ACTIVE',
        // Don't reset credits on update - credits are managed through transactions
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeSubscription.customer,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        billingCycle,
        paymentFailedAttempts: 0,
        lastPaymentFailureDate: null,
      },
    });
    
    console.log(`✅ Subscription upserted for user ${userIdInt}, ID: ${subscription.id}`);
  } else {
    console.log(`✅ Subscription already exists for user ${userIdInt}, ID: ${subscription.id}`);
  }
  
  return subscription;
}

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
 * @param {string} planType - The plan type (STARTER, EXPLORER, PRO)
 * @param {string} billingCycle - The billing cycle (MONTHLY, YEARLY)
 * @param {string} successUrl - URL to redirect on success
 * @param {string} cancelUrl - URL to redirect on cancel
 * @param {boolean} isEducational - Whether this is an educational plan
 */
async function createCheckoutSession(userId, planType, billingCycle, successUrl, cancelUrl, isEducational = false, taxRateId = null) {
  // Validate plan type
  if (!['STARTER', 'EXPLORER', 'PRO'].includes(planType)) {
    throw new Error('Invalid plan type');
  }
  
  // Validate billing cycle
  if (!['MONTHLY', 'YEARLY'].includes(billingCycle)) {
    throw new Error('Invalid billing cycle');
  }
  
  // Get user and subscription
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  
  // Check if user is eligible for educational pricing
  if (isEducational && !user.isStudent) {
    throw new Error('Educational plans are only available for verified students');
  }
  
  const subscription = await getUserSubscription(userId);
  
  // Allow existing subscribers to create new checkout sessions for plan changes
  
  // Get or find existing Stripe customer
  let stripeCustomerId;

  if (subscription && subscription.stripeCustomerId) {
    // Use existing customer from subscription
    stripeCustomerId = subscription.stripeCustomerId;
  } else {
    // Check if user already has a Stripe customer by searching existing customers
    try {
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        // Found existing customer, use it
        stripeCustomerId = existingCustomers.data[0].id;
        console.log(`✅ Found existing Stripe customer: ${stripeCustomerId} for email: ${user.email}`);
      } else {
        // No existing customer, create new one
        const customer = await createStripeCustomer(userId);
        stripeCustomerId = customer.id;
        console.log(`✅ Created new Stripe customer: ${stripeCustomerId} for user: ${userId}`);
      }
    } catch (error) {
      console.error('Error checking/creating Stripe customer:', error);
      // Fallback to creating new customer
      const customer = await createStripeCustomer(userId);
      stripeCustomerId = customer.id;
    }
  }

  // Configure session to use the customer
  let sessionConfig = {
    customer: stripeCustomerId,
    customer_update: {
      name: 'auto',
      address: 'auto',
    },
  };

  // Get Stripe price ID - fallback to Stripe API if not in database
  const planPrice = await getPlanPrice(planType, billingCycle, isEducational);

  let priceId = planPrice?.stripePriceId;

  // If no Stripe price ID in database, get from Stripe API
  if (!priceId) {
    const { getStripeProductsAndPrices } = require('../utils/stripeSetup');
    const productMap = await getStripeProductsAndPrices();
    const lookupKey = isEducational ? `EDUCATIONAL_${planType}` : planType;
    priceId = productMap[lookupKey]?.prices[billingCycle];

    if (!priceId) {
      throw new Error('Stripe price not found');
    }
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    ...sessionConfig,
    payment_method_types: ['card', 'revolut_pay', 'link', 'sepa_debit', 'paypal'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
        tax_rates: [taxRateId || process.env.STRIPE_DEFAULT_TAX_RATE || 'txr_1OMq4OIx86VAQvG3OKA1zFF0'], // Tax on line item like Bubble
      },
    ],
    mode: 'subscription',
    allow_promotion_codes: true,
    tax_id_collection: {
      enabled: true, // Enable tax ID collection
    },
    subscription_data: {
      metadata: {
        userId,
        planType,
        billingCycle,
        isEducational: isEducational.toString(),
      },
    },
    metadata: {
      userId,
      planType,
      billingCycle,
      isEducational: isEducational.toString(),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  
  return session;
}

/**
 * Get plan details from Stripe price ID
 * @param {string} priceId - Stripe price ID
 * @returns {Object} Plan details { planType, billingCycle, isEducational }
 */
async function getPlanDetailsFromPriceId(priceId) {
  try {
    // Get plan from database by Stripe price ID
    const planPrice = await prisma.planPrice.findUnique({
      where: { stripePriceId: priceId },
      include: { plan: true }
    });
    
    if (planPrice) {
      return {
        planType: planPrice.plan.planType,
        billingCycle: planPrice.billingCycle,
        isEducational: planPrice.plan.isEducational
      };
    }
    
    console.log(`⚠️ Plan not found for price ID ${priceId}, will use metadata fallback`);
    return null;
  } catch (error) {
    console.error(`❌ Error getting plan details for price ID ${priceId}:`, error);
    return null;
  }
}

/**
 * Handle successful subscription
 * @param {Object} event - Stripe webhook event
 */
async function handleSubscriptionCreated(event) {
  const subscription = event.data.object;
  let { userId, planType, billingCycle, isEducational } = subscription.metadata;

  console.log(`🔄 handleSubscriptionCreated called for subscription ${subscription.id}`);
  console.log(`🔄 Subscription status: ${subscription.status}`);
  console.log(`🔄 Customer ID: ${subscription.customer}`);
  console.log(`🔄 Metadata: userId=${userId}, planType=${planType}, billingCycle=${billingCycle}, isEducational=${isEducational}`);
  console.log(`🔄 Subscription price data:`, subscription.items?.data?.[0]?.price || 'No price data available');
  console.log(`🔄 Full subscription object:`, JSON.stringify(subscription, null, 2));
  
  // Try to get plan details from price ID to ensure we have the latest subscription details
  const priceId = subscription.items?.data?.[0]?.price?.id;
  // Check if this subscription has been modified externally (Stripe portal, etc)
  const wasModifiedExternally = !subscription.metadata?.updated_via || subscription.metadata?.updated_via !== 'direct_update';
  
  if (priceId) {
    console.log(`🔍 Checking plan details from price ID: ${priceId}`);
    const planDetailsFromPrice = await getPlanDetailsFromPriceId(priceId);
    if (planDetailsFromPrice) {
      const metadataPlan = `${planType}/${billingCycle}`;
      const pricePlan = `${planDetailsFromPrice.planType}/${planDetailsFromPrice.billingCycle}`;
      
      if (metadataPlan !== pricePlan) {
        console.log(`🔄 Plan mismatch detected! Metadata: ${metadataPlan}, Price: ${pricePlan}`);
        console.log(`🔄 Using plan details from price ID (more reliable for portal changes)`);
        planType = planDetailsFromPrice.planType;
        billingCycle = planDetailsFromPrice.billingCycle;
        isEducational = planDetailsFromPrice.isEducational.toString();
      } else if (!planType || !billingCycle) {
        // Use price details if metadata is missing
        planType = planDetailsFromPrice.planType;
        billingCycle = planDetailsFromPrice.billingCycle;
        isEducational = planDetailsFromPrice.isEducational.toString();
        console.log(`✅ Derived plan details: ${planType}/${billingCycle} (Educational: ${isEducational})`);
      }
    } else {
      console.log(`⚠️ Plan not found for price ID ${priceId} in database`);
      if (wasModifiedExternally) {
        console.log(`🔄 External modification detected, will force credit processing`);
      }
    }
  }
  
  if (!userId || !planType || !billingCycle) {
    console.error('❌ Missing metadata in subscription', subscription.id);
    console.error('Available metadata:', subscription.metadata);
    return;
  }
  
  // Convert userId to integer
  let userIdInt = parseInt(userId, 10);
  if (isNaN(userIdInt)) {
    console.error('❌ Invalid userId in metadata', userId);
    return;
  }
  
  // Parse educational flag
  const isEducationalPlan = isEducational === 'true';
  
  try {
    // Use a single transaction to optimize database operations
    await prisma.$transaction(async (tx) => {
      // First, verify the user exists
      let user = await tx.user.findUnique({
        where: { id: userIdInt },
        select: { id: true, email: true, isStudent: true }
      });
      
      // If user doesn't exist, try to find by Stripe customer email
      if (!user) {
        console.log(`⚠️ User ${userIdInt} not found, attempting to find by Stripe customer email`);
        try {
          const stripeCustomer = await stripe.customers.retrieve(subscription.customer);
          if (stripeCustomer.email) {
            const userByEmail = await tx.user.findUnique({
              where: { email: stripeCustomer.email },
              select: { id: true, email: true, isStudent: true }
            });
            
            if (userByEmail) {
              console.log(`✅ Found correct user by email: ${userByEmail.id} (${userByEmail.email})`);
              user = userByEmail;
              userIdInt = userByEmail.id;
              
              // Update Stripe customer metadata with correct userId
              await stripe.customers.update(subscription.customer, {
                metadata: {
                  ...stripeCustomer.metadata,
                  userId: userIdInt.toString()
                }
              });
              
              // Update Stripe subscription metadata with correct userId
              await stripe.subscriptions.update(subscription.id, {
                metadata: {
                  ...subscription.metadata,
                  userId: userIdInt.toString()
                }
              });
              
              console.log(`✅ Updated Stripe metadata with correct userId: ${userIdInt}`);
            }
          }
        } catch (stripeError) {
          console.error('❌ Error retrieving Stripe customer:', stripeError.message);
        }
      }
      
      if (!user) {
        console.error(`❌ User not found: ${userId} and no matching email found in Stripe customer`);
        return;
      }
      
      // Check if educational plan is valid for this user
      if (isEducationalPlan && !user.isStudent) {
        console.error(`❌ Educational plan assigned to non-student user: ${userIdInt}`);
        // Don't throw error, but log it for admin review
      }
      
      console.log(`✅ User verified: ${user.id} (${user.email}) - Student: ${user.isStudent}, Educational Plan: ${isEducationalPlan}`);
      
      // Calculate expiration date for credits
      // Monthly plans: Credits expire in 1 month
      // Yearly plans: Credits still expire in 1 month (monthly allocation)
      const now = new Date();
      const creditsExpiresAt = new Date(now);
      creditsExpiresAt.setMonth(now.getMonth() + 1);
      
      // Parse Stripe dates (they come in seconds, convert to milliseconds)
      const periodStart = subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : now;
      const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : creditsExpiresAt;
      
      console.log(`🔄 Processing subscription for user ${userIdInt}, period: ${periodStart} to ${periodEnd}`);
      
      // Check if this subscription update already processed to prevent duplicates
      const existingSubscription = await tx.subscription.findUnique({
        where: { userId: userIdInt },
        select: { stripeSubscriptionId: true, id: true, currentPeriodStart: true, planType: true, billingCycle: true }
      });
      
      if (existingSubscription && existingSubscription.stripeSubscriptionId === subscription.id) {
        // Check if this is the same billing period to prevent duplicate processing
        const existingPeriodStart = existingSubscription.currentPeriodStart;
        if (existingPeriodStart && Math.abs(existingPeriodStart.getTime() - periodStart.getTime()) < 24 * 60 * 60 * 1000) {
          // Check if this is a plan change (plan type OR billing cycle change) OR external modification
          const isPlanTypeChange = existingSubscription.planType !== planType;
          const isBillingCycleChange = existingSubscription.billingCycle !== billingCycle;
          const isAnyPlanChange = isPlanTypeChange || isBillingCycleChange;
          
          // Only force processing for actual plan changes, not just portal visits
          // Portal visits should not trigger credit allocation unless there's an actual change

          if (!isAnyPlanChange) {
            console.log(`⚠️ No plan changes detected for subscription ${subscription.id}, skipping credit processing (portal visit or minor update)`);
            return;
          } else {
            if (isPlanTypeChange) {
              console.log(`🔄 Plan type change detected: ${existingSubscription.planType} → ${planType}, processing credit update`);
            }
            if (isBillingCycleChange) {
              console.log(`🔄 Billing cycle change detected: ${existingSubscription.billingCycle} → ${billingCycle}, processing credit update`);
            }
          }
        }
      }
      
      // Create or update user subscription
      const result = await tx.subscription.upsert({
        where: { userId: userIdInt },
        create: {
          userId: userIdInt,
          planType,
          status: 'ACTIVE',
          credits: 0, // Credits are managed through transactions, not this field
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          billingCycle,
          isEducational: isEducationalPlan,
          paymentFailedAttempts: 0,
          lastPaymentFailureDate: null,
        },
        update: {
          planType,
          status: 'ACTIVE',
          // Don't reset credits on update - credits are managed through transactions
          stripeSubscriptionId: subscription.id,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          billingCycle,
          isEducational: isEducationalPlan,
          paymentFailedAttempts: 0,
          lastPaymentFailureDate: null,
        },
      });

      console.log(`✅ Subscription upserted with ID: ${result.id}`);

      // CRITICAL DEBUG: Verify the subscription was actually saved
      const verifySubscription = await tx.subscription.findUnique({
        where: { userId: userIdInt },
        select: { id: true, status: true, planType: true, stripeSubscriptionId: true }
      });
      console.log(`🔍 VERIFICATION: Subscription in database after upsert:`, verifySubscription);
      
      // Determine if credits should be allocated
      let shouldAllocateCredits = false;
      let allocationReason = '';

      // CRITICAL: Never allocate credits for cancelled subscriptions
      // Users with cancelled subscriptions should only use remaining tokens, not get new ones
      if (subscription.status === 'cancelled' || subscription.cancel_at_period_end) {
        shouldAllocateCredits = false;
        allocationReason = 'Cancelled subscription - no new credit allocation';
        console.log(`🚫 Subscription ${subscription.id} is cancelled or scheduled for cancellation - preventing new credit allocation`);
      }
      // Check if this is a new subscription (no existing subscription record)
      else if (!existingSubscription) {
        shouldAllocateCredits = true;
        allocationReason = 'New subscription created';
      }
      // Check if this is a plan change (plan type OR billing cycle change)
      else if (existingSubscription.planType !== planType || existingSubscription.billingCycle !== billingCycle) {
        shouldAllocateCredits = true;
        allocationReason = `Plan change: ${existingSubscription.planType}/${existingSubscription.billingCycle} → ${planType}/${billingCycle}`;
      }
      // Check if this is a new billing period (renewal)
      else {
        const timeDiff = Math.abs(periodStart.getTime() - (existingSubscription.currentPeriodStart?.getTime() || 0));
        const isDifferentPeriod = timeDiff > 24 * 60 * 60 * 1000; // More than 1 day difference

        if (isDifferentPeriod) {
          shouldAllocateCredits = true;
          allocationReason = 'New billing period (renewal)';
        }
      }

      // Double-check: Don't allocate if credits already exist for this exact period and plan
      if (shouldAllocateCredits) {
        const creditExists = await creditAllocationExists(userIdInt, planType, periodStart, tx);
        if (creditExists) {
          shouldAllocateCredits = false;
          allocationReason = 'Credits already allocated for this period';
          console.log(`⚠️ Credit allocation already exists for user ${userIdInt} for ${planType} in this period, skipping duplicate allocation`);
        }
      }

      if (shouldAllocateCredits) {
        console.log(`💳 Allocating credits for user ${userIdInt}: ${allocationReason}`);

        // Get appropriate credit allocation based on student status and plan type
        const useEducationalCredits = isEducationalPlan || user.isStudent;
        const creditAmount = getCreditAllocation(planType, useEducationalCredits);
        const planDescription = useEducationalCredits ? `${planType} plan (Student)` : `${planType} plan`;

        // Reset credits to new subscription amount (simplified approach)
        await resetCreditsForNewSubscription(
          userIdInt,
          creditAmount,
          `${planDescription} credit allocation - Month 1 (${billingCycle.toLowerCase()})`,
          tx
        );

        console.log(`✅ Allocated ${creditAmount} credits for user ${userIdInt}${useEducationalCredits ? ' (Student rate)' : ''}`);

        // Debug: Check final balance after allocation
        const finalBalanceAfterAllocation = await getAvailableCredits(userIdInt, tx);
        console.log(`🔍 Final balance after credit allocation: ${finalBalanceAfterAllocation} credits for user ${userIdInt}`);
      } else {
        console.log(`🚫 Skipping credit allocation for user ${userIdInt}: ${allocationReason || 'No allocation needed (portal visit or minor update)'}`);
      }

      // CRITICAL: Final verification before transaction commit
      const finalSubscriptionCheck = await tx.subscription.findUnique({
        where: { userId: userIdInt },
        select: { id: true, status: true, planType: true, stripeSubscriptionId: true }
      });
      console.log(`🔍 FINAL CHECK: Subscription before transaction commit:`, finalSubscriptionCheck);

      if (!finalSubscriptionCheck || finalSubscriptionCheck.status !== 'ACTIVE') {
        console.error(`❌ CRITICAL: Subscription missing or not active before commit!`);
        throw new Error('Subscription not properly saved');
      }
    });
    
    // FINAL DEBUG: Check what we have in the database
    const finalDbSubscription = await prisma.subscription.findUnique({
      where: { userId: userIdInt },
      select: {
        id: true,
        userId: true,
        planType: true,
        status: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        billingCycle: true,
        isEducational: true
      }
    });

    console.log(`🔍 FINAL DATABASE STATE for user ${userIdInt}:`, finalDbSubscription);

    const finalUserCredits = await getAvailableCredits(userIdInt);
    console.log(`🔍 FINAL USER CREDITS for user ${userIdInt}: ${finalUserCredits}`);

    console.log(`✅ Subscription processed successfully for user ${userIdInt}, plan ${planType}${isEducationalPlan ? ' (Educational)' : ''}`);
  } catch (error) {
    console.error(`❌ Error processing subscription for user ${userIdInt}:`, error);
    console.error('Subscription data:', subscription);
    throw error;
  }
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
  
  try {
    // Use a single transaction to handle payment failure
    await prisma.$transaction(async (tx) => {
      // Get current subscription with minimal data needed
      const userSubscription = await tx.subscription.findUnique({
        where: { userId: userIdInt },
        select: { paymentFailedAttempts: true }
      });
      
      if (!userSubscription) {
        console.error('Subscription not found for user', userId);
        return;
      }
      
      const newFailedAttempts = userSubscription.paymentFailedAttempts + 1;
      
      // Update subscription with failed payment info
      await tx.subscription.update({
        where: { userId: userIdInt },
        data: {
          paymentFailedAttempts: newFailedAttempts,
          lastPaymentFailureDate: new Date(),
          status: 'PAST_DUE',
        },
      });
      
      // If max attempts reached, cancel subscription
      if (newFailedAttempts >= 3) { // 3 attempts total
        console.log(`❌ Max payment attempts reached for user ${userIdInt}, cancelling subscription`);
        await cancelSubscriptionInternal(userIdInt, tx);
      }
    });
    
    console.log(`✅ Payment failure processed for user ${userIdInt}`);
  } catch (error) {
    console.error(`❌ Error processing payment failure for user ${userIdInt}:`, error);
    throw error;
  }
}

/**
 * Cancel user subscription (no free plan available)
 * @param {number} userId - The user ID (integer)
 * @param {boolean} immediate - Whether to immediately reset credits (true) or allow usage until period end (false)
 */
async function cancelSubscription(userId, immediate = false) {
  const subscription = await getUserSubscription(userId);
  if (!subscription) throw new Error('Subscription not found');

  await cancelSubscriptionInternal(userId, prisma, subscription, immediate);
}

/**
 * Internal cancel subscription function for use within transactions
 * @param {number} userId - The user ID (integer)
 * @param {Object} tx - Prisma transaction object
 * @param {Object} subscription - Optional subscription object
 * @param {boolean} immediate - Whether to immediately reset credits (true) or allow usage until period end (false)
 */
async function cancelSubscriptionInternal(userId, tx = prisma, subscription = null, immediate = false) {
  if (!subscription) {
    subscription = await tx.subscription.findUnique({
      where: { userId },
      select: { stripeSubscriptionId: true, currentPeriodEnd: true }
    });
  }

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const now = new Date();
  const periodEnd = subscription.currentPeriodEnd || now;
  const isAfterPeriodEnd = now > periodEnd;

  // If there's an active Stripe subscription and we need immediate cancellation, cancel it
  if (subscription.stripeSubscriptionId && immediate) {
    try {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } catch (error) {
      console.error('Error canceling Stripe subscription', error);
    }
  }

  // Determine the subscription status and whether to reset credits
  let newStatus, shouldResetCredits, description;

  if (immediate || isAfterPeriodEnd) {
    // Immediate cancellation or period has already ended
    newStatus = 'CANCELLED';
    shouldResetCredits = true;
    description = immediate
      ? 'Credits reset to 0 due to immediate subscription cancellation'
      : 'Credits reset to 0 due to subscription period ending';
  } else {
    // Schedule cancellation for period end, but allow continued usage
    newStatus = 'CANCELLED_AT_PERIOD_END';
    shouldResetCredits = false;
    description = `Subscription cancelled - credits remain usable until ${periodEnd.toISOString()}`;
  }

  const updatePromises = [
    tx.subscription.update({
      where: { userId },
      data: {
        status: newStatus,
        stripeSubscriptionId: immediate ? null : subscription.stripeSubscriptionId,
        paymentFailedAttempts: 0,
        lastPaymentFailureDate: null,
      },
    }),
    // Create audit record
    tx.creditTransaction.create({
      data: {
        userId,
        amount: shouldResetCredits ? 0 : -1, // -1 indicates no credit change, just status change
        type: 'REFUND', // Use REFUND type to represent cancellation audit
        status: 'COMPLETED',
        description,
      },
    })
  ];

  // Only reset credits if we should
  if (shouldResetCredits) {
    updatePromises.push(
      tx.user.update({
        where: { id: userId },
        data: { remainingCredits: 0 }
      })
    );
  }

  await Promise.all(updatePromises);

  console.log(`✅ Subscription status updated to ${newStatus} for user ${userId}${shouldResetCredits ? ' (credits reset)' : ' (credits preserved until period end)'}`);
}

/**
 * Handle subscription renewal
 * @param {Object} event - Stripe webhook event
 */
async function handleSubscriptionRenewed(event) {
  const invoice = event.data.object;
  
  try {
    // Get subscription from Stripe to ensure we have the latest data
    const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const { userId, planType, billingCycle, isEducational } = stripeSubscription.metadata;
    
    if (!userId || !planType || !billingCycle) {
      console.error('Missing metadata in subscription', stripeSubscription.id);
      return;
    }
    
    // Convert userId to integer
    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      console.error('Invalid userId in metadata', userId);
      return;
    }
    
    // Parse educational flag
    const isEducationalPlan = isEducational === 'true';
    
    console.log(`🔄 Processing renewal for user ${userIdInt}, subscription ${stripeSubscription.id}${isEducationalPlan ? ' (Educational)' : ''}`);
    
    // Use a single transaction to optimize database operations
    await prisma.$transaction(async (tx) => {
      // Get or create subscription from Stripe data (handles missing subscriptions)
      const subscription = await getOrCreateSubscriptionFromStripe(stripeSubscription, tx);
      
      // Get user details to check student status
      const user = await tx.user.findUnique({
        where: { id: userIdInt },
        select: { isStudent: true }
      });
      
      // Calculate expiration date for credits (always 1 month)
      const now = new Date();
      const creditsExpiresAt = new Date(now);
      creditsExpiresAt.setMonth(now.getMonth() + 1);
      
      // Calculate which credit cycle this is
      const subscriptionStart = subscription.currentPeriodStart || subscription.createdAt;
      const cycleMonth = calculateCreditCycleMonth(subscriptionStart, now);

      // CRITICAL: Check if this is a cancelled subscription - they should not get renewal credits
      if (stripeSubscription.status === 'cancelled' || stripeSubscription.cancel_at_period_end) {
        console.log(`🚫 Subscription ${stripeSubscription.id} is cancelled or scheduled for cancellation - preventing renewal credit allocation`);
        return;
      }

      // Check if credit allocation already exists for this period to prevent duplicates
      const creditExists = await creditAllocationExists(userIdInt, planType, subscriptionStart, tx);

      if (creditExists) {
        console.log(`⚠️ Credit allocation already exists for user ${userIdInt} in this period, skipping duplicate renewal`);
        return;
      }
      
      // Get appropriate credit allocation based on educational plan flag and student status
      const useEducationalCredits = isEducationalPlan || user?.isStudent || false;
      const creditAmount = getCreditAllocation(planType, useEducationalCredits);
      const planDescription = useEducationalCredits ? `${planType} plan (Student)` : `${planType} plan`;
      
      // Determine description based on billing cycle
      let description;
      if (billingCycle === 'YEARLY') {
        description = `${planDescription} monthly credit allocation - Month ${cycleMonth}/12 (yearly billing)`;
      } else {
        description = `${planDescription} monthly credit allocation (monthly billing)`;
      }
      
      console.log(`💳 Allocating ${creditAmount} new credits for ${planDescription}, cycle month: ${cycleMonth}`);
      
      // Reset credits for renewal (simplified approach)
      await resetCreditsForNewSubscription(userIdInt, creditAmount, description, tx);
    });
    
    console.log(`✅ Subscription renewal processed successfully for user ${userIdInt}${isEducationalPlan ? ' (Educational)' : ''}`);
  } catch (error) {
    console.error(`❌ Error processing subscription renewal:`, error);
    console.error('Invoice data:', invoice);
    throw error;
  }
}

/**
 * Create Stripe customer portal session with user-type specific configuration
 * @param {number} userId - The user ID
 * @param {string} returnUrl - URL to return to after portal session
 * @returns {Object} Portal session with URL and user type
 */
async function createPortalSessionForUser(userId, returnUrl = null) {
  try {
    // Get user info to check if they're a student
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isStudent: true }
    });

    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      throw new Error('No subscription found for user');
    }

    if (!subscription.stripeCustomerId) {
      throw new Error('No Stripe customer ID found for user');
    }

    // Determine which portal configuration to use based on user type
    const isStudent = user?.isStudent || subscription?.isEducational;

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const frontendUrl = returnUrl || process.env.FRONTEND_URL || 'http://localhost:3000';

    // Create portal session with appropriate configuration
    const portalSessionConfig = {
      customer: subscription.stripeCustomerId,
      return_url: `${frontendUrl}/subscription`,
    };

    // Add different portal configuration based on user type
    if (isStudent) {
      // For student users, use educational portal configuration
      portalSessionConfig.configuration = process.env.STRIPE_PORTAL_CONFIG_STUDENT || 'bpc_1SDPikIx86VAQvG3ty1Tksuf';
    } else {
      // For regular users, use default portal configuration
      portalSessionConfig.configuration = process.env.STRIPE_PORTAL_CONFIG_REGULAR || 'bpc_1OMu6lIx86VAQvG3OW78K6fb';
    }

    const portalSession = await stripe.billingPortal.sessions.create(portalSessionConfig);

    console.log(`✅ Created ${isStudent ? 'student' : 'regular'} portal session for user ${userId}:`, portalSession.url);

    return {
      url: portalSession.url,
      userType: isStudent ? 'student' : 'regular',
      success: true
    };
  } catch (error) {
    console.error('Error creating portal session for user:', error);
    throw error;
  }
}

/**
 * Deduct credits from user's subscription
 * @param {string} userId - The user ID
 * @param {number} amount - Amount of credits to deduct
 * @param {string} description - Description for the transaction
 * @param {Object} tx - Optional Prisma transaction object
 * @param {string} type - Credit transaction type (IMAGE_TWEAK, IMAGE_REFINE, etc.)
 * @returns {Object} Updated user with new credit balance
 */
async function deductCredits(userId, amount, description, tx = prisma, type = 'IMAGE_TWEAK') {
  if (!userId || !amount || amount <= 0) {
    throw new Error('Invalid parameters for credit deduction');
  }

  // Get current user with subscription status and credits
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      remainingCredits: true,
      subscription: {
        select: { status: true, planType: true, currentPeriodEnd: true }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!isSubscriptionUsable(user.subscription)) {
    const now = new Date();
    const periodEnd = user.subscription?.currentPeriodEnd;

    if (user.subscription?.status === 'CANCELLED_AT_PERIOD_END' && periodEnd && now > new Date(periodEnd)) {
      throw new Error('Subscription has expired. Please renew your subscription to continue using credits.');
    } else if (user.subscription?.status === 'CANCELLED') {
      throw new Error('Subscription has been cancelled. Please subscribe to a new plan to continue using credits.');
    } else {
      throw new Error('No active subscription found');
    }
  }

  if (user.remainingCredits < amount) {
    throw new Error(`Insufficient credits. Available: ${user.remainingCredits}, Required: ${amount}`);
  }

  // Atomically update user credits and create transaction record
  const [updatedUser] = await Promise.all([
    tx.user.update({
      where: { id: userId },
      data: { remainingCredits: { decrement: amount } }
    }),
    tx.creditTransaction.create({
      data: {
        userId,
        amount: -amount, // Negative amount for deduction
        type: type || 'IMAGE_TWEAK', // Default to IMAGE_TWEAK if no type specified
        status: 'COMPLETED',
        description,
      },
    })
  ]);

  console.log(`✅ Deducted ${amount} credits for user ${userId}. Remaining: ${updatedUser.remainingCredits}`);
  return updatedUser;
}

/**
 * Refund credits to user's subscription
 * @param {string} userId - The user ID
 * @param {number} amount - Amount of credits to refund
 * @param {string} description - Description for the transaction
 * @param {Object} tx - Optional Prisma transaction object
 * @returns {Object} Updated user with new credit balance
 */
async function refundCredits(userId, amount, description, tx = prisma) {
  if (!userId || !amount || amount <= 0) {
    throw new Error('Invalid parameters for credit refund');
  }

  // Get current user to verify they exist
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, remainingCredits: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Atomically update user credits and create transaction record
  const [updatedUser] = await Promise.all([
    tx.user.update({
      where: { id: userId },
      data: { remainingCredits: { increment: amount } }
    }),
    tx.creditTransaction.create({
      data: {
        userId,
        amount: amount, // Positive amount for refund
        type: 'REFUND',
        status: 'COMPLETED',
        description,
      },
    })
  ]);

  console.log(`✅ Refunded ${amount} credits for user ${userId}. New balance: ${updatedUser.remainingCredits}`);
  return updatedUser;
}

/**
 * Cancel all other active subscriptions for a customer when a new subscription is created
 * @param {Object} event - Stripe webhook event for subscription.created
 */
async function cancelOtherActiveSubscriptions(event) {
  const newSubscription = event.data.object;
  const customerId = newSubscription.customer;
  const newSubscriptionId = newSubscription.id;

  try {
    console.log(`🔍 Checking for existing active subscriptions for customer ${customerId}, excluding new subscription ${newSubscriptionId}`);

    // First, let's check what we have in our database
    const dbSubscriptions = await prisma.subscription.findMany({
      where: {
        stripeCustomerId: customerId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        userId: true,
        stripeSubscriptionId: true,
        planType: true,
        status: true
      }
    });

    console.log(`📊 Found ${dbSubscriptions.length} active subscriptions in database for customer ${customerId}`);

    // Get ALL subscriptions for this customer from Stripe (active, past_due, etc.)
    const allSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100
    });

    console.log(`📊 Found ${allSubscriptions.data.length} total subscriptions in Stripe for customer ${customerId}`);

    // Filter out the newly created subscription and cancel ALL others that aren't already cancelled
    const subscriptionsToCancel = allSubscriptions.data.filter(
      sub => sub.id !== newSubscriptionId &&
             sub.status !== 'canceled' &&
             sub.status !== 'incomplete_expired'
    );

    if (subscriptionsToCancel.length === 0) {
      console.log(`✅ No existing active subscriptions found to cancel for customer ${customerId}`);
      return;
    }

    console.log(`🗑️ Found ${subscriptionsToCancel.length} subscription(s) to cancel for customer ${customerId}:`);
    subscriptionsToCancel.forEach(sub => {
      console.log(`   - ${sub.id} (${sub.metadata?.planType || 'unknown plan'}) - Status: ${sub.status}`);
    });

    // Cancel each existing subscription
    for (const subscription of subscriptionsToCancel) {
      try {
        console.log(`🗑️ Cancelling subscription ${subscription.id} (NOT the new one: ${newSubscriptionId})`);

        // CRITICAL SAFETY CHECK: Never cancel the new subscription
        if (subscription.id === newSubscriptionId) {
          console.error(`❌ CRITICAL SAFETY CHECK FAILED: Almost cancelled the new subscription ${newSubscriptionId}! Skipping.`);
          continue;
        }

        // Additional safety check: Don't cancel if it's already the newest subscription
        const subscriptionDate = new Date(subscription.created * 1000);
        console.log(`🔍 Subscription ${subscription.id} created at: ${subscriptionDate.toISOString()}`);

        // Check if this subscription was created very recently (within last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (subscriptionDate > fiveMinutesAgo && subscription.status === 'active') {
          console.log(`⚠️ Subscription ${subscription.id} is very recent and active, being extra cautious`);
          // Still cancel it, but with extra logging
        }

        await stripe.subscriptions.cancel(subscription.id);

        // Also update our database to mark it as cancelled - be aggressive
        if (subscription.metadata?.userId) {
          const userIdInt = parseInt(subscription.metadata.userId, 10);
          if (!isNaN(userIdInt)) {
            // Update ONLY the specific subscription record with this Stripe subscription ID
            // DO NOT cancel other active subscriptions - they might be the new one we just created
            const updateResult = await prisma.subscription.updateMany({
              where: {
                stripeSubscriptionId: subscription.id,
                userId: userIdInt
              },
              data: {
                status: 'CANCELLED'
              }
            });
            console.log(`📝 Updated ${updateResult.count} database record(s) for cancelled subscription ${subscription.id}`);
          }
        } else {
          // If no userId metadata, find by customer ID but only cancel the specific subscription
          const updateResult = await prisma.subscription.updateMany({
            where: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id
            },
            data: { status: 'CANCELLED' }
          });
          console.log(`📝 Cancelled ${updateResult.count} database records by customer ID for ${subscription.id}`);
        }

        console.log(`✅ Successfully cancelled subscription ${subscription.id}`);
      } catch (cancelError) {
        console.error(`❌ Error cancelling subscription ${subscription.id}:`, cancelError);
      }
    }

    console.log(`✅ Completed cancellation of ${subscriptionsToCancel.length} existing subscription(s) for customer ${customerId}`);

  } catch (error) {
    console.error(`❌ Error checking/cancelling existing subscriptions for customer ${customerId}:`, error);
    // Don't throw error - we still want to process the new subscription
  }
}

/**
 * Update existing subscription with immediate proration and simplified token allocation
 * @param {number} userId - The user ID
 * @param {string} newPlanType - The new plan type
 * @param {string} newBillingCycle - The new billing cycle
 * @param {boolean} isEducational - Whether this is an educational plan
 */
async function updateSubscriptionWithProration(userId, newPlanType, newBillingCycle, isEducational = false) {
  const subscription = await getUserSubscription(userId);
  if (!subscription || !subscription.stripeSubscriptionId) {
    throw new Error('No active subscription found to update');
  }

  // Get the new price ID from database
  const planPrice = await getPlanPrice(newPlanType, newBillingCycle, isEducational);

  if (!planPrice || !planPrice.stripePriceId) {
    throw new Error('Price not found for the selected plan or Stripe price ID missing');
  }

  const newPriceId = planPrice.stripePriceId;

  try {
    // Use transaction to ensure atomic updates
    return await prisma.$transaction(async (tx) => {
      // Get the current subscription from Stripe
      const currentStripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      const subscriptionItemId = currentStripeSubscription.items.data[0].id;
      const currentInterval = currentStripeSubscription.items.data[0].price.recurring.interval;

      // Check if billing interval is changing
      const newInterval = newBillingCycle === 'MONTHLY' ? 'month' : 'year';
      const isIntervalChanging = currentInterval !== newInterval;

      const updateParams = {
        items: [
          {
            id: subscriptionItemId,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
        metadata: {
          userId: userId.toString(),
          planType: newPlanType,
          billingCycle: newBillingCycle,
          isEducational: isEducational.toString(),
          updated_via: 'direct_update',
        },
      };

      // Only set billing_cycle_anchor to 'unchanged' if interval is NOT changing
      if (!isIntervalChanging) {
        updateParams.billing_cycle_anchor = 'unchanged';
      }

      // Update the subscription with proration
      const updatedSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        updateParams
      );

      // Update database record
      const userIdInt = parseInt(userId, 10);
      await tx.subscription.update({
        where: { userId: userIdInt },
        data: {
          planType: newPlanType,
          status: 'ACTIVE',
          billingCycle: newBillingCycle,
          isEducational: isEducational,
          currentPeriodStart: updatedSubscription.current_period_start ? new Date(updatedSubscription.current_period_start * 1000) : new Date(),
          currentPeriodEnd: updatedSubscription.current_period_end ? new Date(updatedSubscription.current_period_end * 1000) : new Date(),
        },
      });

      // SIMPLIFIED TOKEN ALLOCATION - Immediately allocate tokens based on your business rules
      const changeType = subscription.planType !== newPlanType ? 'Plan Change' : 'Billing Cycle Change';
      await allocateTokensForPlanChange(userIdInt, newPlanType, isEducational, changeType, tx);

      console.log(`✅ Subscription updated with immediate token allocation for user ${userIdInt}: ${newPlanType}/${newBillingCycle} (Educational: ${isEducational})`);

      return updatedSubscription;
    });
  } catch (error) {
    console.error('Error updating subscription with proration:', error);
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
}

module.exports = {
  createStripeCustomer,
  getUserSubscription,
  getAvailableCredits,
  cleanupDuplicateCredits,
  creditAllocationExists,
  getOrCreateSubscriptionFromStripe,
  calculateCreditCycleMonth,
  getPlanDetailsFromPriceId,
  createCheckoutSession,
  updateSubscriptionWithProration,
  cancelOtherActiveSubscriptions, // NEW: Cancel existing subscriptions when new one is created
  handleSubscriptionCreated,
  handlePaymentFailed,
  handleSubscriptionRenewed,
  cancelSubscription,
  deductCredits,
  refundCredits,
  getCreditAllocation,
  resetCreditsForNewSubscription,
  allocateTokensForPlanChange, // NEW: Simplified token allocation
  isSubscriptionUsable, // NEW: Check if subscription can be used for credits
  createPortalSessionForUser, // NEW: Reusable portal session creation with user type detection
  CREDIT_ALLOCATION,
  EDUCATIONAL_CREDIT_ALLOCATION,
};