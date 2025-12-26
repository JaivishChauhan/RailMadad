import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "../ui/Logo";
import { Role } from "../../types";
import { usePassengerAuth } from "../../hooks/usePassengerAuth";
import { useAdminAuth } from "../../hooks/useAdminAuth";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const passengerAuth = usePassengerAuth();
  const adminAuth = useAdminAuth();

  // Determine which user to show in header and what buttons to display
  const onAdminRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/dashboard");

  // Determine the active user and appropriate greeting
  const currentUser = onAdminRoute ? adminAuth.user : passengerAuth.user;
  const isFirstTime = false; // You can implement login history logic here if needed
  const greeting = isFirstTime ? "Welcome" : "Welcome back";

  const handleLogout = () => {
    if (onAdminRoute && adminAuth.user) {
      adminAuth.logout();
      navigate("/admin-login");
    } else if (passengerAuth.user) {
      passengerAuth.logout();
      navigate("/");
    }
  };

  return (
    <header className="bg-gray-50 sticky top-0 z-20 shadow-md">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between flex-wrap gap-y-2 py-2 sm:py-3">
          {/* Left side logos - hidden on small mobile, shown on larger screens */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-4">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Government_of_India_logo.svg/2560px-Government_of_India_logo.svg.png"
              alt="Government of India"
              className="h-8 sm:h-10 md:h-12"
            />
            <img
              src="https://thecsmentors.com/wp-content/uploads/2023/08/G20_India_2023_logo.svg.png"
              alt="G20 Logo"
              className="h-10 sm:h-12 md:h-14"
            />
          </div>

          {/* Center title with logo beside it */}
          <div className="flex items-center justify-start sm:justify-center order-first w-auto sm:order-none sm:flex-grow">
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
              <Logo size="lg" className="h-10 sm:h-12 md:h-14" />
              <div>
                <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary leading-tight">
                  RailMadad
                </h1>
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-800">
                  For Inquiry, Assistance & Grievance Redressal
                </p>
              </div>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className="text-center">
              <a
                href="tel:139"
                className="block text-white bg-primary p-1.5 sm:p-2 rounded-lg no-underline animate-color-change hover:bg-red-800"
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C6.477 18 2 13.523 2 8V3z" />
                  </svg>
                  <span className="text-lg sm:text-xl md:text-2xl font-bold">
                    139
                  </span>
                </div>
              </a>
              <p className="text-[8px] sm:text-[10px] md:text-xs text-gray-800 mt-0.5 sm:mt-1">
                For Security/Medical Assistance
              </p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
              {/* Simplified header: Show user info when logged in, simple Login when not */}
              {currentUser ? (
                <>
                  <span className="hidden sm:inline text-xs sm:text-sm text-gray-600">
                    {greeting}, {currentUser.fullName || currentUser.email}
                  </span>
                  {onAdminRoute ||
                  currentUser.role === Role.OFFICIAL ||
                  currentUser.role === Role.SUPER_ADMIN ||
                  currentUser.role === Role.MODERATOR ? (
                    <Link to="/dashboard" title="Go to Admin Dashboard">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                      >
                        Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/status" title="View My Dashboard">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                      >
                        My Dashboard
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to={onAdminRoute ? "/admin-login" : "/passenger-login"}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                    >
                      Login
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                    onClick={() => {
                      console.log("Clearing all localStorage...");
                      localStorage.clear();
                      console.log("localStorage cleared. Reloading page...");
                      window.location.reload();
                    }}
                    title="Force clear all sessions and reload"
                  >
                    Reset
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
