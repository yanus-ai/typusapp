// filepath: client/src/pages/auth/LoginPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import LoginForm from "@/components/auth/LoginForm/LoginForm";
import GoogleButton from "@/components/auth/GoogleButton/GoogleButton";
import { Separator } from "@/components/ui/separator";
import TypusLogoBlack from "@/assets/images/typus_logo_black_transparent.png";
import TrustworthyIcons from "@/components/auth/TrustworthyIcons";
import VideoSection from "@/components/auth/VideoSection";
import { EmailVerificationModal } from "@/components/auth/EmailVerificationModal";
import { clearRegistrationSuccess, resendVerificationEmail } from "@/features/auth/authSlice";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

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
    // Add data attribute to body for reCAPTCHA badge visibility
    document.body.setAttribute('data-form', 'login');

    return () => {
      // Clean up when component unmounts
      document.body.removeAttribute('data-form');
    };
  }, []);

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

  const handleResendEmail = async () => {
    const emailToResend = pendingVerificationEmail || registrationEmail;
    if (emailToResend) {
      try {
        const result = await dispatch(resendVerificationEmail(emailToResend));
        if (resendVerificationEmail.fulfilled.match(result)) {
          toast.success('Verification email sent! Please check your inbox. Check your spam folder and move any messages to your inbox to receive future emails.');
        } else {
          const errorMessage = result.payload as string || 'Failed to send email';
          toast.error(errorMessage);
        }
      } catch (error: any) {
        toast.error(error?.message || 'Failed to send verification email');
      }
    }
  };

  const handleEmailVerificationRequired = (email: string) => {
    setPendingVerificationEmail(email);
    setShowEmailModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Video Section - Hidden on mobile, 60% on desktop */}
        <VideoSection className="hidden lg:flex lg:w-3/5" />

        {/* Login Form Section - Full width on mobile, 40% on desktop */}
        <div className="w-full lg:w-2/5 flex flex-col items-center justify-center relative bg-site-white">
          <div className="max-w-md w-full space-y-8 px-4 sm:px-8">
            <div className="rounded-2xl p-4 sm:p-8">
              <div className="mb-6 sm:mb-8">
                <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-16 sm:h-24 w-auto p-2" />
                <h1 className="mt-2 text-center text-xl sm:text-2xl font-light font-source-serif tracking-[2.5px]">
                  TYPUS.AI
                </h1>
                <p className="mt-2 text-center text-xs sm:text-sm text-gray-600 font-medium">
                  AI-Powered Architectural Visualization
                </p>
              </div>
              <LoginForm mode={mode} onEmailVerificationRequired={handleEmailVerificationRequired} />
              <div className="mt-4 sm:mt-6 space-y-4">
                <div className="relative flex items-center justify-center">
                  <Separator className="absolute w-full bg-gray-300" />
                  <span className="relative bg-site-white px-3 py-1 rounded-full text-gray-600 text-xs sm:text-sm font-medium">
                    Or continue with
                  </span>
                </div>
                <GoogleButton mode={mode} />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm px-4">
            <Link
              to="/terms"
              target="_blank"
              className={`text-center hover:text-gray-600 ${location.pathname === '/terms' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
            >
              Terms of Service
            </Link>
            <Link
              to="/data-privacy"
              target="_blank"
              className={`text-center hover:text-gray-600 ${location.pathname === '/data-privacy' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
            >
              Data Privacy
            </Link>
            <Link
              to="/imprint"
              target="_blank"
              className={`text-center hover:text-gray-600 ${location.pathname === '/imprint' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
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