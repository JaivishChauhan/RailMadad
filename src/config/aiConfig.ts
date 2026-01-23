/**
 * AI Provider Configuration Module
 *
 * Provides a unified configuration system for managing multiple AI providers
 * (Gemini and OpenRouter). Handles API key retrieval, provider selection,
 * and model configuration.
 *
 * @module aiConfig
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Supported AI provider types.
 * - gemini: Google's Gemini API (native SDK)
 * - openrouter: OpenRouter API (OpenAI-compatible REST API)
 */
export type AIProvider = "gemini" | "openrouter";

/**
 * Configuration for a specific AI model.
 */
export interface AIModelConfig {
  /** The model identifier (e.g., "gemini-2.5-flash", "google/gemini-2.5-flash") */
  modelId: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for response randomness (0-2) */
  temperature?: number;
  /** Top-p sampling parameter */
  topP?: number;
}

/**
 * Complete AI provider configuration.
 */
export interface AIProviderConfig {
  /** The active AI provider */
  provider: AIProvider;
  /** API key for the active provider */
  apiKey: string;
  /** Primary model configuration */
  primaryModel: AIModelConfig;
  /** Fallback model for rate limiting scenarios */
  fallbackModel: AIModelConfig;
}

// ============================================================================
// Rate Limiting & Timeout State
// ============================================================================

const PROVIDER_TIMEOUT_DURATION = 10 * 60 * 1000; // 10 minutes

interface ProviderStatus {
  isRateLimited: boolean;
  rateLimitedUntil: number;
}

const providerStatus: Record<AIProvider, ProviderStatus> = {
  gemini: { isRateLimited: false, rateLimitedUntil: 0 },
  openrouter: { isRateLimited: false, rateLimitedUntil: 0 },
};

/**
 * Reports a rate limit (429) for a provider, setting a timeout.
 * @param {AIProvider} provider - The provider that was rate limited.
 */
export const reportRateLimit = (provider: AIProvider): void => {
  providerStatus[provider].isRateLimited = true;
  providerStatus[provider].rateLimitedUntil =
    Date.now() + PROVIDER_TIMEOUT_DURATION;
  console.warn(`⚠️ Provider ${provider} rate limited. Pausing for 10 minutes.`);
};

/**
 * Checks if a provider is currently rate limited (timed out).
 * @param {AIProvider} provider - The provider to check.
 * @returns {boolean} True if the provider is currently timed out.
 */
export const isProviderRateLimited = (provider: AIProvider): boolean => {
  if (!providerStatus[provider].isRateLimited) return false;
  if (Date.now() > providerStatus[provider].rateLimitedUntil) {
    // Reset if timeout expired
    providerStatus[provider].isRateLimited = false;
    providerStatus[provider].rateLimitedUntil = 0;
    return false;
  }
  return true;
};

/**
 * Manually resets the rate limit status for a provider.
 * Useful for admin overrides.
 * @param {AIProvider} provider - The provider to reset.
 */
export const resetRateLimit = (provider: AIProvider): void => {
  providerStatus[provider].isRateLimited = false;
  providerStatus[provider].rateLimitedUntil = 0;
  console.log(`✅ Provider ${provider} rate limit manually reset.`);
};

/**
 * Gets the detailed rate limit status for all providers.
 */
export const getRateLimitStatus = (): Record<
  AIProvider,
  { isRateLimited: boolean; remainingTimeMs: number }
> => {
  const now = Date.now();
  return {
    gemini: {
      isRateLimited: isProviderRateLimited("gemini"),
      remainingTimeMs: Math.max(
        0,
        providerStatus.gemini.rateLimitedUntil - now
      ),
    },
    openrouter: {
      isRateLimited: isProviderRateLimited("openrouter"),
      remainingTimeMs: Math.max(
        0,
        providerStatus.openrouter.rateLimitedUntil - now
      ),
    },
  };
};

// ============================================================================
// Constants
// ============================================================================

/** LocalStorage key for user-overridden Gemini API key */
const GEMINI_STORAGE_KEY = "RAILMADAD_GEMINI_API_KEY";

/** LocalStorage key for user-overridden OpenRouter API key */
const OPENROUTER_STORAGE_KEY = "RAILMADAD_OPENROUTER_API_KEY";

/** LocalStorage key for user-preferred AI provider */
const PROVIDER_STORAGE_KEY = "RAILMADAD_AI_PROVIDER";

/** Default Gemini models (native Gemini SDK) */
export const GEMINI_MODELS = {
  primary: "gemini-3-flash-preview",
  fallback: "gemini-2.5-flash",
} as const;

/** Available Gemini model options for selection */
export const GEMINI_MODEL_OPTIONS = [
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    tier: "latest",
  },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", tier: "stable" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", tier: "pro" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", tier: "stable" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", tier: "legacy" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", tier: "legacy" },
] as const;

/** Default OpenRouter models (using Google's Gemini via OpenRouter) */
export const OPENROUTER_MODELS = {
  primary: "google/gemini-3-flash-preview",
  fallback: "google/gemini-2.0-flash-exp:free",
} as const;

/** Available OpenRouter model options for selection */
export const OPENROUTER_MODEL_OPTIONS = [
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    tier: "latest",
  },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", tier: "stable" },
  {
    id: "google/gemini-2.5-pro-preview",
    name: "Gemini 2.5 Pro Preview",
    tier: "pro",
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    tier: "stable",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash (Free)",
    tier: "free",
  },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", tier: "pro" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", tier: "fast" },
  { id: "openai/gpt-4o", name: "GPT-4o", tier: "pro" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", tier: "fast" },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    tier: "open",
  },
  { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", tier: "open" },
] as const;

/**
 * Max tokens configuration per provider.
 * OpenRouter has lower limits based on credits, Gemini native is more generous.
 */
export const MAX_TOKENS = {
  gemini: 65536,
  openrouter: 8192, // Increased limit for OpenRouter to support image analysis
} as const;

/** LocalStorage keys for max tokens configuration */
const GEMINI_MAX_TOKENS_KEY = "RAILMADAD_GEMINI_MAX_TOKENS";
const OPENROUTER_MAX_TOKENS_KEY = "RAILMADAD_OPENROUTER_MAX_TOKENS";

/** LocalStorage keys for model selection */
const GEMINI_PRIMARY_MODEL_KEY = "RAILMADAD_GEMINI_MODEL_PRIMARY";
const GEMINI_FALLBACK_MODEL_KEY = "RAILMADAD_GEMINI_MODEL_FALLBACK";
const OPENROUTER_PRIMARY_MODEL_KEY = "RAILMADAD_OPENROUTER_MODEL_PRIMARY";
const OPENROUTER_FALLBACK_MODEL_KEY = "RAILMADAD_OPENROUTER_MODEL_FALLBACK";

/**
 * Gets the configured max tokens for Gemini (from localStorage or default).
 *
 * @returns {number} The max tokens limit for Gemini
 */
export const getGeminiMaxTokens = (): number => {
  if (typeof window === "undefined") return MAX_TOKENS.gemini;
  const stored = localStorage.getItem(GEMINI_MAX_TOKENS_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return MAX_TOKENS.gemini;
};

/**
 * Gets the configured max tokens for OpenRouter (from localStorage or default).
 *
 * @returns {number} The max tokens limit for OpenRouter
 */
export const getOpenRouterMaxTokens = (): number => {
  if (typeof window === "undefined") return MAX_TOKENS.openrouter;
  const stored = localStorage.getItem(OPENROUTER_MAX_TOKENS_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return MAX_TOKENS.openrouter;
};

/**
 * Gets the configured primary model for Gemini (from localStorage or default).
 *
 * @returns {string} The primary model ID for Gemini
 */
export const getGeminiPrimaryModel = (): string => {
  if (typeof window === "undefined") return GEMINI_MODELS.primary;
  const stored = localStorage.getItem(GEMINI_PRIMARY_MODEL_KEY);
  return stored && stored.trim() ? stored : GEMINI_MODELS.primary;
};

/**
 * Gets the configured fallback model for Gemini (from localStorage or default).
 *
 * @returns {string} The fallback model ID for Gemini
 */
export const getGeminiFallbackModel = (): string => {
  if (typeof window === "undefined") return GEMINI_MODELS.fallback;
  const stored = localStorage.getItem(GEMINI_FALLBACK_MODEL_KEY);
  return stored && stored.trim() ? stored : GEMINI_MODELS.fallback;
};

/**
 * Gets the configured primary model for OpenRouter (from localStorage or default).
 *
 * @returns {string} The primary model ID for OpenRouter
 */
export const getOpenRouterPrimaryModel = (): string => {
  if (typeof window === "undefined") return OPENROUTER_MODELS.primary;
  const stored = localStorage.getItem(OPENROUTER_PRIMARY_MODEL_KEY);
  return stored && stored.trim() ? stored : OPENROUTER_MODELS.primary;
};

/**
 * Gets the configured fallback model for OpenRouter (from localStorage or default).
 *
 * @returns {string} The fallback model ID for OpenRouter
 */
export const getOpenRouterFallbackModel = (): string => {
  if (typeof window === "undefined") return OPENROUTER_MODELS.fallback;
  const stored = localStorage.getItem(OPENROUTER_FALLBACK_MODEL_KEY);
  return stored && stored.trim() ? stored : OPENROUTER_MODELS.fallback;
};

/**
 * Gets the dynamic fallback tier configuration.
 * Reads max tokens from localStorage to respect admin settings.
 *
 * @param {number} tier - The fallback tier (0, 1, or 2)
 * @returns {{ provider: 'gemini' | 'openrouter'; model: string; maxTokens: number }} Tier config
 */
export const getFallbackTierConfig = (
  tier: 0 | 1 | 2
): { provider: "gemini" | "openrouter"; model: string; maxTokens: number } => {
  switch (tier) {
    case 0:
      return {
        provider: "gemini",
        model: getGeminiPrimaryModel(),
        maxTokens: getGeminiMaxTokens(),
      };
    case 1:
      return {
        provider: "openrouter",
        model: getOpenRouterPrimaryModel(),
        maxTokens: getOpenRouterMaxTokens(),
      };
    case 2:
      return {
        provider: "openrouter",
        model: getOpenRouterFallbackModel(),
        maxTokens: getOpenRouterMaxTokens(),
      };
  }
};

/**
 * Tiered fallback configuration for rate limit handling.
 * Tier 0: Gemini native API (primary)
 * Tier 1: OpenRouter API (paid models)
 * Tier 2: OpenRouter API (free tier)
 */
export const FALLBACK_TIERS = {
  0: {
    provider: "gemini" as const,
    model: GEMINI_MODELS.primary,
    maxTokens: MAX_TOKENS.gemini,
  },
  1: {
    provider: "openrouter" as const,
    model: OPENROUTER_MODELS.primary,
    maxTokens: MAX_TOKENS.openrouter,
  },
  2: {
    provider: "openrouter" as const,
    model: OPENROUTER_MODELS.fallback,
    maxTokens: MAX_TOKENS.openrouter,
  },
} as const;

export type FallbackTier = keyof typeof FALLBACK_TIERS;

// ============================================================================
// API Key Retrieval Functions
// ============================================================================

/**
 * Retrieves the Gemini API Key from available sources in order of priority:
 * 1. LocalStorage (User-overridden key)
 * 2. Vite Env Variables (Client-side)
 * 3. Process Env Variables (Server-side/Build-time)
 *
 * @returns {string | undefined} The resolved API key or undefined if not found.
 */
export const getGeminiApiKey = (): string | undefined => {
  // 1. Check LocalStorage (Dynamic Override - highest priority for runtime config)
  if (typeof window !== "undefined") {
    const storedKey = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (storedKey) return storedKey;
  }

  // 2. Vite client-side env (statically replaced at build time)
  // Note: import.meta.env.VITE_* is replaced by Vite at build time
  // For Cloudflare Pages, env vars must be set during the build, not at runtime
  try {
    // @ts-expect-error - import.meta.env is injected by Vite at build time
    const viteKey = import.meta?.env?.VITE_GEMINI_API_KEY;
    if (viteKey && viteKey !== "undefined" && viteKey !== "") {
      return viteKey;
    }
  } catch {
    // Fallback if import.meta is not available
  }

  // 3. Node/Vite SSR fallbacks (for server-side rendering)
  if (typeof process !== "undefined" && process.env) {
    return (
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.API_KEY ||
      undefined
    );
  }

  return undefined;
};

/**
 * Retrieves the OpenRouter API Key from available sources in order of priority:
 * 1. LocalStorage (User-overridden key)
 * 2. Vite Env Variables (Client-side)
 * 3. Process Env Variables (Server-side/Build-time)
 *
 * @returns {string | undefined} The resolved API key or undefined if not found.
 */
export const getOpenRouterApiKey = (): string | undefined => {
  // 1. Check LocalStorage (Dynamic Override - highest priority for runtime config)
  if (typeof window !== "undefined") {
    const storedKey = localStorage.getItem(OPENROUTER_STORAGE_KEY);
    if (storedKey) return storedKey;
  }

  // 2. Vite client-side env (statically replaced at build time)
  // Note: import.meta.env.VITE_* is replaced by Vite at build time
  // For Cloudflare Pages, env vars must be set during the build, not at runtime
  try {
    // @ts-expect-error - import.meta.env is injected by Vite at build time
    const viteKey = import.meta?.env?.VITE_OPENROUTER_API_KEY;
    if (viteKey && viteKey !== "undefined" && viteKey !== "") {
      return viteKey;
    }
  } catch {
    // Fallback if import.meta is not available
  }

  // 3. Node/Vite SSR fallbacks (for server-side rendering)
  if (typeof process !== "undefined" && process.env) {
    return (
      process.env.VITE_OPENROUTER_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      undefined
    );
  }

  return undefined;
};

// ============================================================================
// Provider Selection Functions
// ============================================================================

/**
 * Gets the user's preferred AI provider from localStorage.
 *
 * @returns {AIProvider | undefined} The stored preference or undefined.
 */
export const getStoredProvider = (): AIProvider | undefined => {
  if (typeof window === "undefined") return undefined;
  const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
  if (stored === "gemini" || stored === "openrouter") {
    return stored;
  }
  return undefined;
};

/**
 * Stores the user's preferred AI provider in localStorage.
 *
 * @param {AIProvider} provider - The provider to store.
 */
export const setStoredProvider = (provider: AIProvider): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
};

/**
 * Stores an API key for a specific provider in localStorage.
 *
 * @param {AIProvider} provider - The provider for the key.
 * @param {string} apiKey - The API key to store.
 */
export const setStoredApiKey = (provider: AIProvider, apiKey: string): void => {
  if (typeof window === "undefined") return;
  const key =
    provider === "gemini" ? GEMINI_STORAGE_KEY : OPENROUTER_STORAGE_KEY;
  localStorage.setItem(key, apiKey);
};

/**
 * Clears stored API keys and provider preference from localStorage.
 */
export const clearStoredConfig = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GEMINI_STORAGE_KEY);
  localStorage.removeItem(OPENROUTER_STORAGE_KEY);
  localStorage.removeItem(PROVIDER_STORAGE_KEY);
};

// ============================================================================
// Active Configuration Resolution
// ============================================================================

/**
 * Determines the active AI provider based on available API keys and user preference.
 * Priority:
 * 1. User's stored preference (if the corresponding key is available)
 * 2. Gemini (if key available)
 * 3. OpenRouter (if key available)
 *
 * @returns {AIProvider | null} The active provider or null if no API keys are configured.
 */
export const getActiveProvider = (): AIProvider | null => {
  const storedPref = getStoredProvider();
  const geminiKey = getGeminiApiKey();
  const openRouterKey = getOpenRouterApiKey();

  // Helper to check availability
  const isAvailable = (p: AIProvider) => {
    if (p === "gemini") return !!geminiKey && !isProviderRateLimited("gemini");
    if (p === "openrouter")
      return !!openRouterKey && !isProviderRateLimited("openrouter");
    return false;
  };

  // Check user preference first
  if (storedPref && isAvailable(storedPref)) {
    return storedPref;
  }

  // Fall back to first available provider
  if (isAvailable("gemini")) return "gemini";
  if (isAvailable("openrouter")) return "openrouter";

  // If all healthy options failed, return a configured provider even if rate limited
  if (geminiKey) return "gemini";
  if (openRouterKey) return "openrouter";

  return null;
};

/**
 * Returns a list of provider configurations to try in order.
 * Logic:
 * 1. Gemini (if configured and not rate limited)
 * 2. OpenRouter Primary (if configured and not rate limited)
 * 3. OpenRouter Free (if configured, as last resort)
 */
export const getPrioritizedProviders = (): Array<{
  provider: AIProvider;
  modelId: string;
  isFree?: boolean;
}> => {
  const chain: Array<{
    provider: AIProvider;
    modelId: string;
    isFree?: boolean;
  }> = [];
  const geminiKey = getGeminiApiKey();
  const openRouterKey = getOpenRouterApiKey();

  // 1. Gemini Primary
  if (geminiKey && !isProviderRateLimited("gemini")) {
    chain.push({ provider: "gemini", modelId: GEMINI_MODELS.primary });
  }

  // 2. OpenRouter Primary
  if (openRouterKey && !isProviderRateLimited("openrouter")) {
    chain.push({ provider: "openrouter", modelId: OPENROUTER_MODELS.primary });
  }

  // 3. OpenRouter Free (Last resort)
  if (openRouterKey) {
    chain.push({
      provider: "openrouter",
      modelId: OPENROUTER_MODELS.fallback,
      isFree: true,
    });
  }

  // If chain is empty but keys exist (all rate limited), add fallback
  if (chain.length === 0) {
    if (openRouterKey) {
      chain.push({
        provider: "openrouter",
        modelId: OPENROUTER_MODELS.fallback,
        isFree: true,
      });
    } else if (geminiKey) {
      chain.push({ provider: "gemini", modelId: GEMINI_MODELS.primary });
    }
  }

  return chain;
};

/**
 * Gets the API key for the currently active provider.
 *
 * @returns {string | undefined} The API key for the active provider.
 */
export const getActiveApiKey = (): string | undefined => {
  const provider = getActiveProvider();
  if (provider === "gemini") return getGeminiApiKey();
  if (provider === "openrouter") return getOpenRouterApiKey();
  return undefined;
};

/**
 * Gets the complete configuration for the active AI provider.
 *
 * @returns {AIProviderConfig | null} The full configuration or null if no provider is available.
 */
export const getActiveConfig = (): AIProviderConfig | null => {
  const provider = getActiveProvider();
  if (!provider) return null;

  const apiKey = getActiveApiKey();
  if (!apiKey) return null;

  const isGemini = provider === "gemini";
  const models = isGemini ? GEMINI_MODELS : OPENROUTER_MODELS;

  return {
    provider,
    apiKey,
    primaryModel: {
      modelId: models.primary,
      maxTokens: 65536,
      temperature: 1,
      topP: 0.95,
    },
    fallbackModel: {
      modelId: models.fallback,
      maxTokens: 65536,
      temperature: 1,
      topP: 0.95,
    },
  };
};

/**
 * Checks if any AI provider is configured and available.
 *
 * @returns {boolean} True if at least one provider is available.
 */
export const isAIConfigured = (): boolean => {
  return getActiveProvider() !== null;
};

/**
 * Gets a summary of available providers for UI display.
 *
 * @returns {object} Object containing availability status for each provider.
 */
export const getProvidersStatus = (): {
  gemini: { available: boolean; isActive: boolean };
  openrouter: { available: boolean; isActive: boolean };
  activeProvider: AIProvider | null;
} => {
  const geminiKey = getGeminiApiKey();
  const openRouterKey = getOpenRouterApiKey();
  const activeProvider = getActiveProvider();

  return {
    gemini: {
      available: !!geminiKey,
      isActive: activeProvider === "gemini",
    },
    openrouter: {
      available: !!openRouterKey,
      isActive: activeProvider === "openrouter",
    },
    activeProvider,
  };
};

// ============================================================================
// Development Logging
// ============================================================================

/**
 * Logs the current AI configuration status (development only).
 */
export const logAIConfigStatus = (): void => {
  if (process.env.NODE_ENV !== "development") return;

  const status = getProvidersStatus();
  console.log("🤖 AI Configuration Status:");
  console.log(
    `   Gemini: ${
      status.gemini.available ? "✅ Available" : "❌ Not configured"
    }${status.gemini.isActive ? " (Active)" : ""}`
  );
  console.log(
    `   OpenRouter: ${
      status.openrouter.available ? "✅ Available" : "❌ Not configured"
    }${status.openrouter.isActive ? " (Active)" : ""}`
  );
  console.log(`   Active Provider: ${status.activeProvider || "None"}`);
};
