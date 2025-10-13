const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const subscriptionService = require('../services/subscriptions.service');
const { prisma } = require('../services/prisma.service');
const gtmTrackingService = new (require('../services/gtmTracking.service'))(prisma);

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

      try {
        // Check if this event was already processed
        const existingEvent = await prisma.webhookEvent.findUnique({
          where: { stripeEventId: event.id },
          select: { id: true, createdAt: true }
        });

        if (existingEvent) {
          console.log(`⚠️ Webhook ${event.type} (${event.id}) already processed at ${existingEvent.createdAt}, skipping duplicate`);
          await prisma.$disconnect();
          return;
        }

        // Record that we're processing this event (prevents race conditions)
        await prisma.webhookEvent.create({
          data: {
            stripeEventId: event.id,
            eventType: event.type,
            processed: true
          }
        });

        console.log(`✅ Webhook ${event.type} (${event.id}) recorded as processed`);

      } catch (webhookError) {
        console.error(`❌ Error in webhook idempotency check:`, webhookError);
        // Continue processing even if webhook tracking fails (better to process than miss)
      }
      
      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          // Payment was successful, subscription started
          console.log('✅ Checkout session completed', event.data.object.id);
          break;
          
        case 'customer.subscription.created':
          // New subscription created
          console.log('🆕 Processing new subscription created');

          // FIRST: Create the new subscription in our database
          await subscriptionService.handleSubscriptionCreated(event);
          console.log('✅ New subscription created in database', event.data.object.id);

          // SMALL DELAY: Give the database transaction time to fully commit
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('⏱️ Waited 1 second for database commit');

          // THEN: Cancel any existing active subscriptions for this customer
          // This prevents race conditions where cancellation happens before creation
          await subscriptionService.cancelOtherActiveSubscriptions(event);
          console.log('✅ Cancelled other subscriptions after creating new one');


          try {
            const subscription = event.data.object;
            let { userId, planType, billingCycle, isEducational } = subscription.metadata;
            let planName = [planType, billingCycle, isEducational ? "EDU" : "NOEDU"].join('-');
            let conversionValue = subscription.items.data[0].plan.amount / 100;
            let orderId = subscription.id;
            let currency = subscription.currency;
            await gtmTrackingService.trackEvents(userId, [{
              name: "purchase",
              params: {
                value: conversionValue,
                transaction_id: orderId,
                currency,
                coupon: subscription.discount?.coupon?.name,
                items: [{
                  item_id: planName,
                  item_name: planName,
                  quantity: 1,
                  price: conversionValue
                }]
              }
            }]);
          } catch (gtmTrackingError) {
            console.error('Failed to track GTM event:', gtmTrackingError);
          }
          break;
          
        case 'customer.subscription.updated':
          // Subscription was updated
          console.log('🔄 Processing subscription updated');

          const updatedSubscription = event.data.object;

          // Check if this is a cancellation scheduling (cancel_at_period_end = true)
          if (updatedSubscription.cancel_at_period_end && updatedSubscription.status === 'active') {
            console.log('📅 Subscription scheduled for cancellation at period end');

            // Update our database to reflect the scheduled cancellation but keep it usable
            if (updatedSubscription.metadata?.userId) {
              const userId = parseInt(updatedSubscription.metadata.userId);
              const { PrismaClient } = require('@prisma/client');
              const prisma = new PrismaClient();

              await prisma.subscription.updateMany({
                where: {
                  userId: userId,
                  stripeSubscriptionId: updatedSubscription.id
                },
                data: {
                  status: 'CANCELLED_AT_PERIOD_END', // New status to indicate scheduled cancellation
                  currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000)
                }
              });

              console.log(`✅ Marked subscription as cancelled at period end for user ${userId}, ends at ${new Date(updatedSubscription.current_period_end * 1000)}`);
            }
          } else {
            // Regular subscription update - handle credit allocation
            if (updatedSubscription.metadata?.updated_via === 'direct_update') {
              console.log('💳 Processing direct subscription update for credit allocation');
            } else {
              console.log('🔄 Processing external subscription update');
            }

            // Handle subscription update and credit allocation
            await subscriptionService.handleSubscriptionCreated(event);
          }

          console.log('✅ Subscription updated', event.data.object.id);
          break;
          
        case 'customer.subscription.deleted':
          // Subscription was canceled or has ended
          console.log('🗑️ Processing subscription cancelled');
          const cancelledSubscription = event.data.object;
          const deletedSubscriptionId = cancelledSubscription.id;

          if (cancelledSubscription.metadata?.userId) {
            const userId = parseInt(cancelledSubscription.metadata.userId);
            console.log(`🔍 Checking if deleted subscription ${deletedSubscriptionId} is user's current active subscription`);

            // Check if this deleted subscription is the user's current active subscription
            const currentSubscription = await subscriptionService.getUserSubscription(userId);

            if (currentSubscription && currentSubscription.stripeSubscriptionId === deletedSubscriptionId) {
              console.log(`❌ Deleted subscription ${deletedSubscriptionId} was user's current subscription - finalizing cancellation`);
              // This is the actual end of the subscription period - reset credits now
              await subscriptionService.cancelSubscription(userId, true); // immediate = true
            } else {
              console.log(`✅ Deleted subscription ${deletedSubscriptionId} was NOT user's current subscription - ignoring (likely old subscription cleanup)`);

              // Just update the specific subscription record if it exists, don't affect user's current subscription
              // Note: We don't reset credits here since this is NOT the user's current active subscription
              const { PrismaClient } = require('@prisma/client');
              const prisma = new PrismaClient();

              await prisma.subscription.updateMany({
                where: {
                  userId: userId,
                  stripeSubscriptionId: deletedSubscriptionId
                },
                data: {
                  status: 'CANCELLED'
                }
              });

              console.log(`📝 Marked specific subscription record as cancelled for ${deletedSubscriptionId} (no credit reset as this is not user's active subscription)`);
            }
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