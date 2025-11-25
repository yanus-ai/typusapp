import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login, reset } from "../../../features/auth/authSlice";
import { useAppDispatch } from "../../../hooks/useAppDispatch";
import { useAppSelector } from "../../../hooks/useAppSelector";
import ForgotPasswordForm from "../ForgotPasswordForm/ForgotPasswordForm";
import toast from "react-hot-toast";

// Import ShadCN components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

// Form validation schema
const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface LoginFormProps {
  mode?: string | null;
  onEmailVerificationRequired?: (email: string) => void;
}

const LoginForm = ({ mode, onEmailVerificationRequired }: LoginFormProps = {}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    const loginData = { ...data, mode: mode || undefined };
    dispatch(login(loginData))
      .unwrap()
      .then((response) => {
        toast.success("Successfully signed in!");
        // Preserve token in redirect URL
        const redirectUrl = response.token ? `/create?token=${response.token}` : "/create";
        navigate(redirectUrl);
      })
      .catch((err: any) => {
        console.log("Login error:", err);
        // Check if it's an email verification error
        if (err?.emailVerificationRequired === true) {
          const email = err.email || data.email;
          onEmailVerificationRequired?.(email);
          setEmailVerificationRequired(true);
          // Don't show toast or error message - let the modal handle the communication
        } else {
          // Handle other error formats
          const errorMessage = typeof err === 'string' ? err : err?.message || "Failed to sign in";
          toast.error(errorMessage);
        }
      });
  };

  if (showForgotPassword) {
    return (
      <ForgotPasswordForm
        onBackToLogin={() => setShowForgotPassword(false)}
      />
    );
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-none py-0">
      <CardHeader className="px-0">
        <CardTitle className="text-xl text-center font-medium">Welcome Back</CardTitle>
        <CardDescription className="text-center">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {error && !emailVerificationRequired && (
          <div className="bg-black/10 border border-black text-black px-4 py-3 rounded-none mb-4">
            {error}
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      className="border-0 shadow-none bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder="Enter your email" 
                      type="email" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-black"/>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      className="border-0 shadow-none bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder="Enter your password" 
                      type={showPassword ? "text" : "password"} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-black"/>
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showPassword" 
                  className="text-white border-black"
                  checked={showPassword}
                  onCheckedChange={() => setShowPassword(!showPassword)}
                />
                <label 
                  htmlFor="showPassword" 
                  className="text-sm cursor-pointer"
                >
                  Show password
                </label>
              </div>
              
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            
            <Button 
              variant={"ghost"}
              className="border-0 w-full shadow-none bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm hover:shadow-md"
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <a
            href="/register"
            className="text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault();
              dispatch(reset());
              const registerUrl = mode ? `/register?m=${mode}` : "/register";
              navigate(registerUrl);
            }}
          >
            Sign Up
          </a>
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;