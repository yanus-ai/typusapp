import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/hooks/useAppSelector";
import RegisterForm from "@/components/auth/RegisterForm/RegisterForm";
import GoogleButton from "@/components/auth/GoogleButton/GoogleButton";
import { Separator } from "@/components/ui/separator";
// import { MasonryBackground } from "@/components/auth/MasonryBackground";
import TypusLogoBlack from "@/assets/images/black-logo.png";
import TrustworthyIcons from "@/components/auth/TrustworthyIcons";

const RegisterPage = () => {
  const { isAuthenticated, isInitialized, registrationSuccess } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get mode parameter from URL
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('m');

  useEffect(() => {
    // Only redirect if auth is initialized to prevent premature redirects
    if (isAuthenticated && isInitialized) {
      // Get the original destination or default to /create
      const from = (location.state as any)?.from?.pathname || "/create";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isInitialized, navigate, location]);

  useEffect(() => {
    // Redirect to login page after successful registration, preserving mode parameter
    if (registrationSuccess) {
      const loginUrl = mode ? `/login?m=${mode}` : '/login';
      navigate(loginUrl, { replace: true });
    }
  }, [registrationSuccess, navigate, mode]);

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* <MasonryBackground opacity={1} /> */}
      
      {/* Credentials Section - Part of the background */}
      <TrustworthyIcons />

      {/* Login/Register Popup - Appears on top */}
      <div className="max-w-md w-full space-y-8 z-20 relative">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/50">
          <div className="mb-8">
            <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-10 w-auto mb-5" />
            <p className="mt-2 text-center text-sm text-gray-600 font-medium">
              AI-Powered Architectural Visualization
            </p>
          </div>
          <RegisterForm mode={mode} />
          <div className="mt-6 space-y-4">
            <div className="relative flex items-center justify-center">
              <Separator className="absolute w-full bg-gray-300" />
              <span className="relative bg-white px-3 py-1 rounded-full text-gray-600 text-sm font-medium">
                Or continue with
              </span>
            </div>
            <GoogleButton mode={mode} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;