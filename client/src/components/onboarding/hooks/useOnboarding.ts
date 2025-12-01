import React from 'react';
import { useAppSelector } from '../../../hooks/useAppSelector';
import onboardingService from '@/services/onboardingService';

export const useOnboarding = () => {
  const { user } = useAppSelector(state => state.auth);
  const [isMounted, setIsMounted] = React.useState(false);
  const [shouldShowQuestionnaire, setShouldShowQuestionnaire] = React.useState(false);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = React.useState(false);
  
  const isCheckingStatus = React.useRef(false)
  const hasCheckedStatus = React.useRef(false)

  React.useEffect(() => {
    setIsMounted(true);
    if (user && !hasCheckedStatus.current) {
      isCheckingStatus.current = true;
      hasCheckedStatus.current = true;
      onboardingService.checkOnboardingStatus().then((response) => {
        setIsOnboardingCompleted(Boolean(response.success && response.hasCompleted));
        setShouldShowQuestionnaire(Boolean(response.success && !response.hasCompleted));
      }).catch((error) => {
        console.error('Error checking onboarding status:', error);
      }).finally(() => {
        isCheckingStatus.current = false;
      });
    }
    return () => setIsMounted(false);
  }, [user])

  return {
    user,
    isCheckingOnboardingStatus: isCheckingStatus.current,
    hasCheckedOnboardingStatus: hasCheckedStatus.current,
    isMounted,
    isOnboardingCompleted,
    shouldShowQuestionnaire
  }
};

export default useOnboarding;

