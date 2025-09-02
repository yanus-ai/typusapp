const stripe = require('stripe')("sk_test_51NW3E7Ix86VAQvG3v1zOShKNIHAqfgpfO0Skk0ZWhhoMtyWJjhKbM5boZNHVVGY7tnIVZsVIFOYDd4o09qSwlf4H00d5vatetc");

const PRODUCTS = {
  STARTER: {
    name: 'Typus - Starter Plan',
    description: 'Perfect for getting started with 50 credits per cycle',
    prices: {
      MONTHLY: {
        amount: 1900, // €19.00
        interval: 'month',
        currency: 'eur',
      },
      YEARLY: {
        amount: 5900, // €59.00
        interval: 'year',
        currency: 'eur',
      },
    },
  },
  EXPLORER: {
    name: 'Typus - Explorer Plan',
    description: 'Ideal for regular use with 150 credits per cycle',
    prices: {
      MONTHLY: {
        amount: 4900, // €49.00
        interval: 'month',
        currency: 'eur',
      },
      YEARLY: {
        amount: 14900, // €149.00
        interval: 'year',
        currency: 'eur',
      },
    },
  },
  PRO: {
    name: 'Typus - Pro Plan',
    description: 'Professional tier with 1000 credits per cycle',
    prices: {
      MONTHLY: {
        amount: 9900, // €99.00
        interval: 'month',
        currency: 'eur',
      },
      YEARLY: {
        amount: 29900, // €299.00
        interval: 'year',
        currency: 'eur',
      },
    },
  },
};

// Educational plans with student discounts (25% off but same credit amounts)
const EDUCATIONAL_PRODUCTS = {
  STARTER: {
    name: 'Educational Typus - Starter Plan',
    description: 'Student plan with 50 credits per cycle',
    prices: {
      MONTHLY: {
        amount: 900, // €9.00 (25% off €12.00)
        interval: 'month',
        currency: 'eur',
      },
      YEARLY: {
        amount: 2000, // €20.00 (25% off regular price)
        interval: 'year',
        currency: 'eur',
      },
    },
  },
  EXPLORER: {
    name: 'Educational Typus - Explorer Plan',
    description: 'Student plan with 150 credits per cycle',
    prices: {
      MONTHLY: {
        amount: 1200, // €12.00 (25% off regular price)
        interval: 'month',
        currency: 'eur',
      },
      YEARLY: {
        amount: 3900, // €39.00 (25% off regular price)
        interval: 'year',
        currency: 'eur',
      },
    },
  },
  PRO: {
    name: 'Educational Typus - Pro Plan',
    description: 'Student plan with 1000 credits per cycle',
    prices: {
      MONTHLY: {
        amount: 2900, // €29.00 (25% off regular price)
        interval: 'month',
        currency: 'eur',
      },
      YEARLY: {
        amount: 6900, // €69.00 (25% off regular price)
        interval: 'year',
        currency: 'eur',
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
  
  // Setup regular products
  for (const [planKey, productData] of Object.entries(PRODUCTS)) {
    // Create or update product
    console.log(`Creating/updating product: ${productData.name}`);
    const product = await stripe.products.create({
      name: productData.name,
      description: productData.description,
      metadata: {
        planType: planKey,
        isEducational: 'false',
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
          isEducational: 'false',
        },
      });
      
      productMap[planKey].prices[intervalKey] = price.id;
    }
  }
  
  // Setup educational products
  for (const [planKey, productData] of Object.entries(EDUCATIONAL_PRODUCTS)) {
    const educationalPlanKey = `EDUCATIONAL_${planKey}`;
    
    // Create or update educational product
    console.log(`Creating/updating educational product: ${productData.name}`);
    const product = await stripe.products.create({
      name: productData.name,
      description: productData.description,
      metadata: {
        planType: planKey,
        isEducational: 'true',
      },
    });
    
    productMap[educationalPlanKey] = {
      productId: product.id,
      prices: {},
    };
    
    // Create prices for each billing interval
    for (const [intervalKey, priceData] of Object.entries(productData.prices)) {
      console.log(`Creating educational price for ${planKey} - ${intervalKey}`);
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
          isEducational: 'true',
        },
      });
      
      productMap[educationalPlanKey].prices[intervalKey] = price.id;
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
    if (product.metadata.planType && product.active) {
      const isEducational = product.metadata.isEducational === 'true';
      const planKey = isEducational ? `EDUCATIONAL_${product.metadata.planType}` : product.metadata.planType;
      
      // Only use products with proper educational metadata (not undefined)
      if (product.metadata.isEducational !== undefined) {
        productMap[planKey] = {
          productId: product.id,
          name: product.name,
          prices: {},
          isEducational: isEducational,
        };
      }
    }
  });
  
  prices.data.forEach(price => {
    if (price.metadata.planType && price.metadata.billingCycle && price.metadata.isEducational !== undefined) {
      const isEducational = price.metadata.isEducational === 'true';
      const planKey = isEducational ? `EDUCATIONAL_${price.metadata.planType}` : price.metadata.planType;
      
      // Only map prices for products that exist in our productMap (which are already filtered for active products)
      if (productMap[planKey]) {
        productMap[planKey].prices[price.metadata.billingCycle] = price.id;
      }
    }
  });
  
  return productMap;
}

module.exports = {
  setupStripeProducts,
  getStripeProductsAndPrices,
  PRODUCTS,
  EDUCATIONAL_PRODUCTS,
};