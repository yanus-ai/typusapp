import api from "../lib/api";

export interface PricingPlan {
  planType: 'STARTER' | 'EXPLORER' | 'PRO';
  name: string;
  description: string;
  credits: number;
  prices: {
    monthly?: number;
    sixMonthly?: number;
    yearly?: number;
    threeMonthly?: number; // For standard plans
  };
  stripePrices: {
    MONTHLY?: string;
    SIX_MONTHLY?: string;
    YEARLY?: string;
    THREE_MONTHLY?: string; // For standard plans
  };
  isEducational?: boolean;
}

export interface PricingPlansResponse {
  regularPlans: PricingPlan[];
  educationalPlans: PricingPlan[];
  isStudent: boolean;
  currency: 'eur' | 'usd';
  isProfessional: boolean;
  isEligibleForTrial: boolean;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface PortalSession {
  url: string;
}

export interface CreditTransactionData {
  topUp: {
    totalPurchased: number;
    totalUsed: number;
    remaining: number;
    usagePercentage: number;
  };
  subscription: {
    planAllocation: number;
    used: number;
    remaining: number;
    usagePercentage: number;
  };
  total: {
    available: number;
    purchased: number;
    used: number;
  };
}

const subscriptionService = {
  // Get current user's subscription
  getCurrentSubscription: async () => {
    const response = await api.get('/subscription');
    return response.data;
  },

  // Get pricing plans
  getPricingPlans: async (): Promise<PricingPlansResponse> => {
    const response = await api.get<PricingPlansResponse>('/subscription/plans');
    return response.data;
  },

  // Create checkout session for upgrade
  createCheckoutSession: async (
    planType: 'STARTER' | 'EXPLORER' | 'PRO',
    billingCycle: 'MONTHLY' | 'SIX_MONTHLY' | 'YEARLY' | 'THREE_MONTHLY' = 'THREE_MONTHLY',
    isEducational: boolean = false
  ): Promise<CheckoutSession> => {
    const response = await api.post<CheckoutSession>('/subscription/checkout', {
      planType,
      billingCycle,
      isEducational,
    });
    return response.data;
  },

  // Removed webapp upgrade/downgrade - all subscription changes go through Stripe portal
  // updateSubscription: removed - use redirectToPortal() instead

  // Create customer portal session for subscription management
  createPortalSession: async (): Promise<PortalSession> => {
    const response = await api.post<PortalSession>('/subscription/portal');
    return response.data;
  },

  // Redirect to Stripe checkout
  redirectToCheckout: async (
    planType: 'STARTER' | 'EXPLORER' | 'PRO',
    billingCycle: 'MONTHLY' | 'SIX_MONTHLY' | 'YEARLY' | 'THREE_MONTHLY' = 'THREE_MONTHLY',
    isEducational: boolean = false
  ): Promise<void> => {
    try {
      const session = await subscriptionService.createCheckoutSession(planType, billingCycle, isEducational);
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
  formatPrice: (amountInCents: number, currency: 'eur' | 'usd' = 'eur'): string => {
    const symbol = currency === 'usd' ? '$' : '€';
    return `${symbol}${(amountInCents / 100).toFixed(0)}`;
  },

  // Calculate monthly equivalent for yearly price
  getMonthlyEquivalent: (yearlyAmountInCents: number, currency: 'eur' | 'usd' = 'eur'): string => {
    const symbol = currency === 'usd' ? '$' : '€';
    const monthlyEquivalent = yearlyAmountInCents / 12 / 100;
    return `(${symbol}${monthlyEquivalent.toFixed(0)}/month)`;
  },

  // Calculate monthly equivalent for 6-month price
  getSixMonthlyEquivalent: (sixMonthlyAmountInCents: number, currency: 'eur' | 'usd' = 'eur'): string => {
    const symbol = currency === 'usd' ? '$' : '€';
    const monthlyEquivalent = sixMonthlyAmountInCents / 6 / 100;
    return `(${symbol}${monthlyEquivalent.toFixed(0)}/month)`;
  },

  // Create checkout session for credit top-up
  createCreditCheckoutSession: async (
    credits: number,
    amount: number
  ): Promise<CheckoutSession> => {
    const response = await api.post<CheckoutSession>('/subscription/credits/checkout', {
      credits,
      amount,
    });
    return response.data;
  },

  // Redirect to credit checkout
  redirectToCreditCheckout: async (
    credits: number,
    amount: number
  ): Promise<void> => {
    try {
      const session = await subscriptionService.createCreditCheckoutSession(credits, amount);
      window.location.href = session.url;
    } catch (error) {
      console.error('Failed to redirect to credit checkout:', error);
      throw error;
    }
  },

  // Get detailed credit transaction data
  getCreditTransactionData: async (): Promise<CreditTransactionData> => {
    const response = await api.get<CreditTransactionData>('/subscription/credits/transactions');
    return response.data;
  },
};

export default subscriptionService;