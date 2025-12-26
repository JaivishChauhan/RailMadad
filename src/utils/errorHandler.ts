/**
 * Comprehensive Error Handling Utilities for RailMadad
 * 
 * Provides:
 * - Centralized error logging and reporting
 * - Error classification and severity levels
 * - Graceful degradation strategies
 * - Network and service error handling
 * - User-friendly error messages
 * - Error recovery mechanisms
 */

import React from 'react';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTH = 'auth',
  CONTEXT = 'context',
  USER_AWARENESS = 'user_awareness',
  AI_SERVICE = 'ai_service',
  DATA_VALIDATION = 'data_validation',
  COMPONENT = 'component',
  PERFORMANCE = 'performance',
  SECURITY = 'security'
}

export interface ErrorReport {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  retryCount?: number;
  resolved?: boolean;
  resolutionStrategy?: string;
}

export interface ErrorRecoveryStrategy {
  id: string;
  name: string;
  description: string;
  execute: () => Promise<boolean>;
  canRetry: boolean;
  maxRetries?: number;
}

/**
 * Central Error Handler Class
 */
class ErrorHandler {
  private static instance: ErrorHandler | null = null;
  private errorLog: ErrorReport[] = [];
  private errorSubscribers: Map<string, (error: ErrorReport) => void> = new Map();
  private recoveryStrategies: Map<ErrorCategory, ErrorRecoveryStrategy[]> = new Map();
  private isOnline = navigator.onLine;

  private constructor() {
    this.initializeRecoveryStrategies();
    this.setupNetworkMonitoring();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Report and handle an error
   */
  async handleError(
    error: Error | string,
    category: ErrorCategory,
    context?: Record<string, any>
  ): Promise<ErrorReport> {
    const errorReport = this.createErrorReport(error, category, context);
    
    // Log the error
    this.logError(errorReport);
    
    // Notify subscribers
    this.notifySubscribers(errorReport);
    
    // Attempt recovery if strategies exist
    await this.attemptRecovery(errorReport);
    
    return errorReport;
  }

  /**
   * Create standardized error report
   */
  private createErrorReport(
    error: Error | string,
    category: ErrorCategory,
    context?: Record<string, any>
  ): ErrorReport {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const severity = this.determineSeverity(category, errorObj);

    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category,
      severity,
      message: errorObj.message,
      originalError: errorObj,
      context: {
        ...context,
        stack: errorObj.stack,
        isOnline: this.isOnline,
        timestamp: new Date().toISOString()
      },
      timestamp: Date.now(),
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: 0,
      resolved: false
    };
  }

  /**
   * Determine error severity based on category and error details
   */
  private determineSeverity(category: ErrorCategory, error: Error): ErrorSeverity {
    // Critical errors
    if (category === ErrorCategory.SECURITY || category === ErrorCategory.AUTH) {
      return ErrorSeverity.CRITICAL;
    }

    if (error.name === 'ChunkLoadError' || error.name === 'TypeError') {
      return ErrorSeverity.HIGH;
    }

    // Network errors during offline state
    if (category === ErrorCategory.NETWORK && !this.isOnline) {
      return ErrorSeverity.MEDIUM;
    }

    // Context and user awareness errors
    if (category === ErrorCategory.USER_AWARENESS || category === ErrorCategory.CONTEXT) {
      return ErrorSeverity.MEDIUM;
    }

    // Default to low for component and validation errors
    return ErrorSeverity.LOW;
  }

  /**
   * Log error with different strategies based on severity
   */
  private logError(errorReport: ErrorReport): void {
    // Add to in-memory log
    this.errorLog.push(errorReport);
    
    // Keep only last 50 errors in memory
    if (this.errorLog.length > 50) {
      this.errorLog = this.errorLog.slice(-50);
    }

    // Console logging with appropriate level
    const logData = {
      id: errorReport.id,
      category: errorReport.category,
      severity: errorReport.severity,
      message: errorReport.message,
      context: errorReport.context
    };

    switch (errorReport.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌ HIGH SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️ MEDIUM SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.LOW:
        console.log('ℹ️ LOW SEVERITY ERROR:', logData);
        break;
    }

    // Persist critical and high severity errors
    if (errorReport.severity === ErrorSeverity.CRITICAL || errorReport.severity === ErrorSeverity.HIGH) {
      this.persistError(errorReport);
    }
  }

  /**
   * Persist error to localStorage
   */
  private persistError(errorReport: ErrorReport): void {
    try {
      const storedErrors = JSON.parse(localStorage.getItem('railmadad_critical_errors') || '[]');
      
      // Remove sensitive information for storage
      const sanitizedReport = {
        ...errorReport,
        context: {
          ...errorReport.context,
          stack: undefined, // Don't store full stack traces
        },
        originalError: undefined
      };

      storedErrors.push(sanitizedReport);
      
      // Keep only last 20 critical errors
      if (storedErrors.length > 20) {
        storedErrors.splice(0, storedErrors.length - 20);
      }
      
      localStorage.setItem('railmadad_critical_errors', JSON.stringify(storedErrors));
    } catch (storageError) {
      console.warn('Failed to persist error to localStorage:', storageError);
    }
  }

  /**
   * Initialize recovery strategies for different error categories
   */
  private initializeRecoveryStrategies(): void {
    // Network error recovery
    this.recoveryStrategies.set(ErrorCategory.NETWORK, [
      {
        id: 'network_retry',
        name: 'Retry Network Request',
        description: 'Retry the failed network request after a delay',
        execute: async () => {
          await this.delay(1000);
          return this.isOnline;
        },
        canRetry: true,
        maxRetries: 3
      },
      {
        id: 'offline_fallback',
        name: 'Offline Mode',
        description: 'Switch to offline mode with cached data',
        execute: async () => {
          console.log('Switching to offline mode');
          return true;
        },
        canRetry: false
      }
    ]);

    // Authentication error recovery
    this.recoveryStrategies.set(ErrorCategory.AUTH, [
      {
        id: 'token_refresh',
        name: 'Refresh Authentication Token',
        description: 'Attempt to refresh the authentication token',
        execute: async () => {
          try {
            // This would integrate with your auth system
            console.log('Attempting token refresh...');
            return false; // Placeholder - implement actual token refresh
          } catch {
            return false;
          }
        },
        canRetry: true,
        maxRetries: 1
      },
      {
        id: 'force_reauth',
        name: 'Force Re-authentication',
        description: 'Clear auth state and redirect to login',
        execute: async () => {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          return true;
        },
        canRetry: false
      }
    ]);

    // Context error recovery
    this.recoveryStrategies.set(ErrorCategory.CONTEXT, [
      {
        id: 'context_refresh',
        name: 'Refresh User Context',
        description: 'Force refresh the user context from the server',
        execute: async () => {
          try {
            // This would integrate with UserContextService
            console.log('Refreshing user context...');
            return true;
          } catch {
            return false;
          }
        },
        canRetry: true,
        maxRetries: 2
      },
      {
        id: 'fallback_context',
        name: 'Use Fallback Context',
        description: 'Switch to a basic fallback user context',
        execute: async () => {
          console.log('Using fallback context');
          return true;
        },
        canRetry: false
      }
    ]);

    // User awareness error recovery
    this.recoveryStrategies.set(ErrorCategory.USER_AWARENESS, [
      {
        id: 'awareness_reset',
        name: 'Reset User Awareness',
        description: 'Reset user awareness manager to initial state',
        execute: async () => {
          try {
            // This would integrate with UserAwarenessManager
            console.log('Resetting user awareness manager...');
            return true;
          } catch {
            return false;
          }
        },
        canRetry: true,
        maxRetries: 1
      }
    ]);

    // AI Service error recovery
    this.recoveryStrategies.set(ErrorCategory.AI_SERVICE, [
      {
        id: 'ai_fallback',
        name: 'Use Fallback Responses',
        description: 'Switch to pre-defined fallback responses',
        execute: async () => {
          console.log('Switching to AI fallback mode');
          return true;
        },
        canRetry: false
      }
    ]);
  }

  /**
   * Attempt recovery using available strategies
   */
  private async attemptRecovery(errorReport: ErrorReport): Promise<boolean> {
    const strategies = this.recoveryStrategies.get(errorReport.category);
    if (!strategies || strategies.length === 0) {
      console.log(`No recovery strategies available for category: ${errorReport.category}`);
      return false;
    }

    for (const strategy of strategies) {
      try {
        console.log(`Attempting recovery strategy: ${strategy.name}`);
        const success = await strategy.execute();
        
        if (success) {
          errorReport.resolved = true;
          errorReport.resolutionStrategy = strategy.id;
          console.log(`✅ Recovery successful using strategy: ${strategy.name}`);
          return true;
        }
      } catch (recoveryError) {
        console.warn(`Recovery strategy ${strategy.name} failed:`, recoveryError);
      }
    }

    console.log(`❌ All recovery strategies failed for error: ${errorReport.id}`);
    return false;
  }

  /**
   * Subscribe to error notifications
   */
  subscribeToErrors(subscriberId: string, callback: (error: ErrorReport) => void): () => void {
    this.errorSubscribers.set(subscriberId, callback);
    
    return () => {
      this.errorSubscribers.delete(subscriberId);
    };
  }

  /**
   * Notify all subscribers of new errors
   */
  private notifySubscribers(errorReport: ErrorReport): void {
    for (const [subscriberId, callback] of this.errorSubscribers) {
      try {
        callback(errorReport);
      } catch (error) {
        console.warn(`Error in subscriber ${subscriberId}:`, error);
      }
    }
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('📶 Network connection restored');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📵 Network connection lost');
    });
  }

  /**
   * Utility methods
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCurrentUserId(): string | undefined {
    // This would integrate with your auth system
    try {
      const authData = localStorage.getItem('auth_user');
      return authData ? JSON.parse(authData).id : undefined;
    } catch {
      return undefined;
    }
  }

  private getSessionId(): string | undefined {
    // This would integrate with your session management
    try {
      const sessionData = localStorage.getItem('session_id');
      return sessionData || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    resolved: number;
    unresolved: number;
  } {
    const stats = {
      total: this.errorLog.length,
      bySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      },
      byCategory: {
        [ErrorCategory.NETWORK]: 0,
        [ErrorCategory.AUTH]: 0,
        [ErrorCategory.CONTEXT]: 0,
        [ErrorCategory.USER_AWARENESS]: 0,
        [ErrorCategory.AI_SERVICE]: 0,
        [ErrorCategory.DATA_VALIDATION]: 0,
        [ErrorCategory.COMPONENT]: 0,
        [ErrorCategory.PERFORMANCE]: 0,
        [ErrorCategory.SECURITY]: 0
      },
      resolved: 0,
      unresolved: 0
    };

    for (const error of this.errorLog) {
      stats.bySeverity[error.severity]++;
      stats.byCategory[error.category]++;
      
      if (error.resolved) {
        stats.resolved++;
      } else {
        stats.unresolved++;
      }
    }

    return stats;
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    console.log('Error log cleared');
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

/**
 * Convenience functions for common error scenarios
 */

export const handleNetworkError = (error: Error, context?: Record<string, any>) =>
  errorHandler.handleError(error, ErrorCategory.NETWORK, context);

export const handleAuthError = (error: Error, context?: Record<string, any>) =>
  errorHandler.handleError(error, ErrorCategory.AUTH, context);

export const handleContextError = (error: Error, context?: Record<string, any>) =>
  errorHandler.handleError(error, ErrorCategory.CONTEXT, context);

export const handleUserAwarenessError = (error: Error, context?: Record<string, any>) =>
  errorHandler.handleError(error, ErrorCategory.USER_AWARENESS, context);

export const handleAIServiceError = (error: Error, context?: Record<string, any>) =>
  errorHandler.handleError(error, ErrorCategory.AI_SERVICE, context);

export const handleComponentError = (error: Error, context?: Record<string, any>) =>
  errorHandler.handleError(error, ErrorCategory.COMPONENT, context);

/**
 * React hook for error handling
 */
export const useErrorHandler = () => {
  const handleError = React.useCallback(
    (error: Error | string, category: ErrorCategory, context?: Record<string, any>) => 
      errorHandler.handleError(error, category, context),
    []
  );

  const subscribeToErrors = React.useCallback(
    (subscriberId: string, callback: (error: any) => void) => 
      errorHandler.subscribeToErrors(subscriberId, callback),
    []
  );

  const getErrorStats = React.useCallback(
    () => errorHandler.getErrorStats(),
    []
  );

  const clearErrorLog = React.useCallback(
    () => errorHandler.clearErrorLog(),
    []
  );

  return {
    handleError,
    subscribeToErrors,
    getErrorStats,
    clearErrorLog,
    handleNetworkError,
    handleAuthError,
    handleContextError,
    handleUserAwarenessError,
    handleAIServiceError,
    handleComponentError
  };
};
