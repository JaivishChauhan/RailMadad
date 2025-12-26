/**
 * Plugin Management Dashboard Component
 *
 * Provides a comprehensive interface for managing plugins,
 * including installation, configuration, and monitoring.
 */

import React, { useState } from "react";
import {
  Settings,
  Power,
  Info,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Zap,
} from "lucide-react";
import { UserContext } from "../../types";
import { usePlugins, usePluginEvents } from "../../hooks/usePlugins";
import {
  Plugin,
  PluginMetadata,
  PluginConfig,
} from "../../utils/pluginManager";

interface PluginManagerProps {
  userContext: UserContext | null;
  onClose?: () => void;
}

interface PluginCardProps {
  plugin: Plugin;
  isActive: boolean;
  onToggle: (pluginId: string) => void;
  onConfigure: (plugin: Plugin) => void;
  onUninstall: (pluginId: string) => void;
}

const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  isActive,
  onToggle,
  onConfigure,
  onUninstall,
}) => {
  const { metadata, config } = plugin;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "ui":
        return "🎨";
      case "service":
        return "⚙️";
      case "integration":
        return "🔗";
      case "analytics":
        return "📊";
      case "security":
        return "🔒";
      case "utility":
        return "🛠️";
      default:
        return "📦";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "ui":
        return "bg-purple-100 text-purple-800";
      case "service":
        return "bg-blue-100 text-blue-800";
      case "integration":
        return "bg-green-100 text-green-800";
      case "analytics":
        return "bg-orange-100 text-orange-800";
      case "security":
        return "bg-red-100 text-red-800";
      case "utility":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getCategoryIcon(metadata.category)}</div>
          <div>
            <h3 className="font-semibold text-gray-900">{metadata.name}</h3>
            <p className="text-sm text-gray-500">
              v{metadata.version} by {metadata.author}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(
              metadata.category
            )}`}
          >
            {metadata.category}
          </span>
          {isActive ? (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Active
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Inactive
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {metadata.description}
      </p>

      {metadata.tags && metadata.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {metadata.tags.map((tag: string) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {metadata.requiredCapabilities &&
        metadata.requiredCapabilities.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-700 mb-1">
              Required Capabilities:
            </p>
            <div className="flex flex-wrap gap-1">
              {metadata.requiredCapabilities.map((cap: string) => (
                <span
                  key={cap}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(metadata.id)}
            className={`p-2 rounded-lg transition-colors ${
              isActive
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "bg-green-100 text-green-600 hover:bg-green-200"
            }`}
            title={isActive ? "Deactivate plugin" : "Activate plugin"}
          >
            <Power className="h-4 w-4" />
          </button>

          <button
            onClick={() => onConfigure(plugin)}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="Configure plugin"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={() => onUninstall(metadata.id)}
          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
          title="Uninstall plugin"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const PluginManager: React.FC<PluginManagerProps> = ({
  userContext,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const {
    plugins,
    availablePlugins,
    loading,
    error,
    activeCount,
    totalCount,
    togglePlugin,
    updatePluginConfig,
  } = usePlugins(userContext, { autoLoad: false });

  const { events, recentEvents } = usePluginEvents([
    "plugin.activated",
    "plugin.deactivated",
    "plugin.error",
  ]);

  // Filter plugins based on search and filters
  const filteredPlugins = availablePlugins.filter((plugin: Plugin) => {
    const matchesSearch =
      plugin.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.metadata.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || plugin.metadata.category === categoryFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && plugin.config.enabled) ||
      (statusFilter === "inactive" && !plugin.config.enabled);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(
    new Set(availablePlugins.map((p: Plugin) => p.metadata.category))
  );

  const handlePluginToggle = async (pluginId: string) => {
    await togglePlugin(pluginId);
  };

  const handlePluginConfigure = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
    setShowConfig(true);
  };

  const handlePluginUninstall = async (pluginId: string) => {
    if (confirm(`Are you sure you want to uninstall this plugin?`)) {
      // Implementation would be added here
      console.log(`Uninstalling plugin: ${pluginId}`);
    }
  };

  const handleConfigSave = async (config: PluginConfig) => {
    if (selectedPlugin) {
      await updatePluginConfig(selectedPlugin.metadata.id, config);
      setShowConfig(false);
      setSelectedPlugin(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-600" />
            Plugin Manager
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and configure user-aware plugins • {activeCount} of{" "}
            {totalCount} active
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Plugins</p>
              <p className="text-2xl font-bold text-blue-900">{totalCount}</p>
            </div>
            <Settings className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Active</p>
              <p className="text-2xl font-bold text-green-900">{activeCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Available</p>
              <p className="text-2xl font-bold text-orange-900">
                {availablePlugins.length}
              </p>
            </div>
            <Download className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Categories</p>
              <p className="text-2xl font-bold text-purple-900">
                {categories.length}
              </p>
            </div>
            <Filter className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search plugins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recentEvents.slice(0, 3).map((event: any, index: number) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-gray-900">{event.type}</span>
                <span className="text-gray-500">• {event.pluginId}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlugins.map((plugin: Plugin) => (
          <PluginCard
            key={plugin.metadata.id}
            plugin={plugin}
            isActive={plugin.config.enabled}
            onToggle={handlePluginToggle}
            onConfigure={handlePluginConfigure}
            onUninstall={handlePluginUninstall}
          />
        ))}
      </div>

      {filteredPlugins.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Settings className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No plugins found
          </h3>
          <p className="text-gray-600">
            {searchTerm || categoryFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search criteria"
              : "No plugins are available for your current role"}
          </p>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfig && selectedPlugin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Configure {selectedPlugin.metadata.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plugin Enabled
                </label>
                <input
                  type="checkbox"
                  checked={selectedPlugin.config.enabled}
                  onChange={(e) => {
                    setSelectedPlugin({
                      ...selectedPlugin,
                      config: {
                        ...selectedPlugin.config,
                        enabled: e.target.checked,
                      },
                    });
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Additional configuration fields would be rendered here based on plugin schema */}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfigSave(selectedPlugin.config)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginManager;
