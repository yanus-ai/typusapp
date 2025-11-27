import React from 'react';
import useOnboarding from './hooks/useOnboarding';
import OnboardingQuestionnaire from './OnboardingQuestionnaire';
import { useCheckout } from '@/contexts/CheckoutContext';

export default function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  const { pendingCheckout, showOnboarding } = useCheckout();
  const { shouldShowQuestionnaire } = useOnboarding();
  
  // Show onboarding if:
  // 1. There's a pending checkout AND onboarding is not completed, OR
  // 2. showOnboarding flag is explicitly set AND onboarding is not completed
  const shouldShow = shouldShowQuestionnaire && (pendingCheckout !== null || showOnboarding);
  
  return shouldShow ? <OnboardingQuestionnaire /> : children;
}

