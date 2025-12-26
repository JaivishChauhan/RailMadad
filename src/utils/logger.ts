/**
 * Centralized Logging Utility
 *
 * This utility provides a consistent logging interface across the application
 * with configurable log levels and production-safe logging.
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

interface LoggingConfig {
  enabled: boolean;
  level: LogLevel;
  enableConsoleColors: boolean;
  enableTimestamps: boolean;
  enableFileLogging: boolean;
  production: {
    enabled: boolean;
    level: LogLevel;
  };
}

// Default logging configuration - SILENCED BY DEFAULT
const DEFAULT_CONFIG: LoggingConfig = {
  enabled: false, // Disable all logging by default to prevent console spam
  level: "error", // Only show errors when enabled
  enableConsoleColors: true,
  enableTimestamps: true,
  enableFileLogging: false,
  production: {
    enabled: false, // Disable all logs in production
    level: "error", // Only show errors in production
  },
};

let currentConfig = { ...DEFAULT_CONFIG };

// Log level hierarchy (higher number = more severe)
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
} as const;

/**
 * Check if a log level should be output based on current configuration
 */
function shouldLog(level: LogLevel): boolean {
  if (!currentConfig.enabled) return false;

  const activeConfig =
    process.env.NODE_ENV === "production"
      ? currentConfig.production
      : currentConfig;

  if (!activeConfig.enabled) return false;

  return LOG_LEVELS[level] >= LOG_LEVELS[activeConfig.level];
}

/**
 * Format log message with optional timestamp and colors
 */
function formatMessage(
  level: LogLevel,
  message: string,
  component?: string
): string {
  let formatted = "";

  if (currentConfig.enableTimestamps) {
    formatted += `[${new Date().toISOString()}] `;
  }

  if (component) {
    formatted += `[${component}] `;
  }

  if (currentConfig.enableConsoleColors && typeof window !== "undefined") {
    const colors = {
      debug: "#6366f1", // Indigo
      info: "#3b82f6", // Blue
      warn: "#f59e0b", // Amber
      error: "#ef4444", // Red
      none: "#6b7280", // Gray
    };

    formatted += `%c${level.toUpperCase()}: ${message}`;
    return formatted;
  }

  formatted += `${level.toUpperCase()}: ${message}`;
  return formatted;
}

/**
 * Main Logger Class
 */
export class Logger {
  private component?: string;

  constructor(component?: string) {
    this.component = component;
  }

  debug(message: string, ...args: any[]): void {
    if (!shouldLog("debug")) return;

    const formatted = formatMessage("debug", message, this.component);
    if (currentConfig.enableConsoleColors && typeof window !== "undefined") {
      console.log(formatted, "color: #6366f1", ...args);
    } else {
      console.log(formatted, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (!shouldLog("info")) return;

    const formatted = formatMessage("info", message, this.component);
    if (currentConfig.enableConsoleColors && typeof window !== "undefined") {
      console.log(formatted, "color: #3b82f6", ...args);
    } else {
      console.log(formatted, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (!shouldLog("warn")) return;

    const formatted = formatMessage("warn", message, this.component);
    if (currentConfig.enableConsoleColors && typeof window !== "undefined") {
      console.warn(formatted, "color: #f59e0b", ...args);
    } else {
      console.warn(formatted, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (!shouldLog("error")) return;

    const formatted = formatMessage("error", message, this.component);
    if (currentConfig.enableConsoleColors && typeof window !== "undefined") {
      console.error(formatted, "color: #ef4444", ...args);
    } else {
      console.error(formatted, ...args);
    }
  }

  /**
   * Create a child logger with a sub-component name
   */
  child(subComponent: string): Logger {
    const childName = this.component
      ? `${this.component}:${subComponent}`
      : subComponent;
    return new Logger(childName);
  }
}

/**
 * Global Logger Configuration
 */
export const LoggerConfig = {
  /**
   * Update logging configuration
   */
  configure(config: Partial<LoggingConfig>): void {
    currentConfig = { ...currentConfig, ...config };
  },

  /**
   * Get current logging configuration
   */
  getConfig(): LoggingConfig {
    return { ...currentConfig };
  },

  /**
   * Reset to default configuration
   */
  reset(): void {
    currentConfig = { ...DEFAULT_CONFIG };
  },

  /**
   * Disable all logging (useful for tests)
   */
  disable(): void {
    currentConfig.enabled = false;
    currentConfig.production.enabled = false;
  },

  /**
   * Enable logging with specified level
   */
  enable(level: LogLevel = "info"): void {
    currentConfig.enabled = true;
    currentConfig.level = level;
  },

  /**
   * Set production logging configuration
   */
  setProduction(enabled: boolean, level: LogLevel = "error"): void {
    currentConfig.production.enabled = enabled;
    currentConfig.production.level = level;
  },

  /**
   * Completely disable all logging across the entire application
   */
  silenceAll(): void {
    currentConfig.enabled = false;
    currentConfig.production.enabled = false;

    // Also disable UserAwarenessManager logging if available
    if (
      typeof window !== "undefined" &&
      (window as any).UserAwarenessManager?.disableAllLogging
    ) {
      (window as any).UserAwarenessManager.disableAllLogging();
    }
  },

  /**
   * Enable only critical errors (recommended for production)
   */
  errorsOnly(): void {
    currentConfig.enabled = true;
    currentConfig.level = "error";
    currentConfig.production.enabled = true;
    currentConfig.production.level = "error";

    // Configure UserAwarenessManager for errors only if available
    if (
      typeof window !== "undefined" &&
      (window as any).UserAwarenessManager?.configureLogging
    ) {
      (window as any).UserAwarenessManager.configureLogging({
        enabled: true,
        level: "error",
        enablePerformanceLogs: false,
        enableMemoryLogs: false,
        enableSubscriberLogs: false,
        enableTransitionLogs: false,
      });
    }
  },
};

/**
 * Create a logger instance for a specific component
 */
export function createLogger(component: string): Logger {
  return new Logger(component);
}

/**
 * Default logger instance (no component specified)
 */
export const logger = new Logger();

/**
 * Pre-configured loggers for common components
 */
export const loggers = {
  userAwareness: createLogger("UserAwarenessManager"),
  functionCall: createLogger("FunctionCallService"),
  gemini: createLogger("GeminiService"),
  openRouter: createLogger("OpenRouterService"),
  unifiedAI: createLogger("UnifiedAIService"),
  aiConfig: createLogger("AIConfig"),
  context: createLogger("ContextService"),
  auth: createLogger("AuthService"),
  complaints: createLogger("ComplaintService"),
  validation: createLogger("ValidationService"),
  performance: createLogger("PerformanceOptimizer"),
  ui: createLogger("UI"),
  api: createLogger("API"),
};

// Make LoggerConfig available globally for console control
if (typeof window !== "undefined") {
  (window as any).LoggerConfig = LoggerConfig;
}

// Export types
export type { LoggingConfig };
