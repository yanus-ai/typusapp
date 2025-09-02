const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

async function getPlansByType(planType, isEducational = false) {
  return await prisma.plan.findUnique({
    where: {
      planType_isEducational: {
        planType,
        isEducational
      }
    },
    include: {
      prices: {
        where: { isActive: true },
        orderBy: { billingCycle: 'asc' }
      }
    }
  });
}

async function getPlanPrice(planType, billingCycle, isEducational = false) {
  const plan = await getPlansByType(planType, isEducational);
  if (!plan) return null;
  
  return plan.prices.find(price => price.billingCycle === billingCycle);
}

async function getRegularPlans() {
  return await prisma.plan.findMany({
    where: { 
      isActive: true,
      isEducational: false 
    },
    include: {
      prices: {
        where: { isActive: true },
        orderBy: { billingCycle: 'asc' }
      }
    },
    orderBy: { planType: 'asc' }
  });
}

async function getEducationalPlans() {
  return await prisma.plan.findMany({
    where: { 
      isActive: true,
      isEducational: true 
    },
    include: {
      prices: {
        where: { isActive: true },
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
  prisma
};