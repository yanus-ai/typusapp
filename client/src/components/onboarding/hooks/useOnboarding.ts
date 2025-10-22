import { useState, useEffect, useRef, useCallback } from 'react';
import onboardingService from '@/services/onboardingService';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { OnboardingData } from '../types';

interface OnboardingState {
  isCompleted: boolean;
  data: OnboardingData | null;
  hasSeenQuestionnaire: boolean;
  loading: boolean;
  error: string | null;
}

export const useOnboarding = () => {
  const { user } = useAppSelector(state => state.auth);
  const hasChecked = useRef(false);
  const isChecking = useRef(false);
  const [state, setState] = useState<OnboardingState>({
    isCompleted: false,
    data: null,
    hasSeenQuestionnaire: false,
    loading: false,
    error: null,
  });

  // Memoized function to check onboarding status
  const checkOnboardingStatus = useCallback(async () => {
    if (!user || hasChecked.current || isChecking.current) {
      return;
    }

    try {
      isChecking.current = true;
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await onboardingService.checkOnboardingStatus();
      
      hasChecked.current = true;
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
    } finally {
      isChecking.current = false;
    }
  }, [user]);

  // Check onboarding status only once when user is available
  useEffect(() => {
    if (user && !hasChecked.current) {
      checkOnboardingStatus();
    } else if (!user) {
      // Reset state when user logs out
      hasChecked.current = false;
      isChecking.current = false;
      setState({
        isCompleted: false,
        data: null,
        hasSeenQuestionnaire: false,
        loading: false,
        error: null,
      });
    }
  }, [user, checkOnboardingStatus]);

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

  const updateOnboarding = async (data: OnboardingData) => {
    try {
      await onboardingService.updateOnboardingData(data);
      setState(prev => ({
        ...prev,
        data,
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      console.error('Error updating onboarding data:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to update onboarding data',
      }));
      throw error;
    }
  };

  const resetOnboarding = () => {
    hasChecked.current = false;
    isChecking.current = false;
    setState({
      isCompleted: false,
      data: null,
      hasSeenQuestionnaire: false,
      loading: false,
      error: null,
    });
  };

  const refreshOnboardingStatus = useCallback(async () => {
    hasChecked.current = false;
    isChecking.current = false;
    await checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const shouldShowQuestionnaire = () => {
    return hasChecked.current
      ? user
        ? !state.hasSeenQuestionnaire && !state.loading
        : false
      : false;
  };

  return {
    ...state,
    completeOnboarding,
    updateOnboarding,
    skipOnboarding,
    resetOnboarding,
    refreshOnboardingStatus,
    shouldShowQuestionnaire,
  };
};

export default useOnboarding;

