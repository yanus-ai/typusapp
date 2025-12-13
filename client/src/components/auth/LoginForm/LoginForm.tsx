import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login, reset } from "../../../features/auth/authSlice";
import { useAppDispatch } from "../../../hooks/useAppDispatch";
import { useAppSelector } from "../../../hooks/useAppSelector";
import ForgotPasswordForm from "../ForgotPasswordForm/ForgotPasswordForm";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";

// Import ShadCN components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

type FormValues = {
  email: string;
  password: string;
};

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
  const { t } = useTranslation();

  // Create form schema with translated messages - memoized to update when language changes
  const formSchema = useMemo(() => z.object({
    email: z.string().email(t('auth.emailInvalid')),
    password: z.string().min(1, t('auth.passwordRequired')),
  }), [t]);

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
        toast.success(t('auth.successfullySignedIn'));
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
          const errorMessage = typeof err === 'string' ? err : err?.message || t('auth.failedToSignIn');
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
        <CardTitle className="text-xl text-center font-medium">{t('auth.welcomeBack')}</CardTitle>
        <CardDescription className="text-center">
          {t('auth.signInToContinue')}
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
                  <FormLabel>{t('auth.email')}</FormLabel>
                  <FormControl>
                    <Input 
                      className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder={t('auth.emailPlaceholder')} 
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
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <FormControl>
                    <Input 
                      className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder={t('auth.passwordPlaceholder')} 
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
                  {t('auth.showPassword')}
                </label>
              </div>
              
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:underline"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>
            
            <Button 
              variant={"ghost"}
              className="border-0 w-full bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm hover:shadow-md"
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          {t('auth.dontHaveAccount')}{" "}
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
            {t('auth.signUp')}
          </a>
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;