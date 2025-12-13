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
import { useTranslation } from "@/hooks/useTranslation";

// Import ShadCN components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useOnboardingKeys } from "@/components/onboarding/hooks/useOnboardingKeys";

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

function RegisterForm(props?: RegisterFormProps) {
  const mode = props?.mode ?? null;
  const { t, currentLanguage } = useTranslation();
  const { welcomeSeenKey, onboardingSeenKey, showWelcomeKey } = useOnboardingKeys();
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const { getRecaptchaToken, resetRecaptcha } = useRecaptcha();

  // Create form schema with translated messages - memoized to update when language changes
  const formSchema = useMemo(() => z.object({
    email: z.string().email(t('auth.emailInvalid')).max(100, t('auth.emailMaxLength')),
    password: z.string().min(6, t('auth.passwordMinLength')).max(128, t('auth.passwordMaxLength')),
    confirmPassword: z.string().max(128, t('auth.confirmPasswordMaxLength')),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: t('auth.acceptTermsError')
    }),
    acceptMarketing: z.boolean().optional()
  }).refine(data => data.password === data.confirmPassword, {
    message: t('auth.passwordsDontMatch'),
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
        toast.error(t('auth.recaptchaFailed'));
        return;
      }

      const { confirmPassword, ...userData } = data;

      // Add recaptcha token to user data
      const userDataWithRecaptcha = {
        ...userData,
        language: currentLanguage,
        recaptchaToken
      };

      try {
        const response = await dispatch(registerUser(userDataWithRecaptcha)).unwrap();
        
        if ('emailSent' in response && response.emailSent) {
          toast.success(t('auth.accountCreated'));
          // Navigate to login with mode parameter preserved
          const loginUrl = mode ? `/login?m=${mode}` : "/login";
          navigate(loginUrl);
        } else {
          toast.success(t('auth.accountCreatedSuccess'));
          // Reset welcome dialog state for new users
          localStorage.removeItem(welcomeSeenKey);
          localStorage.removeItem(onboardingSeenKey);
          localStorage.setItem(showWelcomeKey, "true");
          // If user is immediately authenticated after registration, preserve token
          const redirectUrl = response.token ? `/create?token=${response.token}` : "/create";
          navigate(redirectUrl);
        }
      } catch (err: any) {
        toast.error(err || t('auth.failedToCreateAccount'));
        resetRecaptcha();
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(t('auth.registrationFailed'));
      resetRecaptcha();
    }
  };

  return (
    <Card className="w-full max-w-md border-0 shadow-none py-0">
      <CardHeader className="px-0">
        <CardTitle className="text-xl text-center font-medium">{t('auth.createAccount')}</CardTitle>
        <CardDescription className="text-center">
          {t('auth.enterDetailsToCreate')}
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
                  <FormLabel>{t('auth.email')}</FormLabel>
                  <FormControl>
                    <Input
                      className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder={t('auth.emailPlaceholder')}
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
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <FormControl>
                    <Input
                      className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder={t('auth.createPasswordPlaceholder')}
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
                  <FormLabel>{t('auth.confirmPassword')}</FormLabel>
                  <FormControl>
                    <Input
                      className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder={t('auth.confirmPasswordPlaceholder')}
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
                {t('auth.showPassword')}
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
                {t('auth.acceptTerms')}{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t('auth.termsOfService')}
                </a>
                {" "}{t('auth.and')}{" "}
                <a
                  href="/data-privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t('auth.privacyPolicy')}
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
                {t('auth.acceptMarketing')}
              </label>
            </div>

            {/* reCAPTCHA v3 Privacy Notice */}
            <div className="text-xs text-gray-500 text-center">
              {t('auth.recaptchaNotice')}{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t('auth.recaptchaPrivacyPolicy')}
              </a>
              {" "}{t('auth.and')}{" "}
              <a
                href="https://policies.google.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t('auth.recaptchaTermsOfService')}
              </a>
              {" "}{t('auth.recaptchaApply')}
            </div>

            <Button 
              variant={"ghost"}
              className="border-0 w-full bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm hover:shadow-md"
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? t('auth.creatingAccount') : t('auth.signUp')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          {t('auth.alreadyHaveAccount')}{" "}
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
            {t('auth.signIn')}
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}

export default RegisterForm;