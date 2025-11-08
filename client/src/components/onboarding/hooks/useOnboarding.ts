import React from 'react';
import { useAppSelector } from '../../../hooks/useAppSelector';
import onboardingService from '@/services/onboardingService';

export const useOnboarding = () => {
  const { user } = useAppSelector(state => state.auth);
  const [isMounted, setIsMounted] = React.useState(false);
  const [shouldShowQuestionnaire, setShouldShowQuestionnaire] = React.useState(false);
  
  const isCheckingStatus = React.useRef(false)
  const lastCheckedUserId = React.useRef<string | null>(null)

  React.useEffect(() => {
    setIsMounted(true);
    
    // Check onboarding status when user is available and we haven't checked for this user yet
    if (user && user.id !== lastCheckedUserId.current && !isCheckingStatus.current) {
      isCheckingStatus.current = true;
      lastCheckedUserId.current = user.id;
      
      onboardingService.checkOnboardingStatus().then((response) => {
        setShouldShowQuestionnaire(Boolean(response.success && !response.hasCompleted));
      }).catch((error) => {
        console.error('Error checking onboarding status:', error);
        // Reset on error so we can retry
        lastCheckedUserId.current = null;
      }).finally(() => {
        isCheckingStatus.current = false;
      });
    } else if (!user) {
      // Reset when user logs out
      lastCheckedUserId.current = null;
      setShouldShowQuestionnaire(false);
    }
    
    return () => setIsMounted(false);
  }, [user])

  return {
    user,
    isCheckingOnboardingStatus: isCheckingStatus.current,
    hasCheckedOnboardingStatus: lastCheckedUserId.current !== null,
    isMounted,
    shouldShowQuestionnaire
  }
};

export default useOnboarding;

