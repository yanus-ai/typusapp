import api from '@/lib/api';

export interface OnboardingData {
  software: string;
  status: string;
  timeOnRenderings: string;
  moneySpentForOneImage: string;
  fullName: string;
  email: string;
}

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
      const response = await api.post<OnboardingResponse>('/onboarding/submit', data);
      return response.data;
    } catch (error) {
      console.error('Error submitting onboarding data:', error);
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

