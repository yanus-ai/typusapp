const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CREDIT_MAPPING = {
  STARTER: 50,
  EXPLORER: 150,
  PRO: 1000
};

const PLANS_DATA = {
  regular: {
    STARTER: {
      name: 'Typus - Starter Plan',
      description: 'Perfect for getting started with 50 credits per cycle',
      prices: {
        MONTHLY: { amount: 1900, currency: 'eur' },
        YEARLY: { amount: 5900, currency: 'eur' },
      },
    },
    EXPLORER: {
      name: 'Typus - Explorer Plan',
      description: 'Ideal for regular use with 150 credits per cycle',
      prices: {
        MONTHLY: { amount: 4900, currency: 'eur' },
        YEARLY: { amount: 14900, currency: 'eur' },
      },
    },
    PRO: {
      name: 'Typus - Pro Plan',
      description: 'Professional tier with 1000 credits per cycle',
      prices: {
        MONTHLY: { amount: 9900, currency: 'eur' },
        YEARLY: { amount: 29900, currency: 'eur' },
      },
    },
  },
  educational: {
    STARTER: {
      name: 'Educational Typus - Starter Plan',
      description: 'Student plan with 50 credits per cycle',
      prices: {
        MONTHLY: { amount: 900, currency: 'eur' },
        YEARLY: { amount: 2000, currency: 'eur' },
      },
    },
    EXPLORER: {
      name: 'Educational Typus - Explorer Plan',
      description: 'Student plan with 150 credits per cycle',
      prices: {
        MONTHLY: { amount: 1200, currency: 'eur' },
        YEARLY: { amount: 3900, currency: 'eur' },
      },
    },
    PRO: {
      name: 'Educational Typus - Pro Plan',
      description: 'Student plan with 1000 credits per cycle',
      prices: {
        MONTHLY: { amount: 2900, currency: 'eur' },
        YEARLY: { amount: 6900, currency: 'eur' },
      },
    },
  },
};

async function seedPlans() {
  console.log('🌱 Seeding plans...');
  
  try {
    // Note: Stripe price IDs will be null during seeding
    // They should be populated separately if needed for actual Stripe integration
    
    // Clear existing plans
    await prisma.planPrice.deleteMany();
    await prisma.plan.deleteMany();
    
    // Create regular plans
    for (const [planKey, productData] of Object.entries(PLANS_DATA.regular)) {
      console.log(`🔧 Creating plan: ${productData.name}`);
      
      const plan = await prisma.plan.create({
        data: {
          planType: planKey,
          name: productData.name,
          description: productData.description,
          credits: CREDIT_MAPPING[planKey],
          isEducational: false,
        },
      });
      
      // Create prices for this plan
      for (const [intervalKey, priceData] of Object.entries(productData.prices)) {
        await prisma.planPrice.create({
          data: {
            planId: plan.id,
            billingCycle: intervalKey,
            amount: priceData.amount,
            currency: priceData.currency,
            stripePriceId: null, // Will be populated separately when needed
          },
        });
      }
    }
    
    // Create educational plans
    for (const [planKey, productData] of Object.entries(PLANS_DATA.educational)) {
      console.log(`🎓 Creating educational plan: ${productData.name}`);
      
      const plan = await prisma.plan.create({
        data: {
          planType: planKey,
          name: productData.name,
          description: productData.description,
          credits: CREDIT_MAPPING[planKey],
          isEducational: true,
        },
      });
      
      // Create prices for this educational plan
      for (const [intervalKey, priceData] of Object.entries(productData.prices)) {
        await prisma.planPrice.create({
          data: {
            planId: plan.id,
            billingCycle: intervalKey,
            amount: priceData.amount,
            currency: priceData.currency,
            stripePriceId: null, // Will be populated separately when needed
          },
        });
      }
    }
    
    console.log('✅ Plans seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    throw error;
  }
}

module.exports = { seedPlans };