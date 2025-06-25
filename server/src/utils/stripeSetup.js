const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = {
  BASIC: {
    name: 'Basic Plan',
    description: 'Basic subscription with 1,000 credits per cycle',
    prices: {
      MONTHLY: {
        amount: 1000, // $10.00
        interval: 'month',
        currency: 'usd',
      },
      YEARLY: {
        amount: 9600, // $96.00 ($8/month)
        interval: 'year',
        currency: 'usd',
      },
    },
  },
  PRO: {
    name: 'Pro Plan',
    description: 'Professional subscription with 10,000 credits per cycle',
    prices: {
      MONTHLY: {
        amount: 3500, // $35.00
        interval: 'month',
        currency: 'usd',
      },
      YEARLY: {
        amount: 33600, // $336.00 ($28/month)
        interval: 'year',
        currency: 'usd',
      },
    },
  },
  ENTERPRISE: {
    name: 'Enterprise Plan',
    description: 'Enterprise subscription with 100,000 credits per cycle',
    prices: {
      MONTHLY: {
        amount: 6000, // $60.00
        interval: 'month',
        currency: 'usd',
      },
      YEARLY: {
        amount: 57600, // $576.00 ($48/month)
        interval: 'year',
        currency: 'usd',
      },
    },
  },
};

/**
 * Create all products and prices in Stripe
 */
async function setupStripeProducts() {
  console.log('Setting up Stripe products and prices...');
  
  const productMap = {};
  
  for (const [planKey, productData] of Object.entries(PRODUCTS)) {
    // Create or update product
    console.log(`Creating/updating product: ${productData.name}`);
    const product = await stripe.products.create({
      name: productData.name,
      description: productData.description,
      metadata: {
        planType: planKey,
      },
    });
    
    productMap[planKey] = {
      productId: product.id,
      prices: {},
    };
    
    // Create prices for each billing interval
    for (const [intervalKey, priceData] of Object.entries(productData.prices)) {
      console.log(`Creating price for ${planKey} - ${intervalKey}`);
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceData.amount,
        currency: priceData.currency,
        recurring: {
          interval: priceData.interval,
        },
        metadata: {
          planType: planKey,
          billingCycle: intervalKey,
        },
      });
      
      productMap[planKey].prices[intervalKey] = price.id;
    }
  }
  
  console.log('Stripe setup complete!');
  console.log('Product/Price mapping:', JSON.stringify(productMap, null, 2));
  return productMap;
}

/**
 * Retrieve all products and prices from Stripe
 */
async function getStripeProductsAndPrices() {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const prices = await stripe.prices.list({ active: true, limit: 100 });
  
  const productMap = {};
  
  products.data.forEach(product => {
    if (product.metadata.planType) {
      productMap[product.metadata.planType] = {
        productId: product.id,
        name: product.name,
        prices: {},
      };
    }
  });
  
  prices.data.forEach(price => {
    if (price.metadata.planType && price.metadata.billingCycle) {
      if (productMap[price.metadata.planType]) {
        productMap[price.metadata.planType].prices[price.metadata.billingCycle] = price.id;
      }
    }
  });
  
  return productMap;
}

module.exports = {
  setupStripeProducts,
  getStripeProductsAndPrices,
  PRODUCTS,
};