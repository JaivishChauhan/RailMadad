/**
 * Accessibility Utilities for User-Aware Components
 * 
 * Provides comprehensive accessibility features including:
 * - ARIA attributes and labels
 * - Keyboard navigation support
 * - Screen reader announcements
 * - Focus management
 * - High contrast mode support
 * - Reduced motion preferences
 */

import { UserContext, Role } from '../types';

export interface AccessibilityOptions {
  label?: string;
  description?: string;
  role?: string;
  live?: 'off' | 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  busy?: boolean;
  expanded?: boolean;
  controls?: string;
  describedBy?: string;
  labelledBy?: string;
  level?: number;
  setSize?: number;
  posInSet?: number;
}

export interface KeyboardNavigationConfig {
  enableArrowKeys?: boolean;
  enableTabNavigation?: boolean;
  enableEnterActivation?: boolean;
  enableEscapeClose?: boolean;
  trapFocus?: boolean;
  autoFocus?: boolean;
  focusableSelectors?: string[];
}

export interface ScreenReaderConfig {
  announcements?: boolean;
  liveRegions?: boolean;
  statusUpdates?: boolean;
  progressAnnouncements?: boolean;
  errorAnnouncements?: boolean;
}

/**
 * Generate accessibility attributes for user-aware components
 */
export const generateAccessibilityAttributes = (
  componentType: string,
  context?: UserContext,
  options: AccessibilityOptions = {}
): Record<string, any> => {
  const attributes: Record<string, any> = {};

  // Base ARIA attributes
  if (options.label) {
    attributes['aria-label'] = options.label;
  }

  if (options.description) {
    attributes['aria-description'] = options.description;
  }

  if (options.role) {
    attributes['role'] = options.role;
  }

  if (options.live) {
    attributes['aria-live'] = options.live;
  }

  if (options.atomic !== undefined) {
    attributes['aria-atomic'] = options.atomic;
  }

  if (options.relevant) {
    attributes['aria-relevant'] = options.relevant;
  }

  if (options.busy !== undefined) {
    attributes['aria-busy'] = options.busy;
  }

  if (options.expanded !== undefined) {
    attributes['aria-expanded'] = options.expanded;
  }

  if (options.controls) {
    attributes['aria-controls'] = options.controls;
  }

  if (options.describedBy) {
    attributes['aria-describedby'] = options.describedBy;
  }

  if (options.labelledBy) {
    attributes['aria-labelledby'] = options.labelledBy;
  }

  if (options.level) {
    attributes['aria-level'] = options.level;
  }

  if (options.setSize) {
    attributes['aria-setsize'] = options.setSize;
  }

  if (options.posInSet) {
    attributes['aria-posinset'] = options.posInSet;
  }

  // Component-specific attributes
  switch (componentType) {
    case 'context-indicator':
      attributes['role'] = 'status';
      attributes['aria-live'] = 'polite';
      attributes['aria-atomic'] = true;
      if (context) {
        attributes['aria-label'] = generateContextStatusLabel(context);
      }
      break;

    case 'error-indicator':
      attributes['role'] = 'alert';
      attributes['aria-live'] = 'assertive';
      attributes['aria-atomic'] = true;
      break;

    case 'progress-indicator':
      attributes['role'] = 'progressbar';
      attributes['aria-live'] = 'polite';
      break;

    case 'transition-indicator':
      attributes['role'] = 'status';
      attributes['aria-live'] = 'polite';
      attributes['aria-atomic'] = true;
      break;

    case 'performance-dashboard':
      attributes['role'] = 'region';
      attributes['aria-label'] = 'Performance monitoring dashboard';
      break;

    case 'error-dashboard':
      attributes['role'] = 'region';
      attributes['aria-label'] = 'Error monitoring dashboard';
      break;
  }

  return attributes;
};

/**
 * Generate context-aware status label for screen readers
 */
export const generateContextStatusLabel = (context: UserContext): string => {
  const user = context.user;
  const role = context.role;
  const isAuth = context.isAuthenticated;

  if (!isAuth) {
    return 'User context: Not authenticated, guest access';
  }

  if (user) {
    return `User context: Logged in as ${user.fullName || user.email}, Role: ${role}`;
  }

  return `User context: Authenticated, Role: ${role}`;
};

/**
 * Generate progress announcement text
 */
export const generateProgressAnnouncement = (
  operation: string,
  progress: number,
  total?: number
): string => {
  const percentage = Math.round(progress);
  
  if (total) {
    return `${operation}: ${progress} of ${total} complete, ${percentage} percent`;
  }
  
  return `${operation}: ${percentage} percent complete`;
};

/**
 * Generate error announcement text
 */
export const generateErrorAnnouncement = (
  errorType: string,
  errorMessage: string,
  severity: 'low' | 'medium' | 'high' | 'critical'
): string => {
  const severityText = severity === 'critical' ? 'Critical error' :
                      severity === 'high' ? 'High priority error' :
                      severity === 'medium' ? 'Medium priority error' :
                      'Low priority error';
  
  return `${severityText}: ${errorType}. ${errorMessage}`;
};

/**
 * Keyboard navigation helper
 */
export class KeyboardNavigationManager {
  private element: HTMLElement;
  private config: KeyboardNavigationConfig;
  private focusableElements: NodeListOf<HTMLElement> | null = null;
  private currentFocusIndex = 0;

  constructor(element: HTMLElement, config: KeyboardNavigationConfig = {}) {
    this.element = element;
    this.config = {
      enableArrowKeys: true,
      enableTabNavigation: true,
      enableEnterActivation: true,
      enableEscapeClose: false,
      trapFocus: false,
      autoFocus: false,
      focusableSelectors: [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])'
      ],
      ...config
    };
    this.initialize();
  }

  private initialize(): void {
    this.refreshFocusableElements();
    this.attachEventListeners();
    
    if (this.config.autoFocus && this.focusableElements && this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }
  }

  private refreshFocusableElements(): void {
    const selector = this.config.focusableSelectors!.join(', ');
    this.focusableElements = this.element.querySelectorAll(selector);
  }

  private attachEventListeners(): void {
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    if (this.config.trapFocus) {
      this.element.addEventListener('focusin', this.handleFocusIn.bind(this));
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.focusableElements || this.focusableElements.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        if (this.config.enableArrowKeys) {
          event.preventDefault();
          this.focusNext();
        }
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        if (this.config.enableArrowKeys) {
          event.preventDefault();
          this.focusPrevious();
        }
        break;

      case 'Home':
        if (this.config.enableArrowKeys) {
          event.preventDefault();
          this.focusFirst();
        }
        break;

      case 'End':
        if (this.config.enableArrowKeys) {
          event.preventDefault();
          this.focusLast();
        }
        break;

      case 'Enter':
      case ' ':
        if (this.config.enableEnterActivation) {
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && activeElement.click) {
            event.preventDefault();
            activeElement.click();
          }
        }
        break;

      case 'Escape':
        if (this.config.enableEscapeClose) {
          event.preventDefault();
          this.handleEscape();
        }
        break;

      case 'Tab':
        if (this.config.trapFocus) {
          this.handleTabTrapping(event);
        }
        break;
    }
  }

  private handleFocusIn(event: FocusEvent): void {
    if (this.config.trapFocus && this.focusableElements) {
      const target = event.target as HTMLElement;
      const focusableArray = Array.from(this.focusableElements);
      this.currentFocusIndex = focusableArray.indexOf(target);
    }
  }

  private handleTabTrapping(event: KeyboardEvent): void {
    if (!this.focusableElements || this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab - move backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab - move forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  private focusNext(): void {
    if (!this.focusableElements) return;
    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
    this.focusableElements[this.currentFocusIndex].focus();
  }

  private focusPrevious(): void {
    if (!this.focusableElements) return;
    this.currentFocusIndex = this.currentFocusIndex === 0 
      ? this.focusableElements.length - 1 
      : this.currentFocusIndex - 1;
    this.focusableElements[this.currentFocusIndex].focus();
  }

  private focusFirst(): void {
    if (!this.focusableElements) return;
    this.currentFocusIndex = 0;
    this.focusableElements[0].focus();
  }

  private focusLast(): void {
    if (!this.focusableElements) return;
    this.currentFocusIndex = this.focusableElements.length - 1;
    this.focusableElements[this.currentFocusIndex].focus();
  }

  private handleEscape(): void {
    // This can be overridden by components that need custom escape behavior
    const event = new CustomEvent('accessibility:escape', { bubbles: true });
    this.element.dispatchEvent(event);
  }

  public destroy(): void {
    this.element.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.element.removeEventListener('focusin', this.handleFocusIn.bind(this));
  }

  public updateFocusableElements(): void {
    const selector = this.config.focusableSelectors!.join(', ');
    this.focusableElements = this.element.querySelectorAll(selector);
  }
}

/**
 * Screen reader announcement service
 */
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer | null = null;
  private liveRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;

  static getInstance(): ScreenReaderAnnouncer {
    if (!ScreenReaderAnnouncer.instance) {
      ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer();
    }
    return ScreenReaderAnnouncer.instance;
  }

  constructor() {
    this.createLiveRegions();
  }

  private createLiveRegions(): void {
    // Create polite live region
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(this.liveRegion);

    // Create assertive live region
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');
    this.assertiveRegion.className = 'sr-only';
    this.assertiveRegion.style.cssText = this.liveRegion.style.cssText;
    document.body.appendChild(this.assertiveRegion);
  }

  /**
   * Announce message politely (non-interrupting)
   */
  announcePolite(message: string): void {
    if (this.liveRegion) {
      // Clear first, then set message to ensure announcement
      this.liveRegion.textContent = '';
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = message;
        }
      }, 100);
    }
  }

  /**
   * Announce message assertively (interrupting)
   */
  announceAssertive(message: string): void {
    if (this.assertiveRegion) {
      // Clear first, then set message to ensure announcement
      this.assertiveRegion.textContent = '';
      setTimeout(() => {
        if (this.assertiveRegion) {
          this.assertiveRegion.textContent = message;
        }
      }, 100);
    }
  }

  /**
   * Announce context update
   */
  announceContextUpdate(context: UserContext, operation: string): void {
    const message = `${operation} complete. ${generateContextStatusLabel(context)}`;
    this.announcePolite(message);
  }

  /**
   * Announce progress update
   */
  announceProgress(operation: string, progress: number, total?: number): void {
    // Only announce at meaningful intervals to avoid spam
    if (progress % 25 === 0 || progress === 100 || (total && progress === total)) {
      const message = generateProgressAnnouncement(operation, progress, total);
      this.announcePolite(message);
    }
  }

  /**
   * Announce error
   */
  announceError(errorType: string, errorMessage: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    const message = generateErrorAnnouncement(errorType, errorMessage, severity);
    
    // Use assertive announcement for critical and high priority errors
    if (severity === 'critical' || severity === 'high') {
      this.announceAssertive(message);
    } else {
      this.announcePolite(message);
    }
  }
}

/**
 * Accessibility preference manager
 */
export class AccessibilityPreferenceManager {
  private static instance: AccessibilityPreferenceManager | null = null;
  private preferences: {
    reducedMotion: boolean;
    highContrast: boolean;
    announcements: boolean;
    keyboardNavigation: boolean;
  } = {
    reducedMotion: false,
    highContrast: false,
    announcements: true,
    keyboardNavigation: true
  };

  static getInstance(): AccessibilityPreferenceManager {
    if (!AccessibilityPreferenceManager.instance) {
      AccessibilityPreferenceManager.instance = new AccessibilityPreferenceManager();
    }
    return AccessibilityPreferenceManager.instance;
  }

  constructor() {
    this.loadPreferences();
    this.detectSystemPreferences();
  }

  private loadPreferences(): void {
    try {
      const saved = localStorage.getItem('accessibility_preferences');
      if (saved) {
        this.preferences = { ...this.preferences, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load accessibility preferences:', error);
    }
  }

  private detectSystemPreferences(): void {
    // Detect reduced motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.preferences.reducedMotion = true;
    }

    // Detect high contrast preference
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
      this.preferences.highContrast = true;
    }

    // Listen for changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        this.preferences.reducedMotion = e.matches;
        this.applyPreferences();
      });

      window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
        this.preferences.highContrast = e.matches;
        this.applyPreferences();
      });
    }

    this.applyPreferences();
  }

  private applyPreferences(): void {
    const root = document.documentElement;

    // Apply reduced motion
    if (this.preferences.reducedMotion) {
      root.style.setProperty('--animation-duration', '0.01ms');
      root.style.setProperty('--transition-duration', '0.01ms');
      root.classList.add('reduced-motion');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
      root.classList.remove('reduced-motion');
    }

    // Apply high contrast
    if (this.preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }

  public getPreferences() {
    return { ...this.preferences };
  }

  public updatePreference<K extends keyof typeof this.preferences>(
    key: K, 
    value: typeof this.preferences[K]
  ): void {
    this.preferences[key] = value;
    this.applyPreferences();
    
    try {
      localStorage.setItem('accessibility_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Failed to save accessibility preferences:', error);
    }
  }

  public shouldReduceMotion(): boolean {
    return this.preferences.reducedMotion;
  }

  public shouldUseHighContrast(): boolean {
    return this.preferences.highContrast;
  }

  public shouldAnnounce(): boolean {
    return this.preferences.announcements;
  }

  public shouldEnableKeyboardNavigation(): boolean {
    return this.preferences.keyboardNavigation;
  }
}

/**
 * Focus management utilities
 */
export class FocusManager {
  private static focusStack: HTMLElement[] = [];

  /**
   * Save current focus and set new focus
   */
  static pushFocus(element: HTMLElement): void {
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus && currentFocus !== document.body) {
      this.focusStack.push(currentFocus);
    }
    element.focus();
  }

  /**
   * Restore previous focus
   */
  static popFocus(): boolean {
    const previousFocus = this.focusStack.pop();
    if (previousFocus && document.contains(previousFocus)) {
      previousFocus.focus();
      return true;
    }
    return false;
  }

  /**
   * Clear focus stack
   */
  static clearFocusStack(): void {
    this.focusStack = [];
  }

  /**
   * Get first focusable element in container
   */
  static getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];
    
    const firstFocusable = container.querySelector(focusableSelectors.join(', ')) as HTMLElement;
    return firstFocusable;
  }

  /**
   * Get last focusable element in container
   */
  static getLastFocusableElement(container: HTMLElement): HTMLElement | null {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];
    
    const focusableElements = container.querySelectorAll(focusableSelectors.join(', '));
    return focusableElements.length > 0 ? focusableElements[focusableElements.length - 1] as HTMLElement : null;
  }
}

// Export singleton instances
export const screenReaderAnnouncer = ScreenReaderAnnouncer.getInstance();
export const accessibilityPreferenceManager = AccessibilityPreferenceManager.getInstance();

export default {
  generateAccessibilityAttributes,
  generateContextStatusLabel,
  generateProgressAnnouncement,
  generateErrorAnnouncement,
  KeyboardNavigationManager,
  ScreenReaderAnnouncer,
  AccessibilityPreferenceManager,
  FocusManager,
  screenReaderAnnouncer,
  accessibilityPreferenceManager
};