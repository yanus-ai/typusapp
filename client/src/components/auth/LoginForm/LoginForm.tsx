import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login, reset } from "../../../features/auth/authSlice";
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
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof formSchema>;

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
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
    dispatch(login(data))
      .unwrap()
      .then(() => {
        toast.success("Successfully signed in!");
        navigate("/create");
      })
      .catch((err) => {
        toast.error(err || "Failed to sign in");
      });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
        <CardDescription className="text-center">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded mb-4 border-red-600 text-red-600">
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
                      placeholder="Enter your password" 
                      type={showPassword ? "text" : "password"} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-600"/>
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-between">
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
              
              <a 
                href="#" 
                className="text-sm text-primary hover:underline"
              >
                Forgot Password?
              </a>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient text-white" 
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
              navigate("/register");
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