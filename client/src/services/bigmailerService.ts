import api from '@/lib/api';

interface RequestVerificationParams {
  email: string;
  fullName?: string;
  isStudent?: boolean;
  universityName?: string;
}

interface RequestVerificationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const bigmailerService = {
  /**
   * Request email verification link for BigMailer
   * Sends a JWT verification link to the user's email
   */
  requestVerification: async (params: RequestVerificationParams): Promise<RequestVerificationResponse> => {
    try {
      const response = await api.post<RequestVerificationResponse>(
        '/bigmailer/request-verification-jwt',
        params
      );
      return response.data;
    } catch (error: any) {
      console.error('Error requesting BigMailer verification:', error);
      throw new Error(
        error.response?.data?.error || 
        'Failed to send verification email. Please try again.'
      );
    }
  },
};

export default bigmailerService;

