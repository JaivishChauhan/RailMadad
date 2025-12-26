import { UserContextService } from "./userContextService";
import {
  Role,
  type User,
  type UserContext,
  type UserPreferences,
} from "../types";
import {
  errorHandler,
  handleUserAwarenessError,
  handleContextError,
  ErrorCategory,
  ErrorSeverity,
} from "../utils/errorHandler";
import {
  performanceOptimizer,
  PerformanceMetrics,
} from "../utils/performanceOptimizer";
import {
  createMemoizedFunction,
  createMemoizedAsyncFunction,
  BatchProcessor,
  AdvancedLRUCache,
} from "../utils/memoization";

// Logging configuration
interface LoggingConfig {
  enabled: boolean;
  level: "debug" | "info" | "warn" | "error";
  enablePerformanceLogs: boolean;
  enableMemoryLogs: boolean;
  enableSubscriberLogs: boolean;
  enableTransitionLogs: boolean;
}

// Default logging configuration - COMPLETELY SILENT
const LOGGING_CONFIG: LoggingConfig = {
  enabled: false, // Completely disabled to prevent console spam
  level: "error", // Only show critical errors when enabled
  enablePerformanceLogs: false,
  enableMemoryLogs: false,
  enableSubscriberLogs: false,
  enableTransitionLogs: false,
};

// Utility logger functions
const logger = {
  debug: (message: string, ...args: any[]) => {
    if (LOGGING_CONFIG.enabled && ["debug"].includes(LOGGING_CONFIG.level)) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (
      LOGGING_CONFIG.enabled &&
      ["debug", "info"].includes(LOGGING_CONFIG.level)
    ) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (
      LOGGING_CONFIG.enabled &&
      ["debug", "info", "warn"].includes(LOGGING_CONFIG.level)
    ) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    if (LOGGING_CONFIG.enabled) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  performance: (message: string, ...args: any[]) => {
    if (LOGGING_CONFIG.enabled && LOGGING_CONFIG.enablePerformanceLogs) {
      console.log(`[PERF] ${message}`, ...args);
    }
  },
  memory: (message: string, ...args: any[]) => {
    if (LOGGING_CONFIG.enabled && LOGGING_CONFIG.enableMemoryLogs) {
      console.log(`[MEM] ${message}`, ...args);
    }
  },
  subscriber: (message: string, ...args: any[]) => {
    if (LOGGING_CONFIG.enabled && LOGGING_CONFIG.enableSubscriberLogs) {
      console.log(`[SUB] ${message}`, ...args);
    }
  },
  transition: (message: string, ...args: any[]) => {
    if (LOGGING_CONFIG.enabled && LOGGING_CONFIG.enableTransitionLogs) {
      console.log(`[TRANS] ${message}`, ...args);
    }
  },
};

// Real-time synchronization types
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

interface PriorityOperation {
  id: string;
  type: string;
  priority: number;
  execute: () => Promise<boolean>;
  timestamp: number;
}

interface OptimisticUpdate {
  id: string;
  type: "preference_change" | "context_refresh" | "auth_state_change";
  originalContext: UserContext;
  optimisticContext: UserContext;
  timestamp: number;
  rollbackTimer?: NodeJS.Timeout;
  isRolledBack?: boolean;
}

interface UpdateIndicator {
  isActive: boolean;
  progress: number; // 0-100
  message?: string;
  type?: "loading" | "updating" | "syncing" | "error" | "success";
}

/**
 * User Awareness Manager - Centralized context management with optimized performance
 *
 * This manager provides:
 * - Context subscription system with debounced updates
 * - Session monitoring and automatic refresh
 * - Context caching and memory management
 * - Error handling for context update failures
 * - Real-time UI synchronization with smooth transitions
 * - Context update indicators and loading states
 * - Optimistic UI updates with rollback capabilities
 * - Performance optimization with memoization and batching
 * - Memory-efficient context processing and caching
 * - Intelligent context update scheduling and prioritization
 */
export class UserAwarenessManager {
  private static instance: UserAwarenessManager | null = null;
  private contextSubscribers: Map<string, (context: UserContext) => void> =
    new Map();
  private cachedContext: UserContext | null = null;
  private lastContextUpdate: number = 0;
  private contextUpdateTimer: NodeJS.Timeout | null = null;
  private sessionMonitorTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Configuration constants
  private static readonly DEBOUNCE_DELAY = 100; // 100ms debounce
  private static readonly SESSION_CHECK_INTERVAL = 30000; // 30 seconds
  private static readonly CACHE_VALIDITY_DURATION = 5000; // 5 seconds
  private static readonly MAX_UPDATE_FREQUENCY = 500; // Max 500ms between updates

  // Performance tracking
  private updateCount = 0;
  private errorCount = 0;
  private lastErrorTime: number = 0;

  // Real-time UI synchronization enhancements
  private updateIndicatorSubscribers: Map<
    string,
    (isUpdating: boolean, progress?: number) => void
  > = new Map();
  private transitionSubscribers: Map<
    string,
    (transition: ContextTransition) => void
  > = new Map();
  private optimisticUpdates: Map<string, OptimisticUpdate> = new Map();
  private isUpdating = false;
  private updateProgress = 0;
  private lastTransition: ContextTransition | null = null;

  // Context change tracking for smooth transitions
  private contextHistory: Array<{ context: UserContext; timestamp: number }> =
    [];
  private static readonly HISTORY_LIMIT = 10;

  // Enhanced error handling and recovery
  private errorRecoveryAttempts = 0;
  private static readonly MAX_RECOVERY_ATTEMPTS = 3;
  private lastRecoveryTime = 0;
  private static readonly RECOVERY_COOLDOWN = 30000; // 30 seconds
  private isInRecoveryMode = false;
  private criticalErrorCount = 0;
  private errorSubscriptions: Map<string, (error: any) => void> = new Map();
  private errorRecords: Array<{
    error: any;
    timestamp: number;
    category: string;
  }> = [];

  // Performance optimization components
  private contextProcessor!: BatchProcessor<
    { subscriberId: string; context: UserContext },
    boolean
  >;
  private contextCache!: AdvancedLRUCache<UserContext>;
  private memoizedValidation!: ReturnType<
    typeof createMemoizedFunction<[UserContext], boolean>
  >;
  private memoizedContextRefresh!: ReturnType<
    typeof createMemoizedAsyncFunction<[], UserContext>
  >;
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private updateScheduler: Map<string, NodeJS.Timeout> = new Map();
  private priorityQueue: PriorityOperation[] = [];

  // Performance tracking
  private static readonly PERFORMANCE_SAMPLE_SIZE = 100;
  private renderTimes: number[] = [];
  private contextUpdateTimes: number[] = [];
  private memoryUsageHistory: number[] = [];

  private constructor() {
    this.initialize();
    this.initializePerformanceOptimizations();
  }

  /**
   * Get singleton instance of UserAwarenessManager
   */
  static getInstance(): UserAwarenessManager {
    if (!UserAwarenessManager.instance) {
      UserAwarenessManager.instance = new UserAwarenessManager();

      // Make available globally for logging control (development only)
      if (process.env.NODE_ENV !== "production") {
        (window as any).UserAwarenessManager = UserAwarenessManager;
      }
    }
    return UserAwarenessManager.instance;
  }

  /**
   * Initialize the manager with monitoring and refresh systems
   */
  private initialize(): void {
    if (this.isInitialized) return;

    try {
      // Initialize UserContextService
      UserContextService.initialize();

      // Set up initial context with error handling
      this.safeRefreshContext();

      // Start session monitoring
      this.startSessionMonitoring();

      // Subscribe to UserContextService changes
      UserContextService.subscribeToContextChanges((context) => {
        this.handleContextUpdate(context);
      });

      // Subscribe to global error events
      this.setupErrorSubscription();

      this.isInitialized = true;
      logger.info("UserAwarenessManager initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize UserAwarenessManager:", error);
      this.handleCriticalError("initialization", error);
    }
  }

  /**
   * Setup error event subscription for enhanced error handling
   */
  private setupErrorSubscription(): void {
    try {
      errorHandler.subscribeToErrors(
        "user-awareness-manager",
        (errorReport) => {
          if (
            errorReport.category === ErrorCategory.USER_AWARENESS ||
            errorReport.category === ErrorCategory.CONTEXT
          ) {
            this.handleErrorReport(errorReport);
          }
        }
      );
    } catch (error) {
      logger.warn("Failed to setup error subscription:", error);
    }
  }

  /**
   * Initialize performance optimization components
   */
  private initializePerformanceOptimizations(): void {
    try {
      // Initialize context batch processor for efficient bulk updates
      this.contextProcessor = new BatchProcessor(
        async (updates) => {
          const startTime = performance.now();
          const results: boolean[] = [];

          for (const { subscriberId, context } of updates) {
            try {
              const callback = this.contextSubscribers.get(subscriberId);
              if (callback) {
                callback(context);
                results.push(true);
              } else {
                results.push(false);
              }
            } catch (error) {
              logger.warn(
                `Batch context update failed for ${subscriberId}:`,
                error
              );
              results.push(false);
            }
          }

          const duration = performance.now() - startTime;
          performanceOptimizer.trackContextUpdate(
            "batch_subscriber_update",
            duration,
            updates.length
          );

          return results;
        },
        15, // Batch size
        10 // 10ms delay
      );

      // Initialize context cache with LRU and TTL
      this.contextCache = new AdvancedLRUCache({
        maxSize: 50,
        ttl: 300000, // 5 minutes
        keyGenerator: (key: string) => key,
        contextAware: true,
        memoryLimit: 10, // 10MB
        onEviction: (key, context) => {
          logger.memory(`Context cache evicted: ${key}`);
        },
      });

      // Initialize memoized context validation
      this.memoizedValidation = createMemoizedFunction(
        (context: UserContext) => this.validateContextInternal(context),
        {
          maxSize: 100,
          ttl: 60000, // 1 minute
          keyGenerator: (context) =>
            `${context.user?.id || "anonymous"}_${
              context.sessionInfo.sessionId
            }_${context.lastActivity.getTime()}`,
          contextAware: true,
        }
      );

      // Initialize memoized context refresh
      this.memoizedContextRefresh = createMemoizedAsyncFunction(
        async (): Promise<UserContext> => {
          const startTime = performance.now();
          const context = UserContextService.getCurrentUserContext();
          const duration = performance.now() - startTime;

          performanceOptimizer.trackContextUpdate("service_refresh", duration);
          return context;
        },
        {
          maxSize: 5,
          ttl: 30000, // 30 seconds
          contextAware: false,
        }
      );

      // Start performance monitoring
      this.startPerformanceMonitoring();

      logger.info("Performance optimizations initialized");
    } catch (error) {
      logger.error("Failed to initialize performance optimizations:", error);
      this.handleCriticalError("performance_initialization", error);
    }
  }

  /**
   * Start performance monitoring and optimization scheduling
   */
  private startPerformanceMonitoring(): void {
    // Monitor and optimize every 30 seconds (silent)
    setInterval(() => {
      this.performanceHealthCheck();
    }, 30000);

    // Process priority queue every 100ms (silent)
    setInterval(() => {
      this.processPriorityQueue();
    }, 100);

    // Memory cleanup every 2 minutes (silent)
    setInterval(() => {
      this.performMemoryOptimization();
    }, 120000);
  }

  /**
   * Perform comprehensive performance health check
   */
  private async performanceHealthCheck(): Promise<void> {
    try {
      const startTime = performance.now();

      // Get performance statistics
      const stats = performanceOptimizer.getPerformanceStats();

      // Log performance metrics only in development mode
      if (
        process.env.NODE_ENV === "development" &&
        LOGGING_CONFIG.enablePerformanceLogs
      ) {
        logger.performance("Performance Health Check:", {
          score: stats.score,
          cacheSize: stats.cacheSize,
          renderTrackingSize: stats.renderTrackingSize,
          averageRenderTime: stats.averageRenderTime.toFixed(2) + "ms",
          averageContextUpdateTime:
            stats.averageContextUpdateTime.toFixed(2) + "ms",
          memoryUsage: stats.memoryUsage.toFixed(2) + "MB",
          cacheHitRate: stats.cacheHitRate.toFixed(1) + "%",
        });
      }

      // Check if performance optimization is needed (silent)
      if (stats.score < 70) {
        performanceOptimizer.forceOptimization();
      }

      // Track health check duration
      const duration = performance.now() - startTime;
      performanceOptimizer.recordMetric({
        operation: "health_check",
        duration,
        metadata: {
          performanceScore: stats.score,
          cacheSize: stats.cacheSize,
          memoryUsage: stats.memoryUsage,
        },
      });
    } catch (error) {
      // Only log errors in development
      if (process.env.NODE_ENV === "development") {
        logger.error("Performance health check failed:", error);
      }
      this.handleError("performance_health_check", error);
    }
  }

  /**
   * Process priority queue for scheduled operations
   */
  private processPriorityQueue(): void {
    try {
      // Check if there are pending operations in the priority queue
      if (this.priorityQueue && this.priorityQueue.length > 0) {
        const startTime = performance.now();

        // Process next operation in queue
        const operation = this.priorityQueue.shift();
        if (operation) {
          // Execute the operation
          operation
            .execute()
            .then((success) => {
              const duration = performance.now() - startTime;

              performanceOptimizer.recordMetric({
                operation: "priority_queue_process",
                duration,
                metadata: {
                  operationType: operation.type,
                  success,
                  queueLength: this.priorityQueue?.length || 0,
                },
              });

              if (!success) {
                logger.warn(
                  `Priority queue operation failed: ${operation.type}`
                );
              }
            })
            .catch((error) => {
              logger.error(
                `Priority queue operation error: ${operation.type}`,
                error
              );
            });
        }
      }
    } catch (error) {
      logger.error("Priority queue processing failed:", error);
    }
  }

  /**
   * Perform memory optimization and cleanup
   */
  private performMemoryOptimization(): void {
    try {
      const startTime = performance.now();

      // Clean up context cache
      if (this.contextCache) {
        this.contextCache.cleanup();
      }

      // Clean up old context history entries (keep last 10)
      if (this.contextHistory.length > 10) {
        const removed = this.contextHistory.length - 10;
        this.contextHistory = this.contextHistory.slice(-10);
        if (
          process.env.NODE_ENV === "development" &&
          LOGGING_CONFIG.enableMemoryLogs
        ) {
          logger.memory(`Cleaned up ${removed} old context history entries`);
        }
      }

      // Clean up old optimistic updates (older than 5 minutes)
      const fiveMinutesAgo = Date.now() - 300000;
      let cleanedUpdates = 0;

      for (const [id, update] of this.optimisticUpdates) {
        if (update.timestamp < fiveMinutesAgo) {
          this.optimisticUpdates.delete(id);
          cleanedUpdates++;
        }
      }

      if (
        cleanedUpdates > 0 &&
        process.env.NODE_ENV === "development" &&
        LOGGING_CONFIG.enableMemoryLogs
      ) {
        logger.memory(`Cleaned up ${cleanedUpdates} old optimistic updates`);
      }

      // Clean up old error records (keep last 20)
      if (this.errorRecords.length > 20) {
        const removed = this.errorRecords.length - 20;
        this.errorRecords = this.errorRecords.slice(-20);
        if (
          process.env.NODE_ENV === "development" &&
          LOGGING_CONFIG.enableMemoryLogs
        ) {
          logger.memory(`Cleaned up ${removed} old error records`);
        }
      }

      // Force garbage collection if available (development only)
      if (process.env.NODE_ENV === "development" && "gc" in window) {
        (window as any).gc();
      }

      const duration = performance.now() - startTime;
      performanceOptimizer.recordMetric({
        operation: "memory_optimization",
        duration,
        metadata: {
          historyEntriesRemoved:
            this.contextHistory.length > 10
              ? this.contextHistory.length - 10
              : 0,
          optimisticUpdatesRemoved: cleanedUpdates,
          errorRecordsRemoved:
            this.errorRecords.length > 20 ? this.errorRecords.length - 20 : 0,
        },
      });

      if (
        process.env.NODE_ENV === "development" &&
        LOGGING_CONFIG.enableMemoryLogs
      ) {
        logger.performance(
          `Memory optimization completed in ${duration.toFixed(2)}ms`
        );
      }
    } catch (error) {
      logger.error("Memory optimization failed:", error);
      this.handleError("memory_optimization", error);
    }
  }

  /**
   * Internal context validation with memoization
   */
  private validateContextInternal(context: UserContext): boolean {
    try {
      // Basic validation checks
      if (!context || typeof context !== "object") {
        return false;
      }

      // Validate session info
      if (!context.sessionInfo?.sessionId || !context.sessionInfo?.loginTime) {
        return false;
      }

      // Validate timestamp
      if (!context.lastActivity || !(context.lastActivity instanceof Date)) {
        return false;
      }

      // Validate user object structure (if authenticated)
      if (context.user) {
        if (!context.user.id || typeof context.user.id !== "string") {
          return false;
        }
      }

      // Validate preferences
      if (context.preferences && typeof context.preferences !== "object") {
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Context validation error:", error);
      return false;
    }
  }

  /**
   * Update user context
   */
  async updateContext(updates: Partial<UserContext>): Promise<void> {
    if (updates.preferences) {
      UserContextService.updateUserPreferences(updates.preferences);
    }
    // For other updates, we might need to extend UserContextService or just ignore them for now
    // as the context is largely derived from auth state.
  }

  /**
   * Subscribe to context changes with automatic debouncing and batch processing
   */
  subscribeToContext(
    subscriberId: string,
    callback: (context: UserContext) => void
  ): () => void {
    try {
      this.contextSubscribers.set(subscriberId, callback);

      // Immediately provide current context if available and valid
      if (this.cachedContext && this.isCacheValid()) {
        // Use batch processor for efficient callback execution
        this.contextProcessor
          .add({
            subscriberId,
            context: this.cachedContext,
          })
          .catch((error) => {
            logger.warn(
              `Batch context update failed for ${subscriberId}:`,
              error
            );
            // Fallback to direct callback
            callback(this.cachedContext!);
          });
      } else {
        // Refresh and provide context
        this.refreshContext().then((context) => {
          if (context) {
            // Use batch processor for the callback
            this.contextProcessor
              .add({
                subscriberId,
                context,
              })
              .catch((error) => {
                logger.warn(
                  `Batch context refresh failed for ${subscriberId}:`,
                  error
                );
                // Fallback to direct callback
                callback(context);
              });
          }
        });
      }

      if (
        process.env.NODE_ENV === "development" &&
        LOGGING_CONFIG.enableSubscriberLogs
      ) {
        logger.subscriber(
          `Subscriber '${subscriberId}' registered. Total subscribers: ${this.contextSubscribers.size}`
        );
      }

      // Return unsubscribe function
      return () => {
        this.contextSubscribers.delete(subscriberId);
        if (
          process.env.NODE_ENV === "development" &&
          LOGGING_CONFIG.enableSubscriberLogs
        ) {
          logger.subscriber(
            `Subscriber '${subscriberId}' unregistered. Total subscribers: ${this.contextSubscribers.size}`
          );
        }
      };
    } catch (error) {
      logger.error(`Failed to subscribe '${subscriberId}':`, error);
      this.handleError("subscription", error);
      return () => {}; // Return no-op unsubscribe function
    }
  }

  /**
   * Subscribe to update indicators for real-time loading states
   */
  subscribeToUpdateIndicator(
    subscriberId: string,
    callback: (isUpdating: boolean, progress?: number) => void
  ): () => void {
    try {
      this.updateIndicatorSubscribers.set(subscriberId, callback);

      // Provide current state immediately
      callback(this.isUpdating, this.updateProgress);

      if (
        process.env.NODE_ENV === "development" &&
        LOGGING_CONFIG.enableSubscriberLogs
      ) {
        logger.subscriber(
          `Update indicator subscriber '${subscriberId}' registered`
        );
      }

      return () => {
        this.updateIndicatorSubscribers.delete(subscriberId);
        if (
          process.env.NODE_ENV === "development" &&
          LOGGING_CONFIG.enableSubscriberLogs
        ) {
          logger.subscriber(
            `Update indicator subscriber '${subscriberId}' unregistered`
          );
        }
      };
    } catch (error) {
      logger.error(
        `Failed to subscribe update indicator '${subscriberId}':`,
        error
      );
      this.handleError("indicator_subscription", error);
      return () => {};
    }
  }

  /**
   * Subscribe to context transitions for smooth UI animations
   */
  subscribeToTransitions(
    subscriberId: string,
    callback: (transition: ContextTransition) => void
  ): () => void {
    try {
      this.transitionSubscribers.set(subscriberId, callback);

      // Provide last transition if available
      if (this.lastTransition) {
        callback(this.lastTransition);
      }

      if (
        process.env.NODE_ENV === "development" &&
        LOGGING_CONFIG.enableSubscriberLogs
      ) {
        logger.subscriber(`Transition subscriber '${subscriberId}' registered`);
      }

      return () => {
        this.transitionSubscribers.delete(subscriberId);
        if (
          process.env.NODE_ENV === "development" &&
          LOGGING_CONFIG.enableSubscriberLogs
        ) {
          logger.subscriber(
            `Transition subscriber '${subscriberId}' unregistered`
          );
        }
      };
    } catch (error) {
      logger.error(`Failed to subscribe transitions '${subscriberId}':`, error);
      this.handleError("transition_subscription", error);
      return () => {};
    }
  }

  /**
   * Update context with auth provider data
   */
  async updateWithAuthProviders(
    passengerUser: any,
    adminUser: any
  ): Promise<UserContext> {
    try {
      if (process.env.NODE_ENV === "development") {
        logger.debug("Updating context with auth providers:", {
          hasPassenger: !!passengerUser,
          hasAdmin: !!adminUser,
          passengerEmail: passengerUser?.email,
          adminEmail: adminUser?.email,
        });
      }

      // Update context service with current auth state
      const context = UserContextService.updateWithAuthProviders(
        passengerUser,
        adminUser
      );

      // Cache the new context
      this.updateCachedContext(context);

      // Notify subscribers of the update
      this.notifySubscribers(context);

      if (process.env.NODE_ENV === "development") {
        logger.info("Context updated with auth providers:", {
          isAuthenticated: context.isAuthenticated,
          userEmail: context.user?.email,
          role: context.role,
        });
      }

      return context;
    } catch (error) {
      logger.error("Failed to update context with auth providers:", error);
      this.handleError("auth_provider_update", error);
      return this.createFallbackContext();
    }
  }

  /**
   * Get current user context with caching
   */
  async getCurrentContext(
    passengerUser?: any,
    adminUser?: any
  ): Promise<UserContext> {
    try {
      // Return cached context if valid and no auth data provided
      if (
        !passengerUser &&
        !adminUser &&
        this.cachedContext &&
        this.isCacheValid()
      ) {
        return this.cachedContext;
      }

      // Refresh context from UserContextService with auth provider data
      return await this.refreshContext(false, passengerUser, adminUser);
    } catch (error) {
      logger.error("Failed to get current context:", error);
      this.handleError("context_retrieval", error);

      // Return fallback unauthenticated context
      return this.createFallbackContext();
    }
  }

  /**
   * Force refresh context from source with performance optimization
   */
  async refreshContext(
    forceRefresh = false,
    passengerUser?: any,
    adminUser?: any
  ): Promise<UserContext> {
    try {
      // Set updating state
      this.setUpdateIndicator(true, 10, "Refreshing context...");

      const previousContext = this.cachedContext;
      const startTime = Date.now();

      // Update progress
      this.setUpdateIndicator(true, 30, "Fetching latest context...");

      // Use memoized refresh for frequent calls, direct refresh for forced updates
      let context: UserContext;
      if (forceRefresh) {
        // Direct refresh for forced updates or authentication changes
        context = UserContextService.forceRefresh(passengerUser, adminUser);
        performanceOptimizer.trackContextUpdate(
          "force_refresh",
          performance.now() - startTime
        );
      } else {
        // Use direct refresh with auth providers for better accuracy
        context = UserContextService.getCurrentUserContext(
          passengerUser,
          adminUser
        );
        performanceOptimizer.trackContextUpdate(
          "refresh_with_auth",
          performance.now() - startTime
        );
      }

      // Update progress
      this.setUpdateIndicator(true, 70, "Processing context...");

      // Validate context using memoized validation
      const isValid = this.memoizedValidation(context);
      if (!isValid) {
        logger.warn("Refreshed context failed validation, using fallback");
        context = this.createFallbackContext();
      }

      // Check for context transition
      if (previousContext && this.hasContextChanged(previousContext, context)) {
        const transition = this.createTransition(
          previousContext,
          context,
          Date.now() - startTime
        );
        this.notifyTransitionSubscribers(transition);
        this.addToHistory(context);
      }

      // Cache context with performance tracking
      this.updateCachedContext(context);

      // Cache in performance-optimized cache
      const cacheKey = `context_${
        context.user?.id || "anonymous"
      }_${Date.now()}`;
      this.contextCache.set(cacheKey, context, context);

      // Final progress update
      this.setUpdateIndicator(true, 100, "Context updated");

      // Clear updating state after short delay for visual feedback
      setTimeout(() => {
        this.setUpdateIndicator(false, 0);
      }, 500);

      // Track performance metrics
      const totalDuration = Date.now() - startTime;
      performanceOptimizer.trackContextUpdate(
        "refresh_complete",
        totalDuration
      );

      return context;
    } catch (error) {
      logger.error("Failed to refresh context:", error);
      this.handleError("context_refresh", error);

      // Clear updating state on error
      this.setUpdateIndicator(false, 0, "Update failed");

      return this.createFallbackContext();
    }
  }

  /**
   * Update user preferences through the manager
   */
  async updateUserPreferences(
    preferences: Partial<UserPreferences>
  ): Promise<boolean> {
    try {
      // Start optimistic update
      const optimisticId = this.createOptimisticUpdate(
        "preference_change",
        preferences
      );

      UserContextService.updateUserPreferences(preferences);

      // Force context refresh to get updated preferences
      await this.refreshContext();

      // Complete optimistic update
      this.completeOptimisticUpdate(optimisticId);

      logger.info("User preferences updated successfully");
      return true;
    } catch (error) {
      logger.error("Failed to update user preferences:", error);
      this.handleError("preference_update", error);
      return false;
    }
  }

  /**
   * Create optimistic update for immediate UI feedback
   */
  createOptimisticUpdate(
    type: "preference_change" | "context_refresh" | "auth_state_change",
    changes: any,
    rollbackTimeoutMs = 10000
  ): string {
    if (!this.cachedContext) return "";

    const updateId = `optimistic_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const originalContext = { ...this.cachedContext };

    // Create optimistic context based on type
    let optimisticContext = { ...originalContext };

    switch (type) {
      case "preference_change":
        optimisticContext.preferences = {
          ...originalContext.preferences,
          ...changes,
        };
        break;
      case "auth_state_change":
        optimisticContext = {
          ...originalContext,
          ...changes,
        };
        break;
      case "context_refresh":
        // For refresh, we keep same context but mark as updating
        break;
    }

    // Set up rollback timer
    const rollbackTimer = setTimeout(() => {
      this.rollbackOptimisticUpdate(updateId);
    }, rollbackTimeoutMs);

    // Store optimistic update
    this.optimisticUpdates.set(updateId, {
      id: updateId,
      type,
      originalContext,
      optimisticContext,
      timestamp: Date.now(),
      rollbackTimer,
    });

    // Apply optimistic update immediately
    this.updateCachedContext(optimisticContext);
    this.notifySubscribers(optimisticContext);

    if (process.env.NODE_ENV === "development") {
      logger.debug(`Created optimistic update: ${updateId}`);
    }
    return updateId;
  }

  /**
   * Complete optimistic update (clear rollback timer)
   */
  completeOptimisticUpdate(updateId: string): void {
    const update = this.optimisticUpdates.get(updateId);
    if (update && update.rollbackTimer) {
      clearTimeout(update.rollbackTimer);
      this.optimisticUpdates.delete(updateId);
      if (process.env.NODE_ENV === "development") {
        logger.debug(`Completed optimistic update: ${updateId}`);
      }
    }
  }

  /**
   * Rollback optimistic update on failure
   */
  rollbackOptimisticUpdate(updateId: string): void {
    const update = this.optimisticUpdates.get(updateId);
    if (update && !update.isRolledBack) {
      // Rollback to original context
      this.updateCachedContext(update.originalContext);
      this.notifySubscribers(update.originalContext);

      // Mark as rolled back
      update.isRolledBack = true;
      this.optimisticUpdates.delete(updateId);

      logger.warn(`Rolled back optimistic update: ${updateId}`);
    }
  }

  /**
   * Set user context directly (for auth changes)
   */
  async setUserContext(user: User | null): Promise<void> {
    try {
      UserContextService.setUserContext(user);

      // Context will be updated through subscription
      if (process.env.NODE_ENV === "development") {
        logger.info(`User context set: ${user ? user.fullName : "Guest"}`);
      }
    } catch (error) {
      logger.error("Failed to set user context:", error);
      this.handleError("context_setting", error);
    }
  }

  /**
   * Clear user context (for logout)
   */
  async clearUserContext(): Promise<void> {
    try {
      UserContextService.clearContext();
      if (process.env.NODE_ENV === "development") {
        logger.info("User context cleared");
      }
    } catch (error) {
      logger.error("Failed to clear user context:", error);
      this.handleError("context_clearing", error);
    }
  }

  /**
   * Get manager statistics for monitoring
   */
  getManagerStats(): {
    subscriberCount: number;
    updateCount: number;
    errorCount: number;
    lastUpdate: number;
    cacheValid: boolean;
    isInitialized: boolean;
    isUpdating: boolean;
    optimisticUpdateCount: number;
    transitionCount: number;
    performanceStats: any;
    cacheStats: any;
    memoryUsage: number;
  } {
    const performanceStats = performanceOptimizer.getPerformanceStats();
    const cacheStats = this.contextCache ? this.contextCache.getStats() : null;

    return {
      subscriberCount: this.contextSubscribers.size,
      updateCount: this.updateCount,
      errorCount: this.errorCount,
      lastUpdate: this.lastContextUpdate,
      cacheValid: this.isCacheValid(),
      isInitialized: this.isInitialized,
      isUpdating: this.isUpdating,
      optimisticUpdateCount: this.optimisticUpdates.size,
      transitionCount: this.contextHistory.length,
      performanceStats,
      cacheStats,
      memoryUsage: this.calculateMemoryUsage(),
    };
  }

  /**
   * Calculate estimated memory usage
   */
  private calculateMemoryUsage(): number {
    try {
      let memoryUsage = 0;

      // Estimate memory for cached context
      if (this.cachedContext) {
        memoryUsage += JSON.stringify(this.cachedContext).length * 2; // UTF-16
      }

      // Estimate memory for context history
      memoryUsage += this.contextHistory.reduce((sum, entry) => {
        return sum + JSON.stringify(entry.context).length * 2;
      }, 0);

      // Estimate memory for optimistic updates
      for (const update of this.optimisticUpdates.values()) {
        memoryUsage += JSON.stringify(update.originalContext).length * 2;
        memoryUsage += JSON.stringify(update.optimisticContext).length * 2;
      }

      // Estimate memory for error records
      memoryUsage += this.errorRecords.reduce((sum, record) => {
        return sum + JSON.stringify(record).length * 2;
      }, 0);

      return Math.round(memoryUsage / 1024); // Return in KB
    } catch (error) {
      logger.warn("Failed to calculate memory usage:", error);
      return 0;
    }
  }

  /**
   * Force performance optimization
   */
  forcePerformanceOptimization(): void {
    try {
      logger.info("Forcing performance optimization...");

      // Trigger memory optimization
      this.performMemoryOptimization();

      // Clear memoization caches
      this.memoizedValidation.clearCache();
      this.memoizedContextRefresh.clearCache();

      // Force global performance optimization
      performanceOptimizer.forceOptimization();

      logger.info("Performance optimization completed");
    } catch (error) {
      logger.error("Performance optimization failed:", error);
      this.handleError("performance_optimization", error);
    }
  }

  /**
   * Set update indicator state and notify subscribers
   */
  private setUpdateIndicator(
    isUpdating: boolean,
    progress = 0,
    message?: string
  ): void {
    this.isUpdating = isUpdating;
    this.updateProgress = Math.max(0, Math.min(100, progress));

    // Notify all update indicator subscribers
    for (const [subscriberId, callback] of this.updateIndicatorSubscribers) {
      try {
        callback(isUpdating, this.updateProgress);
      } catch (error) {
        logger.error(
          `Error in update indicator subscriber '${subscriberId}':`,
          error
        );
      }
    }

    if (message && process.env.NODE_ENV === "development") {
      logger.debug(`${message} (${progress}%)`);
    }
  }

  /**
   * Check if context has meaningfully changed
   */
  private hasContextChanged(
    previous: UserContext,
    current: UserContext
  ): boolean {
    return (
      previous.isAuthenticated !== current.isAuthenticated ||
      previous.role !== current.role ||
      previous.user?.id !== current.user?.id ||
      JSON.stringify(previous.preferences) !==
        JSON.stringify(current.preferences) ||
      previous.sessionInfo.sessionId !== current.sessionInfo.sessionId
    );
  }

  /**
   * Create context transition object
   */
  private createTransition(
    from: UserContext | null,
    to: UserContext,
    duration: number
  ): ContextTransition {
    let type: ContextTransition["type"] = "session_refresh";

    if (!from) {
      type = "login";
    } else if (from.isAuthenticated && !to.isAuthenticated) {
      type = "logout";
    } else if (
      from.isAuthenticated &&
      to.isAuthenticated &&
      from.role !== to.role
    ) {
      type = "role_change";
    } else if (
      JSON.stringify(from.preferences) !== JSON.stringify(to.preferences)
    ) {
      type = "preference_update";
    } else if (from.sessionInfo.sessionId !== to.sessionInfo.sessionId) {
      type = "session_refresh";
    }

    const transition: ContextTransition = {
      type,
      from,
      to,
      timestamp: Date.now(),
      duration,
      smooth: duration < 1000, // Consider smooth if under 1 second
      metadata: {
        hasUserChange: from?.user?.id !== to.user?.id,
        hasRoleChange: from?.role !== to.role,
        hasPreferenceChange:
          JSON.stringify(from?.preferences) !== JSON.stringify(to.preferences),
      },
    };

    this.lastTransition = transition;
    return transition;
  }

  /**
   * Notify transition subscribers
   */
  private notifyTransitionSubscribers(transition: ContextTransition): void {
    for (const [subscriberId, callback] of this.transitionSubscribers) {
      try {
        callback(transition);
      } catch (error) {
        logger.error(
          `Error in transition subscriber '${subscriberId}':`,
          error
        );
      }
    }

    if (
      process.env.NODE_ENV === "development" &&
      LOGGING_CONFIG.enableTransitionLogs
    ) {
      logger.transition(
        `Context transition: ${transition.type} (${transition.duration}ms)`
      );
    }
  }

  /**
   * Add context to history for tracking
   */
  private addToHistory(context: UserContext): void {
    this.contextHistory.unshift({
      context: { ...context },
      timestamp: Date.now(),
    });

    // Keep only recent history
    if (this.contextHistory.length > UserAwarenessManager.HISTORY_LIMIT) {
      this.contextHistory = this.contextHistory.slice(
        0,
        UserAwarenessManager.HISTORY_LIMIT
      );
    }
  }

  /**
   * Get context transition history
   */
  getContextHistory(): Array<{ context: UserContext; timestamp: number }> {
    return [...this.contextHistory];
  }

  /**
   * Handle context updates with debouncing
   */
  private handleContextUpdate(context: UserContext): void {
    const now = Date.now();

    // Implement rate limiting to prevent excessive updates
    if (
      now - this.lastContextUpdate <
      UserAwarenessManager.MAX_UPDATE_FREQUENCY
    ) {
      // Debounce the update
      if (this.contextUpdateTimer) {
        clearTimeout(this.contextUpdateTimer);
      }

      this.contextUpdateTimer = setTimeout(() => {
        this.processContextUpdate(context);
      }, UserAwarenessManager.DEBOUNCE_DELAY);
    } else {
      // Process immediately if enough time has passed
      this.processContextUpdate(context);
    }
  }

  /**
   * Process context update and notify subscribers
   */
  private processContextUpdate(context: UserContext): void {
    try {
      // Update cached context
      this.updateCachedContext(context);

      // Notify all subscribers
      this.notifySubscribers(context);

      this.updateCount++;
      if (process.env.NODE_ENV === "development") {
        logger.debug(`Context updated. Update #${this.updateCount}`);
      }
    } catch (error) {
      logger.error("Failed to process context update:", error);
      this.handleError("context_processing", error);
    }
  }

  /**
   * Notify all subscribers with error handling
   */
  private notifySubscribers(context: UserContext): void {
    let successCount = 0;
    let errorCount = 0;

    for (const [subscriberId, callback] of this.contextSubscribers) {
      try {
        callback(context);
        successCount++;
      } catch (error) {
        logger.error(`Error in subscriber '${subscriberId}':`, error);
        errorCount++;
        this.handleError("subscriber_callback", error);
      }
    }

    if (errorCount > 0) {
      logger.warn(
        `${errorCount} subscriber(s) failed, ${successCount} succeeded`
      );
    }
  }

  /**
   * Update cached context with validation
   */
  private updateCachedContext(context: UserContext): void {
    // Validate context before caching
    if (this.isValidContext(context)) {
      this.cachedContext = context;
      this.lastContextUpdate = Date.now();
    } else {
      logger.warn("Invalid context provided, using fallback");
      this.cachedContext = this.createFallbackContext();
      this.lastContextUpdate = Date.now();
    }
  }

  /**
   * Check if cached context is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cachedContext || this.lastContextUpdate === 0) {
      return false;
    }

    const cacheAge = Date.now() - this.lastContextUpdate;
    return cacheAge < UserAwarenessManager.CACHE_VALIDITY_DURATION;
  }

  /**
   * Validate context structure
   */
  private isValidContext(context: UserContext): boolean {
    return (
      context &&
      typeof context.isAuthenticated === "boolean" &&
      Array.isArray(context.capabilities) &&
      context.preferences &&
      context.sessionInfo &&
      context.lastActivity instanceof Date
    );
  }

  /**
   * Create fallback unauthenticated context
   */
  private createFallbackContext(): UserContext {
    const now = new Date();
    return {
      user: null,
      isAuthenticated: false,
      role: null,
      capabilities: ["view_info", "submit_complaint"],
      preferences: {
        language: "en",
        notifications: false,
        theme: "light",
        accessibility: {
          screenReader: false,
          highContrast: false,
          largeText: false,
          keyboardNavigation: false,
          reducedMotion: false,
        },
      },
      sessionInfo: {
        sessionId: `fallback_${Date.now()}`,
        loginTime: now,
        lastUpdate: now,
        authMethod: "email",
        isExpired: false,
      },
      lastActivity: now,
    };
  }

  /**
   * Start session monitoring for automatic refresh
   */
  private startSessionMonitoring(): void {
    if (this.sessionMonitorTimer) {
      clearInterval(this.sessionMonitorTimer);
    }

    this.sessionMonitorTimer = setInterval(async () => {
      try {
        if (this.cachedContext && this.cachedContext.isAuthenticated) {
          // Validate session and refresh if needed
          const isValid = UserContextService.validateSession(
            this.cachedContext
          );
          if (!isValid) {
            logger.info("Session invalid, refreshing context...");
            await this.refreshContext();
          }
        }
      } catch (error) {
        logger.error("Error in session monitoring:", error);
        this.handleError("session_monitoring", error);
      }
    }, UserAwarenessManager.SESSION_CHECK_INTERVAL);
  }

  /**
   * Handle errors with logging and recovery
   */
  private handleError(operation: string, error: any): void {
    this.errorCount++;
    this.lastErrorTime = Date.now();

    const errorContext = {
      operation,
      subscriberCount: this.contextSubscribers.size,
      updateCount: this.updateCount,
      isInitialized: this.isInitialized,
      cacheValid: this.isCacheValid(),
      timestamp: new Date().toISOString(),
    };

    // Use centralized error handler
    handleUserAwarenessError(
      error instanceof Error ? error : new Error(String(error)),
      errorContext
    );

    logger.error(`UserAwarenessManager error in ${operation}:`, {
      error: error.message || error,
      operation,
      timestamp: new Date().toISOString(),
      errorCount: this.errorCount,
      context: errorContext,
    });

    // Implement circuit breaker pattern for high error rates
    const errorWindow = 60000; // 1 minute window
    const maxErrors = 10;

    if (
      this.errorCount >= maxErrors &&
      Date.now() - this.lastErrorTime < errorWindow
    ) {
      logger.error("High error rate detected, implementing circuit breaker");
      this.implementCircuitBreaker();
    } else if (this.shouldAttemptRecovery()) {
      this.attemptErrorRecovery(operation, error);
    }
  }

  /**
   * Handle critical errors that require immediate attention
   */
  private handleCriticalError(operation: string, error: any): void {
    this.criticalErrorCount++;

    const errorContext = {
      operation,
      criticalErrorCount: this.criticalErrorCount,
      isInRecoveryMode: this.isInRecoveryMode,
      subscriberCount: this.contextSubscribers.size,
    };

    // Report as critical error
    handleUserAwarenessError(
      error instanceof Error ? error : new Error(String(error)),
      {
        ...errorContext,
        severity: "critical",
      }
    );

    logger.error(`CRITICAL UserAwarenessManager error in ${operation}:`, {
      error: error.message || error,
      context: errorContext,
    });

    // Force recovery mode for critical errors
    this.enterRecoveryMode();
  }

  /**
   * Handle error reports from the centralized error handler
   */
  private handleErrorReport(errorReport: any): void {
    // Notify error subscribers
    for (const [subscriberId, callback] of this.errorSubscriptions) {
      try {
        callback(errorReport);
      } catch (callbackError) {
        logger.warn(
          `Error in error subscription callback '${subscriberId}':`,
          callbackError
        );
      }
    }

    // Take action based on error severity
    if (errorReport.severity === ErrorSeverity.CRITICAL) {
      this.enterRecoveryMode();
    }
  }

  /**
   * Determine if error recovery should be attempted
   */
  private shouldAttemptRecovery(): boolean {
    const now = Date.now();

    // Don't attempt recovery if we're already in recovery mode
    if (this.isInRecoveryMode) {
      return false;
    }

    // Don't attempt recovery if we've exceeded max attempts
    if (
      this.errorRecoveryAttempts >= UserAwarenessManager.MAX_RECOVERY_ATTEMPTS
    ) {
      return false;
    }

    // Don't attempt recovery if we're in cooldown period
    if (now - this.lastRecoveryTime < UserAwarenessManager.RECOVERY_COOLDOWN) {
      return false;
    }

    return true;
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptErrorRecovery(
    operation: string,
    error: any
  ): Promise<void> {
    this.errorRecoveryAttempts++;
    this.lastRecoveryTime = Date.now();

    logger.debug(
      `Attempting error recovery for operation: ${operation} (attempt ${this.errorRecoveryAttempts}/${UserAwarenessManager.MAX_RECOVERY_ATTEMPTS})`
    );

    try {
      switch (operation) {
        case "context_refresh":
        case "context_retrieval":
          await this.recoverContextOperations();
          break;

        case "subscription":
        case "subscriber_callback":
          this.recoverSubscriptionOperations();
          break;

        case "preference_update":
          await this.recoverPreferenceOperations();
          break;

        case "session_monitoring":
          this.recoverSessionMonitoring();
          break;

        default:
          logger.debug(
            `No specific recovery strategy for operation: ${operation}`
          );
          break;
      }

      logger.info(`Error recovery successful for operation: ${operation}`);
    } catch (recoveryError) {
      logger.error(
        `Error recovery failed for operation: ${operation}:`,
        recoveryError
      );

      // If recovery fails, enter recovery mode
      if (
        this.errorRecoveryAttempts >= UserAwarenessManager.MAX_RECOVERY_ATTEMPTS
      ) {
        this.enterRecoveryMode();
      }
    }
  }

  /**
   * Enter recovery mode with graceful degradation
   */
  private enterRecoveryMode(): void {
    if (this.isInRecoveryMode) {
      return;
    }

    this.isInRecoveryMode = true;
    logger.warn("UserAwarenessManager entering recovery mode");

    // Switch to fallback context
    const fallbackContext = this.createFallbackContext();
    this.updateCachedContext(fallbackContext);

    // Notify subscribers about recovery mode
    this.notifySubscribers(fallbackContext);

    // Set update indicator to show error state
    this.setUpdateIndicator(false, 0, "System recovery in progress");

    // Schedule recovery mode exit
    setTimeout(() => {
      this.exitRecoveryMode();
    }, 60000); // Exit recovery mode after 1 minute
  }

  /**
   * Exit recovery mode and attempt normal operations
   */
  private exitRecoveryMode(): void {
    if (!this.isInRecoveryMode) {
      return;
    }

    logger.info("UserAwarenessManager exiting recovery mode");

    this.isInRecoveryMode = false;
    this.errorRecoveryAttempts = 0;
    this.criticalErrorCount = 0;

    // Attempt to refresh context normally
    this.safeRefreshContext();
  }

  /**
   * Safe context refresh with error handling
   */
  private async safeRefreshContext(): Promise<UserContext> {
    try {
      return await this.refreshContext();
    } catch (error) {
      logger.error("Safe context refresh failed:", error);
      handleContextError(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: "safe_refresh",
          isInRecoveryMode: this.isInRecoveryMode,
        }
      );
      return this.createFallbackContext();
    }
  }

  /**
   * Recovery strategies for different operation types
   */
  private async recoverContextOperations(): Promise<void> {
    // Clear cache and restart context service
    this.cachedContext = null;
    this.lastContextUpdate = 0;

    // Reinitialize context service if needed
    try {
      UserContextService.initialize();
      await this.safeRefreshContext();
    } catch (error) {
      // Use fallback context if all else fails
      const fallbackContext = this.createFallbackContext();
      this.updateCachedContext(fallbackContext);
    }
  }

  private recoverSubscriptionOperations(): void {
    // Remove failed subscribers and clean up
    const failedSubscribers: string[] = [];

    for (const [subscriberId, callback] of this.contextSubscribers) {
      try {
        // Test the callback with current context
        if (this.cachedContext) {
          callback(this.cachedContext);
        }
      } catch (error) {
        logger.warn(`Removing failed subscriber: ${subscriberId}`);
        failedSubscribers.push(subscriberId);
      }
    }

    // Remove failed subscribers
    failedSubscribers.forEach((id) => this.contextSubscribers.delete(id));
  }

  private async recoverPreferenceOperations(): Promise<void> {
    // Clear any pending optimistic updates
    for (const [updateId, update] of this.optimisticUpdates) {
      if (update.rollbackTimer) {
        clearTimeout(update.rollbackTimer);
      }
      this.rollbackOptimisticUpdate(updateId);
    }

    // Reset preferences to last known good state
    if (this.cachedContext) {
      await this.safeRefreshContext();
    }
  }

  private recoverSessionMonitoring(): void {
    // Restart session monitoring
    if (this.sessionMonitorTimer) {
      clearInterval(this.sessionMonitorTimer);
      this.sessionMonitorTimer = null;
    }

    this.startSessionMonitoring();
  }

  /**
   * Subscribe to error notifications
   */
  subscribeToErrors(
    subscriberId: string,
    callback: (error: any) => void
  ): () => void {
    this.errorSubscriptions.set(subscriberId, callback);

    return () => {
      this.errorSubscriptions.delete(subscriberId);
    };
  }

  /**
   * Implement circuit breaker for high error rates
   */
  private implementCircuitBreaker(): void {
    // Clear timers to reduce load
    if (this.contextUpdateTimer) {
      clearTimeout(this.contextUpdateTimer);
      this.contextUpdateTimer = null;
    }

    if (this.sessionMonitorTimer) {
      clearInterval(this.sessionMonitorTimer);
      this.sessionMonitorTimer = null;
    }

    // Reset error count and restart monitoring after delay
    setTimeout(() => {
      this.errorCount = 0;
      this.startSessionMonitoring();
      logger.info("Circuit breaker reset, resuming normal operation");
    }, 30000); // 30 second cooldown
  }

  /**
   * Cleanup resources and stop monitoring
   */
  cleanup(): void {
    try {
      logger.info("Starting UserAwarenessManager cleanup...");

      // Exit recovery mode if active
      if (this.isInRecoveryMode) {
        this.isInRecoveryMode = false;
        logger.info("Exited recovery mode during cleanup");
      }

      // Clear timers
      if (this.contextUpdateTimer) {
        clearTimeout(this.contextUpdateTimer);
        this.contextUpdateTimer = null;
      }

      if (this.sessionMonitorTimer) {
        clearInterval(this.sessionMonitorTimer);
        this.sessionMonitorTimer = null;
      }

      // Clear optimistic update rollback timers
      for (const [id, update] of this.optimisticUpdates) {
        if (update.rollbackTimer) {
          clearTimeout(update.rollbackTimer);
        }
      }

      // Clear all subscribers
      this.contextSubscribers.clear();
      this.updateIndicatorSubscribers.clear();
      this.transitionSubscribers.clear();
      this.optimisticUpdates.clear();
      this.errorSubscriptions.clear();

      // Clear cache and state
      this.cachedContext = null;
      this.lastContextUpdate = 0;
      this.contextHistory = [];
      this.lastTransition = null;
      this.isUpdating = false;
      this.updateProgress = 0;

      // Reset error tracking
      this.errorCount = 0;
      this.errorRecoveryAttempts = 0;
      this.criticalErrorCount = 0;
      this.lastErrorTime = 0;
      this.lastRecoveryTime = 0;

      // Cleanup UserContextService
      try {
        UserContextService.cleanup();
      } catch (serviceCleanupError) {
        logger.warn(
          "Error during UserContextService cleanup:",
          serviceCleanupError
        );
      }

      this.isInitialized = false;
      logger.info("UserAwarenessManager cleanup completed successfully");
    } catch (error) {
      logger.error("Error during UserAwarenessManager cleanup:", error);
      // Don't throw during cleanup - just log the error
      handleUserAwarenessError(
        error instanceof Error ? error : new Error(String(error)),
        { operation: "cleanup" }
      );
    }
  }

  /**
   * Enable debug logging (use only when needed)
   */
  static enableDebugLogging(): void {
    LOGGING_CONFIG.enabled = true;
    LOGGING_CONFIG.level = "debug";
    LOGGING_CONFIG.enablePerformanceLogs = true;
    LOGGING_CONFIG.enableMemoryLogs = true;
    LOGGING_CONFIG.enableSubscriberLogs = true;
    LOGGING_CONFIG.enableTransitionLogs = true;
  }

  /**
   * Disable all logging (clean experience)
   */
  static disableAllLogging(): void {
    LOGGING_CONFIG.enabled = false;
    LOGGING_CONFIG.enablePerformanceLogs = false;
    LOGGING_CONFIG.enableMemoryLogs = false;
    LOGGING_CONFIG.enableSubscriberLogs = false;
    LOGGING_CONFIG.enableTransitionLogs = false;
  }

  /**
   * Configure logging settings at runtime
   */
  static configureLogging(config: Partial<LoggingConfig>): void {
    Object.assign(LOGGING_CONFIG, config);
    // Remove the logger.info call to prevent infinite loops
  }

  /**
   * Get current logging configuration
   */
  static getLoggingConfig(): LoggingConfig {
    return { ...LOGGING_CONFIG };
  }

  /**
   * Reset logging configuration to defaults
   */
  static resetLogging(): void {
    LOGGING_CONFIG.enabled = process.env.NODE_ENV !== "production";
    LOGGING_CONFIG.level = "error";
    LOGGING_CONFIG.enablePerformanceLogs = false;
    LOGGING_CONFIG.enableMemoryLogs = false;
    LOGGING_CONFIG.enableSubscriberLogs = false;
    LOGGING_CONFIG.enableTransitionLogs = false;
    // Remove the logger.info call to prevent infinite loops
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    if (UserAwarenessManager.instance) {
      UserAwarenessManager.instance.cleanup();
      UserAwarenessManager.instance = null;
    }
  }
}
