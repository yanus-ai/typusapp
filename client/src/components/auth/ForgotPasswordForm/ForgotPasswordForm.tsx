import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../../hooks/useAuth";
import toast from "react-hot-toast";
import { useClientLanguage } from "@/hooks/useClientLanguage";

// Import ShadCN components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";

// Translations
const translations = {
  en: {
    backToSignIn: "Back to Sign In",
    forgotPassword: "Forgot Password?",
    enterEmailDescription: "Enter your email address and we'll send you a link to reset your password",
    email: "Email",
    emailPlaceholder: "Enter your email",
    emailInvalid: "Invalid email address",
    sending: "Sending...",
    sendResetLink: "Send Reset Link",
    passwordResetEmailSent: "Password reset email sent!",
    somethingWentWrong: "Something went wrong. Please try again.",
    checkYourEmail: "Check Your Email",
    emailSentDescription: "We've sent a password reset link to your email address",
    checkEmailMessage: "Check your email for a password reset link. It may take a few minutes to arrive.",
    checkSpamFolder: "Don't see the email? Check your spam folder."
  },
  de: {
    backToSignIn: "Zurück zur Anmeldung",
    forgotPassword: "Passwort vergessen?",
    enterEmailDescription: "Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts",
    email: "E-Mail",
    emailPlaceholder: "Geben Sie Ihre E-Mail-Adresse ein",
    emailInvalid: "Ungültige E-Mail-Adresse",
    sending: "Wird gesendet...",
    sendResetLink: "Link zum Zurücksetzen senden",
    passwordResetEmailSent: "E-Mail zum Zurücksetzen des Passworts gesendet!",
    somethingWentWrong: "Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.",
    checkYourEmail: "Überprüfen Sie Ihre E-Mail",
    emailSentDescription: "Wir haben einen Link zum Zurücksetzen des Passworts an Ihre E-Mail-Adresse gesendet",
    checkEmailMessage: "Überprüfen Sie Ihre E-Mail auf einen Link zum Zurücksetzen des Passworts. Es kann einige Minuten dauern, bis er ankommt.",
    checkSpamFolder: "E-Mail nicht gefunden? Überprüfen Sie Ihren Spam-Ordner."
  }
};

// Helper function to get translations
const getTranslations = (language: string | null) => {
  return language === 'de' ? translations.de : translations.en;
};

type FormValues = {
  email: string;
};

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

const ForgotPasswordForm = ({ onBackToLogin }: ForgotPasswordFormProps) => {
  const [emailSent, setEmailSent] = useState(false);
  const { requestPasswordReset, isLoading } = useAuth();
  const language = useClientLanguage();
  const t = useMemo(() => getTranslations(language), [language]);

  // Create form schema with translated messages - memoized to update when language changes
  const formSchema = useMemo(() => z.object({
    email: z.string().email(t.emailInvalid),
  }), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await requestPasswordReset(data.email);
      setEmailSent(true);
      toast.success(t.passwordResetEmailSent);
    } catch (error: any) {
      console.error("Forgot password error:", error);

      // Handle specific error messages from the backend
      let errorMessage = t.somethingWentWrong;

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    }
  };

  if (emailSent) {
    return (
      <Card className="w-full max-w-md border-0 shadow-none py-0">
        <CardHeader className="px-0">
          <CardTitle className="text-xl text-center font-medium">{t.checkYourEmail}</CardTitle>
          <CardDescription className="text-center">
            {t.emailSentDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              {t.checkEmailMessage}
            </p>
            <p className="text-sm text-gray-600">
              {t.checkSpamFolder}
            </p>
            <Button
              variant="ghost"
              className="border-0 w-full bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm hover:shadow-md"
              onClick={onBackToLogin}
            >
              {t.backToSignIn}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-none py-0">
      <CardHeader className="px-0">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit p-0 h-auto hover:bg-transparent"
          onClick={onBackToLogin}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.backToSignIn}
        </Button>
        <CardTitle className="text-xl text-center font-medium mt-4">{t.forgotPassword}</CardTitle>
        <CardDescription className="text-center">
          {t.enterEmailDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-black"/>
                </FormItem>
              )}
            />

            <Button
              variant="ghost"
              className="border-0 w-full bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm hover:shadow-md"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? t.sending : t.sendResetLink}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ForgotPasswordForm;