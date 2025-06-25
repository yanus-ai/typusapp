import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/hooks/useAppSelector";
import RegisterForm from "@/components/auth/RegisterForm/RegisterForm";
import GoogleButton from "@/components/auth/GoogleButton/GoogleButton";
import { Separator } from "@/components/ui/separator";

const RegisterPage = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/create");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            Präi
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            AI-Powered Architectural Visualization
          </p>
        </div>
        <RegisterForm />
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

export default RegisterPage;