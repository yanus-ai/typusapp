// filepath: client/src/pages/auth/LoginPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import LoginForm from "@/components/auth/LoginForm/LoginForm";
import GoogleButton from "@/components/auth/GoogleButton/GoogleButton";
import { Separator } from "@/components/ui/separator";
import TypusLogoBlack from "@/assets/images/typus_logo_black.png";
import TrustworthyIcons from "@/components/auth/TrustworthyIcons";
import VideoSection from "@/components/auth/VideoSection";
import { EmailVerificationModal } from "@/components/auth/EmailVerificationModal";
import { clearRegistrationSuccess, resendVerificationEmail } from "@/features/auth/authSlice";
import { Link } from "react-router-dom";

const LoginPage = () => {
  const { isAuthenticated, isInitialized, registrationSuccess, registrationEmail } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  
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
    // Show email verification modal if user just registered
    if (registrationSuccess) {
      setShowEmailModal(true);
    }
  }, [registrationSuccess]);

  const handleCloseModal = () => {
    setShowEmailModal(false);
    setPendingVerificationEmail("");
    dispatch(clearRegistrationSuccess());
  };

  const handleResendEmail = () => {
    const emailToResend = pendingVerificationEmail || registrationEmail;
    if (emailToResend) {
      dispatch(resendVerificationEmail(emailToResend));
    }
  };

  const handleEmailVerificationRequired = (email: string) => {
    setPendingVerificationEmail(email);
    setShowEmailModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        {/* Video Section - 60% */}
        <VideoSection className="w-3/5" />

        {/* Login Form Section - 40% */}
        <div className="w-2/5 flex flex-col items-center justify-center relative bg-site-white">
          <div className="max-w-md w-full space-y-8 px-8">
            <div className="rounded-2xl p-8">
              <div className="mb-8">
                <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-24 w-auto p-2" />
                <h1 className="mt-2 text-center text-2xl font-light font-source-serif tracking-[2.5px]">
                  TYPUS.AI
                </h1>
                <p className="mt-2 text-center text-sm text-gray-600 font-medium">
                  AI-Powered Architectural Visualization
                </p>
              </div>
              <LoginForm mode={mode} onEmailVerificationRequired={handleEmailVerificationRequired} />
              <div className="mt-6 space-y-4">
                <div className="relative flex items-center justify-center">
                  <Separator className="absolute w-full bg-gray-300" />
                  <span className="relative bg-site-white px-3 py-1 rounded-full text-gray-600 text-sm font-medium">
                    Or continue with
                  </span>
                </div>
                <GoogleButton mode={mode} />
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-6 text-sm">
            <Link
              to="/terms"
              target="_blank"
              className={`hover:text-gray-600 ${location.pathname === '/terms' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
            >
              Terms of Service
            </Link>
            <Link
              to="/data-privacy"
              target="_blank"
              className={`hover:text-gray-600 ${location.pathname === '/data-privacy' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
            >
              Data Privacy
            </Link>
            <Link
              to="/imprint"
              target="_blank"
              className={`hover:text-gray-600 ${location.pathname === '/imprint' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
            >
              Imprint
            </Link>
          </div>
        </div>
      </div>

      {/* Credentials Section - Part of the background */}
      <TrustworthyIcons />

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showEmailModal}
        onClose={handleCloseModal}
        onResendEmail={handleResendEmail}
      />
    </div>
  );
};

export default LoginPage;