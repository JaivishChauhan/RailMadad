import React from 'react';
import { SpinnerIcon } from '../icons/Icons';

interface LoadingScreenProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  description?: string;
  showAnimation?: boolean;
  className?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  size = 'md',
  message,
  description,
  showAnimation = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-12 w-12'
  };

  const containerClasses = {
    sm: 'py-4',
    md: 'py-12',
    lg: 'py-16'
  };

  return (
    <div className={`flex items-center justify-center ${containerClasses[size]} ${className}`}>
      <div className="flex flex-col items-center justify-center">
        <SpinnerIcon className={`${sizeClasses[size]} animate-spin text-primary`} />
        {message && (
          <p className="text-sm text-primary font-semibold mt-2">{message}</p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {showAnimation && (
          <div className="mt-4 flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}
      </div>
    </div>
  );
};
