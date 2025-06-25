require('dotenv').config();
const { setupStripeProducts } = require('./stripeSetup');

async function main() {
  try {
    await setupStripeProducts();
    console.log('Stripe products and prices setup completed successfully');
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
  }
}

main();