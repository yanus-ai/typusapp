import api from "../lib/api";

export interface PricingPlan {
  planType: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  name: string;
  description: string;
  credits: number;
  prices: {
    monthly: number;
    yearly: number;
  };
  stripePrices: {
    MONTHLY?: string;
    YEARLY?: string;
  };
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface PortalSession {
  url: string;
}

const subscriptionService = {
  // Get current user's subscription
  getCurrentSubscription: async () => {
    const response = await api.get('/subscription');
    return response.data;
  },

  // Get pricing plans
  getPricingPlans: async (): Promise<PricingPlan[]> => {
    const response = await api.get<PricingPlan[]>('/subscription/plans');
    return response.data;
  },

  // Create checkout session for upgrade
  createCheckoutSession: async (
    planType: 'BASIC' | 'PRO' | 'ENTERPRISE',
    billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY'
  ): Promise<CheckoutSession> => {
    const response = await api.post<CheckoutSession>('/subscription/checkout', {
      planType,
      billingCycle,
    });
    return response.data;
  },

  // Create customer portal session for subscription management
  createPortalSession: async (): Promise<PortalSession> => {
    const response = await api.post<PortalSession>('/subscription/portal');
    return response.data;
  },

  // Redirect to Stripe checkout
  redirectToCheckout: async (
    planType: 'BASIC' | 'PRO' | 'ENTERPRISE',
    billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY'
  ): Promise<void> => {
    try {
      const session = await subscriptionService.createCheckoutSession(planType, billingCycle);
      window.location.href = session.url;
    } catch (error) {
      console.error('Failed to redirect to checkout:', error);
      throw error;
    }
  },

  // Redirect to customer portal
  redirectToPortal: async (): Promise<void> => {
    try {
      const session = await subscriptionService.createPortalSession();
      window.location.href = session.url;
    } catch (error) {
      console.error('Failed to redirect to portal:', error);
      throw error;
    }
  },

  // Format price for display
  formatPrice: (amountInCents: number): string => {
    return `$${(amountInCents / 100).toFixed(0)}`;
  },

  // Calculate monthly equivalent for yearly price
  getMonthlyEquivalent: (yearlyAmountInCents: number): string => {
    const monthlyEquivalent = yearlyAmountInCents / 12 / 100;
    return `$${monthlyEquivalent.toFixed(0)}`;
  },
};

export default subscriptionService;