import { useEffect } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchCurrentUser, setInitialized } from '../features/auth/authSlice';
import { getLocalStorage } from '../utils/helpers';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppSelector(state => state.auth);

  useEffect(() => {
    const token = getLocalStorage<string | null>("token", null);
    
    if (token) {
      dispatch(fetchCurrentUser())
        .unwrap()
        .catch(() => {
          // If fetching user fails, still mark as initialized
          dispatch(setInitialized(true));
        });
    } else {
      // If no token, just mark as initialized
      dispatch(setInitialized(true));
    }
  }, [dispatch]);

  // Show loading state until auth is initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};