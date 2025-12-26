import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { Role } from '../types';

// Local authentication for admin users (demo mode)
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  signUp: (email: string, password: string, fullName: string, employeeId?: string, department?: string) => Promise<User | null>;
}

const AdminAuthContext = createContext<AuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    console.log('🔄 Setting up local admin auth...');
    const sessionData = localStorage.getItem('railmadad_admin_session');
    if (sessionData) {
      try {
        const userData = JSON.parse(sessionData);
        console.log('📍 Found existing admin session for:', userData.email);
        setUser(userData);
      } catch (error) {
        console.error('❌ Error parsing admin session:', error);
        localStorage.removeItem('railmadad_admin_session');
      }
    } else {
      console.log('📍 No existing admin session');
    }
    setLoading(false);
    console.log('✅ Local admin authentication setup complete.');
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    console.log('🔑 Attempting local admin login for:', email);
    
    // Check against preset admin credentials
    const validCredentials = [
      { email: 'test.admin@railmadad.demo', password: 'admin123', role: Role.OFFICIAL },
      { email: 'super.admin@railmadad.demo', password: 'super123', role: Role.SUPER_ADMIN }
    ];

    const validAdmin = validCredentials.find(cred => 
      cred.email === email && cred.password === password
    );

    if (!validAdmin) {
      console.log('❌ Invalid admin credentials');
      throw new Error('Invalid credentials');
    }

    const adminUser: User = {
      id: `admin_${Date.now()}`,
      email: validAdmin.email,
      fullName: validAdmin.role === Role.SUPER_ADMIN ? 'Super Administrator' : 'Test Railway Official',
      role: validAdmin.role,
      phone: '+91-9876543211',
      employeeId: validAdmin.role === Role.SUPER_ADMIN ? 'SUPER001' : 'TEST001',
      department: validAdmin.role === Role.SUPER_ADMIN ? 'System Administration' : 'Customer Service',
      stationCode: validAdmin.role === Role.SUPER_ADMIN ? 'HQ' : 'NDLS',
      zone: validAdmin.role === Role.SUPER_ADMIN ? 'HQ' : 'NR'
    };

    // Store in localStorage for persistence
    localStorage.setItem('railmadad_admin_session', JSON.stringify(adminUser));
    setUser(adminUser);
    
    console.log('✅ Local admin login successful:', adminUser.email);
    return adminUser;
  }, []);

  const logout = useCallback(() => {
    console.log('🚪 Admin logout');
    localStorage.removeItem('railmadad_admin_session');
    setUser(null);
  }, []);

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    fullName: string, 
    employeeId?: string, 
    department?: string
  ): Promise<User | null> => {
    console.log('📝 Admin signup not implemented in local mode');
    throw new Error('Admin signup not available in demo mode');
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    signUp
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};
