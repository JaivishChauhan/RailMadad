/**
 * React Hooks for Plugin Integration
 *
 * Provides React components with plugin management capabilities,
 * dynamic component loading, and plugin-specific state management.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { UserContext, Role } from "../types";
import {
  PluginManager,
  Plugin,
  PluginMetadata,
  PluginConfig,
  PluginEvent,
} from "../utils/pluginManager";

export interface UsePluginsOptions {
  category?: string;
  autoLoad?: boolean;
  enabledOnly?: boolean;
}

export interface PluginState {
  plugins: Plugin[];
  loading: boolean;
  error: string | null;
  activeCount: number;
  totalCount: number;
}

/**
 * Hook for plugin management and lifecycle
 */
export const usePlugins = (
  userContext: UserContext | null,
  options: UsePluginsOptions = {}
) => {
  const [state, setState] = useState<PluginState>({
    plugins: [],
    loading: true,
    error: null,
    activeCount: 0,
    totalCount: 0,
  });

  const { category, autoLoad = true, enabledOnly = false } = options;
  const pluginManager = PluginManager.getInstance();

  // Load plugins on mount
  useEffect(() => {
    const loadPlugins = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        let plugins = pluginManager.getAllPlugins();

        // Filter by category if specified
        if (category) {
          plugins = plugins.filter(
            (plugin) => plugin.metadata.category === category
          );
        }

        // Filter by enabled status if requested
        if (enabledOnly) {
          plugins = plugins.filter((plugin) => plugin.config.enabled);
        }

        // Auto-load plugins if enabled
        if (autoLoad) {
          await Promise.all(
            plugins
              .filter(
                (plugin) =>
                  plugin.config.enabled &&
                  !pluginManager.isActive(plugin.metadata.id)
              )
              .map((plugin) => pluginManager.activatePlugin(plugin.metadata.id))
          );
        }

        const activeCount = plugins.filter((plugin) =>
          pluginManager.isActive(plugin.metadata.id)
        ).length;

        setState({
          plugins,
          loading: false,
          error: null,
          activeCount,
          totalCount: plugins.length,
        });
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to load plugins",
        }));
      }
    };

    loadPlugins();
  }, [category, autoLoad, enabledOnly, userContext]);

  // Plugin activation/deactivation
  const togglePlugin = useCallback(async (pluginId: string) => {
    try {
      const isActive = pluginManager.isActive(pluginId);

      if (isActive) {
        await pluginManager.deactivatePlugin(pluginId);
      } else {
        await pluginManager.activatePlugin(pluginId);
      }

      // Refresh state
      setState((prev) => ({
        ...prev,
        activeCount: prev.activeCount + (isActive ? -1 : 1),
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || "Failed to toggle plugin",
      }));
    }
  }, []);

  // Plugin configuration update
  const updatePluginConfig = useCallback(
    async (pluginId: string, config: Partial<PluginConfig>) => {
      try {
        await pluginManager.updatePluginConfig(pluginId, config);

        // Refresh plugins list
        setState((prev) => ({
          ...prev,
          plugins: prev.plugins.map((plugin) =>
            plugin.metadata.id === pluginId
              ? { ...plugin, config: { ...plugin.config, ...config } }
              : plugin
          ),
        }));
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          error: error.message || "Failed to update plugin configuration",
        }));
      }
    },
    []
  );

  // Get available plugins for current user
  const availablePlugins = useMemo(() => {
    if (!userContext) return [];

    return state.plugins.filter((plugin) => {
      // Check role requirements
      if (
        plugin.metadata.supportedRoles &&
        !plugin.metadata.supportedRoles.includes(userContext.role as Role)
      ) {
        return false;
      }

      // Check capability requirements
      if (plugin.metadata.requiredCapabilities) {
        const hasAllCapabilities = plugin.metadata.requiredCapabilities.every(
          (cap) => userContext.capabilities?.includes(cap)
        );
        if (!hasAllCapabilities) return false;
      }

      return true;
    });
  }, [state.plugins, userContext]);

  return {
    plugins: state.plugins,
    availablePlugins,
    loading: state.loading,
    error: state.error,
    activeCount: state.activeCount,
    totalCount: state.totalCount,
    togglePlugin,
    updatePluginConfig,
  };
};

/**
 * Hook for dynamic component loading from plugins
 */
export const usePluginComponents = (componentNames: string[]) => {
  const [components, setComponents] = useState<
    Record<string, React.ComponentType<any>>
  >({});
  const [loading, setLoading] = useState(true);

  const pluginManager = PluginManager.getInstance();

  useEffect(() => {
    const loadComponents = () => {
      const loadedComponents: Record<string, React.ComponentType<any>> = {};

      componentNames.forEach((name) => {
        const component = pluginManager.getComponent(name);
        if (component) {
          loadedComponents[name] = component;
        }
      });

      setComponents(loadedComponents);
      setLoading(false);
    };

    loadComponents();

    // Listen for component registration changes
    const unsubscribe = pluginManager.onComponentRegistration(
      (name, component) => {
        if (componentNames.includes(name)) {
          setComponents((prev) => ({ ...prev, [name]: component }));
        }
      }
    );

    return unsubscribe;
  }, [componentNames.join(",")]);

  return {
    components,
    loading,
    hasComponent: (name: string) => !!components[name],
    getComponent: (name: string) => components[name],
  };
};

/**
 * Hook for plugin events and messaging
 */
export const usePluginEvents = (eventTypes: string[] = []) => {
  const [events, setEvents] = useState<PluginEvent[]>([]);
  const pluginManager = PluginManager.getInstance();

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Subscribe to specific event types or all events
    const typesToSubscribe = eventTypes.length > 0 ? eventTypes : ["*"];

    typesToSubscribe.forEach((eventType) => {
      const unsubscribe = pluginManager.on(eventType, (data) => {
        const event: PluginEvent = {
          type: eventType,
          timestamp: new Date(),
          pluginId: data?.pluginId || "system",
          data: data,
          userContext: pluginManager.getCurrentContext() || undefined,
        };

        setEvents((prev) => [event, ...prev].slice(0, 100)); // Keep last 100 events
      });

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [eventTypes.join(",")]);

  const emit = useCallback((eventType: string, data?: any) => {
    pluginManager.emit(eventType, data);
  }, []);

  return {
    events,
    emit,
    recentEvents: events.slice(0, 10),
  };
};

/**
 * Hook for plugin-specific storage
 */
export const usePluginStorage = (pluginId: string, key: string) => {
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const pluginManager = PluginManager.getInstance();

  useEffect(() => {
    const loadValue = () => {
      try {
        const stored = pluginManager.getPluginStorage(pluginId, key);
        setValue(stored);
      } catch (error) {
        console.error(
          `Failed to load plugin storage for ${pluginId}:${key}:`,
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadValue();
  }, [pluginId, key]);

  const updateValue = useCallback(
    (newValue: any) => {
      try {
        pluginManager.setPluginStorage(pluginId, key, newValue);
        setValue(newValue);
      } catch (error) {
        console.error(
          `Failed to update plugin storage for ${pluginId}:${key}:`,
          error
        );
      }
    },
    [pluginId, key]
  );

  return {
    value,
    setValue: updateValue,
    loading,
  };
};

/**
 * Hook for plugin configuration management
 */
export const usePluginConfig = (pluginId: string) => {
  const [config, setConfig] = useState<PluginConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pluginManager = PluginManager.getInstance();

  useEffect(() => {
    const loadConfig = () => {
      try {
        const plugin = pluginManager.getPlugin(pluginId);
        if (plugin) {
          setConfig(plugin.config);
        } else {
          setError(`Plugin ${pluginId} not found`);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load plugin configuration");
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [pluginId]);

  const updateConfig = useCallback(
    async (updates: Partial<PluginConfig>) => {
      try {
        setError(null);
        await pluginManager.updatePluginConfig(pluginId, updates);
        setConfig((prev) => (prev ? { ...prev, ...updates } : null));
      } catch (err: any) {
        setError(err.message || "Failed to update plugin configuration");
      }
    },
    [pluginId]
  );

  return {
    config,
    loading,
    error,
    updateConfig,
  };
};
