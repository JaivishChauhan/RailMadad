import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, HelpCircle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  context?: string;
  level?: 'critical' | 'warning' | 'info';
}

/**
 * Enhanced Error Boundary with comprehensive error handling
 * 
 * Features:
 * - Automatic error logging with unique IDs
 * - Retry mechanism with exponential backoff
 * - Context-aware error messages
 * - Graceful degradation options
 * - User-friendly error display
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, context = 'Unknown' } = this.props;
    const errorId = this.state.errorId;

    // Enhanced error logging
    const errorReport = {
      errorId,
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount
    };

    console.error(`🚨 ErrorBoundary [${context}]:`, errorReport);

    // Store error in localStorage for persistence
    try {
      const storedErrors = JSON.parse(localStorage.getItem('railmadad_errors') || '[]');
      storedErrors.push(errorReport);
      
      // Keep only last 10 errors
      if (storedErrors.length > 10) {
        storedErrors.splice(0, storedErrors.length - 10);
      }
      
      localStorage.setItem('railmadad_errors', JSON.stringify(storedErrors));
    } catch (storageError) {
      console.warn('Failed to store error in localStorage:', storageError);
    }

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo, errorId);
    }

    this.setState({
      errorInfo,
    });
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn(`Max retries (${maxRetries}) reached for error ${this.state.errorId}`);
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, etc.
    const delay = Math.pow(2, retryCount) * 1000;

    console.log(`Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

    const timeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        retryCount: retryCount + 1
      });
    }, delay);

    this.retryTimeouts.push(timeout);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  getErrorLevel = (): 'critical' | 'warning' | 'info' => {
    const { level, context } = this.props;
    const { error } = this.state;

    if (level) return level;

    // Determine level based on context and error type
    if (context?.includes('Auth') || context?.includes('Security')) return 'critical';
    if (error?.name === 'ChunkLoadError' || error?.name === 'NetworkError') return 'warning';
    if (error?.name === 'TypeError' || error?.name === 'ReferenceError') return 'critical';

    return 'warning';
  };

  getErrorMessage = (): string => {
    const { error } = this.state;
    const { context } = this.props;
    const level = this.getErrorLevel();

    if (level === 'critical') {
      return `A critical error occurred in ${context || 'the application'}. Please try refreshing the page or contact support if the problem persists.`;
    }

    if (error?.name === 'ChunkLoadError') {
      return 'Failed to load application resources. This usually happens after an update. Please refresh the page to get the latest version.';
    }

    if (error?.name === 'NetworkError') {
      return 'Network connection issue detected. Please check your internet connection and try again.';
    }

    return `Something went wrong in ${context || 'this section'}. We've logged the issue and you can try again.`;
  };

  render() {
    const { hasError, errorId, retryCount } = this.state;
    const { children, fallback, enableRetry = true, maxRetries = 3 } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const errorLevel = this.getErrorLevel();
      const canRetry = enableRetry && retryCount < maxRetries;

      const bgColor = errorLevel === 'critical' ? 'bg-red-50' : 
                     errorLevel === 'warning' ? 'bg-amber-50' : 'bg-blue-50';
      const borderColor = errorLevel === 'critical' ? 'border-red-200' : 
                         errorLevel === 'warning' ? 'border-amber-200' : 'border-blue-200';
      const iconColor = errorLevel === 'critical' ? 'text-red-500' : 
                       errorLevel === 'warning' ? 'text-amber-500' : 'text-blue-500';

      return (
        <div className={`min-h-32 flex items-center justify-center p-4`}>
          <div className={`max-w-md w-full ${bgColor} ${borderColor} border rounded-lg p-6 shadow-sm`}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className={iconColor} />
              <div>
                <h3 className="font-semibold text-gray-900">
                  {errorLevel === 'critical' ? 'Critical Error' : 
                   errorLevel === 'warning' ? 'Something Went Wrong' : 'Minor Issue'}
                </h3>
                <p className="text-sm text-gray-600">Error ID: {errorId}</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              {this.getErrorMessage()}
            </p>

            <div className="flex flex-col gap-2">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw size={16} />
                  Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw size={16} />
                  Reload Page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  <Home size={16} />
                  Go Home
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    <HelpCircle size={14} className="inline mr-1" />
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-32">
                    <div><strong>Error:</strong> {this.state.error?.message}</div>
                    <div><strong>Stack:</strong></div>
                    <pre className="whitespace-pre-wrap">{this.state.error?.stack}</pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

/**
 * Error boundary specifically for user-aware components
 */
export const UserAwareErrorBoundary: React.FC<{ children: ReactNode; context?: string }> = ({
  children,
  context = 'User-Aware Component'
}) => (
  <ErrorBoundary
    context={context}
    level="warning"
    enableRetry={true}
    maxRetries={2}
    onError={(error, errorInfo, errorId) => {
      console.error(`🔒 User-aware component error [${context}]:`, {
        errorId,
        error: error.message,
        component: errorInfo.componentStack
      });
    }}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;