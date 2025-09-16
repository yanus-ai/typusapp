import { useEffect, useState } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchCurrentUser, setInitialized, logout } from '../features/auth/authSlice';
import { getLocalStorage } from '../utils/helpers';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppSelector(state => state.auth);
  const [initStarted, setInitStarted] = useState(false);

  useEffect(() => {
    // Prevent multiple initialization attempts
    if (initStarted) return;
    setInitStarted(true);
    
    const token = getLocalStorage<string | null>("token", null);
    
    if (token) {
      dispatch(fetchCurrentUser())
        .unwrap()
        .catch((error) => {
          console.error('Failed to fetch current user:', error);
          // Clear invalid token and mark as initialized
          dispatch(logout());
          dispatch(setInitialized(true));
        });
    } else {
      // If no token, just mark as initialized
      dispatch(setInitialized(true));
    }
  }, [dispatch, initStarted]);

  // Show loading state until auth is initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <DotLottieReact
          src={squareSpinner}
          loop
          autoplay
          style={{ width: 80, height: 80 }}
        />
      </div>
    );
  }

  return <>{children}</>;
};