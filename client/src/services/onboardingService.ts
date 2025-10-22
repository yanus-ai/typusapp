import { OnboardingData } from '@/components/onboarding/types';
import api from '@/lib/api';

export interface OnboardingResponse {
  success: boolean;
  message: string;
  recommendations?: {
    planType?: string;
    features?: string[];
    tips?: string[];
  };
}

const onboardingService = {
  // Send onboarding data to backend
  submitOnboardingData: async (data: OnboardingData): Promise<OnboardingResponse> => {
    try {
      console.log('Submitting onboarding data:', data);
      const response = await api.post<OnboardingResponse>('/onboarding/submit', data);
      return response.data;
    } catch (error) {
      console.error('Error submitting onboarding data:', error);
      throw error;
    }
  },

  // Update existing onboarding data
  updateOnboardingData: async (data: OnboardingData): Promise<OnboardingResponse> => {
    try {
      console.log('Updating onboarding data:', data);
      const response = await api.put<OnboardingResponse>('/onboarding/update', data);
      return response.data;
    } catch (error) {
      console.error('Error updating onboarding data:', error);
      throw error;
    }
  },

  // Check if user has completed onboarding
  checkOnboardingStatus: async (): Promise<{ success: boolean; hasCompleted: boolean; data?: any }> => {
    try {
      const response = await api.get<{ success: boolean; hasCompleted: boolean; data?: any }>('/onboarding/status');
      return response.data;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      throw error;
    }
  },
};

export default onboardingService;

