const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const subscriptionService = require('../services/subscriptions.service');

/**
 * Handle Stripe webhook events
 */
async function handleWebhook(req, res) {
  console.log('🔄 Stripe webhook received:', req.method, req.url);
  console.log('🔄 Headers:', req.headers);
  console.log('🔄 Body type:', typeof req.body, 'Length:', req.body?.length);
  
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    if (!sig) {
      console.error('❌ Missing stripe-signature header');
      return res.status(400).send('Missing stripe-signature header');
    }
    
    if (!req.body && !req.rawBody) {
      console.error('❌ Missing request body');
      return res.status(400).send('Missing request body');
    }
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ Missing STRIPE_WEBHOOK_SECRET environment variable');
      return res.status(500).send('Server configuration error');
    }
    
    event = stripe.webhooks.constructEvent(
      req.rawBody || req.body, // Try rawBody first, fallback to body
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log(`✅ Webhook signature verified: ${event.type}`);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Respond immediately to prevent timeouts
  console.log('✅ Responding immediately to Stripe');
  res.status(200).json({ received: true });
  
  // Process webhook asynchronously to prevent timeouts
  setImmediate(async () => {
    try {
      console.log(`🔄 Processing webhook ${event.type} asynchronously`);
      
      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          // Payment was successful, subscription started
          console.log('✅ Checkout session completed', event.data.object.id);
          break;
          
        case 'customer.subscription.created':
          // New subscription created
          console.log('🆕 Processing new subscription created');

          // Cancel any existing active subscriptions for this customer before processing new one
          // This handles cases where checkout is used instead of update (e.g., new customers)
          await subscriptionService.cancelOtherActiveSubscriptions(event);

          await subscriptionService.handleSubscriptionCreated(event);
          console.log('✅ Subscription created', event.data.object.id);
          break;
          
        case 'customer.subscription.updated':
          // Subscription was updated
          console.log('🔄 Processing subscription updated');
          
          // Always handle subscription updates to ensure proper credit allocation
          // This includes both direct updates from our system and external updates
          const updatedSubscription = event.data.object;
          if (updatedSubscription.metadata?.updated_via === 'direct_update') {
            console.log('💳 Processing direct subscription update for credit allocation');
          } else {
            console.log('🔄 Processing external subscription update');
          }
          
          // Handle subscription update and credit allocation
          await subscriptionService.handleSubscriptionCreated(event);
          console.log('✅ Subscription updated', event.data.object.id);
          break;
          
        case 'customer.subscription.deleted':
          // Subscription was canceled or has ended
          console.log('🗑️ Processing subscription cancelled');
          const cancelledSubscription = event.data.object;
          if (cancelledSubscription.metadata?.userId) {
            await subscriptionService.cancelSubscription(parseInt(cancelledSubscription.metadata.userId));
          }
          console.log('✅ Subscription deleted', event.data.object.id);
          break;
          
        case 'invoice.payment_failed':
          // Payment failed
          console.log('❌ Processing payment failed');
          await subscriptionService.handlePaymentFailed(event);
          console.log('✅ Payment failed processed', event.data.object.id);
          break;
          
        case 'invoice.payment_succeeded':
          // Payment succeeded - could be initial payment or renewal
          console.log('💳 Processing payment succeeded');
          
          // Get invoice details to determine if this is first payment or renewal
          const invoice = event.data.object;
          const billingReason = invoice.billing_reason;
          
          // Get subscription to check for direct update flag
          const invoiceSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
          
          if (billingReason === 'subscription_create') {
            // This is the initial payment - subscription creation should handle credits
            console.log('💳 Initial subscription payment - skipping duplicate credit allocation');
          } else if (billingReason === 'subscription_update' && invoiceSubscription.metadata?.updated_via === 'direct_update') {
            // This is a proration invoice from our direct update - don't allocate additional credits
            console.log('💳 Proration invoice from direct update - skipping credit allocation');
          } else {
            // This is a renewal payment - handle monthly credit allocation
            await subscriptionService.handleSubscriptionRenewed(event);
          }
          
          console.log('✅ Payment succeeded processed', event.data.object.id);
          break;
          
        default:
          console.log(`🤷 Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`❌ Error processing webhook ${event.type} asynchronously:`, error);
      // You might want to add retry logic or send to a dead letter queue here
    }
  });
}

module.exports = {
  handleWebhook,
};