import React from 'react';
import type { User } from '../types';
import { Role } from '../types';

// For compatibility with existing App.tsx structure, we need to 
// import the providers from the individual files
export { usePassengerAuth as usePassengerAuth } from './usePassengerAuth';
export { useAdminAuth as useAdminAuth } from './useAdminAuthLocal';
export { PassengerAuthProvider } from './usePassengerAuth';
export { AdminAuthProvider } from './useAdminAuthLocal';

/**
 * This hook is a wrapper around the role-specific hooks and should
 * primarily be used for backward compatibility or general pages.
 * For specific sections, use the role-specific hooks directly.
 */
export const useAuth = () => {
  // Get access to both auth contexts - this requires careful usage
  // since we can't use both hooks simultaneously
  
  // For now, return a basic implementation that checks localStorage directly
  const getAuth = () => {
    try {
      const sessionData = localStorage.getItem('railmadad_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (Date.now() < session.expiresAt) {
          return {
            user: session.user,
            loading: false,
            login: async () => null,
            logout: () => {},
            signUp: async () => null
          };
        }
      }
    } catch (error) {
      console.error('Error reading session:', error);
    }
    
    return {
      user: null,
      loading: false,
      login: async () => null,
      logout: () => {},
      signUp: async () => null
    };
  };
  
  return getAuth();
};
