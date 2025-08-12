const subscriptionService = require('../services/subscriptions.service');

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
    
    res.json(subscription);
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
    const { planType, billingCycle = 'MONTHLY' } = req.body;
    
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
      cancelUrl
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
    const { planType, billingCycle = 'MONTHLY' } = req.body;
    
    if (!planType) {
      return res.status(400).json({ message: 'Plan type is required' });
    }
    
    const updatedSubscription = await subscriptionService.updateSubscriptionWithProration(
      userId,
      planType,
      billingCycle
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
    const { getStripeProductsAndPrices, PRODUCTS } = require('../utils/stripeSetup');
    
    // Get current Stripe products and prices
    const productMap = await getStripeProductsAndPrices();
    
    // Format response with plan details
    const plans = Object.keys(PRODUCTS).map(planKey => {
      const productData = PRODUCTS[planKey];
      const stripeData = productMap[planKey];
      
      return {
        planType: planKey,
        name: productData.name,
        description: productData.description,
        credits: subscriptionService.CREDIT_ALLOCATION[planKey],
        prices: {
          monthly: productData.prices.MONTHLY.amount,
          yearly: productData.prices.YEARLY.amount,
        },
        stripePrices: stripeData?.prices || {},
      };
    });
    
    // Add free plan
    plans.unshift({
      planType: 'FREE',
      name: 'Free Plan',
      description: 'Basic access with 100 credits',
      credits: subscriptionService.CREDIT_ALLOCATION.FREE,
      prices: {
        monthly: 0,
        yearly: 0,
      },
      stripePrices: {},
    });
    
    res.json(plans);
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    res.status(500).json({ message: 'Failed to fetch pricing plans' });
  }
}

module.exports = {
  getCurrentSubscription,
  createCheckoutSession,
  updateSubscription,
  createPortalSession,
  getPricingPlans,
};