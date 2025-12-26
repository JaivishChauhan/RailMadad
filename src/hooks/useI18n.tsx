/**
 * React Hooks for Internationalization
 *
 * Provides React hooks for:
 * - Translation with context
 * - Language switching
 * - Locale formatting
 * - RTL support
 */

import { useState, useEffect, useCallback } from "react";
import { UserContext } from "../types";
import {
  translationManager,
  SupportedLanguage,
  TranslationContext,
  LANGUAGE_CONFIGS,
  t,
  tn,
  formatDate,
  formatTime,
  formatNumber,
  formatCurrency,
} from "../utils/i18n";

export interface UseTranslationReturn {
  // Core translation functions
  t: (key: string, context?: TranslationContext) => string;
  tn: (key: string, count: number, context?: TranslationContext) => string;

  // Formatting functions
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  formatNumber: (number: number) => string;
  formatCurrency: (amount: number, currency?: string) => string;

  // Language management
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  isRTL: boolean;

  // Language info
  languageConfig: (typeof LANGUAGE_CONFIGS)[SupportedLanguage];
  availableLanguages: SupportedLanguage[];
}

/**
 * Hook for translation with automatic re-rendering on language changes
 */
export const useTranslation = (
  userContext?: UserContext | null
): UseTranslationReturn => {
  const [language, setCurrentLanguage] = useState<SupportedLanguage>(
    translationManager.getLanguage()
  );

  // Subscribe to language changes
  useEffect(() => {
    const unsubscribe = translationManager.subscribe((newLanguage) => {
      setCurrentLanguage(newLanguage);
    });

    return unsubscribe;
  }, []);

  // Translation function with user context
  const translate = useCallback(
    (key: string, context: TranslationContext = {}) => {
      // Merge user context if available
      const fullContext = userContext
        ? {
            ...context,
            user: {
              name:
                userContext.user?.fullName || userContext.user?.email || "User",
              role: userContext.role || undefined,
              ...context.user,
            },
          }
        : context;

      return t(key, fullContext, language);
    },
    [language, userContext]
  );

  // Plural translation function with user context
  const translatePlural = useCallback(
    (key: string, count: number, context: TranslationContext = {}) => {
      const fullContext = userContext
        ? {
            ...context,
            user: {
              name:
                userContext.user?.fullName || userContext.user?.email || "User",
              role: userContext.role || undefined,
              ...context.user,
            },
          }
        : context;

      return tn(key, count, fullContext, language);
    },
    [language, userContext]
  );

  // Language setter
  const setLanguage = useCallback((newLanguage: SupportedLanguage) => {
    translationManager.setLanguage(newLanguage);
  }, []);

  // Get current language config
  const languageConfig = LANGUAGE_CONFIGS[language];
  const isRTL = languageConfig.rtl;

  // Available languages
  const availableLanguages = Object.keys(
    LANGUAGE_CONFIGS
  ) as SupportedLanguage[];

  return {
    t: translate,
    tn: translatePlural,
    formatDate: (date: Date) => formatDate(date, language),
    formatTime: (date: Date) => formatTime(date, language),
    formatNumber: (number: number) => formatNumber(number, language),
    formatCurrency: (amount: number, currency?: string) =>
      formatCurrency(amount, currency, language),
    language,
    setLanguage,
    isRTL,
    languageConfig,
    availableLanguages,
  };
};

/**
 * Hook for user-context-aware translations
 */
export const useUserAwareTranslation = (userContext: UserContext | null) => {
  const translation = useTranslation(userContext);

  // Role-specific greeting
  const getRoleGreeting = useCallback(() => {
    if (!userContext || !userContext.isAuthenticated) {
      return translation.t("user.greeting.guest");
    }

    const roleKey = userContext.role?.toLowerCase() || "user";
    const greetingKey = `user.greeting.${roleKey}`;

    // Fallback to generic user greeting if role-specific not found
    const greeting =
      translation.t(greetingKey) !== greetingKey
        ? translation.t(greetingKey)
        : translation.t("user.greeting.user");

    return greeting;
  }, [userContext, translation]);

  // Context-aware status message
  const getContextStatus = useCallback(() => {
    if (!userContext) {
      return translation.t("user.notAuthenticated");
    }

    if (!userContext.isAuthenticated) {
      return translation.t("user.notAuthenticated");
    }

    return translation.t("user.loggedInAs");
  }, [userContext, translation]);

  // Role-specific suggestions
  const getRoleSuggestions = useCallback(() => {
    if (!userContext || !userContext.isAuthenticated) {
      return {
        title: translation.t("chatbot.suggestions.guest.title"),
        items: translation.t("chatbot.suggestions.guest.items"),
      };
    }

    const roleKey = userContext.role?.toLowerCase() || "user";
    const titleKey = `chatbot.suggestions.${roleKey}.title`;
    const itemsKey = `chatbot.suggestions.${roleKey}.items`;

    // Fallback to user suggestions if role-specific not found
    const title =
      translation.t(titleKey) !== titleKey
        ? translation.t(titleKey)
        : translation.t("chatbot.suggestions.user.title");

    const items =
      translation.t(itemsKey) !== itemsKey
        ? translation.t(itemsKey)
        : translation.t("chatbot.suggestions.user.items");

    return { title, items };
  }, [userContext, translation]);

  return {
    ...translation,
    getRoleGreeting,
    getContextStatus,
    getRoleSuggestions,
    userContext,
  };
};

/**
 * Hook for relative time formatting
 */
export const useRelativeTime = () => {
  const { t, language } = useTranslation();

  const formatRelativeTime = useCallback(
    (date: Date) => {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) {
        return t("datetime.timeAgo.seconds", { count: diffInSeconds });
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return t("datetime.timeAgo.minutes", { count: minutes });
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return t("datetime.timeAgo.hours", { count: hours });
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        return t("datetime.timeAgo.days", { count: days });
      }
    },
    [t]
  );

  return { formatRelativeTime, language };
};

/**
 * Hook for language detection and automatic setup
 */
export const useLanguageDetection = () => {
  const { language, setLanguage, availableLanguages } = useTranslation();

  // Detect browser language preference
  const detectBrowserLanguage = useCallback((): SupportedLanguage | null => {
    const browserLang = navigator.language.split("-")[0] as SupportedLanguage;
    return availableLanguages.includes(browserLang) ? browserLang : null;
  }, [availableLanguages]);

  // Auto-detect and set language if not already set
  useEffect(() => {
    const stored = localStorage.getItem("preferred_language");
    if (!stored) {
      const detected = detectBrowserLanguage();
      if (detected && detected !== language) {
        setLanguage(detected);
      }
    }
  }, [language, setLanguage, detectBrowserLanguage]);

  return {
    language,
    setLanguage,
    availableLanguages,
    detectBrowserLanguage,
  };
};

/**
 * Hook for accessibility announcements in multiple languages
 */
export const useAccessibilityAnnouncements = (
  userContext?: UserContext | null
) => {
  const { t } = useUserAwareTranslation(userContext || null);

  const announceContextChange = useCallback(
    (status: string) => {
      const message = t("accessibility.announcements.contextChanged", {
        status,
      });
      // This would integrate with screen reader announcements
      return message;
    },
    [t]
  );

  const announceRoleChange = useCallback(
    (role: string) => {
      const message = t("accessibility.announcements.roleChanged", {
        user: { role },
      });
      return message;
    },
    [t]
  );

  const announceLanguageChange = useCallback(
    (language: string) => {
      const message = t("accessibility.announcements.languageChanged", {
        language,
      });
      return message;
    },
    [t]
  );

  const announceError = useCallback(
    (error: string) => {
      const message = t("accessibility.announcements.errorOccurred", { error });
      return message;
    },
    [t]
  );

  const announceOperation = useCallback(
    (operation: string, success: boolean, error?: string) => {
      const message = success
        ? t("accessibility.announcements.operationComplete", { operation })
        : t("accessibility.announcements.operationFailed", {
            operation,
            error: error || "",
          });
      return message;
    },
    [t]
  );

  return {
    announceContextChange,
    announceRoleChange,
    announceLanguageChange,
    announceError,
    announceOperation,
  };
};

/**
 * Hook for pluralization helpers
 */
export const usePluralization = () => {
  const { tn, language } = useTranslation();

  const formatCount = useCallback(
    (key: string, count: number, context?: TranslationContext) => {
      return tn(key, count, { ...context, count });
    },
    [tn]
  );

  return {
    formatCount,
    language,
  };
};

/**
 * Hook for currency and number formatting with user preferences
 */
export const useLocaleFormatting = (userContext?: UserContext | null) => {
  const {
    formatNumber,
    formatCurrency,
    formatDate,
    formatTime,
    languageConfig,
  } = useTranslation(userContext);

  // Format with user's preferred currency if available
  const formatUserCurrency = useCallback(
    (amount: number) => {
      const currency = languageConfig.currency; // Remove user preference for now
      return formatCurrency(amount, currency);
    },
    [formatCurrency, languageConfig]
  );

  // Format percentage
  const formatPercentage = useCallback(
    (value: number, decimals: number = 1) => {
      return new Intl.NumberFormat(languageConfig.code, {
        style: "percent",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value / 100);
    },
    [languageConfig]
  );

  return {
    formatNumber,
    formatCurrency,
    formatUserCurrency,
    formatDate,
    formatTime,
    formatPercentage,
    languageConfig,
  };
};

export default {
  useTranslation,
  useUserAwareTranslation,
  useRelativeTime,
  useLanguageDetection,
  useAccessibilityAnnouncements,
  usePluralization,
  useLocaleFormatting,
};
