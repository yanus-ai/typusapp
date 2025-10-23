const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CREDIT_MAPPING = {
  STARTER: 50,
  EXPLORER: 150,
  PRO: 1000
};

// Environment-specific Stripe price IDs for 6-month billing
const SIX_MONTHLY_STRIPE_PRICE_IDS = {
  production: {
    professional: {
      STARTER: 'price_1SLLynIx86VAQvG3Yv9vgOzr',
      EXPLORER: 'price_1SLLwNIx86VAQvG3jEk5r20F',
      PRO: 'price_1SLLzUIx86VAQvG33jmiI6UT'
    },
    educational: {
      STARTER: 'price_1SLM1kIx86VAQvG3s9M5eTJV',
      EXPLORER: 'price_1SLM2iIx86VAQvG301bb3LOo',
      PRO: 'price_1SLM3rIx86VAQvG3JZTUOVSe'
    }
  },
  development: {
    professional: {
      STARTER: 'price_1SLMWGIx86VAQvG3TCjIg2R5',
      EXPLORER: 'price_1SLMWZIx86VAQvG3ugKF55N0',
      PRO: 'price_1SLMVmIx86VAQvG3WZIFs49p'
    },
    educational: {
      STARTER: 'price_1SLMUnIx86VAQvG39zMTK7sb',
      EXPLORER: 'price_1SLMTgIx86VAQvG3cWYa6QLJ',
      PRO: 'price_1SLMTQIx86VAQvG352g7TfTh'
    }
  }
};

const SIX_MONTHLY_PLANS_DATA = {
  professional: {
    STARTER: {
      name: 'Typus - Starter Plan (6 Months)',
      description: 'Perfect for getting started with 50 credits per cycle - 6 month billing',
      amount: 3900, // €39.00 from Stripe
      currency: 'eur'
    },
    EXPLORER: {
      name: 'Typus - Explorer Plan (6 Months)',
      description: 'Ideal for regular use with 150 credits per cycle - 6 month billing',
      amount: 9900, // €99.00 from Stripe
      currency: 'eur'
    },
    PRO: {
      name: 'Typus - Pro Plan (6 Months)',
      description: 'Professional tier with 1000 credits per cycle - 6 month billing',
      amount: 19900, // €199.00 from Stripe
      currency: 'eur'
    }
  },
  educational: {
    STARTER: {
      name: 'Educational Typus - Starter Plan (6 Months)',
      description: 'Student plan with 50 credits per cycle - 6 month billing',
      amount: 1200, // €12.00 from Stripe
      currency: 'eur'
    },
    EXPLORER: {
      name: 'Educational Typus - Explorer Plan (6 Months)',
      description: 'Student plan with 150 credits per cycle - 6 month billing',
      amount: 2400, // €24.00 from Stripe
      currency: 'eur'
    },
    PRO: {
      name: 'Educational Typus - Pro Plan (6 Months)',
      description: 'Student plan with 1000 credits per cycle - 6 month billing',
      amount: 3600, // €36.00 from Stripe
      currency: 'eur'
    }
  }
};

// Validate environment and Stripe price ID configuration
function validateEnvironmentConfig() {
  const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

  console.log(`🔍 Validating ${environment} environment configuration for 6-month plans...`);

  if (!SIX_MONTHLY_STRIPE_PRICE_IDS[environment]) {
    throw new Error(`No 6-month Stripe price IDs configured for environment: ${environment}`);
  }

  // Check that all required price IDs exist
  const requiredPlans = ['STARTER', 'EXPLORER', 'PRO'];
  const requiredTypes = ['professional', 'educational'];

  const missingPriceIds = [];

  for (const type of requiredTypes) {
    for (const plan of requiredPlans) {
      const priceId = SIX_MONTHLY_STRIPE_PRICE_IDS[environment][type]?.[plan];
      if (!priceId) {
        missingPriceIds.push(`${environment}.${type}.${plan}`);
      }
    }
  }

  if (missingPriceIds.length > 0) {
    throw new Error(`Missing 6-month Stripe price IDs for: ${missingPriceIds.join(', ')}`);
  }

  console.log(`✅ All required 6-month Stripe price IDs found for ${environment}`);
  return environment;
}

async function seedSixMonthlyPlans() {
  console.log('🌱 Seeding 6-month plans...');

  // Validate environment configuration and get environment
  const environment = validateEnvironmentConfig();

  try {
    // Clear existing 6-month plan prices
    await prisma.planPrice.deleteMany({
      where: {
        billingCycle: 'SIX_MONTHLY'
      }
    });

    // Create professional 6-month plans
    for (const [planKey, planData] of Object.entries(SIX_MONTHLY_PLANS_DATA.professional)) {
      console.log(`🔧 Creating 6-month professional plan: ${planData.name}`);

      // Find existing plan or create new one
      let plan = await prisma.plan.findFirst({
        where: {
          planType: planKey,
          isEducational: false
        }
      });

      if (!plan) {
        plan = await prisma.plan.create({
          data: {
            planType: planKey,
            name: planData.name,
            description: planData.description,
            credits: CREDIT_MAPPING[planKey],
            isEducational: false,
          },
        });
      }

      // Create 6-month price for this plan
      const stripePriceId = SIX_MONTHLY_STRIPE_PRICE_IDS[environment].professional[planKey];

      if (!stripePriceId) {
        throw new Error(`Missing 6-month Stripe price ID for ${environment}.professional.${planKey}`);
      }

      await prisma.planPrice.create({
        data: {
          planId: plan.id,
          billingCycle: 'SIX_MONTHLY',
          amount: planData.amount,
          currency: planData.currency,
          stripePriceId: stripePriceId,
        },
      });

      console.log(`   💳 SIX_MONTHLY: ${stripePriceId} (€${planData.amount / 100})`);
    }

    // Create educational 6-month plans
    for (const [planKey, planData] of Object.entries(SIX_MONTHLY_PLANS_DATA.educational)) {
      console.log(`🎓 Creating 6-month educational plan: ${planData.name}`);

      // Find existing plan or create new one
      let plan = await prisma.plan.findFirst({
        where: {
          planType: planKey,
          isEducational: true
        }
      });

      if (!plan) {
        plan = await prisma.plan.create({
          data: {
            planType: planKey,
            name: planData.name,
            description: planData.description,
            credits: CREDIT_MAPPING[planKey],
            isEducational: true,
          },
        });
      }

      // Create 6-month price for this educational plan
      const stripePriceId = SIX_MONTHLY_STRIPE_PRICE_IDS[environment].educational[planKey];

      if (!stripePriceId) {
        throw new Error(`Missing 6-month Stripe price ID for ${environment}.educational.${planKey}`);
      }

      await prisma.planPrice.create({
        data: {
          planId: plan.id,
          billingCycle: 'SIX_MONTHLY',
          amount: planData.amount,
          currency: planData.currency,
          stripePriceId: stripePriceId,
        },
      });

      console.log(`   💳 SIX_MONTHLY: ${stripePriceId} (€${planData.amount / 100})`);
    }

    console.log(`✅ 6-month plans seeded successfully for ${environment} environment!`);
    console.log(`📊 Summary:`);
    console.log(`   - Professional plans: 3 plans with 6-month billing`);
    console.log(`   - Educational plans: 3 plans with 6-month billing`);
    console.log(`   - Total: 6 new 6-month pricing options`);
  } catch (error) {
    console.error('❌ Error seeding 6-month plans:', error);
    throw error;
  }
}

module.exports = { seedSixMonthlyPlans };
