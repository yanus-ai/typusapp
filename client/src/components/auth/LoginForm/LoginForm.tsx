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
import { useClientLanguage } from "@/hooks/useClientLanguage";

// Import ShadCN components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

// Translations
const translations = {
  en: {
    welcomeBack: "Welcome Back",
    signInToContinue: "Sign in to your account to continue",
    email: "Email",
    emailPlaceholder: "Enter your email",
    emailInvalid: "Invalid email address",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    passwordRequired: "Password is required",
    showPassword: "Show password",
    forgotPassword: "Forgot Password?",
    signingIn: "Signing In...",
    signIn: "Sign In",
    dontHaveAccount: "Don't have an account?",
    signUp: "Sign Up",
    successfullySignedIn: "Successfully signed in!",
    failedToSignIn: "Failed to sign in"
  },
  de: {
    welcomeBack: "Willkommen zurück",
    signInToContinue: "Melden Sie sich in Ihrem Konto an, um fortzufahren",
    email: "E-Mail",
    emailPlaceholder: "Geben Sie Ihre E-Mail-Adresse ein",
    emailInvalid: "Ungültige E-Mail-Adresse",
    password: "Passwort",
    passwordPlaceholder: "Geben Sie Ihr Passwort ein",
    passwordRequired: "Passwort ist erforderlich",
    showPassword: "Passwort anzeigen",
    forgotPassword: "Passwort vergessen?",
    signingIn: "Wird angemeldet...",
    signIn: "Anmelden",
    dontHaveAccount: "Noch kein Konto?",
    signUp: "Registrieren",
    successfullySignedIn: "Erfolgreich angemeldet!",
    failedToSignIn: "Anmeldung fehlgeschlagen"
  }
};

// Helper function to get translations
const getTranslations = (language: string | null) => {
  return language === 'de' ? translations.de : translations.en;
};

type FormValues = {
  email: string;
  password: string;
};

interface LoginFormProps {
  mode?: string | null;
  language?: string | null;
  onEmailVerificationRequired?: (email: string) => void;
}

const LoginForm = ({ mode, language, onEmailVerificationRequired }: LoginFormProps = {}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  
  // Use client language if not provided as prop
  const clientLanguage = useClientLanguage();
  const detectedLanguage = language || clientLanguage;
  const t = useMemo(() => getTranslations(detectedLanguage), [detectedLanguage]);

  // Create form schema with translated messages - memoized to update when language changes
  const formSchema = useMemo(() => z.object({
    email: z.string().email(t.emailInvalid),
    password: z.string().min(1, t.passwordRequired),
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
        toast.success(t.successfullySignedIn);
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
          const errorMessage = typeof err === 'string' ? err : err?.message || t.failedToSignIn;
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
        <CardTitle className="text-xl text-center font-medium">{t.welcomeBack}</CardTitle>
        <CardDescription className="text-center">
          {t.signInToContinue}
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
                  <FormLabel>{t.email}</FormLabel>
                  <FormControl>
                    <Input 
                      className="border-0 shadow-none bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder={t.emailPlaceholder} 
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
                  <FormLabel>{t.password}</FormLabel>
                  <FormControl>
                    <Input 
                      className="border-0 shadow-none bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder={t.passwordPlaceholder} 
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
                  {t.showPassword}
                </label>
              </div>
              
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:underline"
              >
                {t.forgotPassword}
              </button>
            </div>
            
            <Button 
              variant={"ghost"}
              className="border-0 w-full shadow-none bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm hover:shadow-md"
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? t.signingIn : t.signIn}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          {t.dontHaveAccount}{" "}
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
            {t.signUp}
          </a>
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;