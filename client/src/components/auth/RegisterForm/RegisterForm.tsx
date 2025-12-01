import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { register as registerUser, reset } from "../../../features/auth/authSlice";
import { useAppDispatch } from "../../../hooks/useAppDispatch";
import { useAppSelector } from "../../../hooks/useAppSelector";
import { useRecaptcha } from "../../../hooks/useRecaptcha";
import toast from "react-hot-toast";
import { useClientLanguage } from "@/hooks/useClientLanguage";

// Import ShadCN components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

interface RegisterFormProps {
  mode?: string | null;
}

type FormValues = {
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptMarketing?: boolean;
};

// Translations
const translations = {
  en: {
    title: "Create Account",
    description: "Enter your details to create a new account",
    email: "Email",
    emailPlaceholder: "Enter your email",
    emailInvalid: "Invalid email address",
    emailMaxLength: "Email must be no more than 100 characters",
    password: "Password",
    passwordPlaceholder: "Create a password",
    passwordMinLength: "Password must be at least 6 characters",
    passwordMaxLength: "Password must be no more than 128 characters",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Confirm your password",
    confirmPasswordMaxLength: "Password must be no more than 128 characters",
    passwordsDontMatch: "Passwords don't match",
    showPassword: "Show password",
    acceptTerms: "I accept the",
    termsOfService: "Terms of Service",
    and: "and",
    privacyPolicy: "Privacy Policy",
    acceptTermsError: "You must accept the terms and conditions",
    acceptMarketing: "I would like to receive marketing emails and updates about new features",
    recaptchaNotice: "This site is protected by reCAPTCHA and the Google",
    recaptchaPrivacyPolicy: "Privacy Policy",
    recaptchaTermsOfService: "Terms of Service",
    recaptchaApply: "apply.",
    signUp: "Sign Up",
    creatingAccount: "Creating Account...",
    alreadyHaveAccount: "Already have an account?",
    signIn: "Sign In",
    recaptchaFailed: "reCAPTCHA verification failed. Please try again.",
    accountCreated: "Account created! Please check your email to verify your account.",
    accountCreatedSuccess: "Account created successfully!",
    failedToCreateAccount: "Failed to create account",
    registrationFailed: "Registration failed. Please try again."
  },
  de: {
    title: "Konto erstellen",
    description: "Geben Sie Ihre Daten ein, um ein neues Konto zu erstellen",
    email: "E-Mail",
    emailPlaceholder: "Geben Sie Ihre E-Mail-Adresse ein",
    emailInvalid: "Ungültige E-Mail-Adresse",
    emailMaxLength: "E-Mail darf nicht mehr als 100 Zeichen enthalten",
    password: "Passwort",
    passwordPlaceholder: "Passwort erstellen",
    passwordMinLength: "Passwort muss mindestens 6 Zeichen lang sein",
    passwordMaxLength: "Passwort darf nicht mehr als 128 Zeichen enthalten",
    confirmPassword: "Passwort bestätigen",
    confirmPasswordPlaceholder: "Passwort bestätigen",
    confirmPasswordMaxLength: "Passwort darf nicht mehr als 128 Zeichen enthalten",
    passwordsDontMatch: "Passwörter stimmen nicht überein",
    showPassword: "Passwort anzeigen",
    acceptTerms: "Ich akzeptiere die",
    termsOfService: "Nutzungsbedingungen",
    and: "und",
    privacyPolicy: "Datenschutzrichtlinie",
    acceptTermsError: "Sie müssen die Nutzungsbedingungen akzeptieren",
    acceptMarketing: "Ich möchte Marketing-E-Mails und Updates zu neuen Funktionen erhalten",
    recaptchaNotice: "Diese Website ist durch reCAPTCHA und die Google",
    recaptchaPrivacyPolicy: "Datenschutzrichtlinie",
    recaptchaTermsOfService: "Nutzungsbedingungen",
    recaptchaApply: "geschützt.",
    signUp: "Registrieren",
    creatingAccount: "Konto wird erstellt...",
    alreadyHaveAccount: "Bereits ein Konto?",
    signIn: "Anmelden",
    recaptchaFailed: "reCAPTCHA-Verifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.",
    accountCreated: "Konto erstellt! Bitte überprüfen Sie Ihre E-Mail, um Ihr Konto zu verifizieren.",
    accountCreatedSuccess: "Konto erfolgreich erstellt!",
    failedToCreateAccount: "Konto konnte nicht erstellt werden",
    registrationFailed: "Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut."
  }
};

// Helper function to get translations
const getTranslations = (language: string | null) => {
  return language === 'de' ? translations.de : translations.en;
};

function RegisterForm(props?: RegisterFormProps) {
  const mode = props?.mode ?? null;
  const language = useClientLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const { getRecaptchaToken, resetRecaptcha } = useRecaptcha();
  const t = getTranslations(language);

  // Create form schema with translated messages - memoized to update when language changes
  const formSchema = useMemo(() => z.object({
    email: z.string().email(t.emailInvalid).max(100, t.emailMaxLength),
    password: z.string().min(6, t.passwordMinLength).max(128, t.passwordMaxLength),
    confirmPassword: z.string().max(128, t.confirmPasswordMaxLength),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: t.acceptTermsError
    }),
    acceptMarketing: z.boolean().optional()
  }).refine(data => data.password === data.confirmPassword, {
    message: t.passwordsDontMatch,
    path: ["confirmPassword"]
  }), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      acceptMarketing: true,
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      // Get reCAPTCHA v3 token
      const recaptchaToken = await getRecaptchaToken('register');

      if (!recaptchaToken) {
        toast.error(t.recaptchaFailed);
        return;
      }

      const { confirmPassword, ...userData } = data;

      // Add recaptcha token to user data
      const userDataWithRecaptcha = {
        ...userData,
        language,
        recaptchaToken
      };

      try {
        const response = await dispatch(registerUser(userDataWithRecaptcha)).unwrap();
        
        if ('emailSent' in response && response.emailSent) {
          toast.success(t.accountCreated);
          // Navigate to login with mode parameter preserved
          const loginUrl = mode ? `/login?m=${mode}` : "/login";
          navigate(loginUrl);
        } else {
          toast.success(t.accountCreatedSuccess);
          // Reset welcome dialog state for new users
          localStorage.removeItem("welcomeSeen");
          localStorage.removeItem("onboardingSeen");
          localStorage.setItem("showWelcome", "true");
          // If user is immediately authenticated after registration, preserve token
          const redirectUrl = response.token ? `/create?token=${response.token}` : "/create";
          navigate(redirectUrl);
        }
      } catch (err: any) {
        toast.error(err || t.failedToCreateAccount);
        resetRecaptcha();
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(t.registrationFailed);
      resetRecaptcha();
    }
  };

  return (
    <Card className="w-full max-w-md border-0 shadow-none py-0">
      <CardHeader className="px-0">
        <CardTitle className="text-xl text-center font-medium">{t.title}</CardTitle>
        <CardDescription className="text-center">
          {t.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {error && (
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
                      className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder={t.emailPlaceholder}
                      type="email"
                      maxLength={100}
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
                      className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder={t.passwordPlaceholder}
                      type={showPassword ? "text" : "password"}
                      maxLength={128}
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
                  <FormLabel>{t.confirmPassword}</FormLabel>
                  <FormControl>
                    <Input
                      className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder={t.confirmPasswordPlaceholder}
                      type={showPassword ? "text" : "password"}
                      maxLength={128}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-black"/>
                </FormItem>
              )}
            />
            
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

            <div className="flex items-start space-x-2">
              <Checkbox
                id="acceptTerms"
                className="text-white border-black mt-0.5"
                checked={form.watch('acceptTerms')}
                onCheckedChange={(checked) => {
                  form.setValue('acceptTerms', checked === true);
                  form.trigger('acceptTerms');
                }}
              />
              <label
                htmlFor="acceptTerms"
                className="text-sm cursor-pointer leading-relaxed"
              >
                {t.acceptTerms}{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t.termsOfService}
                </a>
                {" "}{t.and}{" "}
                <a
                  href="/data-privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t.privacyPolicy}
                </a>
                {" "}*
              </label>
            </div>
            {form.formState.errors.acceptTerms && (
              <p className="text-black text-sm">
                {form.formState.errors.acceptTerms.message}
              </p>
            )}

            <div className="flex items-start space-x-2">
              <Checkbox
                id="acceptMarketing"
                className="text-white border-black mt-0.5"
                checked={form.watch('acceptMarketing')}
                onCheckedChange={(checked) => form.setValue('acceptMarketing', checked === true)}
              />
              <label
                htmlFor="acceptMarketing"
                className="text-sm text-gray-600 cursor-pointer leading-relaxed"
              >
                {t.acceptMarketing}
              </label>
            </div>

            {/* reCAPTCHA v3 Privacy Notice */}
            <div className="text-xs text-gray-500 text-center">
              {t.recaptchaNotice}{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t.recaptchaPrivacyPolicy}
              </a>
              {" "}{t.and}{" "}
              <a
                href="https://policies.google.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t.recaptchaTermsOfService}
              </a>
              {" "}{t.recaptchaApply}
            </div>

            <Button 
              variant={"ghost"}
              className="border-0 w-full bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm hover:shadow-md"
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? t.creatingAccount : t.signUp}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          {t.alreadyHaveAccount}{" "}
          <a
            href="/login"
            className="text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault();
              dispatch(reset());
              const loginUrl = mode ? `/login?m=${mode}` : "/login";
              navigate(loginUrl);
            }}
          >
            {t.signIn}
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}

export default RegisterForm;