const subscriptionService = require('../services/subscriptions.service');
const { prisma } = require('../services/prisma.service');
const { getRegularPlans, getEducationalPlans } = require('../utils/plansService');
const { triggerMonthlyAllocation } = require('../services/cron.service');

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
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
    const subscription = await subscriptionService.getUserSubscription(userId);

    console.log(`🔍 Portal request for user ${userId}, subscription:`, {
      exists: !!subscription,
      status: subscription?.status,
      stripeCustomerId: subscription?.stripeCustomerId,
      stripeSubscriptionId: subscription?.stripeSubscriptionId
    });

    if (!subscription) {
      console.log(`❌ No subscription found for user ${userId}`);
      return res.status(404).json({ message: 'No subscription found' });
    }

    if (!subscription.stripeCustomerId) {
      console.log(`❌ No Stripe customer ID for user ${userId}`);
      return res.status(404).json({ message: 'No Stripe customer found' });
    }

    // Allow portal access even for non-active subscriptions (cancelled, past_due, etc.)
    // Users should be able to manage their billing regardless of subscription status

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${frontendUrl}/subscription`,
    });

    console.log(`✅ Portal session created for user ${userId}: ${portalSession.url}`);
    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
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
    
    // Check if user is a student
    let isStudent = false;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isStudent: true }
      });
      isStudent = user?.isStudent || false;
    }
    
    // Get plans from database instead of Stripe API
    const [regularPlans, educationalPlans] = await Promise.all([
      getRegularPlans(),
      getEducationalPlans()
    ]);
    
    // Format regular plans
    const plans = regularPlans.map(plan => ({
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
      isEducational: false,
    }));
    
    // Format educational plans
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
    });
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    res.status(500).json({ message: 'Failed to fetch pricing plans' });
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

module.exports = {
  getCurrentSubscription,
  createCheckoutSession,
  updateSubscription,
  createPortalSession,
  getPricingPlans,
  testMonthlyAllocation,
};