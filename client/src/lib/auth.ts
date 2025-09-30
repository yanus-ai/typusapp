import { getLocalStorage } from '../utils/helpers';

export const getAuthToken = (): string | null => {
  return getLocalStorage<string | null>('token', null);
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('token');
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};