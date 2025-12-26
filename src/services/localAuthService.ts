import { Role } from "../types";
import type { User } from "../types";

// Built-in demo users (protected)
const LOCAL_USERS: User[] = [
  {
    id: "passenger-001",
    email: "test.passenger@railmadad.demo",
    password: "demo123", // In real app, this would be hashed
    role: Role.PASSENGER,
    fullName: "Test Passenger",
    phone: "+91-9876543210",
  },
  {
    id: "admin-001",
    email: "test.admin@railmadad.demo",
    password: "admin123", // In real app, this would be hashed
    role: Role.OFFICIAL,
    fullName: "Test Railway Official",
    phone: "+91-9876543211",
    employeeId: "TEST001",
    department: "Customer Service",
    stationCode: "NDLS",
    zone: "NR",
  },
  {
    id: "super-admin-001",
    email: "super.admin@railmadad.demo",
    password: "super123", // In real app, this would be hashed
    role: Role.SUPER_ADMIN,
    fullName: "Super Administrator",
    phone: "+91-9876543212",
    employeeId: "SUPER001",
    department: "System Administration",
    stationCode: "HQ",
    zone: "HQ",
  },
  {
    id: "moderator-001",
    email: "test.moderator@railmadad.demo",
    password: "mod123", // In real app, this would be hashed
    role: Role.MODERATOR,
    fullName: "Test Moderator",
    phone: "+91-9876543213",
    employeeId: "MOD001",
    department: "Content Moderation",
    stationCode: "HQ",
    zone: "HQ",
  },
];

// Session storage keys
const SESSION_KEY = "railmadad_session";
const CUSTOM_USERS_KEY = "railmadad_custom_users";
const PREDEFINED_IDS = new Set<string>([
  "passenger-001",
  "admin-001",
  "super-admin-001",
  "moderator-001",
]);

// ----- Persistence helpers for custom users (created by the user) -----
function loadCustomUsers(): User[] {
  try {
    const raw = localStorage.getItem(CUSTOM_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as User[];
    // Ensure reasonable defaults; don't trust stored shapes blindly
    return Array.isArray(parsed)
      ? parsed.filter(
          (u) => u && typeof u.id === "string" && typeof u.email === "string"
        )
      : [];
  } catch {
    return [];
  }
}

function saveCustomUsers(users: User[]) {
  try {
    localStorage.setItem(CUSTOM_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("Failed to persist custom users to localStorage:", e);
  }
}

function getAllUsersInternal(): User[] {
  // Combine protected built-ins with persisted custom users
  const custom = loadCustomUsers();
  return [...LOCAL_USERS, ...custom];
}

export interface LocalAuthSession {
  user: User;
  timestamp: number;
  expiresAt: number; // For session timeout (24 hours)
}

/**
 * Local authentication service - handles login/logout without Supabase auth
 */
export class LocalAuthService {
  /**
   * Authenticate user with email and password
   */
  static login(email: string, password: string): User | null {
    const user = getAllUsersInternal().find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      // Create session
      const session: LocalAuthSession = {
        user: { ...user, password: undefined }, // Don't store password in session
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      // Store in localStorage
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      console.log("✅ Local login successful:", user.email);
      return { ...user, password: undefined };
    }

    console.log("❌ Local login failed:", email);
    return null;
  }

  /**
   * Register a new user (add to local database)
   */
  static register(userData: Omit<User, "id">): User | null {
    // Check if user already exists
    const existingUser = getAllUsersInternal().find(
      (u) => u.email === userData.email
    );
    if (existingUser) {
      console.log("❌ User already exists:", userData.email);
      return null;
    }

    // Generate new user ID
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    // Persist to custom users store
    const custom = loadCustomUsers();
    custom.push(newUser);
    saveCustomUsers(custom);

    // Auto-login after registration
    return this.login(userData.email, userData.password || "");
  }

  /**
   * Get current session from localStorage
   */
  static getCurrentSession(): User | null {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY);
      if (!sessionData) return null;

      const session: LocalAuthSession = JSON.parse(sessionData);

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        this.logout();
        return null;
      }

      return session.user;
    } catch (error) {
      console.error("Error getting session:", error);
      this.logout();
      return null;
    }
  }

  /**
   * Logout - clear session
   */
  static logout(): void {
    localStorage.removeItem(SESSION_KEY);
    console.log("✅ Logged out successfully");
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return this.getCurrentSession() !== null;
  }

  /**
   * Refresh session (extend expiry)
   */
  static refreshSession(): boolean {
    const currentUser = this.getCurrentSession();
    if (!currentUser) return false;

    const session: LocalAuthSession = {
      user: currentUser,
      timestamp: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  }

  /**
   * Get user by ID (for complaints references)
   */
  static getUserById(id: string): User | null {
    const user = getAllUsersInternal().find((u) => u.id === id);
    return user ? { ...user, password: undefined } : null;
  }

  /**
   * Update user profile
   */
  static updateUser(userId: string, updates: Partial<User>): User | null {
    // First try updating in custom users (persisted)
    const custom = loadCustomUsers();
    const cIdx = custom.findIndex((u) => u.id === userId);
    if (cIdx !== -1) {
      custom[cIdx] = { ...custom[cIdx], ...updates };
      saveCustomUsers(custom);
    } else {
      // Fallback: update in-memory built-in (allowed but not persisted across reloads)
      const userIndex = LOCAL_USERS.findIndex((u) => u.id === userId);
      if (userIndex === -1) return null;
      LOCAL_USERS[userIndex] = { ...LOCAL_USERS[userIndex], ...updates };
    }

    // Update session if it's the current user
    const currentUser = this.getCurrentSession();
    if (currentUser && currentUser.id === userId) {
      const session: LocalAuthSession = {
        user: { ...(this.getUserById(userId) as User), password: undefined },
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    return this.getUserById(userId);
  }

  /**
   * Get all users (for admin purposes)
   */
  static getAllUsers(): User[] {
    return getAllUsersInternal().map((u) => ({ ...u, password: undefined }));
  }

  /**
   * Delete a user locally (demo only)
   */
  static deleteUser(userId: string): boolean {
    // Disallow deletion of predefined demo accounts
    if (PREDEFINED_IDS.has(userId)) return false;
    // Remove from persisted custom users
    const custom = loadCustomUsers();
    const idx = custom.findIndex((u) => u.id === userId);
    if (idx === -1) return false;
    custom.splice(idx, 1);
    saveCustomUsers(custom);
    // If deleting current session user, log them out
    const current = this.getCurrentSession();
    if (current && current.id === userId) {
      this.logout();
    }
    return true;
  }

  /**
   * Check if email exists
   */
  static emailExists(email: string): boolean {
    return getAllUsersInternal().some((u) => u.email === email);
  }

  /**
   * Whether the user is a protected built-in demo user
   */
  static isProtectedUser(userId: string): boolean {
    return PREDEFINED_IDS.has(userId);
  }
}

/**
 * Initialize local auth service
 */
export const initializeLocalAuth = () => {
  console.log("🔧 Local authentication service initialized");
  console.log("📝 Available test accounts:");
  LOCAL_USERS.forEach((user) => {
    console.log(`   ${user.role}: ${user.email} / ${user.password}`);
  });
};
