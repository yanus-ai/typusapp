import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { fetchCurrentUser } from "@/features/auth/authSlice";
import { setLocalStorage } from "@/utils/helpers";
import toast from "react-hot-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    const processCallback = async () => {
      // Extract token from URL
      const queryParams = new URLSearchParams(location.search);
      const token = queryParams.get("token");
      const error = queryParams.get("error");
      
      if (error) {
        toast.error("Authentication failed");
        navigate("/login");
        return;
      }
      
      if (!token) {
        toast.error("No authentication token received");
        navigate("/login");
        return;
      }
      
      try {
        // Save token and get user data
        setLocalStorage("token", token);
        
        // Fetch current user with the new token
        await dispatch(fetchCurrentUser()).unwrap();
        
        toast.success("Successfully signed in!");
        // Preserve token in redirect URL
        const redirectUrl = `/create?token=${token}`;
        navigate(redirectUrl);
      } catch (err) {
        console.error("Error processing authentication:", err);
        toast.error("Authentication failed");
        navigate("/login");
      }
    };
    
    processCallback();
  }, [dispatch, location, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-2">Processing authentication...</h1>
        <p className="text-gray-500">Please wait while we log you in.</p>
      </div>
    </div>
  );
};

export default AuthCallback;