import { usePassengerAuth } from './usePassengerAuth';
import { useAdminAuth } from './useAdminAuth';
import { Role } from '../types';

export interface SessionContext {
  activeRole: Role | null;
  isPassenger: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  currentUser: any;
  logout: () => void;
  switchToPassenger: () => void;
  switchToAdmin: () => void;
}

/**
 * Hook that provides single active session management
 * Only one role can be active at a time, but both sessions persist in storage
 */
export const useSessionContext = (): SessionContext => {
  const { user: passengerUser, logout: passengerLogout } = usePassengerAuth();
  const { user: adminUser, logout: adminLogout } = useAdminAuth();

  // Determine current active session based on URL or last activity
  const isOnAdminRoute = window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/admin');
  
  // Active role logic: prefer admin context when on admin routes, otherwise passenger
  const activeRole = isOnAdminRoute && adminUser ? Role.OFFICIAL : 
                    passengerUser ? Role.PASSENGER :
                    adminUser ? Role.OFFICIAL : null;

  const isPassenger = activeRole === Role.PASSENGER;
  const isAdmin = activeRole === Role.OFFICIAL;
  const isGuest = !activeRole;

  const currentUser = isAdmin ? adminUser : isPassenger ? passengerUser : null;
  const logout = isAdmin ? adminLogout : isPassenger ? passengerLogout : () => {};

  const switchToPassenger = () => {
    if (passengerUser) {
      window.location.href = '/';
    } else {
      window.location.href = '/passenger-login';
    }
  };

  const switchToAdmin = () => {
    if (adminUser) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/admin-login';
    }
  };

  return {
    activeRole,
    isPassenger,
    isAdmin,
    isGuest,
    currentUser,
    logout,
    switchToPassenger,
    switchToAdmin
  };
};
