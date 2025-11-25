import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../../hooks/useAuth";
import toast from "react-hot-toast";

// Import ShadCN components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft } from "lucide-react";

// Form validation schema
const formSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormValues = z.infer<typeof formSchema>;

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

const ForgotPasswordForm = ({ onBackToLogin }: ForgotPasswordFormProps) => {
  const [emailSent, setEmailSent] = useState(false);
  const { requestPasswordReset, isLoading } = useAuth();

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
      toast.success("Password reset email sent!");
    } catch (error: any) {
      console.error("Forgot password error:", error);

      // Handle specific error messages from the backend
      let errorMessage = "Something went wrong. Please try again.";

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
          <CardTitle className="text-xl text-center font-medium">Check Your Email</CardTitle>
          <CardDescription className="text-center">
            We've sent a password reset link to your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Check your email for a password reset link. It may take a few minutes to arrive.
            </p>
            <p className="text-sm text-gray-600">
              Don't see the email? Check your spam folder.
            </p>
            <Button
              variant="ghost"
              className="border-0 w-full shadow-none bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm hover:shadow-md"
              onClick={onBackToLogin}
            >
              Back to Sign In
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
          Back to Sign In
        </Button>
        <CardTitle className="text-xl text-center font-medium mt-4">Forgot Password?</CardTitle>
        <CardDescription className="text-center">
          Enter your email address and we'll send you a link to reset your password
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

            <Button
              variant="ghost"
              className="border-0 w-full shadow-none bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm hover:shadow-md"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ForgotPasswordForm;