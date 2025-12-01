import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/hooks/useAppSelector";
import RegisterForm from "@/components/auth/RegisterForm/RegisterForm";
import GoogleButton from "@/components/auth/GoogleButton/GoogleButton";
import { Separator } from "@/components/ui/separator";
import TypusLogoBlack from "@/assets/images/typus_logo_black_transparent.png";
import TrustworthyIcons from "@/components/auth/TrustworthyIcons";
import VideoSection from "@/components/auth/VideoSection";
import { Link } from "react-router-dom";
import { useClientLanguage } from "@/hooks/useClientLanguage";

// Translations
const translations = {
  en: {
    tagline: "AI-Powered Architectural Visualization",
    orContinueWith: "Or continue with",
    termsOfService: "Terms of Service",
    dataPrivacy: "Data Privacy",
    imprint: "Imprint"
  },
  de: {
    tagline: "KI-gestützte Architekturvisualisierung",
    orContinueWith: "Oder fortfahren mit",
    termsOfService: "Nutzungsbedingungen",
    dataPrivacy: "Datenschutz",
    imprint: "Impressum"
  }
};

// Helper function to get translations
const getTranslations = (language: string | null) => {
  return language === 'de' ? translations.de : translations.en;
};

const RegisterPage = () => {
  const { isAuthenticated, isInitialized, registrationSuccess } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get mode parameter from URL
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('m');
  const language = useClientLanguage();
  const t = getTranslations(language);

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
    document.body.setAttribute('data-form', 'register');

    return () => {
      // Clean up when component unmounts
      document.body.removeAttribute('data-form');
    };
  }, []);

  useEffect(() => {
    // Redirect to login page after successful registration, preserving mode parameter
    if (registrationSuccess) {
      const loginUrl = mode ? `/login?m=${mode}` : '/login';
      navigate(loginUrl, { replace: true });
    }
  }, [registrationSuccess, navigate, mode]);

  return (
      <div className="min-h-screen flex flex-col" data-form="register">
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Video Section - Hidden on mobile, 60% on desktop */}
          <VideoSection className="hidden lg:flex lg:w-3/5" />

          {/* Register Form Section - Full width on mobile, 40% on desktop */}
          <div className="w-full lg:w-2/5 flex flex-col items-center justify-center relative bg-site-white">
            <div className="max-w-md w-full space-y-8 px-4 sm:px-8">
              <div className="rounded-none p-4 sm:p-8">
                <div className="mb-6 sm:mb-8">
                  <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-16 sm:h-24 w-auto p-2" />
                  <h1 className="mt-2 text-center text-xl sm:text-2xl font-light font-source-serif tracking-[2.5px]">
                    TYPUS.AI
                  </h1>
                  <p className="mt-2 text-center text-xs sm:text-sm text-gray-600 font-medium">
                    {t.tagline}
                  </p>
                </div>
                <RegisterForm mode={mode} />
                <div className="mt-4 sm:mt-6 space-y-4">
                  <div className="relative flex items-center justify-center">
                    <Separator className="absolute w-full bg-gray-300" />
                  <span className="relative bg-site-white px-3 py-1 rounded-none text-gray-600 text-xs sm:text-sm font-medium">
                    {t.orContinueWith}
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
                {t.termsOfService}
              </Link>
              <Link
                to="/data-privacy"
                target="_blank"
                className={`text-center hover:text-gray-600 ${location.pathname === '/data-privacy' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
              >
                {t.dataPrivacy}
              </Link>
              <Link
                to="/imprint"
                target="_blank"
                className={`text-center hover:text-gray-600 ${location.pathname === '/imprint' ? 'text-black font-semibold underline' : 'text-gray-800'}`}
              >
                {t.imprint}
              </Link>
            </div>
          </div>
        </div>

        {/* Credentials Section - Part of the background */}
        <TrustworthyIcons />
      </div>
  );
};

export default RegisterPage;