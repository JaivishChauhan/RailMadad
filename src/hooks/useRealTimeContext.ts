import { useState, useEffect, useCallback, useRef } from 'react';
import { UserAwarenessManager } from '../services/userAwarenessManager';
import { type UserContext } from '../types';

interface ContextTransition {
  type: 'login' | 'logout' | 'role_change' | 'preference_update' | 'session_refresh' | 'error_recovery';
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
  type?: 'loading' | 'updating' | 'syncing' | 'error' | 'success';
}

interface UseRealTimeContextOptions {
  subscriberId?: string;
  enableTransitions?: boolean;
  enableUpdateIndicators?: boolean;
  enableOptimisticUpdates?: boolean;
}

interface UseRealTimeContextReturn {
  // Core context
  userContext: UserContext | null;
  isLoading: boolean;
  error: string | null;
  
  // Real-time features
  updateIndicator: UpdateIndicator;
  lastTransition: ContextTransition | null;
  isTransitioning: boolean;
  
  // Actions
  refreshContext: () => Promise<void>;
  updatePreferences: (preferences: any) => Promise<boolean>;
  clearError: () => void;
  
  // State information
  contextHistory: Array<{ context: UserContext; timestamp: number }>;
  managerStats: any;
}

/**
 * Enhanced hook for real-time user context with smooth transitions and loading indicators
 */
export const useRealTimeContext = (
  options: UseRealTimeContextOptions = {}
): UseRealTimeContextReturn => {
  const {
    subscriberId = `realtime-context-${Date.now()}`,
    enableTransitions = true,
    enableUpdateIndicators = true,
    enableOptimisticUpdates = true
  } = options;

  // Core state
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time state
  const [updateIndicator, setUpdateIndicator] = useState<UpdateIndicator>({
    isActive: false,
    progress: 0
  });
  const [lastTransition, setLastTransition] = useState<ContextTransition | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [contextHistory, setContextHistory] = useState<Array<{ context: UserContext; timestamp: number }>>([]);
  const [managerStats, setManagerStats] = useState<any>({});
  
  // Refs for cleanup
  const unsubscribeContextRef = useRef<(() => void) | null>(null);
  const unsubscribeIndicatorRef = useRef<(() => void) | null>(null);
  const unsubscribeTransitionRef = useRef<(() => void) | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get manager instance
  const manager = UserAwarenessManager.getInstance();

  // Context subscription
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Subscribe to context changes
      const unsubscribeContext = manager.subscribeToContext(subscriberId, (context) => {
        setUserContext(context);
        setIsLoading(false);
        setError(null);
      });
      
      unsubscribeContextRef.current = unsubscribeContext;
      
      return () => {
        if (unsubscribeContextRef.current) {
          unsubscribeContextRef.current();
          unsubscribeContextRef.current = null;
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe to context');
      setIsLoading(false);
    }
  }, [subscriberId, manager]);
  
  // Update indicator subscription
  useEffect(() => {
    if (!enableUpdateIndicators) return;
    
    try {
      const unsubscribeIndicator = manager.subscribeToUpdateIndicator(
        `${subscriberId}-indicator`,
        (isUpdating, progress = 0) => {
          setUpdateIndicator({
            isActive: isUpdating,
            progress,
            type: isUpdating ? 'updating' : undefined
          });
        }
      );
      
      unsubscribeIndicatorRef.current = unsubscribeIndicator;
      
      return () => {
        if (unsubscribeIndicatorRef.current) {
          unsubscribeIndicatorRef.current();
          unsubscribeIndicatorRef.current = null;
        }
      };
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to subscribe to update indicators:', err);
      }
    }
  }, [enableUpdateIndicators, subscriberId, manager]);
  
  // Transition subscription
  useEffect(() => {
    if (!enableTransitions) return;
    
    try {
      const unsubscribeTransition = manager.subscribeToTransitions(
        `${subscriberId}-transition`,
        (transition) => {
          setLastTransition(transition);
          setIsTransitioning(true);
          
          // Clear previous transition timeout
          if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
          }
          
          // Set timeout to clear transitioning state
          const transitionDuration = transition.smooth ? 300 : 600;
          transitionTimeoutRef.current = setTimeout(() => {
            setIsTransitioning(false);
          }, transitionDuration);
        }
      );
      
      unsubscribeTransitionRef.current = unsubscribeTransition;
      
      return () => {
        if (unsubscribeTransitionRef.current) {
          unsubscribeTransitionRef.current();
          unsubscribeTransitionRef.current = null;
        }
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
      };
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to subscribe to transitions:', err);
      }
    }
  }, [enableTransitions, subscriberId, manager]);
  
  // Update context history and stats periodically
  useEffect(() => {
    const updateStats = () => {
      try {
        setContextHistory(manager.getContextHistory());
        setManagerStats(manager.getManagerStats());
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to update context history/stats:', err);
        }
      }
    };
    
    // Update immediately
    updateStats();
    
    // Update every 5 seconds
    const interval = setInterval(updateStats, 5000);
    
    return () => clearInterval(interval);
  }, [manager]);

  // Actions
  const refreshContext = useCallback(async () => {
    try {
      setError(null);
      await manager.refreshContext();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh context';
      setError(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to refresh context:', err);
      }
    }
  }, [manager]);
  
  const updatePreferences = useCallback(async (preferences: any): Promise<boolean> => {
    try {
      setError(null);
      
      if (enableOptimisticUpdates) {
        // Manager handles optimistic updates internally
        return await manager.updateUserPreferences(preferences);
      } else {
        return await manager.updateUserPreferences(preferences);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update preferences:', err);
      }
      return false;
    }
  }, [manager, enableOptimisticUpdates]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Core context
    userContext,
    isLoading,
    error,
    
    // Real-time features
    updateIndicator,
    lastTransition,
    isTransitioning,
    
    // Actions
    refreshContext,
    updatePreferences,
    clearError,
    
    // State information
    contextHistory,
    managerStats
  };
};

/**
 * Simplified hook for basic real-time context without advanced features
 */
export const useBasicRealTimeContext = (subscriberId?: string) => {
  return useRealTimeContext({
    subscriberId,
    enableTransitions: false,
    enableUpdateIndicators: false,
    enableOptimisticUpdates: false
  });
};

/**
 * Hook for context with only update indicators (good for loading states)
 */
export const useContextWithIndicators = (subscriberId?: string) => {
  return useRealTimeContext({
    subscriberId,
    enableTransitions: false,
    enableUpdateIndicators: true,
    enableOptimisticUpdates: false
  });
};

/**
 * Full-featured hook with all real-time capabilities
 */
export const useAdvancedRealTimeContext = (subscriberId?: string) => {
  return useRealTimeContext({
    subscriberId,
    enableTransitions: true,
    enableUpdateIndicators: true,
    enableOptimisticUpdates: true
  });
};