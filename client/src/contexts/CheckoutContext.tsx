import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PendingCheckout {
  planType: 'STARTER' | 'EXPLORER' | 'PRO';
  billingCycle: 'MONTHLY' | 'SIX_MONTHLY' | 'YEARLY' | 'THREE_MONTHLY';
  isEducational: boolean;
}

interface CheckoutContextType {
  pendingCheckout: PendingCheckout | null;
  setPendingCheckout: (checkout: PendingCheckout | null) => void;
  clearPendingCheckout: () => void;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const CheckoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const clearPendingCheckout = () => {
    setPendingCheckout(null);
  };

  return (
    <CheckoutContext.Provider value={{ 
      pendingCheckout, 
      setPendingCheckout, 
      clearPendingCheckout,
      showOnboarding,
      setShowOnboarding
    }}>
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within CheckoutProvider');
  }
  return context;
};

