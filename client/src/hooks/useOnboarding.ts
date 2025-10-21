import { useState, useEffect } from 'react';
import onboardingService from '@/services/onboardingService';
import { useAppSelector } from './useAppSelector';

interface OnboardingData {
  software: string;
  status: string;
  timeOnRenderings: string;
  moneySpentForOneImage: string;
  fullName: string;
  email: string;
}

interface OnboardingState {
  isCompleted: boolean;
  data: OnboardingData | null;
  hasSeenQuestionnaire: boolean;
  loading: boolean;
  error: string | null;
}

export const useOnboarding = () => {
  const { user } = useAppSelector(state => state.auth);
  const [state, setState] = useState<OnboardingState>({
    isCompleted: false,
    data: null,
    hasSeenQuestionnaire: false,
    loading: false,
    error: null,
  });

  // Check onboarding status from backend when user is available
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const response = await onboardingService.checkOnboardingStatus();
        
        setState(prev => ({
          ...prev,
          isCompleted: response.hasCompleted,
          data: response.data,
          hasSeenQuestionnaire: response.hasCompleted,
          loading: false,
        }));
      } catch (error: any) {
        console.error('Error checking onboarding status:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to check onboarding status',
        }));
      }
    };

    if (user) {
      checkOnboardingStatus();
    } else {
      setState(state => ({
        ...state,
        loading: false,
      }));
    }
  }, [user]);

  const completeOnboarding = async (data: OnboardingData) => {
    try {
      await onboardingService.submitOnboardingData(data);
      setState({
        isCompleted: true,
        data,
        hasSeenQuestionnaire: true,
        loading: false,
        error: null,
      });
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to complete onboarding',
      }));
    }
  };

  const skipOnboarding = () => {
    setState(prev => ({
      ...prev,
      hasSeenQuestionnaire: true,
    }));
  };

  const resetOnboarding = () => {
    setState({
      isCompleted: false,
      data: null,
      hasSeenQuestionnaire: false,
      loading: false,
      error: null,
    });
  };

  const shouldShowQuestionnaire = () => {
    return user ? !state.hasSeenQuestionnaire && !state.loading : false;
  };

  return {
    ...state,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    shouldShowQuestionnaire,
  };
};

export default useOnboarding;

