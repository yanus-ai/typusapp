export interface User {
  id: string;
  fullName: string;
  email: string;
  handle?: string;
  profilePicture?: string;
  coverPicture?: string;
  socialLinks?: Record<string, string>;
  googleId?: string;
  emailVerified?: string;
  isActive?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}