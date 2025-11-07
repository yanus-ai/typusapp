import { useEffect, useCallback } from "react";
import { useAppDispatch } from "../../../hooks/useAppDispatch";
import { useNavigate, useLocation } from "react-router-dom";
import { googleLogin } from "../../../features/auth/authSlice";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

declare global {
  interface Window {
    google: any;
  }
}

interface GoogleButtonProps {
  mode?: string | null;
}

const GoogleButton = ({ mode }: GoogleButtonProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleCredentialResponse = useCallback(async (response: any) => {
    try {
      // The token from Google is in response.credential
      const loginData = { token: response.credential, mode: mode || undefined };
      const authResponse = await dispatch(googleLogin(loginData)).unwrap();
      toast.success("Successfully signed in with Google!");
      // Preserve token in redirect URL
      const redirectUrl = authResponse.token ? `/create?token=${authResponse.token}` : "/create";
      navigate(redirectUrl);
    } catch (err) {
      toast.error("Google login failed");
      console.error("Google login failed:", err);
    }
  }, [dispatch, navigate, mode]);

  useEffect(() => {
    // Define initializeGoogleLogin first before using it
    const initializeGoogleLogin = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
          });
        } catch (error) {
          console.error('Error initializing Google Sign-In:', error);
        }
      }
    };

    // Check if script is already loaded
    if (window.google) {
      initializeGoogleLogin();
      return;
    }

    // Load the Google SDK
    const loadGoogleScript = () => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        // Script already exists, just initialize
        if (window.google) {
          initializeGoogleLogin();
        } else {
          // Wait for script to load
          existingScript.addEventListener('load', initializeGoogleLogin);
        }
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = initializeGoogleLogin;
      script.onerror = () => {
        console.error('Failed to load Google Sign-In script');
      };
    };

    loadGoogleScript();
  }, [handleCredentialResponse]);

  const handleGoogleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Redirect to the server's Google auth route with mode parameter if present
      const baseUrl = `${import.meta.env.VITE_API_URL}/auth/google`;
      const url = mode ? `${baseUrl}?m=${mode}` : baseUrl;
      
      // Use window.location.href for full page redirect
      window.location.href = url;
    } catch (error) {
      console.error('Error redirecting to Google auth:', error);
      toast.error('Failed to initiate Google sign-in. Please try again.');
    }
  };

  return (
    <Button
      variant="ghost"
      className="w-full border-0 shadow-none bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm hover:shadow-md"
      onClick={handleGoogleLogin}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        width="24px"
        height="24px"
      >
        <path
          fill="#FFC107"
          d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
        />
        <path
          fill="#FF3D00"
          d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
        />
        <path
          fill="#4CAF50"
          d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
        />
        <path
          fill="#1976D2"
          d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
        />
      </svg>
      <span>{`Sign ${location.pathname === "/register" ? "up" : "in"} with Google`}</span>
    </Button>
  );
};

export default GoogleButton;