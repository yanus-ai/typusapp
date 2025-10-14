import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isInitialized, isLoading } = useAppSelector(state => state.auth);
  const location = useLocation();
  
  // If auth not initialized yet or still loading, show loading spinner
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <DotLottieReact
          src={squareSpinner}
          loop
          autoplay
          style={{ width: 100, height: 100 }}
        />
      </div>
    );
  }
  
  // If not authenticated, redirect to login with current location as state
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Otherwise, render children
  return <>{children}</>;
};

export default ProtectedRoute;