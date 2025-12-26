import React from "react";
import type { User } from "../types";
import { Role } from "../types";
import { usePassengerAuth } from "./usePassengerAuth";
import { useAdminAuth } from "./useAdminAuth";

/**
 * This hook is a wrapper around the role-specific hooks and should
 * primarily be used for backward compatibility or general pages.
 * For specific sections, use the role-specific hooks directly.
 */
export const useAuth = () => {
  // Get access to both auth contexts
  const passengerAuth = usePassengerAuth();
  const adminAuth = useAdminAuth();

  // Infer which auth to use based on user's current location
  const isOnAdminRoute =
    window.location.pathname.startsWith("/dashboard") ||
    window.location.pathname.startsWith("/admin");

  // Choose the appropriate auth context based on URL
  const auth = isOnAdminRoute ? adminAuth : passengerAuth;

  // Special combined login that handles role detection
  const login = async (
    email: string,
    password: string,
    expectedRole?: Role
  ): Promise<boolean> => {
    // Try specific auth based on expected role or email pattern
    if (expectedRole === Role.OFFICIAL || email.includes("official")) {
      return adminAuth.login(email, password);
    } else if (expectedRole === Role.PASSENGER || email.includes("passenger")) {
      return passengerAuth.login(email, password);
    }

    // If no role hint, try passenger first, then admin
    const passengerResult = await passengerAuth.login(email, password);
    if (passengerResult) return true;

    return adminAuth.login(email, password);
  };

  return {
    ...auth,
    login,
  };
};
