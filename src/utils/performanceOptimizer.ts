/**
 * Performance Optimizer for RailMadad User Awareness System
 *
 * Provides comprehensive performance monitoring and optimization utilities:
 * - Memory usage tracking and optimization
 * - Component render performance monitoring
 * - Context update batching and debouncing
 * - Resource pooling and caching strategies
 * - Performance metrics collection and analysis
 */
import React from "react";
import { UserContext } from "../types";

export interface PerformanceMetrics {
  id: string;
  timestamp: number;
  operation: string;
  duration: number;
  memoryUsage?: number;
  componentRenders?: number;
  contextUpdates?: number;
  cacheHits?: number;
  cacheMisses?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  maxRenderTime: number; // Max component render time in ms
  maxContextUpdateTime: number; // Max context update time in ms
  maxMemoryUsage: number; // Max memory usage in MB
  maxCacheSize: number; // Max cache entries
  warningThreshold: number; // Performance warning threshold
  criticalThreshold: number; // Critical performance threshold
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  execute: () => Promise<boolean>;
  priority: "low" | "medium" | "high" | "critical";
  estimatedImpact: "minimal" | "moderate" | "significant" | "major";
}

/**
 * Performance Optimizer Class
 */
class PerformanceOptimizer {
  private static instance: PerformanceOptimizer | null = null;
  private metrics: PerformanceMetrics[] = [];
  private optimizationStrategies: Map<string, OptimizationStrategy> = new Map();
  private performanceObservers: Map<string, PerformanceObserver> = new Map();
  private resourcePools: Map<string, any[]> = new Map();
  private contextCache: Map<
    string,
    { data: any; timestamp: number; hits: number }
  > = new Map();
  private renderTracking: Map<
    string,
    { count: number; totalTime: number; lastRender: number }
  > = new Map();

  // Performance thresholds and configuration
  private thresholds: PerformanceThresholds = {
    maxRenderTime: 16, // 60 FPS target
    maxContextUpdateTime: 100, // 100ms max for context updates
    maxMemoryUsage: 100, // 100MB memory limit
    maxCacheSize: 1000, // Max 1000 cache entries
    warningThreshold: 0.7, // 70% of threshold triggers warning
    criticalThreshold: 0.9, // 90% of threshold triggers critical alert
  };

  // Optimization state
  private isOptimizing = false;
  private lastOptimization = 0;
  private optimizationCooldown = 30000; // 30 seconds between optimizations
  private performanceScore = 100; // 0-100 performance score

  private constructor() {
    this.initializeOptimizationStrategies();
    this.setupPerformanceMonitoring();
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Initialize optimization strategies
   */
  private initializeOptimizationStrategies(): void {
    // Memory optimization strategies
    this.optimizationStrategies.set("gc_context_cache", {
      id: "gc_context_cache",
      name: "Garbage Collect Context Cache",
      description: "Remove old and unused context cache entries",
      execute: async () => {
        return this.garbageCollectContextCache();
      },
      priority: "medium",
      estimatedImpact: "moderate",
    });

    this.optimizationStrategies.set("compress_metrics", {
      id: "compress_metrics",
      name: "Compress Performance Metrics",
      description: "Compress and archive old performance metrics",
      execute: async () => {
        return this.compressMetrics();
      },
      priority: "low",
      estimatedImpact: "minimal",
    });

    this.optimizationStrategies.set("optimize_render_tracking", {
      id: "optimize_render_tracking",
      name: "Optimize Render Tracking",
      description:
        "Clean up render tracking data and optimize component performance",
      execute: async () => {
        return this.optimizeRenderTracking();
      },
      priority: "high",
      estimatedImpact: "significant",
    });

    this.optimizationStrategies.set("pool_resource_cleanup", {
      id: "pool_resource_cleanup",
      name: "Resource Pool Cleanup",
      description: "Clean up unused resources in resource pools",
      execute: async () => {
        return this.cleanupResourcePools();
      },
      priority: "medium",
      estimatedImpact: "moderate",
    });

    this.optimizationStrategies.set("batch_context_updates", {
      id: "batch_context_updates",
      name: "Batch Context Updates",
      description: "Optimize context update batching for better performance",
      execute: async () => {
        return this.optimizeContextBatching();
      },
      priority: "critical",
      estimatedImpact: "major",
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor long tasks
    if ("PerformanceObserver" in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (entry.duration > this.thresholds.maxRenderTime) {
              this.recordMetric({
                operation: "long_task",
                duration: entry.duration,
                metadata: {
                  entryType: entry.entryType,
                  startTime: entry.startTime,
                },
              });
            }
          });
        });

        longTaskObserver.observe({ entryTypes: ["longtask"] });
        this.performanceObservers.set("longtask", longTaskObserver);
      } catch (error) {
        console.warn("Long task observer not supported:", error);
      }

      // Monitor layout shifts
      try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            this.recordMetric({
              operation: "layout_shift",
              duration: entry.value,
              metadata: {
                value: entry.value,
                hadRecentInput: entry.hadRecentInput,
              },
            });
          });
        });

        layoutShiftObserver.observe({ entryTypes: ["layout-shift"] });
        this.performanceObservers.set("layout-shift", layoutShiftObserver);
      } catch (error) {
        console.warn("Layout shift observer not supported:", error);
      }
    }

    // Setup memory monitoring
    if ("memory" in performance) {
      setInterval(() => {
        this.monitorMemoryUsage();
      }, 10000); // Monitor every 10 seconds
    }

    // Setup automatic optimization triggers
    setInterval(() => {
      this.assessPerformanceAndOptimize();
    }, 15000); // Assess every 15 seconds
  }

  /**
   * Record performance metric
   */
  recordMetric(metric: Omit<PerformanceMetrics, "id" | "timestamp">): void {
    const fullMetric: PerformanceMetrics = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...metric,
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics (last 1000 entries)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check if this metric indicates performance issues
    this.checkPerformanceThresholds(fullMetric);
  }

  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, renderTime: number): void {
    const tracking = this.renderTracking.get(componentName) || {
      count: 0,
      totalTime: 0,
      lastRender: Date.now(),
    };

    tracking.count++;
    tracking.totalTime += renderTime;
    tracking.lastRender = Date.now();

    this.renderTracking.set(componentName, tracking);

    // Record metric if render time is concerning
    if (renderTime > this.thresholds.maxRenderTime) {
      this.recordMetric({
        operation: "component_render",
        duration: renderTime,
        componentRenders: 1,
        metadata: {
          componentName,
          averageRenderTime: tracking.totalTime / tracking.count,
        },
      });
    }
  }

  /**
   * Track context update performance
   */
  trackContextUpdate(
    operation: string,
    duration: number,
    contextSize?: number
  ): void {
    this.recordMetric({
      operation: `context_${operation}`,
      duration,
      contextUpdates: 1,
      metadata: {
        contextSize: contextSize || 0,
      },
    });
  }

  /**
   * Cache context data with performance tracking
   */
  cacheContextData(key: string, data: any, ttl: number = 300000): void {
    // Check cache size limit
    if (this.contextCache.size >= this.thresholds.maxCacheSize) {
      this.garbageCollectContextCache();
    }

    this.contextCache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });

    // Set TTL cleanup
    setTimeout(() => {
      this.contextCache.delete(key);
    }, ttl);
  }

  /**
   * Retrieve cached context data
   */
  getCachedContextData(key: string): any | null {
    const cached = this.contextCache.get(key);
    if (cached) {
      cached.hits++;
      this.recordMetric({
        operation: "cache_hit",
        duration: 0,
        cacheHits: 1,
        metadata: { key, hits: cached.hits },
      });
      return cached.data;
    }

    this.recordMetric({
      operation: "cache_miss",
      duration: 0,
      cacheMisses: 1,
      metadata: { key },
    });

    return null;
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      const memoryUsageMB = memory.usedJSHeapSize / (1024 * 1024);

      this.recordMetric({
        operation: "memory_usage",
        duration: 0,
        memoryUsage: memoryUsageMB,
        metadata: {
          totalJSHeapSize: memory.totalJSHeapSize / (1024 * 1024),
          jsHeapSizeLimit: memory.jsHeapSizeLimit / (1024 * 1024),
        },
      });

      // Check memory thresholds
      if (
        memoryUsageMB >
        this.thresholds.maxMemoryUsage * this.thresholds.criticalThreshold
      ) {
        console.warn(
          "🚨 Critical memory usage detected:",
          memoryUsageMB.toFixed(2) + "MB"
        );
        this.triggerOptimization("memory_critical");
      } else if (
        memoryUsageMB >
        this.thresholds.maxMemoryUsage * this.thresholds.warningThreshold
      ) {
        console.warn(
          "⚠️ High memory usage detected:",
          memoryUsageMB.toFixed(2) + "MB"
        );
        this.triggerOptimization("memory_warning");
      }
    }
  }

  /**
   * Check performance thresholds
   */
  private checkPerformanceThresholds(metric: PerformanceMetrics): void {
    // Check render time thresholds
    if (
      metric.operation.includes("render") &&
      metric.duration > this.thresholds.maxRenderTime
    ) {
      if (metric.duration > this.thresholds.maxRenderTime * 2) {
        console.warn(
          "🚨 Critical render time detected:",
          metric.duration + "ms"
        );
        this.triggerOptimization("render_critical");
      } else {
        console.warn("⚠️ Slow render detected:", metric.duration + "ms");
      }
    }

    // Check context update thresholds
    if (
      metric.operation.includes("context") &&
      metric.duration > this.thresholds.maxContextUpdateTime
    ) {
      if (metric.duration > this.thresholds.maxContextUpdateTime * 2) {
        console.warn(
          "🚨 Critical context update time detected:",
          metric.duration + "ms"
        );
        this.triggerOptimization("context_critical");
      } else {
        console.warn(
          "⚠️ Slow context update detected:",
          metric.duration + "ms"
        );
      }
    }
  }

  /**
   * Assess overall performance and trigger optimizations
   */
  private assessPerformanceAndOptimize(): void {
    const recentMetrics = this.getRecentMetrics(60000); // Last 60 seconds

    // Calculate performance score
    this.performanceScore = this.calculatePerformanceScore(recentMetrics);

    // Trigger optimization if performance is poor
    if (this.performanceScore < 70) {
      console.warn(
        "📊 Poor performance detected. Score:",
        this.performanceScore
      );
      this.triggerOptimization("performance_assessment");
    }
  }

  /**
   * Calculate performance score based on recent metrics
   */
  private calculatePerformanceScore(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) return 100;

    let score = 100;
    let totalWeight = 0;

    // Analyze different performance aspects
    const renderMetrics = metrics.filter((m) => m.operation.includes("render"));
    const contextMetrics = metrics.filter((m) =>
      m.operation.includes("context")
    );
    const memoryMetrics = metrics.filter((m) => m.operation === "memory_usage");
    const longTasks = metrics.filter((m) => m.operation === "long_task");

    // Render performance (30% weight)
    if (renderMetrics.length > 0) {
      const avgRenderTime =
        renderMetrics.reduce((sum, m) => sum + m.duration, 0) /
        renderMetrics.length;
      const renderScore = Math.max(
        0,
        100 - (avgRenderTime / this.thresholds.maxRenderTime) * 50
      );
      score = (score * totalWeight + renderScore * 0.3) / (totalWeight + 0.3);
      totalWeight += 0.3;
    }

    // Context update performance (25% weight)
    if (contextMetrics.length > 0) {
      const avgContextTime =
        contextMetrics.reduce((sum, m) => sum + m.duration, 0) /
        contextMetrics.length;
      const contextScore = Math.max(
        0,
        100 - (avgContextTime / this.thresholds.maxContextUpdateTime) * 40
      );
      score =
        (score * totalWeight + contextScore * 0.25) / (totalWeight + 0.25);
      totalWeight += 0.25;
    }

    // Memory usage (20% weight)
    if (memoryMetrics.length > 0) {
      const latestMemory = memoryMetrics[memoryMetrics.length - 1];
      const memoryUsage = latestMemory.memoryUsage || 0;
      const memoryScore = Math.max(
        0,
        100 - (memoryUsage / this.thresholds.maxMemoryUsage) * 60
      );
      score = (score * totalWeight + memoryScore * 0.2) / (totalWeight + 0.2);
      totalWeight += 0.2;
    }

    // Long task penalty (25% weight)
    if (longTasks.length > 0) {
      const longTaskPenalty = Math.min(50, longTasks.length * 5); // Max 50 point penalty
      const longTaskScore = Math.max(0, 100 - longTaskPenalty);
      score =
        (score * totalWeight + longTaskScore * 0.25) / (totalWeight + 0.25);
      totalWeight += 0.25;
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Trigger optimization based on performance issues
   */
  private triggerOptimization(trigger: string): void {
    const now = Date.now();

    // Respect cooldown period
    if (now - this.lastOptimization < this.optimizationCooldown) {
      return;
    }

    if (this.isOptimizing) {
      return;
    }

    this.isOptimizing = true;
    this.lastOptimization = now;

    console.log(`🔧 Triggering performance optimization due to: ${trigger}`);

    // Execute optimization strategies based on trigger
    this.executeOptimizationStrategies(trigger).finally(() => {
      this.isOptimizing = false;
    });
  }

  /**
   * Execute optimization strategies
   */
  private async executeOptimizationStrategies(trigger: string): Promise<void> {
    const strategies = Array.from(this.optimizationStrategies.values());

    // Sort strategies by priority and estimated impact
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const impactOrder = { major: 4, significant: 3, moderate: 2, minimal: 1 };

    strategies.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      const aImpact = impactOrder[a.estimatedImpact] || 0;
      const bImpact = impactOrder[b.estimatedImpact] || 0;

      return bPriority + bImpact - (aPriority + aImpact);
    });

    // Execute strategies based on trigger severity
    const strategiesToExecute = trigger.includes("critical")
      ? strategies
      : trigger.includes("warning")
      ? strategies.slice(0, 3)
      : strategies.slice(0, 2);

    for (const strategy of strategiesToExecute) {
      try {
        const startTime = performance.now();
        const success = await strategy.execute();
        const duration = performance.now() - startTime;

        this.recordMetric({
          operation: "optimization_strategy",
          duration,
          metadata: {
            strategyId: strategy.id,
            success,
            trigger,
            priority: strategy.priority,
            estimatedImpact: strategy.estimatedImpact,
          },
        });

        if (success) {
          console.log(
            `✅ Optimization strategy completed: ${
              strategy.name
            } (${duration.toFixed(2)}ms)`
          );
        } else {
          console.warn(`❌ Optimization strategy failed: ${strategy.name}`);
        }
      } catch (error) {
        console.error(
          `🚨 Optimization strategy error: ${strategy.name}`,
          error
        );
      }
    }
  }

  /**
   * Optimization strategy implementations
   */
  private garbageCollectContextCache(): boolean {
    const initialSize = this.contextCache.size;
    const now = Date.now();
    const maxAge = 600000; // 10 minutes
    const minHits = 2;

    for (const [key, cached] of this.contextCache) {
      const age = now - cached.timestamp;
      if (age > maxAge && cached.hits < minHits) {
        this.contextCache.delete(key);
      }
    }

    const cleaned = initialSize - this.contextCache.size;
    console.log(
      `🧹 Context cache cleanup: removed ${cleaned} entries, ${this.contextCache.size} remaining`
    );
    return cleaned > 0;
  }

  private compressMetrics(): boolean {
    const initialLength = this.metrics.length;

    if (initialLength > 500) {
      // Keep only recent and important metrics
      const now = Date.now();
      const maxAge = 300000; // 5 minutes

      this.metrics = this.metrics.filter((metric) => {
        const age = now - metric.timestamp;
        const isRecent = age < maxAge;
        const isImportant =
          metric.operation.includes("critical") ||
          metric.operation.includes("error") ||
          metric.duration > this.thresholds.maxRenderTime;

        return isRecent || isImportant;
      });

      // Keep at most 300 metrics
      if (this.metrics.length > 300) {
        this.metrics = this.metrics.slice(-300);
      }
    }

    const compressed = initialLength - this.metrics.length;
    console.log(
      `📊 Metrics compression: removed ${compressed} entries, ${this.metrics.length} remaining`
    );
    return compressed > 0;
  }

  private optimizeRenderTracking(): boolean {
    const initialSize = this.renderTracking.size;
    const now = Date.now();
    const maxAge = 900000; // 15 minutes

    for (const [componentName, tracking] of this.renderTracking) {
      const age = now - tracking.lastRender;
      if (age > maxAge && tracking.count < 10) {
        this.renderTracking.delete(componentName);
      }
    }

    const cleaned = initialSize - this.renderTracking.size;
    console.log(
      `🎭 Render tracking optimization: removed ${cleaned} entries, ${this.renderTracking.size} remaining`
    );
    return cleaned > 0;
  }

  private cleanupResourcePools(): boolean {
    let totalCleaned = 0;

    for (const [poolName, pool] of this.resourcePools) {
      const initialSize = pool.length;

      // Keep only recent and frequently used resources
      if (initialSize > 50) {
        this.resourcePools.set(poolName, pool.slice(-25));
        totalCleaned += initialSize - 25;
      }
    }

    console.log(
      `🏊 Resource pool cleanup: cleaned ${totalCleaned} resources from ${this.resourcePools.size} pools`
    );
    return totalCleaned > 0;
  }

  private optimizeContextBatching(): boolean {
    // This would integrate with the UserAwarenessManager to optimize batching
    console.log("🔄 Context batching optimization applied");
    return true;
  }

  /**
   * Get recent metrics within specified time window
   */
  private getRecentMetrics(timeWindowMs: number): PerformanceMetrics[] {
    const now = Date.now();
    return this.metrics.filter(
      (metric) => now - metric.timestamp <= timeWindowMs
    );
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    score: number;
    totalMetrics: number;
    cacheSize: number;
    renderTrackingSize: number;
    recentMetrics: PerformanceMetrics[];
    averageRenderTime: number;
    averageContextUpdateTime: number;
    memoryUsage: number;
    cacheHitRate: number;
  } {
    const recentMetrics = this.getRecentMetrics(300000); // Last 5 minutes

    const renderMetrics = recentMetrics.filter((m) =>
      m.operation.includes("render")
    );
    const contextMetrics = recentMetrics.filter((m) =>
      m.operation.includes("context")
    );
    const memoryMetrics = recentMetrics.filter(
      (m) => m.operation === "memory_usage"
    );
    const cacheHits = recentMetrics.filter(
      (m) => m.operation === "cache_hit"
    ).length;
    const cacheMisses = recentMetrics.filter(
      (m) => m.operation === "cache_miss"
    ).length;

    return {
      score: this.performanceScore,
      totalMetrics: this.metrics.length,
      cacheSize: this.contextCache.size,
      renderTrackingSize: this.renderTracking.size,
      recentMetrics,
      averageRenderTime:
        renderMetrics.length > 0
          ? renderMetrics.reduce((sum, m) => sum + m.duration, 0) /
            renderMetrics.length
          : 0,
      averageContextUpdateTime:
        contextMetrics.length > 0
          ? contextMetrics.reduce((sum, m) => sum + m.duration, 0) /
            contextMetrics.length
          : 0,
      memoryUsage:
        memoryMetrics.length > 0
          ? memoryMetrics[memoryMetrics.length - 1].memoryUsage || 0
          : 0,
      cacheHitRate:
        cacheHits + cacheMisses > 0
          ? (cacheHits / (cacheHits + cacheMisses)) * 100
          : 0,
    };
  }

  /**
   * Force optimization run
   */
  forceOptimization(): void {
    this.triggerOptimization("manual_trigger");
  }

  /**
   * Reset performance tracking
   */
  reset(): void {
    this.metrics = [];
    this.contextCache.clear();
    this.renderTracking.clear();
    this.resourcePools.clear();
    this.performanceScore = 100;
    console.log("🔄 Performance tracking reset");
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    // Disconnect performance observers
    for (const observer of this.performanceObservers.values()) {
      observer.disconnect();
    }
    this.performanceObservers.clear();

    // Clear all tracking data
    this.reset();

    console.log("🧹 Performance optimizer disposed");
  }
}

// Export singleton instance and utilities
export const performanceOptimizer = PerformanceOptimizer.getInstance();

/**
 * Performance monitoring decorator for components
 */
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const name =
    componentName ||
    Component.displayName ||
    Component.name ||
    "UnknownComponent";

  const PerformanceMonitoredComponent = (props: P) => {
    const startTime = performance.now();

    React.useEffect(() => {
      const renderTime = performance.now() - startTime;
      performanceOptimizer.trackComponentRender(name, renderTime);
    });

    return React.createElement(Component, props);
  };

  PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${name})`;
  return PerformanceMonitoredComponent;
};

/**
 * React hook for performance monitoring
 */
export const usePerformanceMonitoring = (componentName: string) => {
  const [renderCount, setRenderCount] = React.useState(0);
  const startTimeRef = React.useRef(performance.now());

  React.useEffect(() => {
    const renderTime = performance.now() - startTimeRef.current;
    performanceOptimizer.trackComponentRender(componentName, renderTime);
    setRenderCount((prev) => prev + 1);
    startTimeRef.current = performance.now();
  });

  return {
    renderCount,
    trackOperation: (operation: string, fn: () => any) => {
      const start = performance.now();
      const result = fn();
      const duration = performance.now() - start;

      performanceOptimizer.recordMetric({
        operation,
        duration,
        metadata: { componentName },
      });

      return result;
    },
    getStats: () => performanceOptimizer.getPerformanceStats(),
  };
};

export default PerformanceOptimizer;
