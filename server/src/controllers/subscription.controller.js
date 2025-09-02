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
    
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    // Check if this is an educational subscription by looking at Stripe metadata
    let isEducational = subscription.isEducational || false;
    
    if (!isEducational && subscription.stripeSubscriptionId) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        isEducational = stripeSubscription.metadata?.isEducational === 'true';
      } catch (stripeError) {
        console.error('Error fetching Stripe subscription metadata:', stripeError);
      }
    }
    
    res.json({
      ...subscription,
      isEducational
    });
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
    
    if (!subscription || !subscription.stripeCustomerId) {
      return res.status(404).json({ message: 'No active subscription found' });
    }
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${frontendUrl}/subscription`,
    });
    
    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ message: 'Failed to create portal session' });
  }
}

/**
 * Update existing subscription with proration
 */
async function updateSubscription(req, res) {
  try {
    const userId = req.user.id;
    const { planType, billingCycle = 'MONTHLY', isEducational = false } = req.body;
    
    if (!planType) {
      return res.status(400).json({ message: 'Plan type is required' });
    }
    
    const updatedSubscription = await subscriptionService.updateSubscriptionWithProration(
      userId,
      planType,
      billingCycle,
      isEducational
    );
    
    res.json({ 
      success: true,
      subscription: updatedSubscription,
      message: 'Subscription updated successfully with proration'
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ message: error.message || 'Failed to update subscription' });
  }
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