const subscriptionService = require('../services/subscriptions.service');
const { prisma } = require('../services/prisma.service');
const { getRegularPlans, getEducationalPlans, getUserCurrency } = require('../utils/plansService');
const { triggerMonthlyAllocation } = require('../services/cron.service');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Get current user's subscription details
 */
async function getCurrentSubscription(req, res) {
  try {
    const userId = req.user.id;
    const subscription = await subscriptionService.getUserSubscription(userId);

    console.log(`🔍 getCurrentSubscription for user ${userId}:`, {
      found: !!subscription,
      status: subscription?.status,
      planType: subscription?.planType,
      stripeSubscriptionId: subscription?.stripeSubscriptionId,
      stripeCustomerId: subscription?.stripeCustomerId
    });

    if (!subscription) {
      console.log(`❌ No subscription found for user ${userId}`);
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Check if this is an educational subscription by looking at Stripe metadata
    let isEducational = subscription.isEducational || false;

    if (!isEducational && subscription.stripeSubscriptionId) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        isEducational = stripeSubscription.metadata?.isEducational === 'true';
        console.log(`📚 Educational check: DB=${subscription.isEducational}, Stripe=${stripeSubscription.metadata?.isEducational}, Final=${isEducational}`);
      } catch (stripeError) {
        console.error('Error fetching Stripe subscription metadata:', stripeError);
      }
    }

    const result = {
      ...subscription,
      isEducational
    };

    console.log(`✅ Returning subscription data for user ${userId}:`, result);
    res.json(result);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Create checkout session for subscription upgrade
 */
async function createCheckoutSession(req, res) {
  try {
    const userId = req.user.id;
    const { planType, billingCycle = 'MONTHLY', isEducational = false } = req.body;
    
    if (!planType) {
      return res.status(400).json({ message: 'Plan type is required' });
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${frontendUrl}/subscription?success=true`;
    const cancelUrl = `${frontendUrl}/subscription?canceled=true`;
    
    const session = await subscriptionService.createCheckoutSession(
      userId,
      planType,
      billingCycle,
      successUrl,
      cancelUrl,
      isEducational
    );
    
    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: error.message || 'Failed to create checkout session' });
  }
}

/**
 * Create customer portal session for subscription management
 */
async function createPortalSession(req, res) {
  try {
    const userId = req.user.id;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    console.log(`🔍 Portal request for user ${userId}`);

    // Use the reusable portal service function
    const portalResult = await subscriptionService.createPortalSessionForUser(userId, frontendUrl);

    res.json({
      url: portalResult.url,
      userType: portalResult.userType
    });
  } catch (error) {
    console.error('Error creating portal session:', error);

    // Handle specific error types
    if (error.message === 'No subscription found for user') {
      return res.status(404).json({ message: 'No subscription found' });
    }
    if (error.message === 'No Stripe customer ID found for user') {
      return res.status(404).json({ message: 'No Stripe customer found' });
    }

    res.status(500).json({ message: 'Failed to create portal session' });
  }
}

/**
 * Update existing subscription with proration and simplified token allocation
 */
async function updateSubscription(req, res) {
  try {
    const userId = req.user.id;
    const { planType, billingCycle = 'MONTHLY', isEducational = false } = req.body;

    if (!planType) {
      return res.status(400).json({ message: 'Plan type is required' });
    }

    // Validate user type can access requested plan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isStudent: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Business rule validation
    if (isEducational && !user.isStudent) {
      return res.status(403).json({
        message: 'Educational plans are only available for verified students'
      });
    }

    if (!isEducational && user.isStudent) {
      return res.status(403).json({
        message: 'Students must use educational plans'
      });
    }

    // Get current subscription to determine if this is upgrade or downgrade
    const currentSubscription = await subscriptionService.getUserSubscription(userId);
    if (!currentSubscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    const changeType = determineChangeType(currentSubscription, planType, billingCycle);

    const updatedSubscription = await subscriptionService.updateSubscriptionWithProration(
      userId,
      planType,
      billingCycle,
      isEducational
    );

    res.json({
      success: true,
      subscription: updatedSubscription,
      changeType: changeType,
      message: `Subscription ${changeType}d successfully with immediate token allocation`
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ message: error.message || 'Failed to update subscription' });
  }
}

/**
 * Determine if subscription change is upgrade, downgrade, or billing change
 */
function determineChangeType(currentSubscription, newPlanType, newBillingCycle) {
  const planHierarchy = { STARTER: 1, EXPLORER: 2, PRO: 3 };
  const currentPlanLevel = planHierarchy[currentSubscription.planType];
  const newPlanLevel = planHierarchy[newPlanType];

  if (newPlanLevel > currentPlanLevel) return 'upgrade';
  if (newPlanLevel < currentPlanLevel) return 'downgrade';
  if (currentSubscription.billingCycle !== newBillingCycle) return 'billing cycle change';
  return 'update';
}

/**
 * Get available pricing plans
 */
async function getPricingPlans(req, res) {
  try {
    const userId = req.user?.id;
    
    // Check if user is a student and get currency info
    let isStudent = false;
    let userCurrency = 'usd'; // Default to USD
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          isStudent: true,
          country_code: true,
          continent: true,
          currency: true
        }
      });
      isStudent = user?.isStudent || false;
      
      // Determine currency based on user's location
      if (user) {
        userCurrency = getUserCurrency(user.country_code, user.continent);
      }
    }
    
    // Get plans from database filtered by user's currency
    const [regularPlans, educationalPlans] = await Promise.all([
      getRegularPlans(userCurrency),
      getEducationalPlans(userCurrency)
    ]);
    
    // Format regular plans - Standard plans only use THREE_MONTHLY
    const plans = regularPlans.map(plan => ({
      planType: plan.planType,
      name: plan.name,
      description: plan.description,
      credits: plan.credits,
      prices: {
        threeMonthly: plan.prices.find(p => p.billingCycle === 'THREE_MONTHLY')?.amount || 0,
      },
      stripePrices: {
        THREE_MONTHLY: plan.prices.find(p => p.billingCycle === 'THREE_MONTHLY')?.stripePriceId,
      },
      isEducational: false,
    }));
    
    // Format educational plans - Keep MONTHLY and YEARLY (no SIX_MONTHLY)
    const educationalPlansFormatted = educationalPlans.map(plan => ({
      planType: plan.planType,
      name: plan.name,
      description: plan.description,
      credits: plan.credits,
      prices: {
        monthly: plan.prices.find(p => p.billingCycle === 'MONTHLY')?.amount || 0,
        yearly: plan.prices.find(p => p.billingCycle === 'YEARLY')?.amount || 0,
      },
      stripePrices: {
        MONTHLY: plan.prices.find(p => p.billingCycle === 'MONTHLY')?.stripePriceId,
        YEARLY: plan.prices.find(p => p.billingCycle === 'YEARLY')?.stripePriceId,
      },
      isEducational: true,
    }));
    
    res.json({
      regularPlans: plans,
      educationalPlans: educationalPlansFormatted,
      isStudent: isStudent,
      currency: userCurrency,
    });
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    res.status(500).json({ message: 'Failed to fetch pricing plans' });
  }
}

/**
 * Quick portal redirect endpoint - redirects directly to portal based on user type
 */
async function redirectToPortal(req, res) {
  try {
    const userId = req.user.id;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    console.log(`🚀 Quick portal redirect for user ${userId}`);

    // Use the reusable portal service function
    const portalResult = await subscriptionService.createPortalSessionForUser(userId, frontendUrl);

    // Redirect directly instead of returning JSON
    res.redirect(portalResult.url);
  } catch (error) {
    console.error('Error redirecting to portal:', error);

    // Redirect to subscription page with error parameter
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/subscription?error=portal_failed`);
  }
}

/**
 * Get payment history for the current user
 */
async function getPaymentHistory(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const startingAfter = req.query.starting_after;

    // Get user's subscription to find Stripe customer ID
    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription || !subscription.stripeCustomerId) {
      return res.json({
        payments: [],
        hasMore: false,
        totalCount: 0
      });
    }

    // Build pagination options
    const paginationOptions = {
      customer: subscription.stripeCustomerId,
      limit: Math.min(limit, 100), // Stripe max is 100
      expand: ['data.charge']
    };

    if (startingAfter) {
      paginationOptions.starting_after = startingAfter;
    }

    // Fetch invoices for this customer (better for subscription payments)
    const invoices = await stripe.invoices.list(paginationOptions);

    // Map invoice status to payment status
    const mapInvoiceStatus = (invoice) => {
      switch (invoice.status) {
        case 'paid':
          return 'succeeded';
        case 'open':
          return 'pending';
        case 'void':
        case 'uncollectible':
          return 'failed';
        case 'draft':
          return 'draft';
        default:
          return invoice.status;
      }
    };

    // Format the payment data from invoices
    const payments = invoices.data.map(invoice => {
      return {
        id: invoice.id,
        payment_intent_id: invoice.payment_intent,
        amount: invoice.amount_paid || invoice.amount_due,
        currency: invoice.currency,
        status: mapInvoiceStatus(invoice),
        created: invoice.created,
        description: invoice.description || `Subscription payment for ${invoice.lines?.data[0]?.description || 'plan'}`,
        receipt_url: invoice.hosted_invoice_url, // Stripe hosted invoice URL
        receipt_number: invoice.receipt_number,
        invoice_pdf: invoice.invoice_pdf,
        invoice_number: invoice.number,
        payment_method: invoice.payment_intent ? 'card' : 'invoice'
      };
    });

    res.json({
      payments,
      hasMore: invoices.has_more,
      totalCount: invoices.data.length,
      nextStartingAfter: invoices.data.length > 0 ? invoices.data[invoices.data.length - 1].id : null
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Failed to fetch payment history' });
  }
}

/**
 * Test endpoint to manually trigger monthly credit allocation
 */
async function testMonthlyAllocation(req, res) {
  try {
    await triggerMonthlyAllocation();
    res.json({
      success: true,
      message: 'Monthly credit allocation triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering monthly allocation:', error);
    res.status(500).json({ message: 'Failed to trigger monthly allocation' });
  }
}

/**
 * Create checkout session for credit top-up
 */
async function createCreditCheckoutSession(req, res) {
  try {
    const userId = req.user.id;
    const { credits, amount } = req.body;
    
    if (!credits || !amount) {
      return res.status(400).json({ message: 'Credits and amount are required' });
    }
    
    // Validate credit amounts
    const validCreditAmounts = [50, 100, 300];
    if (!validCreditAmounts.includes(credits)) {
      return res.status(400).json({ message: 'Invalid credit amount' });
    }
    
    // Check if user has active subscription
    const subscription = await subscriptionService.getUserSubscription(userId);
    if (!subscription || subscription.status !== 'ACTIVE') {
      return res.status(403).json({ 
        message: 'Active subscription required to purchase credits' 
      });
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${frontendUrl}/buy-credits?success=true`;
    const cancelUrl = `${frontendUrl}/buy-credits?canceled=true`;
    
    const session = await subscriptionService.createCreditCheckoutSession(
      userId,
      credits,
      amount,
      successUrl,
      cancelUrl
    );
    
    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Error creating credit checkout session:', error);
    res.status(500).json({ message: error.message || 'Failed to create checkout session' });
  }
}

/**
 * Get detailed credit transaction data for top-up credits
 */
async function getCreditTransactionData(req, res) {
  try {
    const userId = req.user.id;

    // Get all credit transactions for the user
    const transactions = await prisma.creditTransaction.findMany({
      where: { 
        userId,
        status: 'COMPLETED'
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate top-up credit data
    const topUpPurchases = transactions.filter(tx => 
      tx.type === 'PURCHASE' && tx.amount > 0
    );
    
    const topUpUsage = transactions.filter(tx => 
      tx.type === 'IMAGE_CREATE' || tx.type === 'IMAGE_TWEAK' || tx.type === 'IMAGE_REFINE'
    );

    const totalTopUpPurchased = topUpPurchases.reduce((sum, tx) => sum + tx.amount, 0);
    const totalTopUpUsed = topUpUsage.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const remainingTopUpCredits = totalTopUpPurchased - totalTopUpUsed;

    // Get subscription credits data
    const subscription = await subscriptionService.getUserSubscription(userId);
    const planCredits = subscription ? getPlanCredits(subscription.planType) : 0;
    const subscriptionCreditsUsed = Math.max(0, planCredits - (req.user.remainingCredits || 0));

    res.json({
      topUp: {
        totalPurchased: totalTopUpPurchased,
        totalUsed: totalTopUpUsed,
        remaining: remainingTopUpCredits,
        usagePercentage: totalTopUpPurchased > 0 
          ? Math.round((totalTopUpUsed / totalTopUpPurchased) * 100)
          : 0
      },
      subscription: {
        planAllocation: planCredits,
        used: subscriptionCreditsUsed,
        remaining: Math.max(0, planCredits - subscriptionCreditsUsed),
        usagePercentage: planCredits > 0 
          ? Math.round((subscriptionCreditsUsed / planCredits) * 100)
          : 0
      },
      total: {
        available: req.user.remainingCredits || 0,
        purchased: totalTopUpPurchased,
        used: totalTopUpUsed + subscriptionCreditsUsed
      }
    });
  } catch (error) {
    console.error('Error getting credit transaction data:', error);
    res.status(500).json({ message: 'Failed to get credit data' });
  }
}

// Helper function to get plan credits
function getPlanCredits(planType) {
  switch (planType) {
    case 'STARTER': return 50;
    case 'EXPLORER': return 150;
    case 'PRO': return 1000;
    default: return 50;
  }
}

module.exports = {
  getCurrentSubscription,
  createCheckoutSession,
  updateSubscription,
  createPortalSession,
  redirectToPortal,
  getPricingPlans,
  getPaymentHistory,
  testMonthlyAllocation,
  createCreditCheckoutSession,
  getCreditTransactionData,
};