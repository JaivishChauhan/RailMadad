import React, { useState, useEffect, useCallback } from "react";
// Use local admin auth to avoid triggering Supabase on admin pages in demo mode
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { LocalAuthService } from "../../services/localAuthService";
import { Role } from "../../types";
import type { User } from "../../types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "../ui/StatusBadge";
import { Input } from "@/components/ui/input";
import { getGeminiApiKey } from "../../services/geminiService";
import {
  getOpenRouterApiKey,
  getStoredProvider,
  setStoredProvider,
  setStoredApiKey,
  GEMINI_MODELS,
  OPENROUTER_MODELS,
  GEMINI_MODEL_OPTIONS,
  OPENROUTER_MODEL_OPTIONS,
  MAX_TOKENS,
  type AIProvider,
} from "../../config/aiConfig";
import {
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  Settings,
  Cpu,
  Zap,
  Users,
  UserPlus,
  Trash2,
  Shield,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

// ============================================================================
// LocalStorage Keys for AI Config Settings
// ============================================================================
const AI_CONFIG_STORAGE_KEYS = {
  geminiPrimary: "RAILMADAD_GEMINI_MODEL_PRIMARY",
  geminiFallback: "RAILMADAD_GEMINI_MODEL_FALLBACK",
  openrouterPrimary: "RAILMADAD_OPENROUTER_MODEL_PRIMARY",
  openrouterFallback: "RAILMADAD_OPENROUTER_MODEL_FALLBACK",
  geminiMaxTokens: "RAILMADAD_GEMINI_MAX_TOKENS",
  openrouterMaxTokens: "RAILMADAD_OPENROUTER_MAX_TOKENS",
};

/**
 * Gets a stored config value or returns the default.
 */
const getStoredConfigValue = (
  key: string,
  defaultValue: string | number
): string | number => {
  if (typeof window === "undefined") return defaultValue;
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  return typeof defaultValue === "number" ? parseInt(stored, 10) : stored;
};

/**
 * Sets a config value in localStorage.
 */
const setStoredConfigValue = (key: string, value: string | number): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, String(value));
};

/**
 *
 * SuperAdminPanel component for system administration.
 * Provides access to test credentials, system status, and AI configuration.
 *
 * @returns {JSX.Element | null} The admin panel UI or null if user is not a Super Admin.
 */
const SuperAdminPanel: React.FC = () => {
  const { user } = useAdminAuth();

  // --- State for AI Configuration ---
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [preferredProvider, setPreferredProvider] =
    useState<AIProvider>("gemini");
  const [geminiMaxTokens, setGeminiMaxTokens] = useState<number>(
    MAX_TOKENS.gemini
  );
  const [openrouterMaxTokens, setOpenrouterMaxTokens] = useState<number>(
    MAX_TOKENS.openrouter
  );
  // Model selection state - explicitly typed as string to allow custom model IDs
  const [geminiPrimaryModel, setGeminiPrimaryModel] = useState<string>(
    GEMINI_MODELS.primary
  );
  const [geminiFallbackModel, setGeminiFallbackModel] = useState<string>(
    GEMINI_MODELS.fallback
  );
  const [openrouterPrimaryModel, setOpenrouterPrimaryModel] = useState<string>(
    OPENROUTER_MODELS.primary
  );
  const [openrouterFallbackModel, setOpenrouterFallbackModel] =
    useState<string>(OPENROUTER_MODELS.fallback);
  // Custom model input toggle state
  const [useCustomGeminiPrimary, setUseCustomGeminiPrimary] = useState(false);
  const [useCustomGeminiFallback, setUseCustomGeminiFallback] = useState(false);
  const [useCustomOpenrouterPrimary, setUseCustomOpenrouterPrimary] =
    useState(false);
  const [useCustomOpenrouterFallback, setUseCustomOpenrouterFallback] =
    useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle"
  );

  // --- State for Local Users Management ---
  const [localUsers, setLocalUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  /**
   * Determines the current status of the Gemini API key configuration.
   * Checks localStorage for a user-set key, then falls back to env var.
   *
   * @returns {'custom' | 'default' | 'none'} The source of the active key.
   */
  const getGeminiKeyStatus = (): "custom" | "default" | "none" => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("RAILMADAD_GEMINI_API_KEY")
    ) {
      return "custom";
    }
    const resolvedKey = getGeminiApiKey();
    if (resolvedKey) {
      return "default";
    }
    return "none";
  };

  /**
   * Determines the current status of the OpenRouter API key configuration.
   * Checks localStorage for a user-set key, then falls back to env var.
   *
   * @returns {'custom' | 'default' | 'none'} The source of the active key.
   */
  const getOpenrouterKeyStatus = (): "custom" | "default" | "none" => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("RAILMADAD_OPENROUTER_API_KEY")
    ) {
      return "custom";
    }
    const resolvedKey = getOpenRouterApiKey();
    if (resolvedKey) {
      return "default";
    }
    return "none";
  };

  const [geminiKeyStatus, setGeminiKeyStatus] = useState<
    "custom" | "default" | "none"
  >("none");
  const [openrouterKeyStatus, setOpenrouterKeyStatus] = useState<
    "custom" | "default" | "none"
  >("none");

  /**
   * Loads all local users from LocalAuthService.
   * Separates built-in demo users from custom (user-created) users.
   */
  const loadLocalUsers = useCallback(() => {
    setIsLoadingUsers(true);
    try {
      const allUsers = LocalAuthService.getAllUsers();
      setLocalUsers(allUsers);
    } catch (error) {
      console.error("Failed to load local users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  /**
   * Handles deletion of a custom (non-protected) user.
   * @param userId - The ID of the user to delete.
   */
  const handleDeleteUser = (userId: string) => {
    if (LocalAuthService.isProtectedUser(userId)) {
      console.warn("Cannot delete protected demo user:", userId);
      return;
    }
    const success = LocalAuthService.deleteUser(userId);
    if (success) {
      loadLocalUsers(); // Refresh the list
      setDeleteConfirmId(null);
    }
  };

  /**
   * Returns appropriate role badge styling based on user role.
   * @param role - The user's role.
   * @returns CSS class string for the badge.
   */
  const getRoleBadgeClass = (role: Role): string => {
    switch (role) {
      case Role.SUPER_ADMIN:
        return "bg-purple-100 text-purple-800";
      case Role.OFFICIAL:
        return "bg-blue-100 text-blue-800";
      case Role.MODERATOR:
        return "bg-amber-100 text-amber-800";
      case Role.PASSENGER:
      default:
        return "bg-green-100 text-green-800";
    }
  };

  // Sync state on mount
  useEffect(() => {
    // Key statuses
    setGeminiKeyStatus(getGeminiKeyStatus());
    setOpenrouterKeyStatus(getOpenrouterKeyStatus());

    // Gemini API key
    const storedGeminiKey = localStorage.getItem("RAILMADAD_GEMINI_API_KEY");
    if (storedGeminiKey) setGeminiApiKey(storedGeminiKey);

    // OpenRouter API key
    const storedOpenrouterKey = localStorage.getItem(
      "RAILMADAD_OPENROUTER_API_KEY"
    );
    if (storedOpenrouterKey) setOpenrouterApiKey(storedOpenrouterKey);

    // Provider preference
    const storedProvider = getStoredProvider();
    if (storedProvider) setPreferredProvider(storedProvider);

    // Max tokens
    const storedGeminiTokens = getStoredConfigValue(
      AI_CONFIG_STORAGE_KEYS.geminiMaxTokens,
      MAX_TOKENS.gemini
    );
    setGeminiMaxTokens(Number(storedGeminiTokens));

    const storedOpenrouterTokens = getStoredConfigValue(
      AI_CONFIG_STORAGE_KEYS.openrouterMaxTokens,
      MAX_TOKENS.openrouter
    );
    setOpenrouterMaxTokens(Number(storedOpenrouterTokens));

    // Model selections
    const storedGeminiPrimary = getStoredConfigValue(
      AI_CONFIG_STORAGE_KEYS.geminiPrimary,
      GEMINI_MODELS.primary
    ) as string;
    setGeminiPrimaryModel(storedGeminiPrimary);
    // Check if it's a custom model (not in predefined list)
    const isCustomGeminiPrimary = !GEMINI_MODEL_OPTIONS.some(
      (m) => m.id === storedGeminiPrimary
    );
    setUseCustomGeminiPrimary(isCustomGeminiPrimary);

    const storedGeminiFallback = getStoredConfigValue(
      AI_CONFIG_STORAGE_KEYS.geminiFallback,
      GEMINI_MODELS.fallback
    ) as string;
    setGeminiFallbackModel(storedGeminiFallback);
    const isCustomGeminiFallback = !GEMINI_MODEL_OPTIONS.some(
      (m) => m.id === storedGeminiFallback
    );
    setUseCustomGeminiFallback(isCustomGeminiFallback);

    const storedOpenrouterPrimary = getStoredConfigValue(
      AI_CONFIG_STORAGE_KEYS.openrouterPrimary,
      OPENROUTER_MODELS.primary
    ) as string;
    setOpenrouterPrimaryModel(storedOpenrouterPrimary);
    const isCustomOpenrouterPrimary = !OPENROUTER_MODEL_OPTIONS.some(
      (m) => m.id === storedOpenrouterPrimary
    );
    setUseCustomOpenrouterPrimary(isCustomOpenrouterPrimary);

    const storedOpenrouterFallback = getStoredConfigValue(
      AI_CONFIG_STORAGE_KEYS.openrouterFallback,
      OPENROUTER_MODELS.fallback
    ) as string;
    setOpenrouterFallbackModel(storedOpenrouterFallback);
    const isCustomOpenrouterFallback = !OPENROUTER_MODEL_OPTIONS.some(
      (m) => m.id === storedOpenrouterFallback
    );
    setUseCustomOpenrouterFallback(isCustomOpenrouterFallback);

    // Load local users on mount
    loadLocalUsers();
  }, [loadLocalUsers]);

  /**
   * Saves all AI configuration settings to localStorage.
   */
  const handleSaveAllConfig = () => {
    try {
      // Save Gemini API key if provided
      if (geminiApiKey.trim()) {
        localStorage.setItem("RAILMADAD_GEMINI_API_KEY", geminiApiKey.trim());
        setGeminiKeyStatus("custom");
      }

      // Save OpenRouter API key if provided
      if (openrouterApiKey.trim()) {
        localStorage.setItem(
          "RAILMADAD_OPENROUTER_API_KEY",
          openrouterApiKey.trim()
        );
        setOpenrouterKeyStatus("custom");
      }

      // Save provider preference
      setStoredProvider(preferredProvider);

      // Save max tokens
      setStoredConfigValue(
        AI_CONFIG_STORAGE_KEYS.geminiMaxTokens,
        geminiMaxTokens
      );
      setStoredConfigValue(
        AI_CONFIG_STORAGE_KEYS.openrouterMaxTokens,
        openrouterMaxTokens
      );

      // Save model selections
      setStoredConfigValue(
        AI_CONFIG_STORAGE_KEYS.geminiPrimary,
        geminiPrimaryModel
      );
      setStoredConfigValue(
        AI_CONFIG_STORAGE_KEYS.geminiFallback,
        geminiFallbackModel
      );
      setStoredConfigValue(
        AI_CONFIG_STORAGE_KEYS.openrouterPrimary,
        openrouterPrimaryModel
      );
      setStoredConfigValue(
        AI_CONFIG_STORAGE_KEYS.openrouterFallback,
        openrouterFallbackModel
      );

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  /**
   * Resets the Gemini API key to default by removing the localStorage entry.
   */
  const handleResetGeminiKey = () => {
    localStorage.removeItem("RAILMADAD_GEMINI_API_KEY");
    setGeminiApiKey("");
    setGeminiKeyStatus(getGeminiKeyStatus());
  };

  /**
   * Resets the OpenRouter API key to default by removing the localStorage entry.
   */
  const handleResetOpenrouterKey = () => {
    localStorage.removeItem("RAILMADAD_OPENROUTER_API_KEY");
    setOpenrouterApiKey("");
    setOpenrouterKeyStatus(getOpenrouterKeyStatus());
  };

  /**
   * Resets all AI config to defaults.
   */
  const handleResetAllConfig = () => {
    handleResetGeminiKey();
    handleResetOpenrouterKey();
    localStorage.removeItem("RAILMADAD_AI_PROVIDER");
    localStorage.removeItem(AI_CONFIG_STORAGE_KEYS.geminiMaxTokens);
    localStorage.removeItem(AI_CONFIG_STORAGE_KEYS.openrouterMaxTokens);
    localStorage.removeItem(AI_CONFIG_STORAGE_KEYS.geminiPrimary);
    localStorage.removeItem(AI_CONFIG_STORAGE_KEYS.geminiFallback);
    localStorage.removeItem(AI_CONFIG_STORAGE_KEYS.openrouterPrimary);
    localStorage.removeItem(AI_CONFIG_STORAGE_KEYS.openrouterFallback);
    setPreferredProvider("gemini");
    setGeminiMaxTokens(MAX_TOKENS.gemini);
    setOpenrouterMaxTokens(MAX_TOKENS.openrouter);
    setGeminiPrimaryModel(GEMINI_MODELS.primary);
    setGeminiFallbackModel(GEMINI_MODELS.fallback);
    setOpenrouterPrimaryModel(OPENROUTER_MODELS.primary);
    setOpenrouterFallbackModel(OPENROUTER_MODELS.fallback);
    setUseCustomGeminiPrimary(false);
    setUseCustomGeminiFallback(false);
    setUseCustomOpenrouterPrimary(false);
    setUseCustomOpenrouterFallback(false);
    setSaveStatus("idle");
  };

  // Test credentials for demo
  const testCredentials = {
    passenger: {
      email: "test.passenger@railmadad.demo",
      password: "demo123",
      description: "Test passenger account for filing complaints",
    },
    admin: {
      email: "test.admin@railmadad.demo",
      password: "admin123",
      description: "Test admin account for managing complaints",
    },
    superAdmin: {
      email: "super.admin@railmadad.demo",
      password: "super123",
      description: "Super admin account with full system access",
    },
  };

  if (!user || user.role !== Role.SUPER_ADMIN) {
    return null;
  }

  return (
    <div className="mt-6 space-y-6">
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusBadge className="bg-purple-100 text-purple-800">
              SUPER ADMIN
            </StatusBadge>
            System Administration Panel
          </CardTitle>
          <CardDescription>
            Advanced system controls and management tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Credentials</CardTitle>
                <CardDescription>
                  Demo accounts for public testing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-green-50 p-3 rounded border">
                  <h4 className="font-semibold text-sm text-green-800">
                    Passenger Account
                  </h4>
                  <p className="text-sm">
                    <strong>Email:</strong> {testCredentials.passenger.email}
                    <br />
                    <strong>Password:</strong>{" "}
                    {testCredentials.passenger.password}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {testCredentials.passenger.description}
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded border">
                  <h4 className="font-semibold text-sm text-blue-800">
                    Admin Account
                  </h4>
                  <p className="text-sm">
                    <strong>Email:</strong> {testCredentials.admin.email}
                    <br />
                    <strong>Password:</strong> {testCredentials.admin.password}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {testCredentials.admin.description}
                  </p>
                </div>

                <div className="bg-purple-50 p-3 rounded border">
                  <h4 className="font-semibold text-sm text-purple-800">
                    Super Admin Account
                  </h4>
                  <p className="text-sm">
                    <strong>Email:</strong> {testCredentials.superAdmin.email}
                    <br />
                    <strong>Password:</strong>{" "}
                    {testCredentials.superAdmin.password}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    {testCredentials.superAdmin.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Status</CardTitle>
                <CardDescription>Current system information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">User Role:</span>
                  <StatusBadge className="bg-purple-100 text-purple-800">
                    {user.role}
                  </StatusBadge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Employee ID:</span>
                  <span className="text-sm">{user.employeeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Department:</span>
                  <span className="text-sm">{user.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Zone:</span>
                  <span className="text-sm">{user.zone}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Configuration Card */}
          <Card className="bg-sky-50 border-sky-200">
            <CardHeader>
              <CardTitle className="text-lg text-sky-800 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                AI Configuration
              </CardTitle>
              <CardDescription>
                Configure AI providers, API keys, and model settings for the
                chatbot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Selection */}
              <div className="bg-white p-4 rounded-lg border border-sky-200 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-sky-800">
                  <Zap className="h-4 w-4" />
                  Provider Preference
                </h4>
                <p className="text-xs text-gray-600">
                  Select the primary AI provider. The system will automatically
                  fall back to other providers if rate limited.
                </p>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="provider"
                      value="gemini"
                      checked={preferredProvider === "gemini"}
                      onChange={() => setPreferredProvider("gemini")}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm font-medium">Gemini (Native)</span>
                    {geminiKeyStatus !== "none" && (
                      <StatusBadge className="bg-green-100 text-green-800 text-xs">
                        Available
                      </StatusBadge>
                    )}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="provider"
                      value="openrouter"
                      checked={preferredProvider === "openrouter"}
                      onChange={() => setPreferredProvider("openrouter")}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm font-medium">OpenRouter</span>
                    {openrouterKeyStatus !== "none" && (
                      <StatusBadge className="bg-green-100 text-green-800 text-xs">
                        Available
                      </StatusBadge>
                    )}
                  </label>
                </div>
              </div>

              {/* Gemini Configuration */}
              <div className="bg-white p-4 rounded-lg border border-blue-200 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-blue-800">
                  <Cpu className="h-4 w-4" />
                  Gemini (Google AI)
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">Status:</span>
                  {geminiKeyStatus === "custom" && (
                    <StatusBadge className="bg-green-100 text-green-800">
                      Using Custom Key
                    </StatusBadge>
                  )}
                  {geminiKeyStatus === "default" && (
                    <StatusBadge className="bg-blue-100 text-blue-800">
                      Using Environment Variable
                    </StatusBadge>
                  )}
                  {geminiKeyStatus === "none" && (
                    <StatusBadge className="bg-red-100 text-red-800">
                      No Key Configured
                    </StatusBadge>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Input
                      type={showGeminiKey ? "text" : "password"}
                      placeholder="Enter Gemini API Key"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="pr-10 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                    >
                      {showGeminiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={handleResetGeminiKey}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
                    Max Tokens:
                  </label>
                  <Input
                    type="number"
                    value={geminiMaxTokens}
                    onChange={(e) =>
                      setGeminiMaxTokens(
                        Math.max(
                          1,
                          parseInt(e.target.value) || MAX_TOKENS.gemini
                        )
                      )
                    }
                    className="w-28 text-sm"
                    min={1}
                    max={100000}
                  />
                  <span className="text-xs text-gray-500">
                    (Default: {MAX_TOKENS.gemini})
                  </span>
                </div>
                {/* Primary Model Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
                      Primary Model:
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer ml-auto">
                      <input
                        type="checkbox"
                        checked={useCustomGeminiPrimary}
                        onChange={(e) => {
                          setUseCustomGeminiPrimary(e.target.checked);
                          if (!e.target.checked)
                            setGeminiPrimaryModel(GEMINI_MODELS.primary);
                        }}
                        className="h-3 w-3"
                      />
                      Custom
                    </label>
                  </div>
                  {useCustomGeminiPrimary ? (
                    <Input
                      type="text"
                      placeholder="Enter custom model ID (e.g., gemini-2.5-pro)"
                      value={geminiPrimaryModel}
                      onChange={(e) => setGeminiPrimaryModel(e.target.value)}
                      className="text-sm"
                    />
                  ) : (
                    <select
                      value={geminiPrimaryModel}
                      onChange={(e) => setGeminiPrimaryModel(e.target.value)}
                      className="w-full text-sm border rounded-md px-3 py-2 bg-white"
                      aria-label="Select Gemini primary model"
                    >
                      {GEMINI_MODEL_OPTIONS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.tier})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {/* Fallback Model Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
                      Fallback Model:
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer ml-auto">
                      <input
                        type="checkbox"
                        checked={useCustomGeminiFallback}
                        onChange={(e) => {
                          setUseCustomGeminiFallback(e.target.checked);
                          if (!e.target.checked)
                            setGeminiFallbackModel(GEMINI_MODELS.fallback);
                        }}
                        className="h-3 w-3"
                      />
                      Custom
                    </label>
                  </div>
                  {useCustomGeminiFallback ? (
                    <Input
                      type="text"
                      placeholder="Enter custom model ID"
                      value={geminiFallbackModel}
                      onChange={(e) => setGeminiFallbackModel(e.target.value)}
                      className="text-sm"
                    />
                  ) : (
                    <select
                      value={geminiFallbackModel}
                      onChange={(e) => setGeminiFallbackModel(e.target.value)}
                      className="w-full text-sm border rounded-md px-3 py-2 bg-white"
                      aria-label="Select Gemini fallback model"
                    >
                      {GEMINI_MODEL_OPTIONS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.tier})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* OpenRouter Configuration */}
              <div className="bg-white p-4 rounded-lg border border-purple-200 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-purple-800">
                  <Cpu className="h-4 w-4" />
                  OpenRouter (Multi-Provider)
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">Status:</span>
                  {openrouterKeyStatus === "custom" && (
                    <StatusBadge className="bg-green-100 text-green-800">
                      Using Custom Key
                    </StatusBadge>
                  )}
                  {openrouterKeyStatus === "default" && (
                    <StatusBadge className="bg-blue-100 text-blue-800">
                      Using Environment Variable
                    </StatusBadge>
                  )}
                  {openrouterKeyStatus === "none" && (
                    <StatusBadge className="bg-red-100 text-red-800">
                      No Key Configured
                    </StatusBadge>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Input
                      type={showOpenrouterKey ? "text" : "password"}
                      placeholder="Enter OpenRouter API Key"
                      value={openrouterApiKey}
                      onChange={(e) => setOpenrouterApiKey(e.target.value)}
                      className="pr-10 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowOpenrouterKey(!showOpenrouterKey)}
                    >
                      {showOpenrouterKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={handleResetOpenrouterKey}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
                    Max Tokens:
                  </label>
                  <Input
                    type="number"
                    value={openrouterMaxTokens}
                    onChange={(e) =>
                      setOpenrouterMaxTokens(
                        Math.max(
                          1,
                          parseInt(e.target.value) || MAX_TOKENS.openrouter
                        )
                      )
                    }
                    className="w-28 text-sm"
                    min={1}
                    max={100000}
                  />
                  <span className="text-xs text-gray-500">
                    (Default: {MAX_TOKENS.openrouter})
                  </span>
                </div>
                {/* Primary Model Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
                      Primary Model (Tier 1):
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer ml-auto">
                      <input
                        type="checkbox"
                        checked={useCustomOpenrouterPrimary}
                        onChange={(e) => {
                          setUseCustomOpenrouterPrimary(e.target.checked);
                          if (!e.target.checked)
                            setOpenrouterPrimaryModel(
                              OPENROUTER_MODELS.primary
                            );
                        }}
                        className="h-3 w-3"
                      />
                      Custom
                    </label>
                  </div>
                  {useCustomOpenrouterPrimary ? (
                    <Input
                      type="text"
                      placeholder="Enter custom model ID (e.g., anthropic/claude-3.5-sonnet)"
                      value={openrouterPrimaryModel}
                      onChange={(e) =>
                        setOpenrouterPrimaryModel(e.target.value)
                      }
                      className="text-sm"
                    />
                  ) : (
                    <select
                      value={openrouterPrimaryModel}
                      onChange={(e) =>
                        setOpenrouterPrimaryModel(e.target.value)
                      }
                      className="w-full text-sm border rounded-md px-3 py-2 bg-white"
                      aria-label="Select OpenRouter primary model"
                    >
                      {OPENROUTER_MODEL_OPTIONS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.tier})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {/* Fallback Model Selection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
                      Fallback Model (Tier 2 - Free):
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer ml-auto">
                      <input
                        type="checkbox"
                        checked={useCustomOpenrouterFallback}
                        onChange={(e) => {
                          setUseCustomOpenrouterFallback(e.target.checked);
                          if (!e.target.checked)
                            setOpenrouterFallbackModel(
                              OPENROUTER_MODELS.fallback
                            );
                        }}
                        className="h-3 w-3"
                      />
                      Custom
                    </label>
                  </div>
                  {useCustomOpenrouterFallback ? (
                    <Input
                      type="text"
                      placeholder="Enter custom model ID"
                      value={openrouterFallbackModel}
                      onChange={(e) =>
                        setOpenrouterFallbackModel(e.target.value)
                      }
                      className="text-sm"
                    />
                  ) : (
                    <select
                      value={openrouterFallbackModel}
                      onChange={(e) =>
                        setOpenrouterFallbackModel(e.target.value)
                      }
                      className="w-full text-sm border rounded-md px-3 py-2 bg-white"
                      aria-label="Select OpenRouter fallback model"
                    >
                      {OPENROUTER_MODEL_OPTIONS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.tier})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Fallback Tier Info */}
              <div className="bg-gradient-to-r from-sky-50 to-purple-50 p-4 rounded-lg border border-gray-200 space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">
                  Automatic Fallback Chain
                </h4>
                <p className="text-xs text-gray-600">
                  When rate limited or encountering errors, the system
                  automatically falls back:
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <StatusBadge className="bg-blue-100 text-blue-800">
                      Tier 0
                    </StatusBadge>
                    <code className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 text-xs">
                      {geminiPrimaryModel}
                    </code>
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="flex items-center gap-1">
                    <StatusBadge className="bg-purple-100 text-purple-800">
                      Tier 1
                    </StatusBadge>
                    <code className="bg-purple-50 px-1.5 py-0.5 rounded text-purple-700 text-xs">
                      {openrouterPrimaryModel}
                    </code>
                  </div>
                  <span className="text-gray-400">→</span>
                  <div className="flex items-center gap-1">
                    <StatusBadge className="bg-green-100 text-green-800">
                      Tier 2
                    </StatusBadge>
                    <code className="bg-green-50 px-1.5 py-0.5 rounded text-green-700 text-xs">
                      {openrouterFallbackModel}
                    </code>
                  </div>
                </div>
              </div>

              {/* Save/Reset Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-sky-200">
                <Button
                  onClick={handleSaveAllConfig}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saveStatus === "saved" ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  {saveStatus === "saved" ? "Saved!" : "Save All Settings"}
                </Button>
                <Button onClick={handleResetAllConfig} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset All to Defaults
                </Button>
                {saveStatus === "error" && (
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Failed to save settings.
                  </span>
                )}
              </div>

              <p className="text-xs text-sky-700">
                <strong>Note:</strong> Changes take effect immediately for new
                chat sessions. API keys stored here override environment
                variables. Token limits affect response length.
              </p>
            </CardContent>
          </Card>

          {/* Local Users Management Card */}
          <Card className="bg-indigo-50 border-indigo-200">
            <CardHeader>
              <CardTitle className="text-lg text-indigo-800 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Local Users Management
              </CardTitle>
              <CardDescription>
                View and manage locally registered users (demo mode).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Refresh Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-indigo-700">
                  <span className="font-medium">
                    Total Users: {localUsers.length}
                  </span>
                  <span className="text-indigo-500">|</span>
                  <span>
                    Built-in:{" "}
                    {
                      localUsers.filter((u) =>
                        LocalAuthService.isProtectedUser(u.id)
                      ).length
                    }
                  </span>
                  <span className="text-indigo-500">|</span>
                  <span className="flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />
                    Custom:{" "}
                    {
                      localUsers.filter(
                        (u) => !LocalAuthService.isProtectedUser(u.id)
                      ).length
                    }
                  </span>
                </div>
                <Button
                  onClick={loadLocalUsers}
                  size="sm"
                  variant="outline"
                  disabled={isLoadingUsers}
                  className="text-indigo-700 border-indigo-300 hover:bg-indigo-100"
                >
                  <RefreshCw
                    className={`h-3 w-3 mr-1 ${
                      isLoadingUsers ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </div>

              {/* Users List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {localUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No local users found.
                  </p>
                ) : (
                  localUsers.map((u) => {
                    const isProtected = LocalAuthService.isProtectedUser(u.id);
                    const isDeleting = deleteConfirmId === u.id;

                    return (
                      <div
                        key={u.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isProtected
                            ? "bg-white border-indigo-200"
                            : "bg-green-50 border-green-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Protection indicator */}
                          {isProtected ? (
                            <span title="Protected demo account">
                              <ShieldCheck className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                            </span>
                          ) : (
                            <span title="Custom user account">
                              <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
                            </span>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">
                                {u.fullName || "Unnamed User"}
                              </span>
                              <StatusBadge
                                className={getRoleBadgeClass(u.role)}
                              >
                                {u.role}
                              </StatusBadge>
                              {isProtected && (
                                <span className="text-xs text-indigo-500 font-medium">
                                  (Demo)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {u.email}
                            </p>
                            {u.department && (
                              <p className="text-xs text-gray-400">
                                {u.department}
                                {u.zone ? ` • Zone: ${u.zone}` : ""}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-2">
                          {!isProtected && (
                            <>
                              {isDeleting ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    onClick={() => handleDeleteUser(u.id)}
                                    size="sm"
                                    variant="destructive"
                                    className="text-xs h-7 px-2"
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    onClick={() => setDeleteConfirmId(null)}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 px-2"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => setDeleteConfirmId(u.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                  title="Delete user"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <p className="text-xs text-indigo-600">
                <strong>Note:</strong> Protected demo accounts (marked with{" "}
                <ShieldCheck className="h-3 w-3 inline" />) cannot be deleted.
                Custom users (marked with <Shield className="h-3 w-3 inline" />)
                are stored in localStorage and can be removed.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg text-amber-800">
                🚀 Demo Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-amber-700">
                <p>
                  <strong>For Public Demo:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>
                    Use passenger credentials to experience complaint filing
                  </li>
                  <li>Use admin credentials to manage complaints</li>
                  <li>Super admin has access to all system functions</li>
                  <li>All test accounts have AI chatbot access</li>
                  <li>Data is persistent in Supabase database</li>
                </ol>
                <p className="mt-3">
                  <strong>Note:</strong> These backdoor accounts are
                  automatically created for demonstration purposes.
                </p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminPanel;
