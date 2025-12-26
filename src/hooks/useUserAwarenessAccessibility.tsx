/**
 * User Awareness Accessibility Hook
 *
 * Provides comprehensive accessibility features for user-aware components:
 * - Context-aware screen reader announcements
 * - Keyboard navigation management
 * - Focus handling for dynamic content
 * - ARIA attributes based on user context
 * - Accessibility preferences integration
 */

import React, { useEffect, useRef, useCallback } from "react";
import { UserContext, Role } from "../types";
import {
  generateAccessibilityAttributes,
  generateContextStatusLabel,
  KeyboardNavigationManager,
  FocusManager,
  screenReaderAnnouncer,
  accessibilityPreferenceManager,
  AccessibilityOptions,
  KeyboardNavigationConfig,
  ScreenReaderConfig,
} from "../utils/accessibility";

export interface UseUserAwarenessAccessibilityOptions {
  // Component identification
  componentType: "indicator" | "dashboard" | "notification" | "form" | "dialog";
  componentName?: string;

  // Keyboard navigation
  keyboardNavigation?: KeyboardNavigationConfig;

  // Screen reader
  screenReader?: ScreenReaderConfig;

  // Focus management
  autoFocus?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;

  // Announcements
  announceContextChanges?: boolean;
  announceErrors?: boolean;
  announceProgress?: boolean;

  // ARIA attributes
  ariaOptions?: AccessibilityOptions;
}

export interface UseUserAwarenessAccessibilityReturn {
  // Refs and attributes
  containerRef: React.RefObject<HTMLElement>;
  accessibilityAttributes: Record<string, any>;

  // Methods
  announceMessage: (message: string, priority?: "polite" | "assertive") => void;
  announceContextUpdate: (context: UserContext, operation: string) => void;
  announceError: (
    error: string,
    severity: "low" | "medium" | "high" | "critical"
  ) => void;
  announceProgress: (
    operation: string,
    progress: number,
    total?: number
  ) => void;

  // Focus management
  focusContainer: () => void;
  pushFocus: (element: HTMLElement) => void;
  popFocus: () => boolean;

  // Keyboard navigation
  updateFocusableElements: () => void;

  // Accessibility state
  preferences: {
    reducedMotion: boolean;
    highContrast: boolean;
    announcements: boolean;
    keyboardNavigation: boolean;
  };
}

/**
 * Hook for managing accessibility in user-aware components
 */
export const useUserAwarenessAccessibility = (
  context: UserContext | null,
  options: UseUserAwarenessAccessibilityOptions
): UseUserAwarenessAccessibilityReturn => {
  const containerRef = useRef<HTMLElement>(null);
  const keyboardManagerRef = useRef<KeyboardNavigationManager | null>(null);
  const previousContextRef = useRef<UserContext | null>(null);

  // Get accessibility preferences
  const preferences = accessibilityPreferenceManager.getPreferences();

  // Generate accessibility attributes
  const accessibilityAttributes = generateAccessibilityAttributes(
    options.componentType,
    context || undefined,
    {
      label:
        options.ariaOptions?.label ||
        `${
          options.componentName || options.componentType
        } for user-aware functionality`,
      ...options.ariaOptions,
    }
  );

  // Initialize keyboard navigation
  useEffect(() => {
    if (!containerRef.current || !preferences.keyboardNavigation) return;

    const keyboardConfig = {
      trapFocus: options.trapFocus || false,
      autoFocus: options.autoFocus || false,
      ...options.keyboardNavigation,
    };

    keyboardManagerRef.current = new KeyboardNavigationManager(
      containerRef.current,
      keyboardConfig
    );

    return () => {
      if (keyboardManagerRef.current) {
        keyboardManagerRef.current.destroy();
      }
    };
  }, [
    options.keyboardNavigation,
    options.trapFocus,
    options.autoFocus,
    preferences.keyboardNavigation,
  ]);

  // Handle context changes
  useEffect(() => {
    if (
      !context ||
      !options.announceContextChanges ||
      !preferences.announcements
    )
      return;

    const previousContext = previousContextRef.current;

    if (previousContext && context !== previousContext) {
      // Announce context change
      const statusLabel = generateContextStatusLabel(context);
      screenReaderAnnouncer.announcePolite(`Context updated: ${statusLabel}`);
    }

    previousContextRef.current = context;
  }, [context, options.announceContextChanges, preferences.announcements]);

  // Auto-focus management
  useEffect(() => {
    if (!options.autoFocus || !containerRef.current) return;

    const element = containerRef.current;

    // Focus the container or first focusable element
    const firstFocusable = FocusManager.getFirstFocusableElement(element);
    if (firstFocusable) {
      FocusManager.pushFocus(firstFocusable);
    } else {
      element.tabIndex = -1;
      FocusManager.pushFocus(element);
    }

    return () => {
      if (options.restoreFocus) {
        FocusManager.popFocus();
      }
    };
  }, [options.autoFocus, options.restoreFocus]);

  // Methods for announcements
  const announceMessage = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (!preferences.announcements) return;

      if (priority === "assertive") {
        screenReaderAnnouncer.announceAssertive(message);
      } else {
        screenReaderAnnouncer.announcePolite(message);
      }
    },
    [preferences.announcements]
  );

  const announceContextUpdate = useCallback(
    (context: UserContext, operation: string) => {
      if (!preferences.announcements || !options.announceContextChanges) return;

      screenReaderAnnouncer.announceContextUpdate(context, operation);
    },
    [preferences.announcements, options.announceContextChanges]
  );

  const announceError = useCallback(
    (error: string, severity: "low" | "medium" | "high" | "critical") => {
      if (!preferences.announcements || !options.announceErrors) return;

      screenReaderAnnouncer.announceError(
        "User awareness error",
        error,
        severity
      );
    },
    [preferences.announcements, options.announceErrors]
  );

  const announceProgress = useCallback(
    (operation: string, progress: number, total?: number) => {
      if (!preferences.announcements || !options.announceProgress) return;

      screenReaderAnnouncer.announceProgress(operation, progress, total);
    },
    [preferences.announcements, options.announceProgress]
  );

  // Focus management methods
  const focusContainer = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  const pushFocus = useCallback((element: HTMLElement) => {
    FocusManager.pushFocus(element);
  }, []);

  const popFocus = useCallback(() => {
    return FocusManager.popFocus();
  }, []);

  const updateFocusableElements = useCallback(() => {
    if (keyboardManagerRef.current) {
      keyboardManagerRef.current.updateFocusableElements();
    }
  }, []);

  return {
    // Refs and attributes
    containerRef: containerRef as React.RefObject<HTMLElement>,
    accessibilityAttributes,

    // Methods
    announceMessage,
    announceContextUpdate,
    announceError,
    announceProgress,

    // Focus management
    focusContainer,
    pushFocus,
    popFocus,

    // Keyboard navigation
    updateFocusableElements,

    // Accessibility state
    preferences,
  };
};

/**
 * Hook for context-aware ARIA labels
 */
export const useContextAwareAriaLabel = (
  context: UserContext | null,
  baseLabel: string,
  includeRole: boolean = true
): string => {
  if (!context) {
    return `${baseLabel} - Guest access`;
  }

  const user = context.user;
  const role = context.role;

  let label = baseLabel;

  if (user) {
    label += ` - ${user.fullName || user.email}`;
  }

  if (includeRole && role) {
    label += ` (${role})`;
  }

  return label;
};

/**
 * Hook for dynamic ARIA live region management
 */
export const useAriaLiveRegion = () => {
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (!liveRegionRef.current) return;

      // Update aria-live attribute
      liveRegionRef.current.setAttribute("aria-live", priority);

      // Clear and set message to ensure announcement
      liveRegionRef.current.textContent = "";
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = message;
        }
      }, 100);
    },
    []
  );

  const LiveRegion: React.FC<{ className?: string }> = ({
    className = "sr-only",
  }) => (
    <div
      ref={liveRegionRef}
      aria-live="polite"
      aria-atomic="true"
      className={className}
      style={{
        position: "absolute",
        left: "-10000px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
      }}
    />
  );

  return {
    announce,
    LiveRegion,
  };
};

/**
 * Hook for managing focus indicators
 */
export const useFocusIndicator = (elementRef: React.RefObject<HTMLElement>) => {
  const [isFocused, setIsFocused] = React.useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    element.addEventListener("focus", handleFocus);
    element.addEventListener("blur", handleBlur);

    return () => {
      element.removeEventListener("focus", handleFocus);
      element.removeEventListener("blur", handleBlur);
    };
  }, [elementRef]);

  return {
    isFocused,
    focusClasses: isFocused ? "ring-2 ring-blue-500 ring-offset-2" : "",
  };
};

/**
 * Hook for accessibility-aware animations
 */
export const useAccessibleAnimation = () => {
  const preferences = accessibilityPreferenceManager.getPreferences();

  const getAnimationClasses = (
    animatedClasses: string,
    staticClasses: string = ""
  ) => {
    return preferences.reducedMotion ? staticClasses : animatedClasses;
  };

  const getTransitionDuration = (defaultDuration: string) => {
    return preferences.reducedMotion ? "0ms" : defaultDuration;
  };

  return {
    shouldReduceMotion: preferences.reducedMotion,
    getAnimationClasses,
    getTransitionDuration,
  };
};

/**
 * Hook for high contrast mode support
 */
export const useHighContrast = () => {
  const preferences = accessibilityPreferenceManager.getPreferences();

  const getContrastClasses = (
    normalClasses: string,
    highContrastClasses: string
  ) => {
    return preferences.highContrast
      ? `${normalClasses} ${highContrastClasses}`
      : normalClasses;
  };

  const getBorderClasses = (normalBorder: string = "border") => {
    return preferences.highContrast ? "border-2" : normalBorder;
  };

  return {
    isHighContrast: preferences.highContrast,
    getContrastClasses,
    getBorderClasses,
  };
};

export default {
  useUserAwarenessAccessibility,
  useContextAwareAriaLabel,
  useAriaLiveRegion,
  useFocusIndicator,
  useAccessibleAnimation,
  useHighContrast,
};
