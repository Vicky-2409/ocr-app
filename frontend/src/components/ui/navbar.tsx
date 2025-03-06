import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, History, LogOut, LogIn, UserPlus, Menu, X } from "lucide-react";
import { theme } from "@/lib/theme";

interface NavbarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
    const isActive = location.pathname === to;
    return (
      <Button
        variant="ghost"
        onClick={() => {
          navigate(to);
          setIsMobileMenuOpen(false);
        }}
        className={cn(
          "relative px-4 py-2 text-sm font-medium transition-all",
          "hover:bg-primary-50 hover:text-primary-600",
          isActive ? "text-primary-600" : "text-secondary-600"
        )}
      >
        {children}
        {isActive && (
          <motion.div
            layoutId="navbar-indicator"
            className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary-600"
            initial={false}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </Button>
    );
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 w-full border-b border-secondary-200 bg-background-glass backdrop-blur-lg backdrop-saturate-150"
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex items-center space-x-2 text-primary-600 transition-all hover:text-primary-700"
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <FileText className="h-6 w-6" />
            </motion.div>
            <span className="font-bold text-xl tracking-tight">OCR App</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {isAuthenticated ? (
              <>
                <NavLink to="/ocr">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>OCR</span>
                  </div>
                </NavLink>
                <NavLink to="/history">
                  <div className="flex items-center space-x-2">
                    <History className="h-4 w-4" />
                    <span>History</span>
                  </div>
                </NavLink>
                <Button
                  variant="ghost"
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 text-secondary-600 hover:bg-error-50 hover:text-error-600 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/login")}
                  className="flex items-center space-x-2 text-secondary-600 hover:bg-primary-50 hover:text-primary-600 transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate("/register")}
                  className="flex items-center space-x-2 bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-md hover:shadow-lg"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Register</span>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-secondary-600 hover:bg-secondary-100 transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-secondary-200 bg-white"
          >
            <div className="container mx-auto px-4 py-2 space-y-1">
              {isAuthenticated ? (
                <>
                  <NavLink to="/ocr">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>OCR</span>
                    </div>
                  </NavLink>
                  <NavLink to="/history">
                    <div className="flex items-center space-x-2">
                      <History className="h-4 w-4" />
                      <span>History</span>
                    </div>
                  </NavLink>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      onLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 text-secondary-600 hover:bg-error-50 hover:text-error-600 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate("/login");
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 text-secondary-600 hover:bg-primary-50 hover:text-primary-600 transition-all"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Login</span>
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      navigate("/register");
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Register</span>
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
