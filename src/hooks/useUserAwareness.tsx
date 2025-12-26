import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { UserAwarenessManager } from "../services/userAwarenessManager";
import { type UserContext, type UserPreferences, type User } from "../types";
import {
  useErrorHandler,
  handleUserAwarenessError,
  handleContextError,
} from "../utils/errorHandler";
import {
  useDegradation,
  createFallbackUserContext,
  DegradationLevel,
} from "../utils/gracefulDegradation";
import { usePassengerAuth } from "./usePassengerAuth";
import { useAdminAuth } from "./useAdminAuth";

// Real-time feature interfaces (duplicated from useRealTimeContext for compatibility)
interface ContextTransition {
  type:
    | "login"
    | "logout"
    | "role_change"
    | "preference_update"
    | "session_refresh"
    | "error_recovery";
  from: UserContext | null;
  to: UserContext;
  timestamp: number;
  duration?: number;
  smooth: boolean;
  metadata?: Record<string, any>;
}

interface UpdateIndicator {
  isActive: boolean;
  progress: number;
  message?: string;
  type?: "loading" | "updating" | "syncing" | "error" | "success";
}

/**
 * Custom hook for user awareness with optimized performance and real-time features
 *
 * Provides:
 * - Real-time user context updates with smooth transitions
 * - Debounced context changes with update indicators
 * - Error handling and recovery with rollback capabilities
 * - Loading states with progress tracking
 * - Context manipulation methods with optimistic updates
 * - Transition tracking and UI synchronization
 * - Integration with authentication providers
 */
export const useUserAwareness = (
  componentId?: string,
  enableRealTimeFeatures = false
) => {
  // Get authentication state from providers
  const passengerAuth = usePassengerAuth();
  const adminAuth = useAdminAuth();

  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Enhanced real-time state
  const [updateIndicator, setUpdateIndicator] = useState<UpdateIndicator>({
    isActive: false,
    progress: 0,
  });
  const [lastTransition, setLastTransition] =
    useState<ContextTransition | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Error handling and degradation - memoize to prevent infinite re-renders
  const { handleUserAwarenessError: reportError } = useErrorHandler();
  const degradationHook = useDegradation();
  const degradationLevel = degradationHook.level;

  // Memoize functions to prevent dependency changes
  const isFeatureAvailable = useCallback(
    (feature: string) => degradationHook.isFeatureAvailable(feature as any),
    [degradationHook.isFeatureAvailable]
  );

  const createFallbackContext = useCallback(
    (level?: DegradationLevel) => degradationHook.createFallbackContext(level),
    [degradationHook.createFallbackContext]
  );

  const [hasRecoveryFailed, setHasRecoveryFailed] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const maxRecoveryAttempts = 3;

  const managerRef = useRef<UserAwarenessManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const unsubscribeIndicatorRef = useRef<(() => void) | null>(null);
  const unsubscribeTransitionRef = useRef<(() => void) | null>(null);
  const unsubscribeErrorRef = useRef<(() => void) | null>(null);
  const componentIdRef = useRef(
    componentId ||
      `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const passengerAuthRef = useRef(passengerAuth);
  const adminAuthRef = useRef(adminAuth);

  // Update refs when auth state changes
  useEffect(() => {
    passengerAuthRef.current = passengerAuth;
    adminAuthRef.current = adminAuth;
  }, [passengerAuth, adminAuth]);

  // Memoize the attemptRecovery function to prevent re-renders
  const attemptRecovery = useCallback(async () => {
    if (recoveryAttempts >= maxRecoveryAttempts) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `⚠️ Max recovery attempts (${maxRecoveryAttempts}) reached for ${componentIdRef.current}`
        );
      }
      setHasRecoveryFailed(true);

      // Use fallback context when all recovery attempts fail
      const fallbackContext = createFallbackContext(DegradationLevel.MINIMAL);
      setUserContext(fallbackContext);
      setIsLoading(false);
      return;
    }

    setRecoveryAttempts((prev) => prev + 1);
    if (process.env.NODE_ENV === "development") {
      console.log(
        `🔧 Attempting recovery for ${componentIdRef.current} (attempt ${
          recoveryAttempts + 1
        }/${maxRecoveryAttempts})`
      );
    }

    try {
      // Wait before retry with exponential backoff
      const delay = Math.pow(2, recoveryAttempts) * 1000; // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Try to reinitialize
      if (managerRef.current) {
        const context = await managerRef.current.getCurrentContext(
          passengerAuthRef.current.user,
          adminAuthRef.current.user
        );
        setUserContext(context);
        setError(null);
        setIsLoading(false);
        if (process.env.NODE_ENV === "development") {
          console.log(`✅ Recovery successful for ${componentIdRef.current}`);
        }
        return;
      }
    } catch (recoveryError) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `❌ Recovery attempt ${recoveryAttempts + 1} failed for ${
            componentIdRef.current
          }:`,
          recoveryError
        );
      }
    }

    // If this was the last attempt, mark as failed
    if (recoveryAttempts + 1 >= maxRecoveryAttempts) {
      setHasRecoveryFailed(true);
      const fallbackContext = createFallbackContext(DegradationLevel.MINIMAL);
      setUserContext(fallbackContext);
      setIsLoading(false);
    }
  }, [recoveryAttempts, maxRecoveryAttempts, createFallbackContext]);

  // Initialize manager and subscription
  useEffect(() => {
    let mounted = true;

    const initializeAwareness = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setHasRecoveryFailed(false);

        // Check if user awareness is available at current degradation level
        if (!isFeatureAvailable("userAwareness")) {
          if (process.env.NODE_ENV === "development") {
            console.log(
              "🗺 User awareness disabled due to degradation level:",
              degradationLevel
            );
          }
          const fallbackContext = createFallbackContext(degradationLevel);
          setUserContext(fallbackContext);
          setIsLoading(false);
          return;
        }

        // Get manager instance
        managerRef.current = UserAwarenessManager.getInstance();

        // Subscribe to context changes with error handling
        unsubscribeRef.current = managerRef.current.subscribeToContext(
          componentIdRef.current,
          (context: UserContext) => {
            if (mounted) {
              setUserContext(context);
              setIsLoading(false);
              setError(null);
              setRecoveryAttempts(0); // Reset recovery attempts on success
            }
          }
        );

        // Subscribe to error events for this component
        unsubscribeErrorRef.current = managerRef.current.subscribeToErrors(
          componentIdRef.current,
          (errorReport) => {
            if (mounted) {
              handleComponentError(errorReport);
            }
          }
        );

        // Update context with current auth state
        if (passengerAuth.user || adminAuth.user) {
          await managerRef.current.updateWithAuthProviders(
            passengerAuth.user,
            adminAuth.user
          );
        }

        // Subscribe to real-time features if enabled and available
        if (enableRealTimeFeatures && isFeatureAvailable("realTimeUpdates")) {
          // Update indicator subscription
          if (isFeatureAvailable("realTimeUpdates")) {
            unsubscribeIndicatorRef.current =
              managerRef.current.subscribeToUpdateIndicator(
                `${componentIdRef.current}-indicator`,
                (isUpdating, progress = 0) => {
                  if (mounted) {
                    setUpdateIndicator({
                      isActive: isUpdating,
                      progress,
                      type: isUpdating ? "updating" : undefined,
                    });
                  }
                }
              );
          }

          // Transition subscription
          if (isFeatureAvailable("contextTransitions")) {
            unsubscribeTransitionRef.current =
              managerRef.current.subscribeToTransitions(
                `${componentIdRef.current}-transition`,
                (transition) => {
                  if (mounted) {
                    setLastTransition(transition);
                    setIsTransitioning(true);

                    // Clear previous transition timeout
                    if (transitionTimeoutRef.current) {
                      clearTimeout(transitionTimeoutRef.current);
                    }

                    // Set timeout to clear transitioning state
                    const transitionDuration = transition.smooth ? 300 : 600;
                    transitionTimeoutRef.current = setTimeout(() => {
                      if (mounted) {
                        setIsTransitioning(false);
                      }
                    }, transitionDuration);
                  }
                }
              );
          }
        }

        if (process.env.NODE_ENV === "development") {
          // console.log(`🎯 useUserAwareness initialized for ${componentIdRef.current} (realtime: ${enableRealTimeFeatures}, degradation: ${degradationLevel})`);
        }
      } catch (err) {
        if (mounted) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to initialize user awareness";
          setError(errorMessage);
          setIsLoading(false);

          // Report error and attempt recovery
          reportError(err instanceof Error ? err : new Error(errorMessage), {
            component: componentIdRef.current,
            operation: "initialization",
            degradationLevel,
          });

          await attemptRecovery();
        }
        // console.error('❌ Failed to initialize useUserAwareness:', err);
      }
    };

    const handleComponentError = (errorReport: any) => {
      const errorMessage = `Component error: ${
        errorReport.message || "Unknown error"
      }`;
      setError(errorMessage);

      // Attempt recovery if not already failed
      if (!hasRecoveryFailed && recoveryAttempts < maxRecoveryAttempts) {
        attemptRecovery();
      }
    };

    initializeAwareness();

    // Cleanup function
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (unsubscribeIndicatorRef.current) {
        unsubscribeIndicatorRef.current();
        unsubscribeIndicatorRef.current = null;
      }
      if (unsubscribeTransitionRef.current) {
        unsubscribeTransitionRef.current();
        unsubscribeTransitionRef.current = null;
      }
      if (unsubscribeErrorRef.current) {
        unsubscribeErrorRef.current();
        unsubscribeErrorRef.current = null;
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [
    enableRealTimeFeatures,
    degradationLevel,
    isFeatureAvailable,
    createFallbackContext,
  ]);

  // Listen for authentication changes and update context
  useEffect(() => {
    if (!managerRef.current) return;

    const updateContextWithAuth = async () => {
      try {
        if (process.env.NODE_ENV === "development") {
          console.log("🔄 Auth state changed, updating user context:", {
            hasPassenger: !!passengerAuth.user,
            hasAdmin: !!adminAuth.user,
            passengerLoading: passengerAuth.loading,
            adminLoading: adminAuth.loading,
          });
        }

        // Wait for auth to finish loading
        if (passengerAuth.loading || adminAuth.loading) {
          return;
        }

        // Update context with current auth state
        if (managerRef.current) {
          await managerRef.current.updateWithAuthProviders(
            passengerAuth.user,
            adminAuth.user
          );
        }
      } catch (error) {
        console.error("❌ Failed to update context with auth state:", error);
        setError("Failed to update authentication state");
      }
    };

    updateContextWithAuth();
  }, [
    passengerAuth.user,
    adminAuth.user,
    passengerAuth.loading,
    adminAuth.loading,
  ]);

  // Update user preferences with loading state
  const updatePreferences = useCallback(
    async (preferences: Partial<UserPreferences>): Promise<boolean> => {
      if (!managerRef.current) {
        setError("User awareness manager not initialized");
        return false;
      }

      try {
        setIsUpdating(true);
        setError(null);

        const success = await managerRef.current.updateUserPreferences(
          preferences
        );

        if (!success) {
          setError("Failed to update user preferences");
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update preferences";
        setError(errorMessage);
        console.error("❌ Failed to update preferences:", err);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  // Set user context (for auth changes)
  const setUser = useCallback(async (user: User | null): Promise<void> => {
    if (!managerRef.current) {
      setError("User awareness manager not initialized");
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      await managerRef.current.setUserContext(user);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to set user context";
      setError(errorMessage);
      console.error("❌ Failed to set user context:", err);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Clear user context (for logout)
  const clearUser = useCallback(async (): Promise<void> => {
    if (!managerRef.current) {
      setError("User awareness manager not initialized");
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      await managerRef.current.clearUserContext();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to clear user context";
      setError(errorMessage);
      console.error("❌ Failed to clear user context:", err);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Refresh context manually
  const refreshContext = useCallback(async (): Promise<void> => {
    if (!managerRef.current) {
      setError("User awareness manager not initialized");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await managerRef.current.refreshContext(
        true,
        passengerAuth.user,
        adminAuth.user
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh context";
      setError(errorMessage);
      console.error("❌ Failed to refresh context:", err);
    } finally {
      setIsLoading(false);
    }
  }, [passengerAuth.user, adminAuth.user]);

  // Get manager statistics
  const getStats = useCallback(() => {
    if (!managerRef.current) {
      return null;
    }

    return managerRef.current.getManagerStats();
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Derived state
  const isAuthenticated = userContext?.isAuthenticated ?? false;
  const user = userContext?.user ?? null;
  const role = userContext?.role ?? null;
  const capabilities = userContext?.capabilities ?? [];
  const preferences = userContext?.preferences ?? null;
  const sessionInfo = userContext?.sessionInfo ?? null;

  // Helper functions
  const hasCapability = useCallback(
    (capability: string): boolean => {
      return capabilities.includes(capability);
    },
    [capabilities]
  );

  const hasRole = useCallback(
    (targetRole: string): boolean => {
      return role === targetRole;
    },
    [role]
  );

  const hasAnyRole = useCallback(
    (targetRoles: string[]): boolean => {
      return role !== null && targetRoles.includes(role);
    },
    [role]
  );

  const contextValue = useMemo(
    () => ({
      // State
      userContext,
      isLoading,
      error,
      isUpdating,

      // Error handling and recovery
      hasRecoveryFailed,
      recoveryAttempts,
      degradationLevel,

      // Real-time features (available when enableRealTimeFeatures is true)
      updateIndicator,
      lastTransition,
      isTransitioning,

      // Derived state
      isAuthenticated,
      user,
      role,
      capabilities,
      preferences,
      sessionInfo,

      // Actions
      updatePreferences,
      setUser,
      clearUser,
      refreshContext,
      clearError,

      // Helper functions
      hasCapability,
      hasRole,
      hasAnyRole,

      // Utilities
      getStats,
      componentId: componentIdRef.current,
    }),
    [
      userContext,
      isLoading,
      error,
      isUpdating,
      hasRecoveryFailed,
      recoveryAttempts,
      degradationLevel,
      updateIndicator,
      lastTransition,
      isTransitioning,
      isAuthenticated,
      user,
      role,
      capabilities,
      preferences,
      sessionInfo,
      updatePreferences,
      setUser,
      clearUser,
      refreshContext,
      clearError,
      hasCapability,
      hasRole,
      hasAnyRole,
      getStats,
    ]
  );

  return contextValue;
};

/**
 * Hook for checking if user has specific capabilities
 */
export const useUserCapabilities = (requiredCapabilities: string[]) => {
  const { capabilities, isLoading, isAuthenticated } = useUserAwareness();

  const hasAllCapabilities = capabilities.every((cap) =>
    requiredCapabilities.includes(cap)
  );

  const hasAnyCapability = requiredCapabilities.some((cap) =>
    capabilities.includes(cap)
  );

  const missingCapabilities = requiredCapabilities.filter(
    (cap) => !capabilities.includes(cap)
  );

  return {
    hasAllCapabilities,
    hasAnyCapability,
    missingCapabilities,
    isLoading,
    isAuthenticated,
    capabilities,
  };
};

/**
 * Hook for role-based access control
 */
export const useRoleAccess = (allowedRoles: string[]) => {
  const { role, isLoading, isAuthenticated } = useUserAwareness();

  const hasAccess = role !== null && allowedRoles.includes(role);
  const isRestricted = !hasAccess && isAuthenticated;
  const needsAuth = !isAuthenticated;

  return {
    hasAccess,
    isRestricted,
    needsAuth,
    currentRole: role,
    allowedRoles,
    isLoading,
  };
};

/**
 * Enhanced hook with real-time features enabled by default
 */
export const useEnhancedUserAwareness = (componentId?: string) => {
  return useUserAwareness(componentId, true);
};

/**
 * Hook specifically for components that need smooth transitions
 */
export const useUserAwarenessWithTransitions = (componentId?: string) => {
  const awareness = useUserAwareness(componentId, true);

  return {
    ...awareness,
    // Additional transition helpers
    isLoginTransition: awareness.lastTransition?.type === "login",
    isLogoutTransition: awareness.lastTransition?.type === "logout",
    isRoleChangeTransition: awareness.lastTransition?.type === "role_change",
    transitionDuration: awareness.lastTransition?.duration || 0,
    isSmoothTransition: awareness.lastTransition?.smooth || false,
  };
};
