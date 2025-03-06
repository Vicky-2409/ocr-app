import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/api";
import axios from "axios";
import { RegisterCredentials } from "@/types/api";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Initialize from localStorage synchronously
    const token = localStorage.getItem("token");
    return !!token;
  });
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem("token");
      const storedUser = authService.getUser();

      if (token && storedUser) {
        setIsAuthenticated(true);
        setUser(storedUser);
      } else {
        // Clear any inconsistent state
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Subscribe to storage events for multi-tab sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token") {
        setIsAuthenticated(!!e.newValue);
        if (!e.newValue) {
          setUser(null);
        } else {
          const storedUser = authService.getUser();
          setUser(storedUser);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      if (response.success && response.data?.token && response.data?.user) {
        const { token, user } = response.data;
        // Update localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        // Update state
        setUser(user);
        setIsAuthenticated(true);
        return response.data;
      }
      throw new Error(response.message || "Login failed");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error(
          "Invalid email or password. Please check your credentials."
        );
      }
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Update state
    setUser(null);
    setIsAuthenticated(false);
    // Navigate after state update
    navigate("/login", { replace: true });
  }, [navigate]);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      const response = await authService.register(credentials);
      if (response.success) {
        return response;
      }
      throw new Error(response.message || "Registration failed");
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    isAuthenticated,
    user,
    isLoading,
    login,
    register,
    logout,
  };
};
