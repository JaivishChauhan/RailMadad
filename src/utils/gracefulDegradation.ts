/**
 * Graceful Degradation Utilities for RailMadad
 * 
 * Provides fallback strategies and degraded functionality
 * when primary systems fail or are unavailable.
 */

import React, { useCallback } from 'react';
import { UserContext, Role } from '../types';
import { errorHandler, ErrorCategory } from './errorHandler';

/**
 * Degradation levels for different features
 */
export enum DegradationLevel {
  FULL = 'full',           // All features available
  REDUCED = 'reduced',     // Some features disabled
  MINIMAL = 'minimal',     // Only core features
  OFFLINE = 'offline'      // Offline mode with cached data
}

/**
 * Feature availability matrix based on degradation level
 */
export const FeatureAvailability = {
  [DegradationLevel.FULL]: {
    userAwareness: true,
    realTimeUpdates: true,
    aiChat: true,
    fileUpload: true,
    voiceInput: true,
    contextTransitions: true,
    optimisticUpdates: true,
    errorRecovery: true
  },
  [DegradationLevel.REDUCED]: {
    userAwareness: true,
    realTimeUpdates: false,
    aiChat: true,
    fileUpload: false,
    voiceInput: false,
    contextTransitions: false,
    optimisticUpdates: false,
    errorRecovery: true
  },
  [DegradationLevel.MINIMAL]: {
    userAwareness: false,
    realTimeUpdates: false,
    aiChat: true,
    fileUpload: false,
    voiceInput: false,
    contextTransitions: false,
    optimisticUpdates: false,
    errorRecovery: false
  },
  [DegradationLevel.OFFLINE]: {
    userAwareness: false,
    realTimeUpdates: false,
    aiChat: false,
    fileUpload: false,
    voiceInput: false,
    contextTransitions: false,
    optimisticUpdates: false,
    errorRecovery: false
  }
} as const;

/**
 * Fallback user context for when user awareness fails
 */
export const createFallbackUserContext = (
  degradationLevel: DegradationLevel = DegradationLevel.MINIMAL
): UserContext => {
  const now = new Date();
  
  const baseContext: UserContext = {
    user: null,
    isAuthenticated: false,
    role: null,
    capabilities: ['view_info'],
    preferences: {
      language: 'en',
      notifications: false,
      theme: 'light',
      accessibility: {
        screenReader: false,
        highContrast: false,
        largeText: false,
        keyboardNavigation: false,
        reducedMotion: false
      }
    },
    sessionInfo: {
      sessionId: `fallback_${Date.now()}`,
      loginTime: now,
      lastUpdate: now,
      authMethod: 'email',
      isExpired: false
    },
    lastActivity: now
  };

  // Adjust capabilities based on degradation level
  switch (degradationLevel) {
    case DegradationLevel.FULL:
    case DegradationLevel.REDUCED:
      baseContext.capabilities = ['view_info', 'submit_complaint', 'track_complaint'];
      break;
    case DegradationLevel.MINIMAL:
      baseContext.capabilities = ['view_info', 'submit_complaint'];
      break;
    case DegradationLevel.OFFLINE:
      baseContext.capabilities = ['view_info'];
      break;
  }

  return baseContext;
};

/**
 * Fallback AI responses for when AI service fails
 */
export const FallbackResponses = {
  greeting: "Hello! I'm your RailMadad assistant. I'm currently running in basic mode but can still help you with railway queries and complaints.",
  
  aiUnavailable: "I'm sorry, but my AI capabilities are temporarily unavailable. However, I can still help you submit complaints and provide basic railway information.",
  
  contextUnavailable: "I'm unable to access your personalized information right now, but I can still assist you with general railway queries.",
  
  networkError: "I'm having trouble connecting to our servers. You can still use basic features, and I'll sync your data when the connection is restored.",
  
  fileUploadError: "File upload is temporarily unavailable. You can still describe your issue in text, and we'll help you submit your complaint.",
  
  voiceError: "Voice input is currently not working. Please type your message instead.",
  
  authError: "There's an issue with authentication. You can still use basic features, but for personalized help, please try logging in again.",
  
  complaintSubmissionError: "I'm having trouble submitting your complaint right now. I've saved your information and will try again automatically. You can also call 139 for immediate assistance.",
  
  fallbackContact: "For immediate assistance, please contact Railway Helpline at 139 or visit your nearest railway station.",
  
  offlineMode: "You're currently offline. I can show you cached information and you can prepare complaints that will be submitted when your connection is restored."
};

/**
 * Degradation Manager Class
 */
class DegradationManager {
  private static instance: DegradationManager | null = null;
  private currentLevel: DegradationLevel = DegradationLevel.FULL;
  private degradationSubscribers: Map<string, (level: DegradationLevel) => void> = new Map();
  private featureOverrides: Map<string, boolean> = new Map();
  private degradationReasons: string[] = [];

  private constructor() {
    this.setupNetworkMonitoring();
  }

  static getInstance(): DegradationManager {
    if (!DegradationManager.instance) {
      DegradationManager.instance = new DegradationManager();
    }
    return DegradationManager.instance;
  }

  /**
   * Set degradation level and notify subscribers
   */
  setDegradationLevel(level: DegradationLevel, reason?: string): void {
    const previousLevel = this.currentLevel;
    this.currentLevel = level;

    if (reason) {
      this.degradationReasons.push(`${new Date().toISOString()}: ${reason}`);
      // Keep only last 10 reasons
      if (this.degradationReasons.length > 10) {
        this.degradationReasons = this.degradationReasons.slice(-10);
      }
    }

    console.log(`🔄 Degradation level changed: ${previousLevel} → ${level}${reason ? ` (${reason})` : ''}`);

    // Log to error handler for tracking
    errorHandler.handleError(
      `Degradation level changed to ${level}`,
      ErrorCategory.PERFORMANCE,
      { 
        previousLevel, 
        newLevel: level, 
        reason,
        timestamp: Date.now()
      }
    );

    // Notify subscribers
    for (const [subscriberId, callback] of this.degradationSubscribers) {
      try {
        callback(level);
      } catch (error) {
        console.error(`Error in degradation subscriber ${subscriberId}:`, error);
      }
    }
  }

  /**
   * Get current degradation level
   */
  getCurrentLevel(): DegradationLevel {
    return this.currentLevel;
  }

  /**
   * Check if a feature is available at current degradation level
   */
  isFeatureAvailable(feature: keyof typeof FeatureAvailability[DegradationLevel.FULL]): boolean {
    // Check for manual overrides first
    if (this.featureOverrides.has(feature)) {
      return this.featureOverrides.get(feature) || false;
    }

    return FeatureAvailability[this.currentLevel][feature];
  }

  /**
   * Manually override a feature's availability
   */
  setFeatureOverride(feature: string, available: boolean): void {
    this.featureOverrides.set(feature, available);
    console.log(`🔧 Feature override: ${feature} = ${available}`);
  }

  /**
   * Clear feature override
   */
  clearFeatureOverride(feature: string): void {
    this.featureOverrides.delete(feature);
    console.log(`🔧 Cleared feature override: ${feature}`);
  }

  /**
   * Subscribe to degradation level changes
   */
  subscribe(subscriberId: string, callback: (level: DegradationLevel) => void): () => void {
    this.degradationSubscribers.set(subscriberId, callback);
    
    // Immediately notify of current level
    callback(this.currentLevel);
    
    return () => {
      this.degradationSubscribers.delete(subscriberId);
    };
  }

  /**
   * Get degradation status information
   */
  getStatus(): {
    level: DegradationLevel;
    availableFeatures: string[];
    unavailableFeatures: string[];
    reasons: string[];
    overrides: Record<string, boolean>;
  } {
    const features = FeatureAvailability[this.currentLevel];
    
    return {
      level: this.currentLevel,
      availableFeatures: Object.entries(features)
        .filter(([_, available]) => available)
        .map(([feature, _]) => feature),
      unavailableFeatures: Object.entries(features)
        .filter(([_, available]) => !available)
        .map(([feature, _]) => feature),
      reasons: [...this.degradationReasons],
      overrides: Object.fromEntries(this.featureOverrides)
    };
  }

  /**
   * Automatically assess and set degradation level based on system state
   */
  assessDegradation(): void {
    let newLevel = DegradationLevel.FULL;
    const reasons: string[] = [];

    // Check network connectivity
    if (!navigator.onLine) {
      newLevel = DegradationLevel.OFFLINE;
      reasons.push('Network offline');
    }
    // Check error rates (this would be integrated with error handler)
    else if (this.hasHighErrorRate()) {
      newLevel = DegradationLevel.REDUCED;
      reasons.push('High error rate detected');
    }
    // Check if critical services are failing
    else if (this.hasCriticalServiceFailures()) {
      newLevel = DegradationLevel.MINIMAL;
      reasons.push('Critical services unavailable');
    }

    if (newLevel !== this.currentLevel) {
      this.setDegradationLevel(newLevel, reasons.join(', '));
    }
  }

  /**
   * Setup network monitoring for automatic degradation
   */
  private setupNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      console.log('📶 Network restored');
      this.assessDegradation();
    });

    window.addEventListener('offline', () => {
      console.log('📵 Network lost');
      this.setDegradationLevel(DegradationLevel.OFFLINE, 'Network connection lost');
    });

    // Initial assessment
    this.assessDegradation();
  }

  /**
   * Check for high error rate (placeholder - would integrate with error handler)
   */
  private hasHighErrorRate(): boolean {
    try {
      const stats = errorHandler.getErrorStats();
      const recentErrors = stats.unresolved;
      return recentErrors > 5; // Threshold for high error rate
    } catch {
      return false;
    }
  }

  /**
   * Check for critical service failures (placeholder - would check service health)
   */
  private hasCriticalServiceFailures(): boolean {
    // This would check the health of critical services
    // For now, return false as a placeholder
    return false;
  }
}

// Export singleton instance
export const degradationManager = DegradationManager.getInstance();

/**
 * React hook for graceful degradation
 */
export const useDegradation = () => {
  const [level, setLevel] = React.useState(degradationManager.getCurrentLevel());
  const [status, setStatus] = React.useState(degradationManager.getStatus());

  React.useEffect(() => {
    const unsubscribe = degradationManager.subscribe('use-degradation-hook', (newLevel) => {
      setLevel(newLevel);
      setStatus(degradationManager.getStatus());
    });

    return unsubscribe;
  }, []);

  const isFeatureAvailable = React.useCallback(
    (feature: keyof typeof FeatureAvailability[DegradationLevel.FULL]) => 
      degradationManager.isFeatureAvailable(feature),
    []
  );

  const setFeatureOverride = React.useCallback(
    (feature: string, available: boolean) => 
      degradationManager.setFeatureOverride(feature, available),
    []
  );

  const clearFeatureOverride = React.useCallback(
    (feature: string) => 
      degradationManager.clearFeatureOverride(feature),
    []
  );

  const getFallbackResponse = React.useCallback(
    (key: keyof typeof FallbackResponses) => FallbackResponses[key],
    []
  );

  const createFallbackContext = React.useCallback(
    (level?: DegradationLevel) => createFallbackUserContext(level),
    []
  );

  return {
    level,
    status,
    isFeatureAvailable,
    setFeatureOverride,
    clearFeatureOverride,
    getFallbackResponse,
    createFallbackContext
  };
};

/**
 * Higher-order component for graceful degradation
 */
export const withGracefulDegradation = <P extends object>(
  Component: React.ComponentType<P>,
  fallbackComponent?: React.ComponentType<P>,
  requiredFeatures?: string[]
) => {
  const WrappedComponent = (props: P) => {
    const { isFeatureAvailable, level } = useDegradation();

    // Check if all required features are available
    const hasRequiredFeatures = !requiredFeatures || 
      requiredFeatures.every(feature => isFeatureAvailable(feature as any));

    if (!hasRequiredFeatures && fallbackComponent) {
      return React.createElement(fallbackComponent, props);
    }

    if (!hasRequiredFeatures && level === DegradationLevel.OFFLINE) {
      // Return a simple object representing offline state
      return React.createElement('div', {
        className: 'flex items-center justify-center p-8 bg-gray-50 rounded-lg'
      }, React.createElement('div', {
        className: 'text-center'
      }, [
        React.createElement('h3', {
          className: 'text-lg font-medium text-gray-900 mb-2',
          key: 'title'
        }, "You're Offline"),
        React.createElement('p', {
          className: 'text-gray-600 mb-4',
          key: 'description'
        }, 'This feature requires an internet connection.'),
        React.createElement('p', {
          className: 'text-sm text-gray-500',
          key: 'instruction'
        }, 'Please check your connection and try again.')
      ]));
    }

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withGracefulDegradation(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

/**
 * Default offline fallback component
 */
export const createOfflineFallbackComponent = () => {
  return {
    displayName: 'OfflineFallback',
    render: () => ({
      type: 'div',
      props: {
        className: 'flex items-center justify-center p-8 bg-gray-50 rounded-lg',
        children: {
          type: 'div',
          props: {
            className: 'text-center',
            children: [
              {
                type: 'div',
                props: {
                  className: 'text-gray-500 mb-4',
                  children: [
                    {
                      type: 'svg',
                      props: {
                        className: 'w-16 h-16 mx-auto mb-4',
                        fill: 'none',
                        stroke: 'currentColor',
                        viewBox: '0 0 24 24'
                      }
                    }
                  ]
                }
              },
              {
                type: 'h3',
                props: {
                  className: 'text-lg font-medium text-gray-900 mb-2',
                  children: "You're Offline"
                }
              },
              {
                type: 'p',
                props: {
                  className: 'text-gray-600 mb-4',
                  children: 'This feature requires an internet connection.'
                }
              },
              {
                type: 'p',
                props: {
                  className: 'text-sm text-gray-500',
                  children: 'Please check your connection and try again.'
                }
              }
            ]
          }
        }
      }
    })
  };
};

export default DegradationManager;