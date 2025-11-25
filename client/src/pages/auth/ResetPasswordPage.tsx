import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

// Import ShadCN components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import TypusLogoBlack from "@/assets/images/typus_logo_black_transparent.png";
import TrustworthyIcons from "@/components/auth/TrustworthyIcons";
import VideoSection from "@/components/auth/VideoSection";

// Form validation schema
const formSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const ResetPasswordPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { resetUserPassword, isLoading, isAuthenticated } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/create", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Check if token exists
  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing reset token");
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  const onSubmit = async (data: FormValues) => {
    if (!token) {
      toast.error("Invalid reset token");
      return;
    }

    try {
      await resetUserPassword(token, data.password);
      setIsSuccess(true);
      toast.success("Password reset successfully! You are now logged in.");
      // Navigate after a short delay to show success message
      setTimeout(() => {
        navigate("/create", { replace: true });
      }, 2000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      let errorMessage = "Something went wrong. Please try again.";

      // Show specific error messages for common issues
      if (typeof error === 'string') {
        if (error.includes('Invalid or expired')) {
          errorMessage = "This reset link has expired or is invalid. Please request a new password reset.";
        } else if (error.includes('Token and new password')) {
          errorMessage = "Please enter a valid password.";
        } else {
          errorMessage = error;
        }
      } else if (error?.message) {
        if (error.message.includes('Invalid or expired')) {
          errorMessage = "This reset link has expired or is invalid. Please request a new password reset.";
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Video Section - Hidden on mobile, 60% on desktop */}
          <VideoSection className="hidden lg:flex lg:w-3/5" />

          {/* Success Message Section - Full width on mobile, 40% on desktop */}
          <div className="w-full lg:w-2/5 flex flex-col items-center justify-center relative bg-site-white">
            <div className="max-w-md w-full space-y-8 px-4 sm:px-8">
              <div className="rounded-none p-4 sm:p-8">
                <div className="mb-6 sm:mb-8">
                  <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-16 sm:h-24 w-auto p-2" />
                  <h1 className="mt-2 text-center text-xl sm:text-2xl font-light font-source-serif tracking-[2.5px]">
                    TYPUS.AI
                  </h1>
                  <p className="mt-2 text-center text-xs sm:text-sm text-gray-600 font-medium">
                    AI-Powered Architectural Visualization
                  </p>
                </div>

                <Card className="w-full max-w-md border-0 shadow-none py-0">
                  <CardHeader className="px-0">
                    <CardTitle className="text-lg sm:text-xl text-center font-medium text-black">Password Reset Successful!</CardTitle>
                    <CardDescription className="text-center text-sm sm:text-base">
                      Your password has been reset and you are now logged in. Redirecting you to the app...
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </div>
        <TrustworthyIcons />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Video Section - Hidden on mobile, 60% on desktop */}
        <VideoSection className="hidden lg:flex lg:w-3/5" />

        {/* Reset Password Form Section - Full width on mobile, 40% on desktop */}
        <div className="w-full lg:w-2/5 flex flex-col items-center justify-center relative bg-site-white">
          <div className="max-w-md w-full space-y-8 px-4 sm:px-8">
            <div className="rounded-none p-4 sm:p-8">
              <div className="mb-6 sm:mb-8">
                <img src={TypusLogoBlack} alt="Typus Logo" className="mx-auto h-16 sm:h-24 w-auto p-2" />
                <h1 className="mt-2 text-center text-xl sm:text-2xl font-light font-source-serif tracking-[2.5px]">
                  TYPUS.AI
                </h1>
                <p className="mt-2 text-center text-xs sm:text-sm text-gray-600 font-medium">
                  AI-Powered Architectural Visualization
                </p>
              </div>

              <Card className="w-full max-w-md border-0 shadow-none py-0">
                <CardHeader className="px-0">
                  <CardTitle className="text-lg sm:text-xl text-center font-medium">Reset Your Password</CardTitle>
                  <CardDescription className="text-center text-sm sm:text-base">
                    Enter your new password below
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input
                                className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                                placeholder="Enter your new password"
                                type={showPassword ? "text" : "password"}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-black"/>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input
                                className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                                placeholder="Confirm your new password"
                                type={showConfirmPassword ? "text" : "password"}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-black"/>
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showPasswords"
                          className="text-white border-black"
                          checked={showPassword && showConfirmPassword}
                          onCheckedChange={(checked) => {
                            setShowPassword(!!checked);
                            setShowConfirmPassword(!!checked);
                          }}
                        />
                        <label
                          htmlFor="showPasswords"
                          className="text-sm cursor-pointer"
                        >
                          Show passwords
                        </label>
                      </div>

                      <Button
                        variant="ghost"
                        className="border-0 w-full bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm hover:shadow-md"
                        type="submit"
                        disabled={isLoading}
                      >
                        {isLoading ? "Resetting Password..." : "Reset Password"}
                      </Button>
                    </form>
                  </Form>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                      Remember your password?{" "}
                      <a
                        href="/login"
                        className="text-primary hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate("/login");
                        }}
                      >
                        Sign In
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>
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
      <TrustworthyIcons />
    </div>
  );
};

export default ResetPasswordPage;