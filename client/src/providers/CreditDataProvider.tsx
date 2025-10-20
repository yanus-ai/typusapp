import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAppSelector } from '@/hooks/useAppSelector';
import subscriptionService, { CreditTransactionData } from '@/services/subscriptionService';

interface CreditDataContextType {
  creditData: CreditTransactionData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CreditDataContext = createContext<CreditDataContextType | undefined>(undefined);

interface CreditDataProviderProps {
  children: ReactNode;
}

export const CreditDataProvider: React.FC<CreditDataProviderProps> = ({ children }) => {
  const { subscription } = useAppSelector((state) => state.auth);
  const [creditData, setCreditData] = useState<CreditTransactionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if subscription is usable (active or cancelled but not expired)
  const isSubscriptionUsable = (subscription: { status: string; currentPeriodEnd?: string | Date } | null) => {
    if (!subscription) return false;

    const now = new Date();
    const periodEnd = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : now;

    return (
      subscription.status === "ACTIVE" ||
      (subscription.status === "CANCELLED_AT_PERIOD_END" && now <= periodEnd)
    );
  };

  const hasUsableSubscription = isSubscriptionUsable(subscription);

  const fetchCreditData = async () => {
    if (!hasUsableSubscription) {
      setCreditData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await subscriptionService.getCreditTransactionData();
      setCreditData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch credit data';
      setError(errorMessage);
      console.error('Failed to fetch credit data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when subscription changes
  useEffect(() => {
    fetchCreditData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUsableSubscription]);

  // Refetch function for manual refresh
  const refetch = async () => {
    await fetchCreditData();
  };

  const value: CreditDataContextType = {
    creditData,
    loading,
    error,
    refetch,
  };

  return (
    <CreditDataContext.Provider value={value}>
      {children}
    </CreditDataContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCreditData = (): CreditDataContextType => {
  const context = useContext(CreditDataContext);
  if (context === undefined) {
    throw new Error('useCreditData must be used within a CreditDataProvider');
  }
  return context;
};

export default CreditDataProvider;
