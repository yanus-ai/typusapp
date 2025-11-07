const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CREDIT_MAPPING = {
  STARTER: 50,
  EXPLORER: 150,
  PRO: 1000
};

// Environment-specific Stripe price IDs
const STRIPE_PRICE_IDS = {
  production: {
    professional: {
      STARTER: {
        MONTHLY: 'price_1QeJB1Ix86VAQvG3mIDfTPZ2',
        YEARLY: 'price_1S170oIx86VAQvG3mP0D8lAm'
      },
      EXPLORER: {
        MONTHLY: 'price_1R14MPIx86VAQvG3bLXTE1tQ',
        YEARLY: 'price_1S1753Ix86VAQvG3Kin91ciI'
      },
      PRO: {
        MONTHLY: 'price_1RBB4sIx86VAQvG3OF6qVmpp',
        YEARLY: 'price_1S174QIx86VAQvG3M5e3bMBQ'
      }
    },
    educational: {
      STARTER: {
        MONTHLY: 'price_1S53KbIx86VAQvG3c19VYZTR',
        YEARLY: 'price_1S53LFIx86VAQvG30gkq8s2k'
      },
      EXPLORER: {
        MONTHLY: 'price_1Rf0r1Ix86VAQvG3WOMdTHhg',
        YEARLY: 'price_1S53MiIx86VAQvG34mo1PXVs'
      },
      PRO: {
        MONTHLY: 'price_1S53N6Ix86VAQvG39yK92En9',
        YEARLY: 'price_1S53NiIx86VAQvG3e8z3C0Jj'
      }
    }
  },
  development: {
    professional: {
      STARTER: {
        MONTHLY: 'price_1S1U48Ix86VAQvG3UKHJcCnN',
        YEARLY: 'price_1S1U49Ix86VAQvG3FKYVwhad'
      },
      EXPLORER: {
        MONTHLY: 'price_1S1U4AIx86VAQvG3SPBvjz7A',
        YEARLY: 'price_1S1U4AIx86VAQvG3O699hAnb'
      },
      PRO: {
        MONTHLY: 'price_1S1U4BIx86VAQvG32wy44rEx',
        YEARLY: 'price_1S1U4CIx86VAQvG3LUsFGI0R'
      }
    },
    educational: {
      STARTER: {
        MONTHLY: 'price_1S58JaIx86VAQvG359EaOZxy',
        YEARLY: 'price_1S1U4DIx86VAQvG3eP62J9Dm'
      },
      EXPLORER: {
        MONTHLY: 'price_1S1U4EIx86VAQvG3T9Kavsms',
        YEARLY: 'price_1S1U4EIx86VAQvG3tMxKCBJA'
      },
      PRO: {
        MONTHLY: 'price_1S1U4FIx86VAQvG3JbozcHYo',
        YEARLY: 'price_1S1U4GIx86VAQvG3aeM1MnLI'
      }
    }
  }
};

const PLANS_DATA = {
  professional: {
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
        MONTHLY: { amount: 600, currency: 'eur' },
        YEARLY: { amount: 1800, currency: 'eur' },
      },
    },
    EXPLORER: {
      name: 'Educational Typus - Explorer Plan',
      description: 'Student plan with 150 credits per cycle',
      prices: {
        MONTHLY: { amount: 1200, currency: 'eur' },
        YEARLY: { amount: 3600, currency: 'eur' },
      },
    },
    PRO: {
      name: 'Educational Typus - Pro Plan',
      description: 'Student plan with 1000 credits per cycle',
      prices: {
        MONTHLY: { amount: 1800, currency: 'eur' },
        YEARLY: { amount: 5400, currency: 'eur' },
      },
    },
  },
};

// Validate environment and Stripe price ID configuration
function validateEnvironmentConfig() {
  const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

  console.log(`🔍 Validating ${environment} environment configuration...`);

  if (!STRIPE_PRICE_IDS[environment]) {
    throw new Error(`No Stripe price IDs configured for environment: ${environment}`);
  }

  // Check that all required price IDs exist
  const requiredPlans = ['STARTER', 'EXPLORER', 'PRO'];
  const requiredCycles = ['MONTHLY', 'YEARLY'];
  const requiredTypes = ['professional', 'educational'];

  const missingPriceIds = [];

  for (const type of requiredTypes) {
    for (const plan of requiredPlans) {
      for (const cycle of requiredCycles) {
        const priceId = STRIPE_PRICE_IDS[environment][type]?.[plan]?.[cycle];
        if (!priceId) {
          missingPriceIds.push(`${environment}.${type}.${plan}.${cycle}`);
        }
      }
    }
  }

  if (missingPriceIds.length > 0) {
    throw new Error(`Missing Stripe price IDs for: ${missingPriceIds.join(', ')}`);
  }

  console.log(`✅ All required Stripe price IDs found for ${environment}`);
  return environment;
}

async function seedPlans() {
  console.log('🌱 Seeding plans...');

  // Validate environment configuration and get environment
  const environment = validateEnvironmentConfig();

  try {
    // Clear existing plans
    await prisma.planPrice.deleteMany();
    await prisma.plan.deleteMany();

    // Create professional plans
    for (const [planKey, productData] of Object.entries(PLANS_DATA.professional)) {
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

      // Create prices for this plan with environment-specific Stripe price IDs
      for (const [intervalKey, priceData] of Object.entries(productData.prices)) {
        const stripePriceId = STRIPE_PRICE_IDS[environment].professional[planKey][intervalKey];

        if (!stripePriceId) {
          throw new Error(`Missing Stripe price ID for ${environment}.professional.${planKey}.${intervalKey}`);
        }

        await prisma.planPrice.create({
          data: {
            planId: plan.id,
            billingCycle: intervalKey,
            amount: priceData.amount,
            currency: priceData.currency,
            stripePriceId: stripePriceId,
          },
        });

        console.log(`   💳 ${intervalKey}: ${stripePriceId}`);
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

      // Create prices for this educational plan with environment-specific Stripe price IDs
      for (const [intervalKey, priceData] of Object.entries(productData.prices)) {
        const stripePriceId = STRIPE_PRICE_IDS[environment].educational[planKey][intervalKey];

        if (!stripePriceId) {
          throw new Error(`Missing Stripe price ID for ${environment}.educational.${planKey}.${intervalKey}`);
        }

        await prisma.planPrice.create({
          data: {
            planId: plan.id,
            billingCycle: intervalKey,
            amount: priceData.amount,
            currency: priceData.currency,
            stripePriceId: stripePriceId,
          },
        });

        console.log(`   💳 ${intervalKey}: ${stripePriceId}`);
      }
    }

    console.log(`✅ Plans seeded successfully for ${environment} environment!`);
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    throw error;
  }
}

module.exports = { seedPlans };