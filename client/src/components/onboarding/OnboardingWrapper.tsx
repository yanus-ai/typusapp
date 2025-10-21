import React from 'react';
import { useOnboarding } from '@/components/onboarding/hooks/useOnboarding';
import OnboardingQuestionnaire from './OnboardingQuestionnaire';
import { OnboardingData } from './types';

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

const OnboardingWrapper: React.FC<OnboardingWrapperProps> = ({ children }) => {
  const { shouldShowQuestionnaire, completeOnboarding, skipOnboarding } = useOnboarding();

  const handleComplete = async (data: OnboardingData) => {
    await completeOnboarding(data);
    console.log('Onboarding completed with data:', data);
  };

  const handleSkip = () => {
    skipOnboarding();
    console.log('Onboarding skipped');
  };

  // Show questionnaire if user hasn't completed onboarding
  if (shouldShowQuestionnaire()) {
    return (
      <OnboardingQuestionnaire
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    );
  }

  // Show normal app if onboarding is completed
  return <>{children}</>;
};

export default OnboardingWrapper;

