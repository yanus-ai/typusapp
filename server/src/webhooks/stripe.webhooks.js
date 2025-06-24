const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const subscriptionService = require('../services/subscriptions.service');

/**
 * Handle Stripe webhook events
 */
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody, // Make sure your Express app preserves raw body
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        // Payment was successful, subscription started
        console.log('Checkout session completed', event.data.object.id);
        break;
        
      case 'customer.subscription.created':
        // New subscription created
        await subscriptionService.handleSubscriptionCreated(event);
        console.log('Subscription created', event.data.object.id);
        break;
        
      case 'customer.subscription.updated':
        // Subscription was updated
        await subscriptionService.handleSubscriptionCreated(event); // Reuse the same handler
        console.log('Subscription updated', event.data.object.id);
        break;
        
      case 'customer.subscription.deleted':
        // Subscription was canceled or has ended
        // Will handle at period end based on our requirements
        console.log('Subscription deleted', event.data.object.id);
        break;
        
      case 'invoice.payment_failed':
        // Payment failed
        await subscriptionService.handlePaymentFailed(event);
        console.log('Payment failed', event.data.object.id);
        break;
        
      case 'invoice.payment_succeeded':
        // Payment succeeded (renewal)
        await subscriptionService.handleSubscriptionRenewed(event);
        console.log('Payment succeeded', event.data.object.id);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook', error);
    res.status(500).send(`Webhook Error: ${error.message}`);
  }
}

module.exports = {
  handleWebhook,
};