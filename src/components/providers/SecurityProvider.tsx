/**
 * Security Context Provider
 *
 * Provides security context and enforcement throughout the application.
 * Handles Content Security Policy, security headers, and global security state.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { UserContext, Role } from "../../types";
import {
  SecurityManager,
  SecurityViolation,
  AuditEvent,
  securityManager,
} from "../../utils/securityManager";

interface SecurityContextType {
  securityManager: SecurityManager;
  violations: SecurityViolation[];
  auditEvents: AuditEvent[];
  securityScore: number;
  isSecurityEnabled: boolean;
  reportViolation: (violation: Partial<SecurityViolation>) => void;
  clearViolations: () => void;
  getContentSecurityPolicy: () => Record<string, string>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(
  undefined
);

interface SecurityProviderProps {
  children: ReactNode;
  userContext: UserContext | null;
  enableMonitoring?: boolean;
  enableCSP?: boolean;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({
  children,
  userContext,
  enableMonitoring = true,
  enableCSP = true,
}) => {
  const [violations, setViolations] = useState<SecurityViolation[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [securityScore, setSecurityScore] = useState<number>(100);

  // Apply Content Security Policy
  useEffect(() => {
    if (enableCSP && typeof document !== "undefined") {
      const cspHeaders = securityManager.getContentSecurityPolicy();

      // Apply CSP meta tag (for development)
      const existingCSP = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]'
      );
      if (!existingCSP) {
        const metaTag = document.createElement("meta");
        metaTag.httpEquiv = "Content-Security-Policy";
        metaTag.content = cspHeaders["Content-Security-Policy"];
        document.head.appendChild(metaTag);
      }

      // Apply other security headers as meta tags
      Object.entries(cspHeaders).forEach(([key, value]) => {
        if (key !== "Content-Security-Policy") {
          const existingMeta = document.querySelector(
            `meta[http-equiv="${key}"]`
          );
          if (!existingMeta) {
            const metaTag = document.createElement("meta");
            metaTag.httpEquiv = key;
            metaTag.content = value;
            document.head.appendChild(metaTag);
          }
        }
      });
    }
  }, [enableCSP]);

  // Monitor security events
  useEffect(() => {
    if (!enableMonitoring) return;

    const updateSecurityState = () => {
      const recentViolations = securityManager.getSecurityViolations({
        userId: userContext?.user?.id,
        fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      });

      const recentAudits = securityManager.getAuditTrail({
        userId: userContext?.user?.id,
        fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      });

      setViolations(recentViolations);
      setAuditEvents(recentAudits);

      // Calculate security score
      const criticalCount = recentViolations.filter(
        (v) => v.severity === "critical"
      ).length;
      const highCount = recentViolations.filter(
        (v) => v.severity === "high"
      ).length;
      const mediumCount = recentViolations.filter(
        (v) => v.severity === "medium"
      ).length;

      let score = 100;
      score -= criticalCount * 30;
      score -= highCount * 15;
      score -= mediumCount * 5;

      setSecurityScore(Math.max(0, score));
    };

    updateSecurityState();

    // Update every 5 minutes
    const interval = setInterval(updateSecurityState, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [enableMonitoring, userContext]);

  // Report security violation
  const reportViolation = (violation: Partial<SecurityViolation>) => {
    const fullViolation: SecurityViolation = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: "suspicious_activity",
      severity: "medium",
      description: "Security violation reported",
      evidence: {},
      blocked: false,
      userContext: userContext || undefined,
      ...violation,
    };

    // This would typically call the security manager's internal logging
    console.warn("Security violation reported:", fullViolation);

    // Update local state
    setViolations((prev) => [...prev, fullViolation]);
  };

  // Clear violations (admin only)
  const clearViolations = () => {
    if (userContext?.role !== "SUPER_ADMIN") {
      reportViolation({
        type: "unauthorized_access",
        severity: "high",
        description: "Unauthorized attempt to clear security violations",
        blocked: true,
      });
      return;
    }

    setViolations([]);
  };

  // Get CSP headers
  const getContentSecurityPolicy = () => {
    return securityManager.getContentSecurityPolicy();
  };

  // Global error handler for security-related errors
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      // Check for potential security-related errors
      const message = event.message.toLowerCase();

      if (
        message.includes("script") ||
        message.includes("eval") ||
        message.includes("unsafe") ||
        message.includes("blocked")
      ) {
        reportViolation({
          type: "injection_attempt",
          severity: "high",
          description: `Potential security error detected: ${event.message}`,
          evidence: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
          blocked: true,
        });
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Check for security-related promise rejections
      const reason = String(event.reason).toLowerCase();

      if (
        reason.includes("csp") ||
        reason.includes("cors") ||
        reason.includes("unauthorized") ||
        reason.includes("forbidden")
      ) {
        reportViolation({
          type: "suspicious_activity",
          severity: "medium",
          description: `Security-related promise rejection: ${event.reason}`,
          evidence: { reason: String(event.reason) },
          blocked: false,
        });
      }
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  // Monitor for suspicious DOM manipulation
  useEffect(() => {
    if (typeof document === "undefined") return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;

              // Check for suspicious script injections
              if (element.tagName === "SCRIPT") {
                reportViolation({
                  type: "injection_attempt",
                  severity: "critical",
                  description: "Suspicious script element detected",
                  evidence: {
                    tagName: element.tagName,
                    innerHTML: element.innerHTML,
                    src: element.getAttribute("src"),
                  },
                  blocked: true,
                });
              }

              // Check for suspicious iframe injections
              if (element.tagName === "IFRAME") {
                const src = element.getAttribute("src");
                if (src && !src.startsWith(window.location.origin)) {
                  reportViolation({
                    type: "injection_attempt",
                    severity: "high",
                    description: "Suspicious iframe detected",
                    evidence: {
                      tagName: element.tagName,
                      src: src,
                    },
                    blocked: false,
                  });
                }
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  const contextValue: SecurityContextType = {
    securityManager,
    violations,
    auditEvents,
    securityScore,
    isSecurityEnabled: enableMonitoring,
    reportViolation,
    clearViolations,
    getContentSecurityPolicy,
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
};

// Hook to use security context
export const useSecurityContext = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error(
      "useSecurityContext must be used within a SecurityProvider"
    );
  }
  return context;
};

// Security wrapper component for protecting routes/components
interface SecureWrapperProps {
  children: ReactNode;
  requiredRole?: string;
  requiredCapabilities?: string[];
  fallback?: ReactNode;
  onAccessDenied?: () => void;
}

export const SecureWrapper: React.FC<SecureWrapperProps> = ({
  children,
  requiredRole,
  requiredCapabilities,
  fallback,
  onAccessDenied,
}) => {
  const { securityManager, reportViolation } = useSecurityContext();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // This would typically get user context from a global state or context
    // For now, we'll use a placeholder
    const checkAccess = async () => {
      try {
        // In a real implementation, get current user context
        const userContext = null; // Get from global state

        const policy = {
          requiredRole: requiredRole as Role | undefined,
          requiredCapabilities,
          allowUnauthenticated: !requiredRole && !requiredCapabilities?.length,
        };

        const validation = securityManager.validateAccess(
          userContext,
          policy,
          "component_access",
          "render"
        );

        if (!validation.allowed) {
          reportViolation({
            type: "unauthorized_access",
            severity: "medium",
            description: `Access denied to protected component`,
            evidence: { requiredRole, requiredCapabilities },
            blocked: true,
          });

          if (onAccessDenied) {
            onAccessDenied();
          }
        }

        setIsAuthorized(validation.allowed);
      } catch (error) {
        console.error("Security check failed:", error);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [requiredRole, requiredCapabilities, onAccessDenied]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      fallback || (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-red-800 font-medium">Access Denied</div>
          <div className="text-red-600 text-sm mt-1">
            You don't have permission to view this content.
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
};

export default SecurityProvider;
