import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { getLocalStorage } from "../utils/helpers";
import { store } from "../store";
import { logout } from "../features/auth/authSlice";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getLocalStorage<string | null>("token", null);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: AxiosError): Promise<AxiosError> => {
    const { response } = error;
    
    // Handle session expiration
    if (response && response.status === 401) {
      // Dispatch logout action to clear state and localStorage properly
      store.dispatch(logout());
      
      // Only redirect if we're not already on an auth page to prevent loops
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register') && !currentPath.startsWith('/auth/callback')) {
        // Use setTimeout to ensure state updates complete first
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;