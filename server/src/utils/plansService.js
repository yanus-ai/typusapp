const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// EU country codes
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

/**
 * Determine user currency based on country_code or continent
 * EU users get EUR, others get USD
 * @param {string} countryCode - ISO country code (e.g., 'US', 'DE')
 * @param {string} continent - Continent code (e.g., 'EU', 'NA')
 * @returns {string} Currency code ('eur' or 'usd')
 */
function getUserCurrency(countryCode, continent) {
  // Check if country is in EU
  if (countryCode && EU_COUNTRIES.includes(countryCode.toUpperCase())) {
    return 'eur';
  }
  
  // Check if continent is EU
  if (continent && continent.toUpperCase() === 'EU') {
    return 'eur';
  }
  
  // Default to USD for non-EU users
  return 'usd';
}

async function getAllPlans() {
  return await prisma.plan.findMany({
    where: { isActive: true },
    include: {
      prices: {
        where: { isActive: true },
        orderBy: { billingCycle: 'asc' }
      }
    },
    orderBy: [
      { isEducational: 'asc' },
      { planType: 'asc' }
    ]
  });
}

async function getPlansByType(planType, isEducational = false, currency = null) {
  const plan = await prisma.plan.findUnique({
    where: {
      planType_isEducational: {
        planType,
        isEducational
      }
    },
    include: {
      prices: {
        where: { 
          isActive: true,
          ...(currency ? { currency } : {})
        },
        orderBy: { billingCycle: 'asc' }
      }
    }
  });
  
  return plan;
}

async function getPlanPrice(planType, billingCycle, isEducational = false, currency = null) {
  const plan = await getPlansByType(planType, isEducational, currency);
  if (!plan) return null;
  
  return plan.prices.find(price => price.billingCycle === billingCycle);
}

async function getRegularPlans(currency = null) {
  return await prisma.plan.findMany({
    where: { 
      isActive: true,
      isEducational: false 
    },
    include: {
      prices: {
        where: { 
          isActive: true,
          ...(currency ? { currency } : {})
        },
        orderBy: { billingCycle: 'asc' }
      }
    },
    orderBy: { planType: 'asc' }
  });
}

async function getEducationalPlans(currency = null) {
  return await prisma.plan.findMany({
    where: { 
      isActive: true,
      isEducational: true 
    },
    include: {
      prices: {
        where: { 
          isActive: true,
          ...(currency ? { currency } : {})
        },
        orderBy: { billingCycle: 'asc' }
      }
    },
    orderBy: { planType: 'asc' }
  });
}

// Format plans data similar to the old Stripe API response structure
function formatPlansForAPI(plans) {
  const productMap = {};
  
  plans.forEach(plan => {
    const planKey = plan.isEducational ? `EDUCATIONAL_${plan.planType}` : plan.planType;
    
    productMap[planKey] = {
      productId: `local_${plan.id}`, // Use local ID since we're not storing Stripe product IDs
      name: plan.name,
      description: plan.description,
      credits: plan.credits,
      isEducational: plan.isEducational,
      prices: {}
    };
    
    plan.prices.forEach(price => {
      productMap[planKey].prices[price.billingCycle] = {
        id: price.stripePriceId || `local_price_${price.id}`,
        amount: price.amount,
        currency: price.currency,
        interval: price.billingCycle.toLowerCase()
      };
    });
  });
  
  return productMap;
}

module.exports = {
  getAllPlans,
  getPlansByType,
  getPlanPrice,
  getRegularPlans,
  getEducationalPlans,
  formatPlansForAPI,
  getUserCurrency,
  prisma
};