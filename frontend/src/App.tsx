import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { OcrPage } from "@/features/ocr/pages/OcrPage";
import { HistoryPage } from "@/features/ocr/pages/HistoryPage";
import { Navbar } from "@/components/ui/navbar";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
    </motion.div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { isAuthenticated, logout, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar isAuthenticated={isAuthenticated} onLogout={logout} />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Routes location={location}>
            <Route 
              path="/login" 
              element={
                isAuthenticated ? <Navigate to="/ocr" replace /> : <LoginPage />
              } 
            />
            <Route 
              path="/register" 
              element={
                isAuthenticated ? <Navigate to="/ocr" replace /> : <RegisterPage />
              } 
            />
            <Route
              path="/ocr"
              element={
                <ProtectedRoute>
                  <OcrPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <Navigate to={isAuthenticated ? "/ocr" : "/login"} replace />
              }
            />
          </Routes>
        </motion.main>
      </AnimatePresence>
      <Toaster
        position="top-right"
        toastOptions={{
          className: "!bg-white !text-gray-900 !shadow-lg",
          duration: 4000,
          style: {
            background: "white",
            color: "black",
            padding: "16px",
            borderRadius: "8px",
          },
        }}
      />
    </div>
  );
};

export default App;
