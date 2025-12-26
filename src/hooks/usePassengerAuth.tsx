import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { localAuth } from '../lib/localDatabase';
import { User, Role } from '../types';

interface PassengerAuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, fullName: string, phone?: string) => Promise<boolean>;
  logout: () => void;
}

const PassengerAuthContext = createContext<PassengerAuthContextType | undefined>(undefined);

export const PassengerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Create user profile from local auth user
  const createUserProfile = (authUser: any): User => {
    return {
      id: authUser.id,
      email: authUser.email,
      fullName: authUser.full_name || authUser.email?.split('@')[0] || 'User',
      role: Role.PASSENGER,
      phone: authUser.phone
    };
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('🔄 Initializing passenger auth (localStorage)...');
        const { user: storedUser } = await localAuth.getSession();
        
        if (storedUser && mounted) {
          console.log('📍 Found existing passenger session:', storedUser.email);
          const userData = createUserProfile(storedUser);
          setUser(userData);
          console.log('✅ Passenger session restored:', userData.email);
        } else {
          console.log('📍 No existing passenger session');
        }
      } catch (error) {
        console.error('❌ Error initializing passenger auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('✅ Passenger auth initialization complete');
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = localAuth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Passenger auth state change:', event, session?.user?.email);
        
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          const userData = createUserProfile(session.user);
          setUser(userData);
          console.log('✅ Passenger signed in:', userData.email);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          console.log('🚪 Passenger signed out');
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔑 Passenger login attempt:', email);
      
      const { user: authUser, error } = await localAuth.signInWithPassword(email, password);

      if (error) {
        console.error('❌ Passenger login error:', error.message);
        return false;
      }

      if (authUser) {
        const userData = createUserProfile(authUser);
        setUser(userData);
        console.log('✅ Passenger login successful:', email);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Passenger login error:', error);
      return false;
    }
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<void> => {
    // Google OAuth not available in local mode - show message
    console.warn('⚠️ Google OAuth not available in local mode. Please use email/password login.');
    throw new Error('Google OAuth not available in local mode. Please use email/password login or sign up first.');
  }, []);

  const signup = useCallback(async (email: string, password: string, fullName: string, phone?: string): Promise<boolean> => {
    try {
      console.log('📝 Passenger signup attempt:', email);
      
      const { user: authUser, error } = await localAuth.signUp(email, password, {
        full_name: fullName,
        phone: phone
      });

      if (error) {
        console.error('❌ Passenger signup error:', error.message);
        return false;
      }

      if (authUser) {
        const userData = createUserProfile(authUser);
        setUser(userData);
        console.log('✅ Passenger signup successful:', email);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Passenger signup error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('🚪 Passenger logout');
      await localAuth.signOut();
      setUser(null);
    } catch (error) {
      console.error('❌ Passenger logout error:', error);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    loginWithGoogle,
    signup,
    logout
  }), [user, loading, login, loginWithGoogle, signup, logout]);

  return (
    <PassengerAuthContext.Provider value={value}>
      {children}
    </PassengerAuthContext.Provider>
  );
};

export const usePassengerAuth = () => {
  const context = useContext(PassengerAuthContext);
  if (context === undefined) {
    throw new Error('usePassengerAuth must be used within PassengerAuthProvider');
  }
  return context;
};
