import api from "../lib/api";
import { setLocalStorage } from "../utils/helpers";
import { AuthResponse, LoginCredentials, RegisterData } from "../types/auth";

const authService = {
  // Register a new user
  register: async (userData: RegisterData): Promise<any> => {
    const response = await api.post("/auth/register", userData);
    // Note: Registration now returns different response - no token until email is verified
    return response.data;
  },

  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/login", credentials);
    if (response.data.token) {
      setLocalStorage("token", response.data.token);
      setLocalStorage("user", response.data.user);
      setLocalStorage("subscription", response.data.subscription);
      setLocalStorage("credits", response.data.credits);
    }
    return response.data;
  },

  // Google login
  googleLogin: async (token: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/google", { token });
    if (response.data.token) {
      setLocalStorage("token", response.data.token);
      setLocalStorage("user", response.data.user);
      setLocalStorage("subscription", response.data.subscription);
      setLocalStorage("credits", response.data.credits);
    }
    return response.data;
  },

  // Logout user
  logout: (): void => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("subscription");
    localStorage.removeItem("credits");
  },

  // Get current user profile
  getCurrentUser: async (): Promise<AuthResponse> => {
    const response = await api.get<AuthResponse>("/auth/me");
    
    // Update localStorage with fresh data
    if (response.data.user) {
      setLocalStorage("user", response.data.user);
    }
    if (response.data.subscription) {
      setLocalStorage("subscription", response.data.subscription);
    }
    if (typeof response.data.credits === 'number') {
      setLocalStorage("credits", response.data.credits);
    }
    
    return response.data;
  },

  // Verify email with token
  verifyEmail: async (token: string): Promise<AuthResponse> => {
    const response = await api.get<AuthResponse>(`/auth/verify-email?token=${token}`);
    if (response.data.token) {
      setLocalStorage("token", response.data.token);
      setLocalStorage("user", response.data.user);
      setLocalStorage("subscription", response.data.subscription);
      setLocalStorage("credits", response.data.credits);
    }
    return response.data;
  },

  // Resend verification email
  resendVerificationEmail: async (email: string): Promise<any> => {
    const response = await api.post("/auth/resend-verification", { email });
    return response.data;
  },
};

export default authService;