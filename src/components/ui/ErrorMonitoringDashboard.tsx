import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useErrorHandler } from '../../utils/errorHandler';
import { useDegradation } from '../../utils/gracefulDegradation';
import { 
  generateAccessibilityAttributes, 
  KeyboardNavigationManager, 
  FocusManager,
  screenReaderAnnouncer,
  accessibilityPreferenceManager 
} from '../../utils/accessibility';

interface ErrorMonitoringDashboardProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  // Accessibility props
  autoFocus?: boolean;
  trapFocus?: boolean;
  announceChanges?: boolean;
}

/**
 * Comprehensive Error Monitoring Dashboard with Enhanced Accessibility
 * 
 * Displays:
 * - Real-time error statistics
 * - Degradation level status  
 * - System health indicators
 * - Recovery actions
 * 
 * Accessibility Features:
 * - ARIA labels and descriptions
 * - Keyboard navigation with tab trapping
 * - Screen reader announcements for status changes
 * - High contrast mode support
 * - Focus management
 * - Semantic HTML structure
 */
export const ErrorMonitoringDashboard: React.FC<ErrorMonitoringDashboardProps> = ({
  className = '',
  isOpen = false,
  onClose,
  autoFocus = true,
  trapFocus = true,
  announceChanges = true
}) => {
  const { getErrorStats, clearErrorLog } = useErrorHandler();
  const { level, status, isFeatureAvailable } = useDegradation();
  const [stats, setStats] = useState(getErrorStats());
  const [refreshCount, setRefreshCount] = useState(0);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const keyboardManagerRef = useRef<KeyboardNavigationManager | null>(null);
  const previousStatsRef = useRef(stats);
  
  // Get accessibility preferences
  const preferences = accessibilityPreferenceManager.getPreferences();
  
  // Generate unique IDs for accessibility
  const dashboardId = 'error-monitoring-dashboard';
  const headingId = `${dashboardId}-heading`;
  const descriptionId = `${dashboardId}-description`;
  const statsRegionId = `${dashboardId}-stats`;

  // Generate accessibility attributes
  const accessibilityAttributes = generateAccessibilityAttributes(
    'error-dashboard',
    undefined,
    {
      label: 'Error monitoring and system health dashboard',
      description: 'Real-time display of error statistics, system health, and feature availability',
      role: 'dialog',
      labelledBy: headingId,
      describedBy: descriptionId
    }
  );

  // Initialize keyboard navigation
  useEffect(() => {
    if (!dashboardRef.current || !preferences.keyboardNavigation) return;
    
    keyboardManagerRef.current = new KeyboardNavigationManager(
      dashboardRef.current,
      {
        trapFocus,
        autoFocus,
        enableArrowKeys: true,
        enableTabNavigation: true,
        enableEnterActivation: true,
        enableEscapeClose: true
      }
    );
    
    // Listen for escape key to close dashboard
    const handleEscape = () => {
      if (onClose) {
        onClose();
      }
    };
    
    dashboardRef.current.addEventListener('accessibility:escape', handleEscape);
    
    return () => {
      if (keyboardManagerRef.current) {
        keyboardManagerRef.current.destroy();
      }
      if (dashboardRef.current) {
        dashboardRef.current.removeEventListener('accessibility:escape', handleEscape);
      }
    };
  }, [trapFocus, autoFocus, onClose, preferences.keyboardNavigation]);

  // Auto-focus management
  useEffect(() => {
    if (!autoFocus || !dashboardRef.current) return;
    
    const firstFocusable = FocusManager.getFirstFocusableElement(dashboardRef.current);
    if (firstFocusable) {
      FocusManager.pushFocus(firstFocusable);
    } else {
      dashboardRef.current.tabIndex = -1;
      FocusManager.pushFocus(dashboardRef.current);
    }
    
    return () => {
      FocusManager.popFocus();
    };
  }, [autoFocus]);

  // Update stats every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const newStats = getErrorStats();
      const previousStats = previousStatsRef.current;
      
      // Announce significant changes if enabled
      if (announceChanges && preferences.announcements) {
        // Check for critical changes
        if (newStats.bySeverity.critical > previousStats.bySeverity.critical) {
          const increase = newStats.bySeverity.critical - previousStats.bySeverity.critical;
          screenReaderAnnouncer.announceAssertive(
            `Alert: ${increase} new critical error${increase > 1 ? 's' : ''} detected`
          );
        }
        
        // Check for health improvement
        const oldErrorRate = previousStats.total > 0 ? (previousStats.unresolved / previousStats.total) * 100 : 0;
        const newErrorRate = newStats.total > 0 ? (newStats.unresolved / newStats.total) * 100 : 0;
        
        if (oldErrorRate > 60 && newErrorRate <= 30) {
          screenReaderAnnouncer.announcePolite('System health improved significantly');
        }
      }
      
      setStats(newStats);
      previousStatsRef.current = newStats;
      setRefreshCount(prev => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [getErrorStats, announceChanges, preferences.announcements]);

  if (!isOpen) {
    return null;
  }

  const getHealthStatus = () => {
    const errorRate = stats.total > 0 ? (stats.unresolved / stats.total) * 100 : 0;
    
    if (errorRate === 0) return { status: 'excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (errorRate < 10) return { status: 'good', color: 'text-green-600', bg: 'bg-green-50' };
    if (errorRate < 30) return { status: 'fair', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (errorRate < 60) return { status: 'poor', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { status: 'critical', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const health = getHealthStatus();

  return (
    <div 
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${className}`}
      role="presentation"
    >
      <div 
        ref={dashboardRef}
        className={`bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden ${
          preferences.highContrast ? 'border-2 border-black' : ''
        }`}
        {...accessibilityAttributes}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 
              id={headingId}
              className="text-xl font-semibold text-gray-900"
            >
              System Health Dashboard
            </h2>
            <p 
              id={descriptionId}
              className="text-sm text-gray-600"
            >
              Real-time error monitoring and system status
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              preferences.highContrast ? 'border-2 border-gray-400' : ''
            }`}
            aria-label="Close error monitoring dashboard"
            type="button"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden={true}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div 
          id={statsRegionId}
          className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]"
          role="region"
          aria-labelledby={headingId}
        >
          {/* System Health Overview */}
          <div 
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
            role="group"
            aria-label="System health overview statistics"
          >
            {/* Overall Health */}
            <div 
              className={`p-4 rounded-lg border ${health.bg} border-gray-200 ${preferences.highContrast ? 'border-2' : ''}`}
              role="status"
              aria-label={`System health is ${health.status}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">System Health</h3>
                {health.status === 'excellent' || health.status === 'good' ? (
                  <CheckCircle 
                    className={`w-5 h-5 ${health.color}`} 
                    aria-hidden={true}
                  />
                ) : (
                  <AlertTriangle 
                    className={`w-5 h-5 ${health.color}`} 
                    aria-hidden={true}
                  />
                )}
              </div>
              <p 
                className={`text-2xl font-bold ${health.color} capitalize`}
                role="status"
                aria-live="polite"
              >
                {health.status}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="sr-only">Error summary: </span>
                {stats.unresolved} unresolved of {stats.total} total errors
              </p>
            </div>

            {/* Degradation Status */}
            <div 
              className={`p-4 rounded-lg border border-gray-200 bg-blue-50 ${preferences.highContrast ? 'border-2' : ''}`}
              role="status"
              aria-label={`Degradation level is ${level}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Degradation Level</h3>
                <TrendingUp 
                  className="w-5 h-5 text-blue-600" 
                  aria-hidden={true}
                />
              </div>
              <p 
                className="text-2xl font-bold text-blue-600 capitalize"
                role="status"
                aria-live="polite"
              >
                {level}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="sr-only">Feature availability: </span>
                {status.availableFeatures.length} of {status.availableFeatures.length + status.unavailableFeatures.length} features active
              </p>
            </div>

            {/* Error Resolution Rate */}
            <div 
              className={`p-4 rounded-lg border border-gray-200 bg-purple-50 ${preferences.highContrast ? 'border-2' : ''}`}
              role="status"
              aria-label={`Error resolution rate is ${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 100} percent`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Resolution Rate</h3>
                <TrendingDown 
                  className="w-5 h-5 text-purple-600" 
                  aria-hidden={true}
                />
              </div>
              <p 
                className="text-2xl font-bold text-purple-600"
                role="status"
                aria-live="polite"
              >
                {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 100}%
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="sr-only">Resolution summary: </span>
                {stats.resolved} errors resolved automatically
              </p>
            </div>
          </div>

          {/* Error Statistics by Severity */}
          <section 
            className="mb-8"
            role="region"
            aria-labelledby="severity-heading"
          >
            <h3 
              id="severity-heading"
              className="text-lg font-medium text-gray-900 mb-4"
            >
              Error Statistics by Severity
            </h3>
            <div 
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              role="group"
              aria-label="Error counts grouped by severity level"
            >
              <div 
                className={`p-3 bg-red-50 border border-red-200 rounded-lg ${preferences.highContrast ? 'border-2' : ''}`}
                role="status"
                aria-label={`${stats.bySeverity.critical} critical errors`}
              >
                <div 
                  className="text-2xl font-bold text-red-600"
                  aria-live="polite"
                >
                  {stats.bySeverity.critical}
                </div>
                <div className="text-sm text-red-700">Critical</div>
              </div>
              <div 
                className={`p-3 bg-orange-50 border border-orange-200 rounded-lg ${preferences.highContrast ? 'border-2' : ''}`}
                role="status"
                aria-label={`${stats.bySeverity.high} high priority errors`}
              >
                <div 
                  className="text-2xl font-bold text-orange-600"
                  aria-live="polite"
                >
                  {stats.bySeverity.high}
                </div>
                <div className="text-sm text-orange-700">High</div>
              </div>
              <div 
                className={`p-3 bg-yellow-50 border border-yellow-200 rounded-lg ${preferences.highContrast ? 'border-2' : ''}`}
                role="status"
                aria-label={`${stats.bySeverity.medium} medium priority errors`}
              >
                <div 
                  className="text-2xl font-bold text-yellow-600"
                  aria-live="polite"
                >
                  {stats.bySeverity.medium}
                </div>
                <div className="text-sm text-yellow-700">Medium</div>
              </div>
              <div 
                className={`p-3 bg-gray-50 border border-gray-200 rounded-lg ${preferences.highContrast ? 'border-2' : ''}`}
                role="status"
                aria-label={`${stats.bySeverity.low} low priority errors`}
              >
                <div 
                  className="text-2xl font-bold text-gray-600"
                  aria-live="polite"
                >
                  {stats.bySeverity.low}
                </div>
                <div className="text-sm text-gray-700">Low</div>
              </div>
            </div>
          </section>

          {/* Error Statistics by Category */}
          <section 
            className="mb-8"
            role="region"
            aria-labelledby="category-heading"
          >
            <h3 
              id="category-heading"
              className="text-lg font-medium text-gray-900 mb-4"
            >
              Error Statistics by Category
            </h3>
            <div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
              role="group"
              aria-label="Error counts grouped by category"
            >
              {Object.entries(stats.byCategory).map(([category, count]) => (
                <div 
                  key={category} 
                  className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg ${preferences.highContrast ? 'border-2 border-gray-400' : ''}`}
                  role="status"
                  aria-label={`${count} errors in ${category.replace('_', ' ')} category`}
                >
                  <span className="text-sm font-medium capitalize">
                    {category.replace('_', ' ')}
                  </span>
                  <span 
                    className="text-lg font-bold text-gray-900"
                    aria-live="polite"
                  >
                    {count as number}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Feature Availability */}
          <section 
            className="mb-8"
            role="region"
            aria-labelledby="features-heading"
          >
            <h3 
              id="features-heading"
              className="text-lg font-medium text-gray-900 mb-4"
            >
              Feature Availability
            </h3>
            <div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
              role="group"
              aria-label="Available and disabled features"
            >
              <div>
                <h4 
                  id="available-features-heading"
                  className="text-sm font-medium text-green-700 mb-2"
                >
                  Available Features
                </h4>
                <div 
                  className="space-y-1"
                  role="list"
                  aria-labelledby="available-features-heading"
                >
                  {status.availableFeatures.map(feature => (
                    <div 
                      key={feature} 
                      className="flex items-center gap-2 text-sm"
                      role="listitem"
                    >
                      <CheckCircle 
                        className="w-4 h-4 text-green-500" 
                        aria-hidden={true}
                      />
                      <span className="capitalize">
                        {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 
                  id="disabled-features-heading"
                  className="text-sm font-medium text-red-700 mb-2"
                >
                  Disabled Features
                </h4>
                <div 
                  className="space-y-1"
                  role="list"
                  aria-labelledby="disabled-features-heading"
                >
                  {status.unavailableFeatures.map(feature => (
                    <div 
                      key={feature} 
                      className="flex items-center gap-2 text-sm"
                      role="listitem"
                    >
                      <AlertTriangle 
                        className="w-4 h-4 text-red-500" 
                        aria-hidden={true}
                      />
                      <span className="capitalize">
                        {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Degradation Reasons */}
          {status.reasons.length > 0 && (
            <section 
              className="mb-8"
              role="region"
              aria-labelledby="degradation-heading"
            >
              <h3 
                id="degradation-heading"
                className="text-lg font-medium text-gray-900 mb-4"
              >
                Recent Degradation Events
              </h3>
              <div 
                className="space-y-2"
                role="list"
                aria-labelledby="degradation-heading"
              >
                {status.reasons.map((reason, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg ${preferences.highContrast ? 'border-2' : ''}`}
                    role="listitem"
                  >
                    <Clock 
                      className="w-4 h-4 text-amber-600 flex-shrink-0" 
                      aria-hidden={true}
                    />
                    <span className="text-sm text-amber-800">{reason}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Actions */}
          <section 
            className="border-t border-gray-200 pt-6"
            role="region"
            aria-labelledby="actions-heading"
          >
            <h3 
              id="actions-heading"
              className="text-lg font-medium text-gray-900 mb-4"
            >
              Actions
            </h3>
            <div 
              className="flex flex-wrap gap-3"
              role="group"
              aria-labelledby="actions-heading"
            >
              <button
                onClick={() => {
                  clearErrorLog();
                  setStats(getErrorStats());
                  if (preferences.announcements) {
                    screenReaderAnnouncer.announcePolite('Error log cleared successfully');
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                  preferences.highContrast ? 'border-2 border-red-800' : ''
                }`}
                type="button"
                aria-describedby="clear-log-description"
              >
                <AlertTriangle 
                  className="w-4 h-4" 
                  aria-hidden={true}
                />
                Clear Error Log
              </button>
              <span 
                id="clear-log-description" 
                className="sr-only"
              >
                Removes all error entries from the system log
              </span>

              <button
                onClick={() => {
                  setStats(getErrorStats());
                  if (preferences.announcements) {
                    screenReaderAnnouncer.announcePolite('Statistics refreshed');
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  preferences.highContrast ? 'border-2 border-blue-800' : ''
                }`}
                type="button"
                aria-describedby="refresh-stats-description"
              >
                <RefreshCw 
                  className="w-4 h-4" 
                  aria-hidden={true}
                />
                Refresh Stats
              </button>
              <span 
                id="refresh-stats-description" 
                className="sr-only"
              >
                Updates error statistics and system health information
              </span>

              <button
                onClick={() => {
                  if (preferences.announcements) {
                    screenReaderAnnouncer.announcePolite('Reloading application');
                  }
                  window.location.reload();
                }}
                className={`flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${
                  preferences.highContrast ? 'border-2 border-gray-800' : ''
                }`}
                type="button"
                aria-describedby="reload-page-description"
              >
                <RefreshCw 
                  className="w-4 h-4" 
                  aria-hidden={true}
                />
                Reload Page
              </button>
              <span 
                id="reload-page-description" 
                className="sr-only"
              >
                Reloads the entire application to reset system state
              </span>
            </div>
          </section>

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <details 
              className="mt-6 border-t border-gray-200 pt-6"
              role="region"
              aria-labelledby="debug-heading"
            >
              <summary 
                id="debug-heading"
                className={`text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded ${
                  preferences.highContrast ? 'border border-gray-600 p-1' : ''
                }`}
                tabIndex={0}
              >
                Debug Information
              </summary>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div 
                  className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm"
                  role="group"
                  aria-label="Debug data sections"
                >
                  <div>
                    <h4 
                      className="font-medium mb-2"
                      id="error-stats-debug"
                    >
                      Error Statistics
                    </h4>
                    <pre 
                      className="text-xs text-gray-600 overflow-auto"
                      aria-labelledby="error-stats-debug"
                      tabIndex={0}
                    >
                      {JSON.stringify(stats, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 
                      className="font-medium mb-2"
                      id="degradation-debug"
                    >
                      Degradation Status
                    </h4>
                    <pre 
                      className="text-xs text-gray-600 overflow-auto"
                      aria-labelledby="degradation-debug"
                      tabIndex={0}
                    >
                      {JSON.stringify(status, null, 2)}
                    </pre>
                  </div>
                </div>
                <div 
                  className="mt-4 text-xs text-gray-500"
                  role="status"
                  aria-live="polite"
                >
                  Refresh Count: {refreshCount} | Last Updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Compact error indicator for showing in the UI with accessibility support
 */
export const ErrorIndicator: React.FC<{
  onClick?: () => void;
  className?: string;
}> = ({ onClick, className = '' }) => {
  const { getErrorStats } = useErrorHandler();
  const { level } = useDegradation();
  const [stats, setStats] = useState(getErrorStats());
  const preferences = accessibilityPreferenceManager.getPreferences();

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getErrorStats());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [getErrorStats]);

  const hasErrors = stats.unresolved > 0;
  const isDegraded = level !== 'full';

  if (!hasErrors && !isDegraded) {
    return null;
  }

  // Generate accessibility attributes
  const accessibilityAttributes = generateAccessibilityAttributes(
    'error-indicator',
    undefined,
    {
      label: hasErrors 
        ? `${stats.unresolved} unresolved errors detected` 
        : `System running in ${level} mode`,
      description: hasErrors 
        ? 'Click to view detailed error information' 
        : 'Click to view system degradation details',
      role: 'button'
    }
  );

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        hasErrors
          ? 'bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500'
          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus:ring-yellow-500'
      } ${preferences.highContrast ? 'border-2 border-current' : ''} ${className}`}
      type="button"
      {...accessibilityAttributes}
    >
      <AlertTriangle 
        className="w-4 h-4" 
        aria-hidden={true}
      />
      <span>
        {hasErrors ? `${stats.unresolved} errors` : `${level} mode`}
      </span>
      <span className="sr-only">
        {hasErrors 
          ? `. ${stats.unresolved} unresolved system errors require attention` 
          : `. System degraded to ${level} functionality mode`}
      </span>
    </button>
  );
};

export default ErrorMonitoringDashboard;