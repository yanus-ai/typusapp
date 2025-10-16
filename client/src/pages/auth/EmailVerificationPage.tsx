import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { verifyEmail } from "@/features/auth/authSlice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import TypusLogoBlack from "@/assets/images/typus_logo_black.png";
import toast from "react-hot-toast";

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>("");
  const verificationAttemptedRef = useRef<boolean>(false);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    // Prevent duplicate verification attempts using ref
    if (verificationAttemptedRef.current) return;
    
    const token = searchParams.get('token');
    
    if (!token) {
      setVerificationStatus('error');
      setErrorMessage('Invalid verification link. No token provided.');
      return;
    }

    verificationAttemptedRef.current = true;

    dispatch(verifyEmail(token))
      .unwrap()
      .then((response) => {
        setVerificationStatus('success');
        toast.success("Email verified successfully! Welcome to Typus!");
        try {
          if (typeof window !== 'undefined') {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
              event: 'sign_up',
              event_id: ['sign_up', response.user.id].join('-')
            });
          }
        } catch (error) {
          console.error('Failed to push to dataLayer:', error);
        }

        // Redirect to create page after 3 seconds
        setTimeout(() => {
          const redirectUrl = response.token ? `/create?token=${response.token}` : "/create";
          navigate(redirectUrl);
        }, 3000);
      })
      .catch((error) => {
        setVerificationStatus('error');
        setErrorMessage(error || 'Email verification failed. The token may be expired or invalid.');
      });
  }, [searchParams, dispatch, navigate]); // Removed verificationAttempted from dependencies


  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleGoToDashboard = () => {
    // Get token from current URL params to preserve it
    const currentUrl = new URL(window.location.href);
    const tokenParam = currentUrl.searchParams.get('token');
    const redirectUrl = tokenParam ? `/create?token=${tokenParam}` : "/create";
    navigate(redirectUrl);
  };

  const handleManualVerification = () => {
    const token = searchParams.get('token');
    if (token && verificationStatus === 'error') { // Only allow retry if currently in error state
      setVerificationStatus('loading');
      setErrorMessage('');
      
      dispatch(verifyEmail(token))
        .unwrap()
        .then((response) => {
          setVerificationStatus('success');
          toast.success("Email verified successfully!");
          setTimeout(() => {
            const redirectUrl = response.token ? `/create?token=${response.token}` : "/create";
            navigate(redirectUrl);
          }, 2000);
        })
        .catch((error) => {
          setVerificationStatus('error');
          setErrorMessage(error || 'Verification failed. The token may be expired or invalid.');
          toast.error('Manual verification failed: ' + error);
        });
    }
  };

  return (
    <div className="min-h-screen bg-site-white flex items-center justify-center bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-16 sm:h-24 w-auto p-2" />
          <h1 className="mt-2 text-center text-lg sm:text-xl font-light font-source-serif tracking-[2.5px]">
            TYPUS.AI
          </h1>
          <p className="mt-2 text-center text-xs sm:text-sm text-gray-600">
            AI-Powered Architectural Visualization
          </p>
        </div>

        <Card className="w-full max-w-md border-0 shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
          <CardHeader className="text-center px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl">Email Verification</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {verificationStatus === 'loading' && "Verifying your email address..."}
              {verificationStatus === 'success' && "Email verified successfully!"}
              {verificationStatus === 'error' && "Verification failed"}
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center space-y-4 px-4 sm:px-6">
            {verificationStatus === 'loading' && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-black" />
              </div>
            )}

            {verificationStatus === 'success' && (
              <>
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-green-700 mb-2">
                    Welcome to Typus!
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    Your email has been successfully verified. You're now logged in and ready to explore the power of AI-driven architectural visualization.
                  </p>
                  <p className="text-xs text-gray-500">
                    You will be automatically redirected to the dashboard in a few seconds...
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleGoToDashboard}
                  className="w-full cursor-pointer border-0 shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] focus:ring-2 focus:ring-offset-2 focus:ring-black transition-shadow text-sm sm:text-base"
                >
                  Go to Dashboard
                </Button>
              </>
            )}

            {verificationStatus === 'error' && (
              <>
                <div className="flex items-center justify-center">
                  <XCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-500" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-red-700 mb-2">
                    Verification Failed
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    {errorMessage}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Please try requesting a new verification email from the login page.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button
                    variant={"outline"}
                    onClick={handleManualVerification}
                    className="w-full cursor-pointer border-0 shadow-sm hover:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-black transition-shadow mb-4 text-sm sm:text-base"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={handleGoToLogin}
                    variant="outline"
                    className="w-full cursor-pointer border-0 shadow-sm hover:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-black transition-shadow text-sm sm:text-base"
                  >
                    Go to Login
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailVerificationPage;