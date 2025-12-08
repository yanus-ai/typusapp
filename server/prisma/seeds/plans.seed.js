const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CREDIT_MAPPING = {
  STARTER: 50,
  EXPLORER: 150,
  PRO: 1000
};

// Environment-specific Stripe price IDs
// NOTE: Standard plans use THREE_MONTHLY only, Educational plans keep MONTHLY and YEARLY
const STRIPE_PRICE_IDS = {
  production: {
    professional: {
      STARTER: {
        THREE_MONTHLY: {
          eur: 'price_1SWgPBIx86VAQvG3m3iKikDD', // €297 per 3 months
          usd: 'price_1SbSAQIx86VAQvG3VBirwi27' // $345 per 3 months
        }
      },
      EXPLORER: {
        THREE_MONTHLY: {
          eur: 'price_1SWgP7Ix86VAQvG3pUrjO4HD', // €495 per 3 months
          usd: 'price_1SbSBIIx86VAQvG3B0XW7fNA' // $575 per 3 months
        }
      },
      PRO: {
        THREE_MONTHLY: {
          eur: 'price_1SWgOzIx86VAQvG3MMXVMOY8', // €990 per 3 months
          usd: 'price_1SbSBoIx86VAQvG3Sx6nzaHj' // $1150 per 3 months
        }
      }
    },
    educational: {
      STARTER: {
        MONTHLY: {
          eur: 'price_1S53KbIx86VAQvG3c19VYZTR', // €6/month
          usd: 'price_1Sc9d3Ix86VAQvG3Lwd9tHHV' // $7/month
        },
        YEARLY: {
          eur: 'price_1S53LFIx86VAQvG30gkq8s2k', // €18/year
          usd: 'price_1Sc9doIx86VAQvG3J7GIpZSA' // $21/year
        }
      },
      EXPLORER: {
        MONTHLY: {
          eur: 'price_1Rf0r1Ix86VAQvG3WOMdTHhg', // €12/month
          usd: 'price_1Sc9fTIx86VAQvG3aUr7nYzK' // $14/month
        },
        YEARLY: {
          eur: 'price_1S53MiIx86VAQvG34mo1PXVs', // €36/year
          usd: 'price_1Sc9ehIx86VAQvG3x2EaUfM3' // $42/year
        }
      },
      PRO: {
        MONTHLY: {
          eur: 'price_1S53N6Ix86VAQvG39yK92En9', // €18/month
          usd: 'price_1Sc9fAIx86VAQvG3kiXtOpkp' // $21/month
        },
        YEARLY: {
          eur: 'price_1S53NiIx86VAQvG3e8z3C0Jj', // €54/year
          usd: 'price_1Sc9eJIx86VAQvG3GVA781tf' // $63/year
        }
      }
    }
  },
  development: {
    professional: {
      STARTER: {
        THREE_MONTHLY: {
          eur: 'price_1SWgKXIx86VAQvG3hYpV9IwZ', // €297 per 3 months
          usd: 'price_1Sc8VvIx86VAQvG3Xus7ITnm' // $345 per 3 months
        }
      },
      EXPLORER: {
        THREE_MONTHLY: {
          eur: 'price_1SWgM2Ix86VAQvG3ncMdKY6B', // €495 per 3 months
          usd: 'price_1Sc8VOIx86VAQvG3KPdxICti' // $575 per 3 months
        }
      },
      PRO: {
        THREE_MONTHLY: {
          eur: 'price_1SWgN1Ix86VAQvG3imNS0d5U', // €990 per 3 months
          usd: 'price_1Sc8UrIx86VAQvG3yblcNxQA' // $1150 per 3 months
        }
      }
    },
    educational: {
      STARTER: {
        MONTHLY: {
          eur: 'price_1S58JaIx86VAQvG359EaOZxy', // €6/month
          usd: 'price_1Sc9sBIx86VAQvG3jULe9Zzg' // $7/month
        },
        YEARLY: {
          eur: 'price_1S1U4DIx86VAQvG3eP62J9Dm', // €18/year
          usd: 'price_1Sc9sfIx86VAQvG3g9ZAcJs2' // $21/year
        }
      },
      EXPLORER: {
        MONTHLY: {
          eur: 'price_1S1U4EIx86VAQvG3T9Kavsms', // €12/month
          usd: 'price_1Sc9uPIx86VAQvG3Piw35w2Z' // $14/month
        },
        YEARLY: {
          eur: 'price_1S1U4EIx86VAQvG3tMxKCBJA', // €36/year
          usd: 'price_1Sc9tkIx86VAQvG3pzpyAr5H' // $42/year
        }
      },
      PRO: {
        MONTHLY: {
          eur: 'price_1S1U4FIx86VAQvG3JbozcHYo', // €18/month
          usd: 'price_1Sc9vZIx86VAQvG3tQEj3rsr' // $21/month
        },
        YEARLY: {
          eur: 'price_1Sc9x6Ix86VAQvG3Wa02IQ9I', // €54/year
          usd: 'price_1Sc9wXIx86VAQvG3Qf9nJpzO' // $63/year
        }
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
        THREE_MONTHLY: {
          eur: { amount: 29700 }, // €297 per 3 months (€99/month)
          usd: { amount: 34500 }, // $345 per 3 months ($115/month)
        },
      },
    },
    EXPLORER: {
      name: 'Typus - Explorer Plan',
      description: 'Ideal for regular use with 150 credits per cycle',
      prices: {
        THREE_MONTHLY: {
          eur: { amount: 49500 }, // €495 per 3 months (€165/month)
          usd: { amount: 57500 }, // $575 per 3 months ($192/month)
        },
      },
    },
    PRO: {
      name: 'Typus - Pro Plan',
      description: 'Professional tier with 1000 credits per cycle',
      prices: {
        THREE_MONTHLY: {
          eur: { amount: 99000 }, // €990 per 3 months (€330/month)
          usd: { amount: 115000 }, // $1150 per 3 months ($383/month)
        },
      },
    },
  },
  educational: {
    STARTER: {
      name: 'Educational Typus - Starter Plan',
      description: 'Student plan with 50 credits per cycle',
      prices: {
        MONTHLY: {
          eur: { amount: 600 }, // €6/month
          usd: { amount: 700 }, // $7/month
        },
        YEARLY: {
          eur: { amount: 1800 }, // €18/year
          usd: { amount: 2100 }, // $21/year
        },
      },
    },
    EXPLORER: {
      name: 'Educational Typus - Explorer Plan',
      description: 'Student plan with 150 credits per cycle',
      prices: {
        MONTHLY: {
          eur: { amount: 1200 }, // €12/month
          usd: { amount: 1400 }, // $14/month
        },
        YEARLY: {
          eur: { amount: 3600 }, // €36/year
          usd: { amount: 4200 }, // $42/year
        },
      },
    },
    PRO: {
      name: 'Educational Typus - Pro Plan',
      description: 'Student plan with 1000 credits per cycle',
      prices: {
        MONTHLY: {
          eur: { amount: 1800 }, // €18/month
          usd: { amount: 2100 }, // $21/month
        },
        YEARLY: {
          eur: { amount: 5400 }, // €54/year
          usd: { amount: 6300 }, // $63/year
        },
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
  const requiredTypes = ['professional', 'educational'];
  const requiredCurrencies = ['eur', 'usd'];

  const missingPriceIds = [];

  for (const type of requiredTypes) {
    for (const plan of requiredPlans) {
      if (type === 'professional') {
        // Standard plans only have THREE_MONTHLY
        for (const currency of requiredCurrencies) {
          const priceId = STRIPE_PRICE_IDS[environment][type]?.[plan]?.['THREE_MONTHLY']?.[currency];
          if (!priceId) {
            missingPriceIds.push(`${environment}.${type}.${plan}.THREE_MONTHLY.${currency}`);
          }
        }
      } else {
        // Educational plans have MONTHLY and YEARLY
        for (const cycle of ['MONTHLY', 'YEARLY']) {
          for (const currency of requiredCurrencies) {
            const priceId = STRIPE_PRICE_IDS[environment][type]?.[plan]?.[cycle]?.[currency];
            if (!priceId) {
              missingPriceIds.push(`${environment}.${type}.${plan}.${cycle}.${currency}`);
            }
          }
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
      // Standard plans only have THREE_MONTHLY
      for (const [intervalKey, currenciesData] of Object.entries(productData.prices)) {
        for (const [currency, priceData] of Object.entries(currenciesData)) {
          const stripePriceId = STRIPE_PRICE_IDS[environment].professional[planKey][intervalKey]?.[currency];

          if (!stripePriceId) {
            throw new Error(`Missing Stripe price ID for ${environment}.professional.${planKey}.${intervalKey}.${currency}`);
          }

          await prisma.planPrice.create({
            data: {
              planId: plan.id,
              billingCycle: intervalKey,
              amount: priceData.amount,
              currency: currency,
              stripePriceId: stripePriceId,
            },
          });

          const currencySymbol = currency === 'usd' ? '$' : '€';
          console.log(`   💳 ${intervalKey} (${currency.toUpperCase()}): ${stripePriceId} (${currencySymbol}${priceData.amount / 100})`);
        }
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
      for (const [intervalKey, currenciesData] of Object.entries(productData.prices)) {
        for (const [currency, priceData] of Object.entries(currenciesData)) {
          const stripePriceId = STRIPE_PRICE_IDS[environment].educational[planKey][intervalKey]?.[currency];

          if (!stripePriceId) {
            throw new Error(`Missing Stripe price ID for ${environment}.educational.${planKey}.${intervalKey}.${currency}`);
          }

          await prisma.planPrice.create({
            data: {
              planId: plan.id,
              billingCycle: intervalKey,
              amount: priceData.amount,
              currency: currency,
              stripePriceId: stripePriceId,
            },
          });

          const currencySymbol = currency === 'usd' ? '$' : '€';
          console.log(`   💳 ${intervalKey} (${currency.toUpperCase()}): ${stripePriceId} (${currencySymbol}${priceData.amount / 100})`);
        }
      }
    }

    console.log(`✅ Plans seeded successfully for ${environment} environment!`);
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    throw error;
  }
}

module.exports = { seedPlans };
