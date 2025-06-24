import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAppSelector(state => state.auth);
  
  // If auth not initialized yet, show nothing (loading state is in AuthProvider)
  if (!isInitialized) {
    return null;
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Otherwise, render children
  return <>{children}</>;
};

export default ProtectedRoute;