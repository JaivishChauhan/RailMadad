import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  alt?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  alt = 'RailMadad Logo' 
}) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24'
  };

  return (
    <img 
      src="/favicon/RMLogo.png" 
      alt={alt} 
      className={`${sizeClasses[size]} ${className}`}
    />
  );
};

export default Logo;