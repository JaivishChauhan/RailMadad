import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { User, Role } from "../types";

interface AdminAuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined
);

// Predefined admin credentials
const ADMIN_CREDENTIALS = {
  "test.admin@railmadad.demo": {
    password: "admin123",
    user: {
      id: "admin_001",
      email: "test.admin@railmadad.demo",
      fullName: "Test Railway Official",
      role: Role.OFFICIAL,
      phone: "+91-9876543211",
      employeeId: "TEST001",
      department: "Customer Service",
      stationCode: "NDLS",
      zone: "NR",
    },
  },
  "super.admin@railmadad.demo": {
    password: "super123",
    user: {
      id: "admin_002",
      email: "super.admin@railmadad.demo",
      fullName: "Super Administrator",
      role: Role.SUPER_ADMIN,
      phone: "+91-9876543212",
      employeeId: "SUPER001",
      department: "System Administration",
      stationCode: "HQ",
      zone: "HQ",
    },
  },
  "test.moderator@railmadad.demo": {
    password: "mod123",
    user: {
      id: "moderator-001",
      email: "test.moderator@railmadad.demo",
      fullName: "Test Moderator",
      role: Role.MODERATOR,
      phone: "+91-9876543213",
      employeeId: "MOD001",
      department: "Content Moderation",
      stationCode: "HQ",
      zone: "HQ",
    },
  },
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Debug user state changes
  useEffect(() => {
    console.log("👤 Admin user state changed:", user ? user.email : "null");
  }, [user]);

  // Initialize from localStorage on mount
  useEffect(() => {
    console.log("🔄 AdminAuthProvider initializing...");
    try {
      const storedUser = localStorage.getItem("railmadad_admin_auth");
      console.log("🔍 Stored user data:", storedUser ? "found" : "not found");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log("✅ Admin session restored:", userData.email);
      } else {
        console.log("📍 No existing admin session found");
      }
    } catch (error) {
      console.error("❌ Error restoring admin session:", error);
      localStorage.removeItem("railmadad_admin_auth");
    } finally {
      setLoading(false);
      console.log("🔄 AdminAuthProvider initialization complete");
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      console.log("🔑 Admin login attempt:", email);
      console.log("🔍 Available credentials:", Object.keys(ADMIN_CREDENTIALS));

      const credential =
        ADMIN_CREDENTIALS[email as keyof typeof ADMIN_CREDENTIALS];

      if (!credential) {
        console.log("❌ Email not found in credentials");
        return false;
      }

      if (credential.password !== password) {
        console.log("❌ Password mismatch for email:", email);
        return false;
      }

      // Store user in state and localStorage
      console.log("💾 Storing user in state and localStorage...");
      setUser(credential.user);
      localStorage.setItem(
        "railmadad_admin_auth",
        JSON.stringify(credential.user)
      );

      // Verify storage
      const verification = localStorage.getItem("railmadad_admin_auth");
      console.log(
        "🔍 Storage verification:",
        verification ? "success" : "failed"
      );

      console.log("✅ Admin login successful:", email);
      console.log("✅ User stored:", credential.user);
      return true;
    },
    []
  );

  const logout = useCallback(() => {
    console.log("🚺 Admin logout");
    setUser(null);
    localStorage.removeItem("railmadad_admin_auth");
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
    }),
    [user, loading, login, logout]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
};
