import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { LoginCredentials } from "@/types/api";
import { Input } from "@/components/ui/input";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  isLoading: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  isLoading,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    watch,
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const email = watch("email");
  const password = watch("password");

  const getEmailWarning = () => {
    if (!touchedFields.email) return null;
    if (!email) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Please enter a valid email address";
    return null;
  };

  const getPasswordWarning = () => {
    if (!touchedFields.password) return null;
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <div className="relative">
          <Input
            type="text"
            id="email"
            {...register("email")}
            className={`w-full ${
              touchedFields.email && errors.email ? "border-red-500" : ""
            }`}
            placeholder="Enter your email"
            autoComplete="email"
          />
          {touchedFields.email && errors.email && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          )}
        </div>
        {touchedFields.email && errors.email && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="mr-1 h-4 w-4" />
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            id="password"
            {...register("password")}
            className={`w-full ${
              touchedFields.password && errors.password ? "border-red-500" : ""
            }`}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
          {touchedFields.password && errors.password && (
            <div className="absolute inset-y-0 right-10 pr-3 flex items-center pointer-events-none">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          )}
        </div>
        {touchedFields.password && errors.password && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="mr-1 h-4 w-4" />
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
};
