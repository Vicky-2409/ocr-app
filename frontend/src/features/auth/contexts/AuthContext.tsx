import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/api";
import axios from "axios";
import { User } from "@/types/api";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = localStorage.getItem("token");
    return !!token;
  });
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem("token");
      const storedUser = authService.getUser();

      if (token && storedUser) {
        setIsAuthenticated(true);
        setUser(storedUser);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

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
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
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
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
    navigate("/login", { replace: true });
  }, [navigate]);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const response = await authService.register(name, email, password);
        if (response.success) {
          return response;
        }
        throw new Error(response.message || "Registration failed");
      } catch (error) {
        throw error;
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
