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
  isStudent?: boolean;
  universityName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planType: 'STARTER' | 'EXPLORER' | 'PRO';
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'CANCELLED_AT_PERIOD_END' | 'UNPAID' | 'TRIALING' | 'ENDED';
  credits: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  isEducational?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  subscription: Subscription | null;
  credits: number;
  redirect?: string;
}

export interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  credits: number;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}