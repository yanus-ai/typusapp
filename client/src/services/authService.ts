import api from "../lib/api";
import { setLocalStorage } from "../utils/helpers";
import { AuthResponse, LoginCredentials, RegisterData, User } from "../types/auth";

const authService = {
  // Register a new user
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/register", userData);
    if (response.data.token) {
      setLocalStorage("token", response.data.token);
      setLocalStorage("user", response.data.user);
    }
    return response.data;
  },

  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/login", credentials);
    if (response.data.token) {
      setLocalStorage("token", response.data.token);
      setLocalStorage("user", response.data.user);
    }
    return response.data;
  },

  // Google login
  googleLogin: async (token: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/google", { token });
    if (response.data.token) {
      setLocalStorage("token", response.data.token);
      setLocalStorage("user", response.data.user);
    }
    return response.data;
  },

  // Logout user
  logout: (): void => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>("/auth/me");
    return response.data;
  },
};

export default authService;