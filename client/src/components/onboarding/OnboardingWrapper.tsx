import React from 'react';
import useOnboarding from './hooks/useOnboarding';
import OnboardingQuestionnaire from './OnboardingQuestionnaire';

export default function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  const { shouldShowQuestionnaire } = useOnboarding()
  return shouldShowQuestionnaire ? <OnboardingQuestionnaire /> : children
}

