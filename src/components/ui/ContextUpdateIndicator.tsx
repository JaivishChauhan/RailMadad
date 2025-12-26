import React, { useEffect, useRef } from 'react';
import { Loader2, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { 
  generateAccessibilityAttributes, 
  generateProgressAnnouncement, 
  screenReaderAnnouncer,
  accessibilityPreferenceManager,
  KeyboardNavigationManager,
  FocusManager 
} from '../../utils/accessibility';

interface ContextUpdateIndicatorProps {
  isActive: boolean;
  progress?: number;
  message?: string;
  type?: 'loading' | 'updating' | 'syncing' | 'error' | 'success';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'minimal' | 'detailed' | 'compact';
  showProgress?: boolean;
  className?: string;
  // Accessibility props
  label?: string;
  description?: string;
  announceUpdates?: boolean;
  id?: string;
  onComplete?: () => void;
}

/**
 * Real-time context update indicator component with comprehensive accessibility
 * Provides visual feedback for context changes, updates, and synchronization
 * 
 * Accessibility Features:
 * - ARIA live regions for screen reader announcements
 * - Keyboard navigation support
 * - High contrast mode support
 * - Reduced motion preferences
 * - Progress announcements
 * - Semantic role attributes
 */
export const ContextUpdateIndicator: React.FC<ContextUpdateIndicatorProps> = ({
  isActive,
  progress = 0,
  message,
  type = 'updating',
  size = 'md',
  variant = 'detailed',
  showProgress = true,
  className = '',
  label,
  description,
  announceUpdates = true,
  id,
  onComplete
}) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const previousProgressRef = useRef(progress);
  const keyboardManagerRef = useRef<KeyboardNavigationManager | null>(null);
  
  // Generate unique ID if not provided
  const componentId = id || `context-indicator-${Math.random().toString(36).substr(2, 9)}`;
  const progressBarId = `${componentId}-progress`;
  const statusId = `${componentId}-status`;
  
  // Get accessibility preferences
  const accessibilityPrefs = accessibilityPreferenceManager.getPreferences();
  
  // Screen reader announcements
  useEffect(() => {
    if (!announceUpdates || !accessibilityPrefs.announcements) return;
    
    const currentProgress = Math.round(progress);
    const previousProgress = Math.round(previousProgressRef.current);
    
    if (type === 'error') {
      screenReaderAnnouncer.announceAssertive(
        `Context update failed: ${message || 'An error occurred during update'}`
      );
    } else if (type === 'success') {
      screenReaderAnnouncer.announcePolite(
        `Context update completed successfully: ${message || 'Update complete'}`
      );
      if (onComplete) {
        onComplete();
      }
    } else if (isActive && showProgress && currentProgress !== previousProgress) {
      // Announce progress at meaningful intervals
      if (currentProgress % 25 === 0 || currentProgress === 100) {
        const operation = message || `${type} context`;
        screenReaderAnnouncer.announcePolite(
          generateProgressAnnouncement(operation, currentProgress)
        );
      }
    }
    
    previousProgressRef.current = progress;
  }, [progress, type, message, isActive, announceUpdates, accessibilityPrefs.announcements, onComplete]);
  
  // Initialize keyboard navigation
  useEffect(() => {
    if (!componentRef.current || !accessibilityPrefs.keyboardNavigation) return;
    
    keyboardManagerRef.current = new KeyboardNavigationManager(componentRef.current, {
      enableArrowKeys: false,
      enableTabNavigation: true,
      enableEnterActivation: false,
      trapFocus: false,
      autoFocus: false
    });
    
    return () => {
      if (keyboardManagerRef.current) {
        keyboardManagerRef.current.destroy();
      }
    };
  }, [accessibilityPrefs.keyboardNavigation]);
  
  // Generate accessibility attributes
  const accessibilityAttributes = generateAccessibilityAttributes('context-indicator', undefined, {
    label: label || `Context update ${type}`,
    description: description || message,
    live: type === 'error' ? 'assertive' : 'polite',
    atomic: true,
    busy: isActive
  });
  
  if (!isActive && type !== 'success' && type !== 'error') {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  const getIcon = () => {
    const iconSize = iconSizes[size];
    const baseIconProps = {
      size: iconSize,
      'aria-hidden': true, // Use boolean instead of string
      role: 'img'
    };
    
    switch (type) {
      case 'loading':
        return <Loader2 
          {...baseIconProps}
          className={`animate-spin text-blue-500 ${accessibilityPrefs.reducedMotion ? 'motion-reduce:animate-none' : ''}`} 
        />;
      case 'updating':
        return <RefreshCw 
          {...baseIconProps}
          className={`animate-spin text-amber-500 ${accessibilityPrefs.reducedMotion ? 'motion-reduce:animate-none' : ''}`} 
        />;
      case 'syncing':
        return <RefreshCw 
          {...baseIconProps}
          className={`animate-pulse text-blue-500 ${accessibilityPrefs.reducedMotion ? 'motion-reduce:animate-none' : ''}`} 
        />;
      case 'success':
        return <CheckCircle {...baseIconProps} className="text-green-500" />;
      case 'error':
        return <AlertTriangle {...baseIconProps} className="text-red-500" />;
      default:
        return <Loader2 
          {...baseIconProps}
          className={`animate-spin text-gray-500 ${accessibilityPrefs.reducedMotion ? 'motion-reduce:animate-none' : ''}`} 
        />;
    }
  };

  const getBackgroundColor = () => {
    const baseClasses = accessibilityPrefs.highContrast ? 'border-2' : 'border';
    
    switch (type) {
      case 'success':
        return `bg-green-50 border-green-200 ${baseClasses} ${accessibilityPrefs.highContrast ? 'hc:bg-green-100 hc:border-green-800' : ''}`;
      case 'error':
        return `bg-red-50 border-red-200 ${baseClasses} ${accessibilityPrefs.highContrast ? 'hc:bg-red-100 hc:border-red-800' : ''}`;
      case 'loading':
      case 'updating':
        return `bg-blue-50 border-blue-200 ${baseClasses} ${accessibilityPrefs.highContrast ? 'hc:bg-blue-100 hc:border-blue-800' : ''}`;
      case 'syncing':
        return `bg-amber-50 border-amber-200 ${baseClasses} ${accessibilityPrefs.highContrast ? 'hc:bg-amber-100 hc:border-amber-800' : ''}`;
      default:
        return `bg-gray-50 border-gray-200 ${baseClasses} ${accessibilityPrefs.highContrast ? 'hc:bg-gray-100 hc:border-gray-800' : ''}`;
    }
  };

  const getMessage = () => {
    if (message) return message;
    
    switch (type) {
      case 'loading':
        return 'Loading context...';
      case 'updating':
        return 'Updating context...';
      case 'syncing':
        return 'Syncing changes...';
      case 'success':
        return 'Context updated';
      case 'error':
        return 'Update failed';
      default:
        return 'Processing...';
    }
  };

  if (variant === 'minimal') {
    return (
      <div 
        ref={componentRef}
        className={`inline-flex items-center gap-1 ${sizeClasses[size]} ${className}`}
        {...accessibilityAttributes}
        id={componentId}
      >
        {getIcon()}
        <span className="sr-only">{getMessage()}</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div 
        ref={componentRef}
        className={`inline-flex items-center gap-2 px-2 py-1 rounded-md ${getBackgroundColor()} ${sizeClasses[size]} ${className} focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1`}
        {...accessibilityAttributes}
        id={componentId}
        tabIndex={accessibilityPrefs.keyboardNavigation ? 0 : -1}
      >
        {getIcon()}
        <span className="font-medium" id={statusId}>{getMessage()}</span>
      </div>
    );
  }

  // Detailed variant
  return (
    <div 
      ref={componentRef}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg ${getBackgroundColor()} ${sizeClasses[size]} ${className} focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1`}
      {...accessibilityAttributes}
      id={componentId}
      tabIndex={accessibilityPrefs.keyboardNavigation ? 0 : -1}
    >
      {getIcon()}
      <div className="flex-1">
        <div className="font-medium text-gray-900" id={statusId}>
          {getMessage()}
        </div>
        {showProgress && isActive && progress > 0 && (
          <div className="mt-1" role="group" aria-labelledby={`${progressBarId}-label`}>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span id={`${progressBarId}-label`}>Progress</span>
              <span aria-live="polite" aria-atomic="true">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${
                  accessibilityPrefs.reducedMotion ? '' : 'transition-all duration-300'
                } ${
                  type === 'error' ? 'bg-red-500' : 
                  type === 'success' ? 'bg-green-500' : 
                  'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                aria-labelledby={`${progressBarId}-label`}
                aria-describedby={statusId}
                id={progressBarId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Floating context update indicator for global app state with accessibility
 */
export const FloatingContextIndicator: React.FC<{
  isActive: boolean;
  progress?: number;
  message?: string;
  type?: 'loading' | 'updating' | 'syncing' | 'error' | 'success';
  onDismiss?: () => void;
  autoHide?: boolean;
  duration?: number;
}> = ({ isActive, progress, message, type, onDismiss, autoHide = true, duration = 5000 }) => {
  const floatingRef = useRef<HTMLDivElement>(null);
  
  // Auto-hide functionality
  useEffect(() => {
    if (!isActive || !autoHide || type === 'error') return;
    
    const timer = setTimeout(() => {
      if (onDismiss) {
        onDismiss();
      }
    }, duration);
    
    return () => clearTimeout(timer);
  }, [isActive, autoHide, duration, onDismiss, type]);
  
  // Focus management for accessibility
  useEffect(() => {
    if (isActive && type === 'error' && floatingRef.current) {
      // For error states, we may want to focus the floating indicator
      // but only if no other critical element has focus
      const activeElement = document.activeElement;
      if (!activeElement || activeElement === document.body) {
        FocusManager.pushFocus(floatingRef.current);
      }
    }
  }, [isActive, type]);
  
  if (!isActive && type !== 'success' && type !== 'error') {
    return null;
  }

  return (
    <div 
      ref={floatingRef}
      className={`fixed top-4 right-4 z-50 max-w-sm ${
        accessibilityPreferenceManager.shouldReduceMotion() 
          ? '' 
          : 'animate-in slide-in-from-top-2 duration-300'
      }`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <ContextUpdateIndicator
        isActive={isActive}
        progress={progress}
        message={message}
        type={type}
        variant="compact"
        size="sm"
        className="shadow-lg"
        announceUpdates={false} // Prevent double announcements
      />
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      )}
    </div>
  );
};

/**
 * Context transition animation component
 */
export const ContextTransitionIndicator: React.FC<{
  isTransitioning: boolean;
  transitionType?: string;
  className?: string;
  onTransitionComplete?: () => void;
}> = ({ isTransitioning, transitionType, className = '', onTransitionComplete }) => {
  const transitionRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isTransitioning) return;
    
    // Announce transition start
    if (accessibilityPreferenceManager.shouldAnnounce()) {
      const message = getTransitionMessage();
      screenReaderAnnouncer.announcePolite(message.replace(/[🔐🚪🔄⚙️]/g, ''));
    }
    
    // Focus management - save current focus
    if (transitionRef.current) {
      FocusManager.pushFocus(transitionRef.current);
    }
    
    // Simulate transition completion
    const timer = setTimeout(() => {
      if (onTransitionComplete) {
        onTransitionComplete();
      }
      
      // Restore focus
      FocusManager.popFocus();
      
      // Announce completion
      if (accessibilityPreferenceManager.shouldAnnounce()) {
        screenReaderAnnouncer.announcePolite('Transition complete');
      }
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      FocusManager.popFocus();
    };
  }, [isTransitioning, onTransitionComplete]);
  
  if (!isTransitioning) return null;

  const getTransitionMessage = () => {
    switch (transitionType) {
      case 'login':
        return '🔐 Logging in...';
      case 'logout':
        return '🚪 Logging out...';
      case 'role_change':
        return '🔄 Updating role...';
      case 'preference_update':
        return '⚙️ Saving preferences...';
      case 'session_refresh':
        return '🔄 Refreshing session...';
      default:
        return '🔄 Updating...';
    }
  };

  return (
    <div 
      className={`fixed inset-0 bg-black/20 flex items-center justify-center z-50 ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transition-label"
      aria-describedby="transition-description"
    >
      <div 
        ref={transitionRef}
        className={`bg-white rounded-lg shadow-xl p-6 flex items-center gap-4 ${
          accessibilityPreferenceManager.shouldReduceMotion() 
            ? '' 
            : 'animate-in zoom-in-95 duration-300'
        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        tabIndex={-1}
      >
        <RefreshCw 
          size={24} 
          className={`text-blue-500 ${
            accessibilityPreferenceManager.shouldReduceMotion() ? '' : 'animate-spin'
          }`}
          aria-hidden="true"
        />
        <div>
          <span 
            id="transition-label"
            className="text-gray-900 font-medium"
          >
            {getTransitionMessage()}
          </span>
          <div 
            id="transition-description"
            className="sr-only"
          >
            Please wait while the system processes your request. This dialog will close automatically when complete.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextUpdateIndicator;