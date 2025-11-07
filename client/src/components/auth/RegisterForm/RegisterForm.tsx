import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { register as registerUser, reset } from "../../../features/auth/authSlice";
import { useAppDispatch } from "../../../hooks/useAppDispatch";
import { useAppSelector } from "../../../hooks/useAppSelector";
import { useRecaptcha } from "../../../hooks/useRecaptcha";
import toast from "react-hot-toast";

// Import ShadCN components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

// Form validation schema
const formSchema = z.object({
  email: z.string().email("Invalid email address").max(100, "Email must be no more than 100 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(128, "Password must be no more than 128 characters"),
  confirmPassword: z.string().max(128, "Password must be no more than 128 characters"),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  }),
  acceptMarketing: z.boolean().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type FormValues = z.infer<typeof formSchema>;

interface RegisterFormProps {
  mode?: string | null;
}

const RegisterForm = (props: RegisterFormProps = {}) => {
  const { mode = null } = props;
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const { getRecaptchaToken, resetRecaptcha } = useRecaptcha();

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
        toast.error("reCAPTCHA verification failed. Please try again.");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...userData } = data;

      // Add recaptcha token to user data
      const userDataWithRecaptcha = {
        ...userData,
        recaptchaToken
      };

      dispatch(registerUser(userDataWithRecaptcha))
        .unwrap()
        .then((response: any) => {
          if (response.emailSent) {
            toast.success("Account created! Please check your email to verify your account.");
            // Navigate to login with mode parameter preserved
            const loginUrl = mode ? `/login?m=${mode}` : "/login";
            navigate(loginUrl);
          } else {
            toast.success("Account created successfully!");
            // Reset welcome dialog state for new users
            localStorage.removeItem("welcomeSeen");
            localStorage.removeItem("onboardingSeen");
            localStorage.setItem("showWelcome", "true");
            // If user is immediately authenticated after registration, preserve token
            const redirectUrl = response.token ? `/create?token=${response.token}` : "/create";
            navigate(redirectUrl);
          }
        })
        .catch((err) => {
          toast.error(err || "Failed to create account");
          resetRecaptcha();
        });
    } catch (error) {
      console.error('Registration error:', error);
      toast.error("Registration failed. Please try again.");
      resetRecaptcha();
    }
  };

  return (
    <Card className="w-full max-w-md border-0 shadow-none py-0">
      <CardHeader className="px-0">
        <CardTitle className="text-xl text-center font-medium">Create Account</CardTitle>
        <CardDescription className="text-center">
          Enter your details to create a new account
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {error && (
          <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded mb-4">
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
                      className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder="Enter your email"
                      type="email"
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
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
                      className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder="Create a password"
                      type={showPassword ? "text" : "password"}
                      maxLength={128}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      className="border-0 bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm"
                      placeholder="Confirm your password"
                      type={showPassword ? "text" : "password"}
                      maxLength={128}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
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
                Show password
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
                I accept the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Terms of Service
                </a>
                {" "}and{" "}
                <a
                  href="/data-privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </a>
                {" "}*
              </label>
            </div>
            {form.formState.errors.acceptTerms && (
              <p className="text-red-600 text-sm">
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
                I would like to receive marketing emails and updates about new features
              </label>
            </div>

            {/* reCAPTCHA v3 Privacy Notice */}
            <div className="text-xs text-gray-500 text-center">
              This site is protected by reCAPTCHA and the Google{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </a>
              {" "}and{" "}
              <a
                href="https://policies.google.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Terms of Service
              </a>
              {" "}apply.
            </div>

            <Button 
              variant={"ghost"}
              className="border-0 w-full bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0 focus-visible:ring-transparent shadow-sm hover:shadow-md"
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
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
            Sign In
          </a>
        </p>
      </CardFooter>
    </Card>
  );
};

export default RegisterForm;