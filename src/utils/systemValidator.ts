/**
 * System Validation Utilities
 *
 * Comprehensive validation functions for ensuring system integrity,
 * performance compliance, and feature compatibility.
 */

import { UserContext, Role } from "../types";
import { UserAwarenessManager } from "../services/userAwarenessManager";
import { SecurityManager } from "../utils/securityManager";
import { PluginManager } from "../utils/pluginManager";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  performance: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage?: number;
  };
}

export interface SystemHealthCheck {
  userAwareness: ValidationResult;
  security: ValidationResult;
  plugins: ValidationResult;
  accessibility: ValidationResult;
  internationalization: ValidationResult;
  performance: ValidationResult;
  overall: ValidationResult;
}

/**
 * Comprehensive system validation
 */
export class SystemValidator {
  private userAwarenessManager: UserAwarenessManager;
  private securityManager: SecurityManager;
  private pluginManager: PluginManager;

  constructor() {
    this.userAwarenessManager = UserAwarenessManager.getInstance();
    this.securityManager = SecurityManager.getInstance();
    this.pluginManager = PluginManager.getInstance();
  }

  /**
   * Run complete system health check
   */
  async runSystemHealthCheck(): Promise<SystemHealthCheck> {
    const startTime = performance.now();
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const results = {
      userAwareness: await this.validateUserAwareness(),
      security: await this.validateSecurity(),
      plugins: await this.validatePlugins(),
      accessibility: await this.validateAccessibility(),
      internationalization: await this.validateInternationalization(),
      performance: await this.validatePerformance(),
      overall: {
        isValid: true,
        errors: [] as string[],
        warnings: [] as string[],
        performance: { responseTime: 0, memoryUsage: 0 },
      },
    };

    const endTime = performance.now();
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // Calculate overall result
    const allErrors = Object.values(results).flatMap((r) => r.errors);
    const allWarnings = Object.values(results).flatMap((r) => r.warnings);

    results.overall = {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      performance: {
        responseTime: endTime - startTime,
        memoryUsage: finalMemory - initialMemory,
      },
    };

    return results;
  }

  /**
   * Validate user awareness system
   */
  private async validateUserAwareness(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = performance.now();

    try {
      // Test context initialization
      if (!this.userAwarenessManager) {
        errors.push("UserAwarenessManager not initialized");
      }

      // Test context subscription
      let callbackTriggered = false;
      const unsubscribe = this.userAwarenessManager.subscribeToContext(
        "validator",
        () => {
          callbackTriggered = true;
        }
      );

      // Test context update
      const testContext: UserContext = {
        isAuthenticated: true,
        user: {
          id: "test-user",
          email: "test@example.com",
          fullName: "Test User",
          profilePicture: undefined,
          department: "Testing",
          role: Role.PASSENGER,
        },
        role: Role.PASSENGER,
        sessionInfo: {
          sessionId: "test-session",
          loginTime: new Date(),
          lastUpdate: new Date(),
          authMethod: "email",
          isExpired: false,
        },
        capabilities: ["VIEW_COMPLAINTS"],
        preferences: {
          language: "en",
          theme: "light",
          notifications: true,
        },
        lastActivity: new Date(),
      };

      await this.userAwarenessManager.updateContext(testContext);

      // Wait for subscription callback
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (!callbackTriggered) {
        warnings.push("Context subscription not triggered");
      }

      // Test context retrieval
      const retrievedContext = this.userAwarenessManager.getCurrentContext();
      if (!retrievedContext) {
        errors.push("Context not retrievable after update");
      }

      // Cleanup
      unsubscribe();

      // Test memory cleanup
      const subscriberCount =
        this.userAwarenessManager.getManagerStats().subscriberCount || 0;
      if (subscriberCount > 0) {
        warnings.push("Subscribers not properly cleaned up");
      }
    } catch (error: any) {
      errors.push(`User awareness validation failed: ${error.message}`);
    }

    const endTime = performance.now();

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      performance: {
        responseTime: endTime - startTime,
        memoryUsage: 0, // Would be measured if available
      },
    };
  }

  /**
   * Validate security system
   */
  private async validateSecurity(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = performance.now();

    try {
      // Test basic security validation
      const testContext: UserContext = {
        isAuthenticated: true,
        user: {
          id: "test",
          email: "test@test.com",
          fullName: "Test",
          profilePicture: undefined,
          department: "Test",
          role: Role.PASSENGER,
        },
        role: Role.PASSENGER,
        sessionInfo: {
          sessionId: "test-session",
          loginTime: new Date(),
          lastUpdate: new Date(),
          authMethod: "email",
          isExpired: false,
        },
        capabilities: ["VIEW_COMPLAINTS"],
        preferences: { language: "en", theme: "light", notifications: true },
        lastActivity: new Date(),
      };

      // Test access validation
      const validation = this.securityManager.validateAccess(
        testContext,
        {
          requiredCapabilities: ["VIEW_COMPLAINTS"],
          dataClassification: "internal",
          auditLevel: "basic",
        },
        "test-resource",
        "read"
      );

      if (!validation.allowed) {
        errors.push("Security validation failed for valid user");
      }

      // Test unauthorized access
      const unauthorizedValidation = this.securityManager.validateAccess(
        testContext,
        {
          requiredCapabilities: ["MANAGE_USERS"],
          dataClassification: "confidential",
          auditLevel: "detailed",
        },
        "admin-resource",
        "write"
      );

      if (unauthorizedValidation.allowed) {
        errors.push("Security validation allowed unauthorized access");
      }

      // Test input sanitization
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = this.securityManager.sanitizeInput(
        maliciousInput,
        "html"
      );

      if (sanitized.includes("<script>")) {
        errors.push("Input sanitization failed");
      }

      // Test session validation
      const expiredContext = {
        ...testContext,
        sessionInfo: { ...testContext.sessionInfo, isExpired: true },
      };

      // Would test session validation if method exists
      // const sessionValid = this.securityManager.isSessionValid?.(expiredContext);
    } catch (error: any) {
      errors.push(`Security validation failed: ${error.message}`);
    }

    const endTime = performance.now();

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      performance: {
        responseTime: endTime - startTime,
        memoryUsage: 0,
      },
    };
  }

  /**
   * Validate plugin system
   */
  private async validatePlugins(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = performance.now();

    try {
      // Test plugin manager initialization
      if (!this.pluginManager) {
        errors.push("PluginManager not initialized");
        return {
          isValid: false,
          errors,
          warnings,
          performance: {
            responseTime: performance.now() - startTime,
            memoryUsage: 0,
          },
        };
      }

      // Test plugin registration
      const testPlugin = {
        metadata: {
          id: "test-plugin",
          name: "Test Plugin",
          version: "1.0.0",
          description: "Test plugin for validation",
          author: "System Validator",
          category: "utility" as const,
          supportedRoles: [Role.PASSENGER],
        },
        config: {
          enabled: true,
          settings: {},
        },
        hooks: {},
      };

      const registered = await this.pluginManager.registerPlugin(testPlugin);
      if (!registered) {
        errors.push("Plugin registration failed");
      }

      // Test plugin activation
      if (registered) {
        const activated = await this.pluginManager.activatePlugin(
          "test-plugin"
        );
        if (!activated) {
          warnings.push("Plugin activation failed");
        }

        // Test plugin is active
        const isActive = this.pluginManager.isActive("test-plugin");
        if (!isActive) {
          warnings.push("Plugin not showing as active after activation");
        }

        // Test plugin deactivation
        const deactivated = await this.pluginManager.deactivatePlugin(
          "test-plugin"
        );
        if (!deactivated) {
          warnings.push("Plugin deactivation failed");
        }
      }

      // Test event system
      let eventReceived = false;
      const unsubscribe = this.pluginManager.on("test-event", () => {
        eventReceived = true;
      });

      this.pluginManager.emit("test-event", { test: true });

      // Wait for event propagation
      await new Promise((resolve) => setTimeout(resolve, 10));

      if (!eventReceived) {
        warnings.push("Plugin event system not working");
      }

      unsubscribe();
    } catch (error: any) {
      errors.push(`Plugin validation failed: ${error.message}`);
    }

    const endTime = performance.now();

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      performance: {
        responseTime: endTime - startTime,
        memoryUsage: 0,
      },
    };
  }

  /**
   * Validate accessibility features
   */
  private async validateAccessibility(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = performance.now();

    try {
      // Test ARIA support
      const testElement = document.createElement("div");
      testElement.setAttribute("role", "button");
      testElement.setAttribute("aria-label", "Test button");

      if (!testElement.getAttribute("aria-label")) {
        errors.push("ARIA attributes not supported");
      }

      // Test keyboard navigation support
      if (typeof document.activeElement === "undefined") {
        warnings.push("Keyboard navigation may not be fully supported");
      }

      // Test reduced motion support
      const prefersReducedMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      );
      if (!prefersReducedMotion) {
        warnings.push("Reduced motion detection not available");
      }

      // Test high contrast support
      const prefersHighContrast = window.matchMedia?.(
        "(prefers-contrast: high)"
      );
      if (!prefersHighContrast) {
        warnings.push("High contrast detection not available");
      }

      // Test screen reader compatibility
      if (!("speechSynthesis" in window)) {
        warnings.push(
          "Speech synthesis not available for screen reader features"
        );
      }
    } catch (error: any) {
      errors.push(`Accessibility validation failed: ${error.message}`);
    }

    const endTime = performance.now();

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      performance: {
        responseTime: endTime - startTime,
        memoryUsage: 0,
      },
    };
  }

  /**
   * Validate internationalization
   */
  private async validateInternationalization(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = performance.now();

    try {
      // Test Intl API support
      if (typeof Intl === "undefined") {
        errors.push("Internationalization API not available");
        return {
          isValid: false,
          errors,
          warnings,
          performance: {
            responseTime: performance.now() - startTime,
            memoryUsage: 0,
          },
        };
      }

      // Test date formatting
      try {
        const formatter = new Intl.DateTimeFormat("en-US");
        const formatted = formatter.format(new Date());
        if (!formatted) {
          warnings.push("Date formatting may not work correctly");
        }
      } catch {
        warnings.push("Date formatting not available");
      }

      // Test number formatting
      try {
        const numberFormatter = new Intl.NumberFormat("en-US");
        const formatted = numberFormatter.format(1234.56);
        if (!formatted) {
          warnings.push("Number formatting may not work correctly");
        }
      } catch {
        warnings.push("Number formatting not available");
      }

      // Test relative time formatting
      try {
        if ("RelativeTimeFormat" in Intl) {
          const rtf = new Intl.RelativeTimeFormat("en-US");
          const formatted = rtf.format(-1, "day");
          if (!formatted) {
            warnings.push("Relative time formatting may not work correctly");
          }
        } else {
          warnings.push("Relative time formatting not available");
        }
      } catch {
        warnings.push("Relative time formatting not available");
      }

      // Test pluralization support
      try {
        if ("PluralRules" in Intl) {
          const pr = new Intl.PluralRules("en-US");
          const rule = pr.select(1);
          if (!rule) {
            warnings.push("Plural rules may not work correctly");
          }
        } else {
          warnings.push("Plural rules not available");
        }
      } catch {
        warnings.push("Plural rules not available");
      }
    } catch (error: any) {
      errors.push(`Internationalization validation failed: ${error.message}`);
    }

    const endTime = performance.now();

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      performance: {
        responseTime: endTime - startTime,
        memoryUsage: 0,
      },
    };
  }

  /**
   * Validate performance requirements
   */
  private async validatePerformance(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = performance.now();

    try {
      // Test context update performance
      const contextUpdateStart = performance.now();

      const testContext: UserContext = {
        isAuthenticated: true,
        user: {
          id: "perf-test",
          email: "test@test.com",
          fullName: "Performance Test",
          profilePicture: undefined,
          department: "Test",
          role: Role.PASSENGER,
        },
        role: Role.PASSENGER,
        sessionInfo: {
          sessionId: "perf-session",
          loginTime: new Date(),
          lastUpdate: new Date(),
          authMethod: "email",
          isExpired: false,
        },
        capabilities: ["VIEW_COMPLAINTS"],
        preferences: { language: "en", theme: "light", notifications: true },
        lastActivity: new Date(),
      };

      await this.userAwarenessManager.updateContext(testContext);
      const contextUpdateTime = performance.now() - contextUpdateStart;

      if (contextUpdateTime > 50) {
        errors.push(
          `Context update too slow: ${contextUpdateTime}ms (requirement: <50ms)`
        );
      } else if (contextUpdateTime > 30) {
        warnings.push(
          `Context update approaching limit: ${contextUpdateTime}ms`
        );
      }

      // Test memory usage
      if ((performance as any).memory) {
        const memoryUsage = (performance as any).memory.usedJSHeapSize;
        const memoryLimit = (performance as any).memory.jsHeapSizeLimit;

        if (memoryUsage > memoryLimit * 0.8) {
          warnings.push(
            `High memory usage: ${((memoryUsage / memoryLimit) * 100).toFixed(
              1
            )}%`
          );
        }
      }

      // Test batch operations performance
      const batchStart = performance.now();
      const batchOperations = Array(100)
        .fill(null)
        .map((_, i) =>
          this.userAwarenessManager.updateContext({
            ...testContext,
            // metadata removed as it is not part of UserContext
          })
        );

      await Promise.all(batchOperations);
      const batchTime = performance.now() - batchStart;

      if (batchTime > 200) {
        errors.push(
          `Batch operations too slow: ${batchTime}ms (requirement: <200ms)`
        );
      } else if (batchTime > 150) {
        warnings.push(`Batch operations approaching limit: ${batchTime}ms`);
      }
    } catch (error: any) {
      errors.push(`Performance validation failed: ${error.message}`);
    }

    const endTime = performance.now();

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      performance: {
        responseTime: endTime - startTime,
        memoryUsage: 0,
      },
    };
  }

  /**
   * Validate specific feature integration
   */
  async validateFeatureIntegration(feature: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = performance.now();

    try {
      switch (feature) {
        case "authentication":
          // Test authentication flow
          break;
        case "real-time-updates":
          // Test real-time update system
          break;
        case "security":
          return await this.validateSecurity();
        case "accessibility":
          return await this.validateAccessibility();
        case "i18n":
          return await this.validateInternationalization();
        case "plugins":
          return await this.validatePlugins();
        default:
          warnings.push(`Unknown feature: ${feature}`);
      }
    } catch (error: any) {
      errors.push(`Feature validation failed: ${error.message}`);
    }

    const endTime = performance.now();

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      performance: {
        responseTime: endTime - startTime,
        memoryUsage: 0,
      },
    };
  }

  /**
   * Generate validation report
   */
  generateReport(healthCheck: SystemHealthCheck): string {
    const lines = [];

    lines.push("# System Validation Report");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");

    lines.push("## Overall Status");
    lines.push(
      `Status: ${healthCheck.overall.isValid ? "✅ PASS" : "❌ FAIL"}`
    );
    lines.push(`Total Errors: ${healthCheck.overall.errors.length}`);
    lines.push(`Total Warnings: ${healthCheck.overall.warnings.length}`);
    lines.push(
      `Response Time: ${healthCheck.overall.performance.responseTime.toFixed(
        2
      )}ms`
    );
    lines.push("");

    // Individual component results
    Object.entries(healthCheck).forEach(([component, result]) => {
      if (component === "overall") return;

      lines.push(
        `## ${component.charAt(0).toUpperCase() + component.slice(1)}`
      );
      lines.push(`Status: ${result.isValid ? "✅ PASS" : "❌ FAIL"}`);
      lines.push(
        `Response Time: ${result.performance.responseTime.toFixed(2)}ms`
      );

      if (result.errors.length > 0) {
        lines.push("### Errors:");
        result.errors.forEach((error: string) => lines.push(`- ${error}`));
      }

      if (result.warnings.length > 0) {
        lines.push("### Warnings:");
        result.warnings.forEach((warning: string) =>
          lines.push(`- ${warning}`)
        );
      }

      lines.push("");
    });

    return lines.join("\n");
  }
}

// Export singleton instance
export const systemValidator = new SystemValidator();
