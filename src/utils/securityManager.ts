/**
 * Security Manager for User-Aware Features
 *
 * Provides comprehensive security measures including:
 * - Role-based access control (RBAC)
 * - Capability validation
 * - Data sanitization and validation
 * - Audit logging
 * - Session security
 * - XSS and injection protection
 */

import { UserContext, Role } from "../types";

export interface SecurityPolicy {
  requiredRole?: Role;
  requiredCapabilities?: string[];
  allowUnauthenticated?: boolean;
  dataClassification?: "public" | "internal" | "confidential" | "restricted";
  auditLevel?: "none" | "basic" | "detailed" | "full";
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string | null;
  userRole: Role | null;
  action: string;
  resource: string;
  outcome: "success" | "failure" | "blocked";
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface SecurityViolation {
  id: string;
  timestamp: Date;
  type:
    | "unauthorized_access"
    | "privilege_escalation"
    | "data_breach"
    | "injection_attempt"
    | "suspicious_activity";
  severity: "low" | "medium" | "high" | "critical";
  userContext?: UserContext;
  description: string;
  evidence: Record<string, any>;
  blocked: boolean;
}

/**
 * Central security manager for user-aware features
 */
export class SecurityManager {
  private static instance: SecurityManager | null = null;
  private auditLog: AuditEvent[] = [];
  private securityViolations: SecurityViolation[] = [];
  private maxAuditLogSize = 10000;
  private maxViolationLogSize = 1000;

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Validate access to a protected resource
   */
  validateAccess(
    userContext: UserContext | null,
    policy: SecurityPolicy,
    resource: string,
    action: string
  ): { allowed: boolean; reason?: string } {
    try {
      // Log access attempt
      this.logAuditEvent({
        action: `attempt_${action}`,
        resource,
        userId: userContext?.user?.id || null,
        userRole: userContext?.role || null,
        outcome: "success", // Will be updated if blocked
        details: { policy },
      });

      // Check authentication requirement
      if (!policy.allowUnauthenticated && !userContext?.isAuthenticated) {
        this.blockAccess(userContext, resource, action, "Not authenticated");
        return { allowed: false, reason: "Authentication required" };
      }

      // Check session validity
      if (userContext?.isAuthenticated && !this.isSessionValid(userContext)) {
        this.blockAccess(userContext, resource, action, "Invalid session");
        return { allowed: false, reason: "Session expired or invalid" };
      }

      // Check role requirements
      if (policy.requiredRole && userContext?.role !== policy.requiredRole) {
        // Allow higher privilege roles
        if (
          !this.isRoleAuthorized(userContext?.role || null, policy.requiredRole)
        ) {
          this.blockAccess(userContext, resource, action, "Insufficient role");
          return { allowed: false, reason: "Insufficient privileges" };
        }
      }

      // Check capability requirements
      if (policy.requiredCapabilities?.length) {
        const hasAllCapabilities = policy.requiredCapabilities.every((cap) =>
          userContext?.capabilities?.includes(cap)
        );

        if (!hasAllCapabilities) {
          this.blockAccess(
            userContext,
            resource,
            action,
            "Missing capabilities"
          );
          return { allowed: false, reason: "Missing required capabilities" };
        }
      }

      // Log successful access
      this.logAuditEvent({
        action: `access_${action}`,
        resource,
        userId: userContext?.user?.id || null,
        userRole: userContext?.role || null,
        outcome: "success",
        details: { policy },
      });

      return { allowed: true };
    } catch (error: any) {
      this.logSecurityViolation({
        type: "suspicious_activity",
        severity: "high",
        userContext: userContext || undefined,
        description: "Error during access validation",
        evidence: { error: error.message, resource, action },
        blocked: true,
      });

      return { allowed: false, reason: "Security error" };
    }
  }

  /**
   * Check if a role is authorized for a required role
   */
  private isRoleAuthorized(userRole: Role | null, requiredRole: Role): boolean {
    if (!userRole) return false;

    // Role hierarchy: SUPER_ADMIN > OFFICIAL > PASSENGER
    const roleHierarchy: Record<Role, number> = {
      [Role.SUPER_ADMIN]: 3,
      [Role.OFFICIAL]: 2,
      [Role.MODERATOR]: 2,
      [Role.PASSENGER]: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Validate session security
   */
  private isSessionValid(userContext: UserContext): boolean {
    if (!userContext.sessionInfo) return false;

    const now = new Date();
    const session = userContext.sessionInfo;

    // Check expiry
    if (session.isExpired) {
      return false;
    }

    // Check last activity (4 hours max inactivity)
    const maxInactivity = 4 * 60 * 60 * 1000; // 4 hours

    if (
      userContext.lastActivity &&
      now.getTime() - userContext.lastActivity.getTime() > maxInactivity
    ) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize user input to prevent XSS and injection attacks
   */
  sanitizeInput(
    input: any,
    context: "text" | "html" | "json" | "sql" = "text"
  ): any {
    if (typeof input !== "string") {
      return input;
    }

    switch (context) {
      case "text":
        return this.sanitizeText(input);
      case "html":
        return this.sanitizeHtml(input);
      case "json":
        return this.sanitizeJson(input);
      case "sql":
        return this.sanitizeSql(input);
      default:
        return this.sanitizeText(input);
    }
  }

  private sanitizeText(input: string): string {
    return input
      .replace(/[<>\"'&]/g, (char) => {
        const entities: Record<string, string> = {
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#x27;",
          "&": "&amp;",
        };
        return entities[char] || char;
      })
      .trim()
      .slice(0, 10000); // Limit length
  }

  private sanitizeHtml(input: string): string {
    // Remove dangerous tags and attributes
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/on\w+\s*=\s*[\"'][^\"']*[\"']/gi, "")
      .replace(/javascript:/gi, "")
      .trim();
  }

  private sanitizeJson(input: string): string {
    try {
      // Parse and re-stringify to validate JSON
      const parsed = JSON.parse(input);
      return JSON.stringify(parsed);
    } catch {
      throw new Error("Invalid JSON input");
    }
  }

  private sanitizeSql(input: string): string {
    // Basic SQL injection prevention
    return input
      .replace(/[;'\"\\]/g, "")
      .replace(
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
        ""
      )
      .trim();
  }

  /**
   * Validate data based on classification level
   */
  validateDataAccess(
    userContext: UserContext | null,
    dataClassification: SecurityPolicy["dataClassification"],
    action: "read" | "write" | "delete"
  ): boolean {
    if (!dataClassification) return true;

    switch (dataClassification) {
      case "public":
        return true;

      case "internal":
        return userContext?.isAuthenticated || false;

      case "confidential":
        return (
          (userContext?.isAuthenticated ?? false) &&
          (userContext?.role === Role.OFFICIAL ||
            userContext?.role === Role.SUPER_ADMIN)
        );

      case "restricted":
        return userContext?.role === Role.SUPER_ADMIN;

      default:
        return false;
    }
  }

  /**
   * Log audit events
   */
  private logAuditEvent(eventData: Partial<AuditEvent>): void {
    const event: AuditEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      userId: null,
      userRole: null,
      action: "unknown",
      resource: "unknown",
      outcome: "success",
      details: {},
      severity: "low",
      ...eventData,
    };

    this.auditLog.push(event);

    // Maintain log size limit
    if (this.auditLog.length > this.maxAuditLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxAuditLogSize);
    }

    // Send high-severity events to external logging
    if (event.severity === "high" || event.severity === "critical") {
      this.sendToExternalLogging(event);
    }
  }

  /**
   * Log security violations
   */
  private logSecurityViolation(
    violationData: Partial<SecurityViolation>
  ): void {
    const violation: SecurityViolation = {
      id: this.generateId(),
      timestamp: new Date(),
      type: "suspicious_activity",
      severity: "medium",
      description: "Security violation detected",
      evidence: {},
      blocked: false,
      ...violationData,
    };

    this.securityViolations.push(violation);

    // Maintain log size limit
    if (this.securityViolations.length > this.maxViolationLogSize) {
      this.securityViolations = this.securityViolations.slice(
        -this.maxViolationLogSize
      );
    }

    // Alert on critical violations
    if (violation.severity === "critical") {
      this.alertSecurityTeam(violation);
    }
  }

  /**
   * Block access and log the event
   */
  private blockAccess(
    userContext: UserContext | null,
    resource: string,
    action: string,
    reason: string
  ): void {
    this.logAuditEvent({
      action: `blocked_${action}`,
      resource,
      userId: userContext?.user?.id || null,
      userRole: userContext?.role || null,
      outcome: "blocked",
      details: { reason },
      severity: "medium",
    });

    this.logSecurityViolation({
      type: "unauthorized_access",
      severity: "medium",
      userContext: userContext || undefined,
      description: `Access blocked: ${reason}`,
      evidence: { resource, action, reason },
      blocked: true,
    });
  }

  /**
   * Encrypt sensitive data for storage
   */
  encryptSensitiveData(data: any): string {
    // In a real implementation, use proper encryption
    // This is a simple example for demonstration
    try {
      const jsonString = JSON.stringify(data);
      return btoa(jsonString); // Base64 encoding (not secure for production)
    } catch (error) {
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptSensitiveData(encryptedData: string): any {
    try {
      const jsonString = atob(encryptedData);
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error("Failed to decrypt data");
    }
  }

  /**
   * Generate content security policy headers
   */
  getContentSecurityPolicy(): Record<string, string> {
    return {
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
        "connect-src 'self' https://api.example.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
      ].join("; "),
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    };
  }

  /**
   * Get audit trail for a user or resource
   */
  getAuditTrail(filter: {
    userId?: string;
    resource?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
  }): AuditEvent[] {
    return this.auditLog.filter((event) => {
      if (filter.userId && event.userId !== filter.userId) return false;
      if (filter.resource && !event.resource.includes(filter.resource))
        return false;
      if (filter.action && !event.action.includes(filter.action)) return false;
      if (filter.fromDate && event.timestamp < filter.fromDate) return false;
      if (filter.toDate && event.timestamp > filter.toDate) return false;
      return true;
    });
  }

  /**
   * Get security violations
   */
  getSecurityViolations(filter: {
    type?: SecurityViolation["type"];
    severity?: SecurityViolation["severity"];
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): SecurityViolation[] {
    return this.securityViolations.filter((violation) => {
      if (filter.type && violation.type !== filter.type) return false;
      if (filter.severity && violation.severity !== filter.severity)
        return false;
      if (filter.userId && violation.userContext?.user?.id !== filter.userId)
        return false;
      if (filter.fromDate && violation.timestamp < filter.fromDate)
        return false;
      if (filter.toDate && violation.timestamp > filter.toDate) return false;
      return true;
    });
  }

  /**
   * Clear audit logs (admin only)
   */
  clearAuditLogs(
    userContext: UserContext,
    retentionDays: number = 30
  ): boolean {
    if (userContext.role !== Role.SUPER_ADMIN) {
      this.logSecurityViolation({
        type: "unauthorized_access",
        severity: "high",
        userContext,
        description: "Unauthorized attempt to clear audit logs",
        evidence: { retentionDays },
        blocked: true,
      });
      return false;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    this.auditLog = this.auditLog.filter(
      (event) => event.timestamp >= cutoffDate
    );
    this.securityViolations = this.securityViolations.filter(
      (violation) => violation.timestamp >= cutoffDate
    );

    this.logAuditEvent({
      action: "clear_audit_logs",
      resource: "audit_system",
      userId: userContext.user?.id || null,
      userRole: userContext.role,
      outcome: "success",
      details: { retentionDays },
      severity: "high",
    });

    return true;
  }

  /**
   * Generate unique ID for events
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Send high-severity events to external logging service
   */
  private sendToExternalLogging(event: AuditEvent): void {
    // In a real implementation, send to external service
    console.warn("High-severity audit event:", event);
  }

  /**
   * Alert security team about critical violations
   */
  private alertSecurityTeam(violation: SecurityViolation): void {
    // In a real implementation, send alerts to security team
    console.error("Critical security violation:", violation);
  }

  /**
   * Reset security manager (for testing)
   */
  reset(): void {
    this.auditLog = [];
    this.securityViolations = [];
  }
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance();

// Common security policies
export const SECURITY_POLICIES = {
  // Public access
  PUBLIC_READ: {
    allowUnauthenticated: true,
    dataClassification: "public" as const,
    auditLevel: "basic" as const,
  },

  // Authenticated user access
  USER_READ: {
    requiredCapabilities: ["VIEW_COMPLAINTS"],
    dataClassification: "internal" as const,
    auditLevel: "basic" as const,
  },

  USER_WRITE: {
    requiredCapabilities: ["CREATE_COMPLAINT"],
    dataClassification: "internal" as const,
    auditLevel: "detailed" as const,
  },

  // Official access
  OFFICIAL_READ: {
    requiredRole: Role.OFFICIAL,
    requiredCapabilities: ["MANAGE_COMPLAINTS"],
    dataClassification: "confidential" as const,
    auditLevel: "detailed" as const,
  },

  OFFICIAL_WRITE: {
    requiredRole: Role.OFFICIAL,
    requiredCapabilities: ["MANAGE_COMPLAINTS", "UPDATE_STATUS"],
    dataClassification: "confidential" as const,
    auditLevel: "full" as const,
  },

  // Admin access
  ADMIN_READ: {
    requiredRole: Role.SUPER_ADMIN,
    dataClassification: "restricted" as const,
    auditLevel: "full" as const,
  },

  ADMIN_WRITE: {
    requiredRole: Role.SUPER_ADMIN,
    requiredCapabilities: ["ADMIN_ACCESS"],
    dataClassification: "restricted" as const,
    auditLevel: "full" as const,
  },
} as const;
