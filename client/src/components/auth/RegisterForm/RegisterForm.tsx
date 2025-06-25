import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { register as registerUser, reset } from "../../../features/auth/authSlice";
import { useAppDispatch } from "../../../hooks/useAppDispatch";
import { useAppSelector } from "../../../hooks/useAppSelector";
import toast from "react-hot-toast";

// Import ShadCN components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

// Form validation schema
const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type FormValues = z.infer<typeof formSchema>;

const RegisterForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    const { confirmPassword, ...userData } = data;
    dispatch(registerUser(userData))
      .unwrap()
      .then(() => {
        toast.success("Account created successfully!");
        navigate("/create");
      })
      .catch((err) => {
        toast.error(err || "Failed to create account");
      });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Enter your details to create a new account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      className="focus-visible:ring"
                      placeholder="Enter your full name" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      className="focus-visible:ring"
                      placeholder="Enter your email" 
                      type="email" 
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
                      className="focus-visible:ring"
                      placeholder="Create a password" 
                      type={showPassword ? "text" : "password"} 
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
                      className="focus-visible:ring"
                      placeholder="Confirm your password" 
                      type={showPassword ? "text" : "password"} 
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
            
            <Button 
              type="submit" 
              className="w-full" 
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
              navigate("/login");
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