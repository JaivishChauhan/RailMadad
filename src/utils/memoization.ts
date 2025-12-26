/**
 * Advanced Memoization Utilities for Performance Optimization
 *
 * Provides comprehensive memoization strategies:
 * - LRU (Least Recently Used) cache with automatic cleanup
 * - Time-based cache expiration (TTL)
 * - Memory-aware caching with size limits
 * - Weak reference caching for object dependencies
 * - Context-aware memoization for user-specific data
 */
import React from "react";
import { UserContext } from "../types";

export interface MemoizationOptions {
  maxSize?: number; // Maximum cache entries
  ttl?: number; // Time to live in milliseconds
  keyGenerator?: (...args: any[]) => string; // Custom key generation
  onEviction?: (key: string, value: any) => void; // Eviction callback
  contextAware?: boolean; // Include user context in cache key
  memoryLimit?: number; // Memory limit in MB
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  size?: number;
  contextId?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  memoryUsage: number;
  hitRate: number;
  evictions: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Advanced LRU Cache with TTL and memory management
 */
export class AdvancedLRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Set<string>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    memoryUsage: 0,
    hitRate: 0,
    evictions: 0,
    oldestEntry: Date.now(),
    newestEntry: Date.now(),
  };

  constructor(
    private options: Required<MemoizationOptions> = {
      maxSize: 1000,
      ttl: 300000, // 5 minutes
      keyGenerator: (...args) => JSON.stringify(args),
      onEviction: () => {},
      contextAware: false,
      memoryLimit: 50, // 50MB
    }
  ) {}

  get(key: string, currentContext?: UserContext): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Check TTL expiration
    if (Date.now() - entry.timestamp > this.options.ttl) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Check context validity for context-aware caching
    if (this.options.contextAware && currentContext) {
      const contextId = this.generateContextId(currentContext);
      if (entry.contextId && entry.contextId !== contextId) {
        this.delete(key);
        this.stats.misses++;
        this.updateHitRate();
        return undefined;
      }
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccess = Date.now();

    // Move to front (most recently used)
    this.accessOrder.delete(key);
    this.accessOrder.add(key);

    this.stats.hits++;
    this.updateHitRate();

    return entry.value;
  }

  set(key: string, value: T, currentContext?: UserContext): void {
    const now = Date.now();
    const size = this.estimateSize(value);

    // Check memory limit
    if (
      this.stats.memoryUsage + size >
      this.options.memoryLimit * 1024 * 1024
    ) {
      this.evictByMemoryPressure();
    }

    // Check size limit
    if (this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }

    // Create cache entry
    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccess: now,
      size,
      contextId:
        this.options.contextAware && currentContext
          ? this.generateContextId(currentContext)
          : undefined,
    };

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Add new entry
    this.cache.set(key, entry);
    this.accessOrder.add(key);

    // Update stats
    this.stats.size = this.cache.size;
    this.stats.memoryUsage += size || 0;
    this.stats.newestEntry = now;

    if (this.stats.size === 1) {
      this.stats.oldestEntry = now;
    }
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.accessOrder.delete(key);

      // Update stats
      this.stats.size = this.cache.size;
      this.stats.memoryUsage -= entry.size || 0;

      // Call eviction callback
      this.options.onEviction(key, entry.value);

      return true;
    }
    return false;
  }

  clear(): void {
    // Call eviction callbacks
    for (const [key, entry] of this.cache) {
      this.options.onEviction(key, entry.value);
    }

    this.cache.clear();
    this.accessOrder.clear();

    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      memoryUsage: 0,
      hitRate: 0,
      evictions: 0,
      oldestEntry: Date.now(),
      newestEntry: Date.now(),
    };
  }

  private evictLRU(): void {
    // Get least recently used key
    const lruKey = this.accessOrder.values().next().value;
    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
    }
  }

  private evictByMemoryPressure(): void {
    // Sort by access count and last access time to evict least valuable entries
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      const [, entryA] = a;
      const [, entryB] = b;

      // Prioritize by access count, then by last access time
      if (entryA.accessCount !== entryB.accessCount) {
        return entryA.accessCount - entryB.accessCount;
      }

      return entryA.lastAccess - entryB.lastAccess;
    });

    // Evict bottom 25% of entries
    const toEvict = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toEvict && i < entries.length; i++) {
      const [key] = entries[i];
      this.delete(key);
      this.stats.evictions++;
    }
  }

  private generateContextId(context: UserContext): string {
    return `${context.user?.id || "anonymous"}_${context.role || "none"}_${
      context.sessionInfo.sessionId
    }`;
  }

  private estimateSize(value: any): number {
    if (value === null || value === undefined) return 8;

    switch (typeof value) {
      case "boolean":
        return 4;
      case "number":
        return 8;
      case "string":
        return value.length * 2; // Approximate for UTF-16
      case "object":
        return JSON.stringify(value).length * 2; // Rough estimate
      default:
        return 16;
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.options.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }
  }
}

/**
 * Create memoized function with advanced caching
 */
export function createMemoizedFunction<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options: Partial<MemoizationOptions> = {}
): {
  (...args: TArgs): TReturn;
  cache: AdvancedLRUCache<TReturn>;
  getStats: () => CacheStats;
  clearCache: () => void;
  setContext: (context?: UserContext) => void;
} {
  const defaultOptions: Required<MemoizationOptions> = {
    maxSize: 100,
    ttl: 300000, // 5 minutes
    keyGenerator: (...args) => JSON.stringify(args),
    onEviction: () => {},
    contextAware: false,
    memoryLimit: 10, // 10MB
  };

  const mergedOptions = { ...defaultOptions, ...options };
  const cache = new AdvancedLRUCache<TReturn>(mergedOptions);
  let currentContext: UserContext | undefined;

  const memoizedFn = (...args: TArgs): TReturn => {
    const key = mergedOptions.keyGenerator(...args);

    // Try to get from cache
    const cachedResult = cache.get(key, currentContext);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    // Compute result
    const result = fn(...args);

    // Store in cache
    cache.set(key, result, currentContext);

    return result;
  };

  // Add cache control methods
  memoizedFn.cache = cache;
  memoizedFn.getStats = () => cache.getStats();
  memoizedFn.clearCache = () => cache.clear();
  memoizedFn.setContext = (context?: UserContext) => {
    currentContext = context;
  };

  return memoizedFn;
}

/**
 * Memoization for async functions
 */
export function createMemoizedAsyncFunction<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: Partial<MemoizationOptions> = {}
): {
  (...args: TArgs): Promise<TReturn>;
  cache: AdvancedLRUCache<Promise<TReturn>>;
  getStats: () => CacheStats;
  clearCache: () => void;
  setContext: (context?: UserContext) => void;
} {
  const defaultOptions: Required<MemoizationOptions> = {
    maxSize: 50,
    ttl: 180000, // 3 minutes for async operations
    keyGenerator: (...args) => JSON.stringify(args),
    onEviction: () => {},
    contextAware: false,
    memoryLimit: 20, // 20MB
  };

  const mergedOptions = { ...defaultOptions, ...options };
  const cache = new AdvancedLRUCache<Promise<TReturn>>(mergedOptions);
  let currentContext: UserContext | undefined;

  const memoizedAsyncFn = async (...args: TArgs): Promise<TReturn> => {
    const key = mergedOptions.keyGenerator(...args);

    // Try to get from cache
    const cachedPromise = cache.get(key, currentContext);
    if (cachedPromise) {
      try {
        return await cachedPromise;
      } catch (error) {
        // Remove failed promise from cache
        cache.delete(key);
        throw error;
      }
    }

    // Create new promise and cache it immediately (to handle concurrent calls)
    const promise = fn(...args).catch((error) => {
      // Remove failed promise from cache
      cache.delete(key);
      throw error;
    });

    cache.set(key, promise, currentContext);

    return await promise;
  };

  // Add cache control methods
  memoizedAsyncFn.cache = cache;
  memoizedAsyncFn.getStats = () => cache.getStats();
  memoizedAsyncFn.clearCache = () => cache.clear();
  memoizedAsyncFn.setContext = (context?: UserContext) => {
    currentContext = context;
  };

  return memoizedAsyncFn;
}

/**
 * React hook for memoization with component lifecycle
 */
export function useMemoizedFunction<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  deps: React.DependencyList,
  options: Partial<MemoizationOptions> = {}
) {
  const memoizedFnRef = React.useRef<ReturnType<
    typeof createMemoizedFunction<TArgs, TReturn>
  > | null>(null);

  // Create memoized function on first render or when dependencies change
  const memoizedFn = React.useMemo(() => {
    // Clear previous cache if it exists
    if (memoizedFnRef.current) {
      memoizedFnRef.current.clearCache();
    }

    const newMemoizedFn = createMemoizedFunction(fn, options);
    memoizedFnRef.current = newMemoizedFn;
    return newMemoizedFn;
  }, deps);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (memoizedFnRef.current) {
        memoizedFnRef.current.clearCache();
      }
    };
  }, []);

  return memoizedFn;
}

/**
 * Context-aware memoization hook
 */
export function useContextAwareMemoization<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  context: UserContext | undefined,
  deps: React.DependencyList,
  options: Partial<MemoizationOptions> = {}
) {
  const contextAwareOptions = {
    ...options,
    contextAware: true,
    keyGenerator: (...args: any[]) => {
      const baseKey = options.keyGenerator
        ? options.keyGenerator(...args)
        : JSON.stringify(args);
      const contextKey = context
        ? `${context.user?.id}_${context.role}_${context.sessionInfo.sessionId}`
        : "anonymous";
      return `${contextKey}:${baseKey}`;
    },
  };

  const memoizedFn = useMemoizedFunction(fn, deps, contextAwareOptions);

  // Update context when it changes
  React.useEffect(() => {
    memoizedFn.setContext(context);
  }, [context, memoizedFn]);

  return memoizedFn;
}

/**
 * Batch operations utility for performance optimization
 */
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private resolvers: Array<{
    resolve: (value: R) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(
    private processBatch: (items: T[]) => Promise<R[]>,
    private batchSize: number = 10,
    private batchDelay: number = 50 // 50ms
  ) {}

  async add(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.batch.push(item);
      this.resolvers.push({ resolve, reject });

      // Process batch if size limit reached
      if (this.batch.length >= this.batchSize) {
        this.processBatchNow();
      } else {
        // Set timeout to process batch after delay
        if (this.batchTimeout) {
          clearTimeout(this.batchTimeout);
        }

        this.batchTimeout = setTimeout(() => {
          this.processBatchNow();
        }, this.batchDelay);
      }
    });
  }

  private async processBatchNow(): Promise<void> {
    if (this.batch.length === 0) return;

    const currentBatch = this.batch.slice();
    const currentResolvers = this.resolvers.slice();

    // Clear current batch
    this.batch = [];
    this.resolvers = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    try {
      const results = await this.processBatch(currentBatch);

      // Resolve individual promises
      for (let i = 0; i < currentResolvers.length; i++) {
        if (i < results.length) {
          currentResolvers[i].resolve(results[i]);
        } else {
          currentResolvers[i].reject(new Error("Batch processing incomplete"));
        }
      }
    } catch (error) {
      // Reject all promises in batch
      for (const resolver of currentResolvers) {
        resolver.reject(error);
      }
    }
  }

  flush(): Promise<void> {
    return this.processBatchNow();
  }
}

export default {
  createMemoizedFunction,
  createMemoizedAsyncFunction,
  useMemoizedFunction,
  useContextAwareMemoization,
  BatchProcessor,
  AdvancedLRUCache,
};
