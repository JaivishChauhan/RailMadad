/**
 * Plugin Architecture for User-Aware Features
 *
 * Provides an extensible foundation for adding new user-aware features
 * without modifying core code. Supports dynamic loading, configuration,
 * and lifecycle management of plugins.
 */

import { UserContext, Role } from "../types";
import { SecurityManager } from "./securityManager";
import { UserAwarenessManager } from "../services/userAwarenessManager";

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];
  requiredCapabilities?: string[];
  supportedRoles?: Role[];
  category:
    | "ui"
    | "service"
    | "integration"
    | "analytics"
    | "security"
    | "utility";
  tags?: string[];
}

export interface PluginConfig {
  enabled: boolean;
  settings: Record<string, any>;
  userSettings?: Record<string, any>;
  roleSettings?: Record<Role, Record<string, any>>;
}

export interface PluginHooks {
  onUserContextChange?: (
    context: UserContext,
    previousContext?: UserContext
  ) => void;
  onAuthentication?: (context: UserContext) => void;
  onLogout?: (previousContext: UserContext) => void;
  onRoleChange?: (
    newRole: Role,
    previousRole: Role,
    context: UserContext
  ) => void;
  onCapabilityUpdate?: (capabilities: string[], context: UserContext) => void;
  onSessionExpire?: (context: UserContext) => void;
  onError?: (error: Error, context?: UserContext) => void;
  onPerformanceIssue?: (
    metric: string,
    value: number,
    context?: UserContext
  ) => void;
  onSecurityViolation?: (violation: any, context?: UserContext) => void;
}

export interface PluginAPI {
  // Context access
  getCurrentContext: () => UserContext | null;
  updateContext: (updates: Partial<UserContext>) => Promise<void>;

  // Security access
  validateAccess: (resource: string, action: string) => boolean;
  sanitizeInput: (input: any, type?: string) => any;

  // UI integration
  registerComponent: (
    name: string,
    component: React.ComponentType<any>
  ) => void;
  unregisterComponent: (name: string) => void;

  // Event system
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: (data?: any) => void) => () => void;

  // Storage
  getStorage: (key: string) => any;
  setStorage: (key: string, value: any) => void;

  // HTTP requests
  request: (url: string, options?: RequestInit) => Promise<Response>;

  // Logging
  log: (
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: any
  ) => void;

  // Notifications
  notify: (
    type: "info" | "success" | "warning" | "error",
    message: string
  ) => void;
}

export interface Plugin {
  metadata: PluginMetadata;
  config: PluginConfig;
  hooks: PluginHooks;

  // Lifecycle methods
  initialize?: (api: PluginAPI, config: PluginConfig) => Promise<void>;
  activate?: (api: PluginAPI) => Promise<void>;
  deactivate?: (api: PluginAPI) => Promise<void>;
  cleanup?: (api: PluginAPI) => Promise<void>;

  // Configuration
  getDefaultConfig?: () => PluginConfig;
  validateConfig?: (config: PluginConfig) => string[] | null;

  // UI components
  getComponents?: () => Record<string, React.ComponentType<any>>;

  // Settings UI
  getSettingsComponent?: () => React.ComponentType<{
    config: PluginConfig;
    onChange: (config: PluginConfig) => void;
  }>;
}

export interface PluginEvent {
  type: string;
  timestamp: Date;
  pluginId: string;
  data?: any;
  userContext?: UserContext;
}

/**
 * Plugin Manager for handling plugin lifecycle and coordination
 */
export class PluginManager {
  private static instance: PluginManager | null = null;
  private plugins: Map<string, Plugin> = new Map();
  private activePlugins: Set<string> = new Set();
  private eventListeners: Map<string, Set<(data?: any) => void>> = new Map();
  private components: Map<string, React.ComponentType<any>> = new Map();
  private eventHistory: PluginEvent[] = [];
  private maxEventHistory = 1000;

  private userAwarenessManager: UserAwarenessManager;
  private securityManager: SecurityManager;
  private currentContext: UserContext | null = null;

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  constructor() {
    this.userAwarenessManager = UserAwarenessManager.getInstance();
    this.securityManager = SecurityManager.getInstance();
    this.setupCoreEventListeners();
  }

  /**
   * Register a new plugin
   */
  async registerPlugin(plugin: Plugin): Promise<boolean> {
    try {
      // Validate plugin metadata
      if (!this.validatePluginMetadata(plugin.metadata)) {
        throw new Error("Invalid plugin metadata");
      }

      // Check for conflicts
      if (this.plugins.has(plugin.metadata.id)) {
        throw new Error(`Plugin ${plugin.metadata.id} is already registered`);
      }

      // Validate dependencies
      if (!this.validateDependencies(plugin.metadata.dependencies)) {
        throw new Error("Plugin dependencies not met");
      }

      // Validate configuration
      if (plugin.validateConfig && !plugin.validateConfig(plugin.config)) {
        throw new Error("Invalid plugin configuration");
      }

      // Register the plugin
      this.plugins.set(plugin.metadata.id, plugin);

      // Initialize if auto-enabled
      if (plugin.config.enabled) {
        await this.activatePlugin(plugin.metadata.id);
      }

      this.logPluginEvent("registered", plugin.metadata.id);
      return true;
    } catch (error) {
      console.error(`Failed to register plugin ${plugin.metadata.id}:`, error);
      return false;
    }
  }

  /**
   * Activate a plugin
   */
  async activatePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      if (this.activePlugins.has(pluginId)) {
        return true; // Already active
      }

      // Check user permissions
      const currentContext = this.getCurrentContext();
      if (!this.canUserAccessPlugin(currentContext, plugin)) {
        throw new Error("Insufficient permissions to activate plugin");
      }

      // Initialize plugin
      if (plugin.initialize) {
        await plugin.initialize(this.createPluginAPI(pluginId), plugin.config);
      }

      // Activate plugin
      if (plugin.activate) {
        await plugin.activate(this.createPluginAPI(pluginId));
      }

      // Register components
      if (plugin.getComponents) {
        const components = plugin.getComponents();
        Object.entries(components).forEach(([name, component]) => {
          this.registerComponent(`${pluginId}.${name}`, component);
        });
      }

      // Set up event hooks
      this.setupPluginHooks(pluginId, plugin.hooks);

      this.activePlugins.add(pluginId);
      this.logPluginEvent("activated", pluginId);

      return true;
    } catch (error) {
      console.error(`Failed to activate plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin || !this.activePlugins.has(pluginId)) {
        return true; // Not active
      }

      // Deactivate plugin
      if (plugin.deactivate) {
        await plugin.deactivate(this.createPluginAPI(pluginId));
      }

      // Cleanup plugin
      if (plugin.cleanup) {
        await plugin.cleanup(this.createPluginAPI(pluginId));
      }

      // Unregister components
      for (const [name] of this.components) {
        if (name.startsWith(`${pluginId}.`)) {
          this.components.delete(name);
        }
      }

      // Remove event hooks
      this.removePluginHooks(pluginId);

      this.activePlugins.delete(pluginId);
      this.logPluginEvent("deactivated", pluginId);

      return true;
    } catch (error) {
      console.error(`Failed to deactivate plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string): Promise<boolean> {
    try {
      // Deactivate first
      await this.deactivatePlugin(pluginId);

      // Remove from registry
      this.plugins.delete(pluginId);

      this.logPluginEvent("unregistered", pluginId);
      return true;
    } catch (error) {
      console.error(`Failed to unregister plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Get list of all plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get list of active plugins
   */
  getActivePlugins(): Plugin[] {
    return Array.from(this.activePlugins).map((id) => this.plugins.get(id)!);
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Check if plugin is active
   */
  isActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }

  /**
   * Get registered component
   */
  getComponent(name: string): React.ComponentType<any> | undefined {
    return this.components.get(name);
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfig(
    pluginId: string,
    config: Partial<PluginConfig>
  ): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      const newConfig = { ...plugin.config, ...config } as PluginConfig;

      // Validate new configuration
      if (plugin.validateConfig) {
        const errors = plugin.validateConfig(newConfig);
        if (errors && errors.length > 0) {
          throw new Error(
            `Configuration validation failed: ${errors.join(", ")}`
          );
        }
      }

      // Update configuration
      plugin.config = newConfig;

      // Restart plugin if active and config changed significantly
      if (this.activePlugins.has(pluginId)) {
        await this.deactivatePlugin(pluginId);
        if (newConfig.enabled) {
          await this.activatePlugin(pluginId);
        }
      }

      this.logPluginEvent("config_updated", pluginId, { config });
      return true;
    } catch (error) {
      console.error(`Failed to update plugin config ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Emit event to all listening plugins
   */
  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }

    // Log event
    this.logPluginEvent("event_emitted", "system", { event, data });
  }

  /**
   * Create plugin API instance
   */
  private createPluginAPI(pluginId: string): PluginAPI {
    return {
      getCurrentContext: () => this.getCurrentContext(),
      updateContext: async (updates) => {
        // TODO: Implement proper context update mapping
        console.warn("PluginAPI.updateContext is not fully implemented");
        if (updates.preferences) {
          await this.userAwarenessManager.updateUserPreferences(
            updates.preferences
          );
        }
      },

      validateAccess: (resource, action) => {
        const context = this.getCurrentContext();
        const validation = this.securityManager.validateAccess(
          context,
          { allowUnauthenticated: false },
          resource,
          action
        );
        return validation.allowed;
      },

      sanitizeInput: (input, type = "text") => {
        return this.securityManager.sanitizeInput(input, type as any);
      },

      registerComponent: (name, component) => {
        this.registerComponent(`${pluginId}.${name}`, component);
      },

      unregisterComponent: (name) => {
        this.components.delete(`${pluginId}.${name}`);
      },

      emit: (event, data) => this.emit(event, data),

      on: (event, handler) => {
        if (!this.eventListeners.has(event)) {
          this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(handler);

        // Return unsubscribe function
        return () => {
          this.eventListeners.get(event)?.delete(handler);
        };
      },

      getStorage: (key) => {
        try {
          const data = localStorage.getItem(`plugin_${pluginId}_${key}`);
          return data ? JSON.parse(data) : null;
        } catch {
          return null;
        }
      },

      setStorage: (key, value) => {
        try {
          localStorage.setItem(
            `plugin_${pluginId}_${key}`,
            JSON.stringify(value)
          );
        } catch (error) {
          console.error("Failed to save plugin data:", error);
        }
      },

      request: async (url, options) => {
        // Add security headers and validation
        const secureOptions = {
          ...options,
          headers: {
            ...options?.headers,
            "X-Plugin-ID": pluginId,
          },
        };
        return fetch(url, secureOptions);
      },

      log: (level, message, data) => {
        console[level](`[Plugin ${pluginId}] ${message}`, data);
      },

      notify: (type, message) => {
        // This would integrate with a notification system
        console.log(`[${type.toUpperCase()}] ${message}`);
      },
    };
  }

  /**
   * Validate plugin metadata
   */
  private validatePluginMetadata(metadata: PluginMetadata): boolean {
    return !!(
      metadata.id &&
      metadata.name &&
      metadata.version &&
      metadata.category
    );
  }

  /**
   * Validate plugin dependencies
   */
  private validateDependencies(dependencies?: string[]): boolean {
    if (!dependencies) return true;

    return dependencies.every((dep) => this.plugins.has(dep));
  }

  /**
   * Check if user can access plugin
   */
  private canUserAccessPlugin(
    context: UserContext | null,
    plugin: Plugin
  ): boolean {
    // Check required capabilities
    if (plugin.metadata.requiredCapabilities) {
      if (!context?.capabilities) return false;

      const hasAllCapabilities = plugin.metadata.requiredCapabilities.every(
        (cap) => context.capabilities.includes(cap)
      );

      if (!hasAllCapabilities) return false;
    }

    // Check supported roles
    if (plugin.metadata.supportedRoles) {
      if (!context?.role) return false;

      if (!plugin.metadata.supportedRoles.includes(context.role)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Set up plugin event hooks
   */
  private setupPluginHooks(pluginId: string, hooks: PluginHooks): void {
    if (hooks.onUserContextChange) {
      this.on("userContextChange", hooks.onUserContextChange);
    }

    if (hooks.onAuthentication) {
      this.on("userAuthenticated", hooks.onAuthentication);
    }

    if (hooks.onLogout) {
      this.on("userLoggedOut", hooks.onLogout);
    }

    // Add other hooks...
  }

  /**
   * Remove plugin event hooks
   */
  private removePluginHooks(pluginId: string): void {
    // Remove all event listeners for this plugin
    // This would need to track which listeners belong to which plugin
  }

  /**
   * Set up core event listeners
   */
  private setupCoreEventListeners(): void {
    // Subscribe to user awareness events
    this.userAwarenessManager.subscribeToContext(
      "plugin-manager",
      (context) => {
        this.currentContext = context;
        this.emit("userContextChange", context);
      }
    );
  }

  /**
   * Register a component
   */
  private registerComponent(
    name: string,
    component: React.ComponentType<any>
  ): void {
    this.components.set(name, component);
  }

  /**
   * Log plugin events
   */
  private logPluginEvent(type: string, pluginId: string, data?: any): void {
    const event: PluginEvent = {
      type,
      timestamp: new Date(),
      pluginId,
      data,
      userContext: this.getCurrentContext() || undefined,
    };

    this.eventHistory.push(event);

    // Maintain history size
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxEventHistory);
    }
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Subscribe to component registration events
   */
  onComponentRegistration(
    callback: (name: string, component: React.ComponentType<any>) => void
  ): () => void {
    // This would need to be implemented with proper event tracking
    return () => {}; // Placeholder
  }

  /**
   * Get plugin storage
   */
  getPluginStorage(pluginId: string, key: string): any {
    try {
      const data = localStorage.getItem(`plugin_${pluginId}_${key}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set plugin storage
   */
  setPluginStorage(pluginId: string, key: string, value: any): void {
    try {
      localStorage.setItem(`plugin_${pluginId}_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error("Failed to save plugin data:", error);
    }
  }

  /**
   * Subscribe to events (public method)
   */
  on(event: string, handler: (data?: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(handler);
    };
  }

  /**
   * Get current user context
   */
  getCurrentContext(): UserContext | null {
    return this.currentContext;
  }

  /**
   * Reset plugin manager (for testing)
   */
  reset(): void {
    this.activePlugins.forEach((pluginId) => {
      this.deactivatePlugin(pluginId);
    });

    this.plugins.clear();
    this.activePlugins.clear();
    this.eventListeners.clear();
    this.components.clear();
    this.eventHistory = [];
  }
}

// Export singleton instance
export const pluginManager = PluginManager.getInstance();
