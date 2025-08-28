import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { verifyEmail } from "@/features/auth/authSlice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import TypusLogoBlack from "@/assets/images/black-logo.png";
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
      .then(() => {
        setVerificationStatus('success');
        toast.success("Email verified successfully! Welcome to Typus!");
        
        // Redirect to create page after 3 seconds
        setTimeout(() => {
          navigate('/create');
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
    navigate('/create');
  };

  const handleManualVerification = () => {
    const token = searchParams.get('token');
    if (token && verificationStatus === 'error') { // Only allow retry if currently in error state
      setVerificationStatus('loading');
      setErrorMessage('');
      
      dispatch(verifyEmail(token))
        .unwrap()
        .then(() => {
          setVerificationStatus('success');
          toast.success("Email verified successfully!");
          setTimeout(() => {
            navigate('/create');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-10 w-auto mb-5" />
          <p className="mt-2 text-center text-sm text-gray-600">
            AI-Powered Architectural Visualization
          </p>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Email Verification</CardTitle>
            <CardDescription>
              {verificationStatus === 'loading' && "Verifying your email address..."}
              {verificationStatus === 'success' && "Email verified successfully!"}
              {verificationStatus === 'error' && "Verification failed"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            {verificationStatus === 'loading' && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-black" />
              </div>
            )}

            {verificationStatus === 'success' && (
              <>
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-2">
                    Welcome to Typus!
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Your email has been successfully verified. You're now logged in and ready to explore the power of AI-driven architectural visualization.
                  </p>
                  <p className="text-xs text-gray-500">
                    You will be automatically redirected to the dashboard in a few seconds...
                  </p>
                </div>
                <Button 
                  onClick={handleGoToDashboard}
                  className="w-full bg-black text-white cursor-pointer"
                >
                  Go to Dashboard
                </Button>
              </>
            )}

            {verificationStatus === 'error' && (
              <>
                <div className="flex items-center justify-center">
                  <XCircle className="h-16 w-16 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-700 mb-2">
                    Verification Failed
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {errorMessage}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Please try requesting a new verification email from the login page.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button 
                    onClick={handleManualVerification}
                    className="w-full text-white"
                  >
                    Try Again
                  </Button>
                  <Button 
                    onClick={handleGoToLogin}
                    variant="outline"
                    className="w-full"
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