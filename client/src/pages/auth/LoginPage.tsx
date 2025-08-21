// filepath: client/src/pages/auth/LoginPage.tsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/hooks/useAppSelector";
import LoginForm from "@/components/auth/LoginForm/LoginForm";
import GoogleButton from "@/components/auth/GoogleButton/GoogleButton";
import { Separator } from "@/components/ui/separator";
import TypusLogo from "@/assets/images/typus-logo.png";

const LoginPage = () => {
  const { isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if auth is initialized to prevent premature redirects
    if (isAuthenticated && isInitialized) {
      // Get the original destination or default to /create
      const from = (location.state as any)?.from?.pathname || "/create";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isInitialized, navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img src={TypusLogo} alt="Typus Logo" className="mx-auto h-18 w-auto mb-5" />
          <p className="mt-2 text-center text-sm text-gray-600">
            AI-Powered Architectural Visualization
          </p>
        </div>
        <LoginForm />
        <div className="mt-4 space-y-4">
          <div className="relative flex items-center justify-center">
            <Separator className="absolute w-full" />
            <span className="relative bg-background px-2 text-gray-600 text-sm">
              Or continue with
            </span>
          </div>
          <GoogleButton />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;