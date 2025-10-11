import { useState, useEffect } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { isMobileDevice } from "@/utils/deviceDetection";
import DesktopOnlyMessage from "../DesktopOnlyMessage";

interface MobileProtectedRouteProps {
  children: React.ReactNode;
}

const MobileProtectedRoute: React.FC<MobileProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);
  const [isMobile, setIsMobile] = useState(isMobileDevice());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // If on mobile and user is authenticated, show desktop message
  if (isMobile && isAuthenticated && isInitialized) {
    return <DesktopOnlyMessage />;
  }

  // Otherwise, render the children (which includes the regular ProtectedRoute logic)
  return <>{children}</>;
};

export default MobileProtectedRoute;