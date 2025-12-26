import {
  Role,
  type User,
  type UserContext,
  type SessionInfo,
  type UserPreferences,
  type UserDisplayInfo,
  type TaskSuggestion,
  type AccessibilitySettings,
} from "../types";

/**
 * Enhanced User Context Service - Provides user-aware functionality with session tracking and real-time updates
 */
export class UserContextService {
  private static contextSubscribers: Set<(context: UserContext) => void> =
    new Set();
  private static currentContext: UserContext | null = null;
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static contextUpdateInterval: NodeJS.Timeout | null = null;
  private static readonly CONTEXT_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static isInitialized = false;

  /**
   * Initialize the user context service with automatic refresh
   */
  static initialize(): void {
    if (this.isInitialized) return;

    // Start periodic context refresh
    this.startContextRefresh();

    // Listen for window focus to refresh context
    if (typeof window !== "undefined") {
      window.addEventListener("focus", this.handleWindowFocus.bind(this));
      window.addEventListener("storage", this.handleStorageChange.bind(this));
    }

    this.isInitialized = true;
  }

  /**
   * Start automatic context refresh interval
   */
  private static startContextRefresh(): void {
    if (this.contextUpdateInterval) {
      clearInterval(this.contextUpdateInterval);
    }

    this.contextUpdateInterval = setInterval(() => {
      if (this.currentContext && this.currentContext.isAuthenticated) {
        const refreshedContext = this.refreshContext();
        if (refreshedContext !== this.currentContext) {
          this.notifySubscribers(refreshedContext);
        }
      }
    }, this.CONTEXT_REFRESH_INTERVAL);
  }

  /**
   * Handle window focus event to refresh context
   */
  private static handleWindowFocus(): void {
    if (this.currentContext && this.currentContext.isAuthenticated) {
      this.refreshContext();
    }
  }

  /**
   * Handle localStorage changes from other tabs
   */
  private static handleStorageChange(event: StorageEvent): void {
    if (event.key === "railmadad_session") {
      // Session changed in another tab, refresh context
      this.currentContext = null;
      const newContext = this.getCurrentUserContext();
      this.notifySubscribers(newContext);
    }
  }

  /**
   * Stop context refresh and cleanup
   */
  static cleanup(): void {
    if (this.contextUpdateInterval) {
      clearInterval(this.contextUpdateInterval);
      this.contextUpdateInterval = null;
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("focus", this.handleWindowFocus.bind(this));
      window.removeEventListener(
        "storage",
        this.handleStorageChange.bind(this)
      );
    }

    this.contextSubscribers.clear();
    this.isInitialized = false;
  }

  /**
   * Get current user context from both passenger and admin auth systems
   */
  static getCurrentUserContext(
    passengerUser?: any,
    adminUser?: any
  ): UserContext {
    // Ensure service is initialized
    if (!this.isInitialized) {
      this.initialize();
    }

    // Return cached context if available and valid
    if (this.currentContext && this.validateSession(this.currentContext)) {
      this.updateLastActivity(this.currentContext);
      return this.currentContext;
    }

    // Determine active user based on current route and available sessions
    let activeUser: any = null;

    // Check URL to determine expected auth context
    const isOnAdminRoute =
      typeof window !== "undefined" &&
      (window.location.pathname.startsWith("/dashboard") ||
        window.location.pathname.startsWith("/admin"));

    if (isOnAdminRoute) {
      // STRICT ADMIN CONTEXT: Only look for admin users
      if (adminUser) {
        activeUser = adminUser;
      } else {
        // Fallback to local storage only for admin routes
        const adminSession = this.getAdminSession();
        if (adminSession) {
          activeUser = adminSession;
        }
      }
    } else {
      // STRICT PUBLIC CONTEXT: Only look for passenger users
      // Do NOT fallback to admin user to keep sessions "parallel" and separate
      if (passengerUser) {
        activeUser = passengerUser;
      } else {
        // Fallback to cookie for passenger routes (e.g. when called from services)
        const passengerSession = this.getPassengerSession();
        if (passengerSession) {
          activeUser = passengerSession;
        }
      }
    }

    // Create context based on active user
    let context: UserContext;
    if (activeUser) {
      context = this.createUserContext(activeUser);
    } else {
      context = this.createUnauthenticatedContext();
    }

    this.currentContext = context;
    this.notifySubscribers(context);
    return context;
  }

  /**
   * Subscribe to context changes for real-time updates
   */
  static subscribeToContextChanges(
    callback: (context: UserContext) => void
  ): () => void {
    // Ensure service is initialized
    if (!this.isInitialized) {
      this.initialize();
    }

    this.contextSubscribers.add(callback);

    // Immediately call with current context if available
    if (this.currentContext) {
      try {
        callback(this.currentContext);
      } catch (error) {
        console.error("Error in initial context callback:", error);
      }
    }

    // Return unsubscribe function
    return () => {
      this.contextSubscribers.delete(callback);
    };
  }

  /**
   * Update user preferences with validation and persistence
   */
  static updateUserPreferences(preferences: Partial<UserPreferences>): void {
    if (!this.currentContext) return;

    // Validate preference updates
    const validatedPreferences = this.validatePreferences(preferences);

    this.currentContext.preferences = {
      ...this.currentContext.preferences,
      ...validatedPreferences,
    };

    // Update session info
    if (this.currentContext.sessionInfo) {
      this.currentContext.sessionInfo.lastUpdate = new Date();
    }

    // Persist to localStorage if user is authenticated
    if (this.currentContext.isAuthenticated && this.currentContext.user) {
      this.persistUserPreferences(
        this.currentContext.user.id,
        this.currentContext.preferences
      );
    }

    this.notifySubscribers(this.currentContext);
  }

  /**
   * Validate user preference updates
   */
  private static validatePreferences(
    preferences: Partial<UserPreferences>
  ): Partial<UserPreferences> {
    const validated: Partial<UserPreferences> = {};

    if (
      preferences.language &&
      [
        "en",
        "hi",
        "ta",
        "te",
        "kn",
        "ml",
        "bn",
        "gu",
        "pa",
        "or",
        "as",
        "ur",
      ].includes(preferences.language)
    ) {
      validated.language = preferences.language;
    }

    if (typeof preferences.notifications === "boolean") {
      validated.notifications = preferences.notifications;
    }

    if (preferences.theme && ["light", "dark"].includes(preferences.theme)) {
      validated.theme = preferences.theme;
    }

    if (preferences.accessibility) {
      validated.accessibility = {
        screenReader: Boolean(preferences.accessibility.screenReader),
        highContrast: Boolean(preferences.accessibility.highContrast),
        largeText: Boolean(preferences.accessibility.largeText),
        keyboardNavigation: Boolean(
          preferences.accessibility.keyboardNavigation
        ),
        reducedMotion: Boolean(preferences.accessibility.reducedMotion),
      };
    }

    return validated;
  }

  /**
   * Persist user preferences to localStorage
   */
  private static persistUserPreferences(
    userId: string,
    preferences: UserPreferences
  ): void {
    try {
      const key = `railmadad_preferences_${userId}`;
      localStorage.setItem(key, JSON.stringify(preferences));
    } catch (error) {
      console.error("Failed to persist user preferences:", error);
    }
  }

  /**
   * Load user preferences from localStorage
   */
  private static loadUserPreferences(userId: string): UserPreferences | null {
    try {
      const key = `railmadad_preferences_${userId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load user preferences:", error);
    }
    return null;
  }

  /**
   * Validate session and check if it's expired
   */
  static validateSession(context: UserContext): boolean {
    if (!context.isAuthenticated || !context.sessionInfo) {
      return false;
    }

    const now = Date.now();
    const sessionAge = now - context.sessionInfo.loginTime.getTime();
    const lastActivityAge = now - context.lastActivity.getTime();

    // Check if session has expired
    if (sessionAge > this.SESSION_DURATION) {
      context.sessionInfo.isExpired = true;
      return false;
    }

    // Check if user has been inactive too long
    if (lastActivityAge > this.ACTIVITY_TIMEOUT) {
      return false;
    }

    return true;
  }

  /**
   * Handle session expiry with enhanced cleanup
   */
  static handleSessionExpiry(context: UserContext): void {
    if (context.sessionInfo) {
      context.sessionInfo.isExpired = true;
    }

    // Clear all session-related data
    localStorage.removeItem("railmadad_session");

    // Clear user preferences if they were stored
    if (context.user) {
      try {
        localStorage.removeItem(`railmadad_preferences_${context.user.id}`);
      } catch (error) {
        console.error("Error clearing user preferences:", error);
      }
    }

    // Create unauthenticated context
    const unauthenticatedContext = this.createUnauthenticatedContext();
    this.currentContext = unauthenticatedContext;
    this.notifySubscribers(unauthenticatedContext);
  }

  /**
   * Update last activity timestamp with debouncing
   */
  private static updateLastActivity(context: UserContext): void {
    const now = new Date();

    // Only update if more than 30 seconds have passed to avoid excessive updates
    const timeSinceLastUpdate = context.lastActivity
      ? now.getTime() - context.lastActivity.getTime()
      : Infinity;
    if (timeSinceLastUpdate < 30000) {
      return;
    }

    context.lastActivity = now;
    if (context.sessionInfo) {
      context.sessionInfo.lastUpdate = now;
    }

    // Update session count and interaction tracking
    if (context.user) {
      if (!context.user.totalChatInteractions) {
        context.user.totalChatInteractions = 0;
      }
      context.user.totalChatInteractions++;
    }
  }

  /**
   * Notify all subscribers of context changes
   */
  private static notifySubscribers(context: UserContext): void {
    this.contextSubscribers.forEach((callback) => {
      try {
        callback(context);
      } catch (error) {
        console.error("Error in context subscriber:", error);
      }
    });
  }

  /**
   * Get passenger session from cookie
   */
  private static getPassengerSession(): User | null {
    try {
      if (typeof document === "undefined") return null;

      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (name === "railmadad_session") {
          const sessionData = JSON.parse(decodeURIComponent(value));
          return sessionData;
        }
      }
      return null;
    } catch (error) {
      console.error("Error getting passenger session:", error);
      return null;
    }
  }

  /**
   * Get admin session from localStorage
   */
  private static getAdminSession(): User | null {
    try {
      const sessionData = localStorage.getItem("railmadad_session");
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        return null;
      }

      return session.user;
    } catch (error) {
      console.error("Error getting admin session:", error);
      return null;
    }
  }

  /**
   * Create user context for authenticated user with enhanced session tracking
   */
  private static createUserContext(user: User): UserContext {
    const capabilities = this.getUserCapabilities(user.role);
    const now = new Date();

    // Generate session ID if not exists
    const sessionId = user.currentSessionId || this.generateSessionId();

    // Update user session tracking
    if (!user.sessionCount) {
      user.sessionCount = 0;
    }
    user.sessionCount++;
    user.currentSessionId = sessionId;
    user.lastLoginAt = now;

    const sessionInfo: SessionInfo = {
      sessionId,
      loginTime: user.lastLoginAt || now,
      lastUpdate: now,
      authMethod: user.role === Role.PASSENGER ? "google" : "admin",
      isExpired: false,
    };

    // Load user preferences or use defaults
    let preferences: UserPreferences = {
      language: user.preferredLanguage || "en",
      notifications: true,
      theme: "light",
      accessibility: {
        screenReader: false,
        highContrast: false,
        largeText: false,
        keyboardNavigation: false,
        reducedMotion: false,
      },
    };

    // Try to load saved preferences
    const savedPreferences = this.loadUserPreferences(user.id);
    if (savedPreferences) {
      preferences = { ...preferences, ...savedPreferences };
    }

    return {
      user,
      isAuthenticated: true,
      role: user.role,
      capabilities,
      preferences,
      sessionInfo,
      lastActivity: now,
    };
  }

  /**
   * Create context for unauthenticated user
   */
  private static createUnauthenticatedContext(): UserContext {
    const now = new Date();
    const sessionId = this.generateSessionId();

    const sessionInfo: SessionInfo = {
      sessionId,
      loginTime: now,
      lastUpdate: now,
      authMethod: "email", // Default for unauthenticated
      isExpired: false,
    };

    const preferences: UserPreferences = {
      language: "en",
      notifications: false,
      theme: "light",
      accessibility: {
        screenReader: false,
        highContrast: false,
        largeText: false,
        keyboardNavigation: false,
        reducedMotion: false,
      },
    };

    return {
      user: null,
      isAuthenticated: false,
      role: null,
      capabilities: ["view_info", "submit_complaint"],
      preferences,
      sessionInfo,
      lastActivity: now,
    };
  }

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get user capabilities based on role
   */
  static getUserCapabilities(role: Role): string[] {
    switch (role) {
      case Role.PASSENGER:
        return [
          "submit_complaint",
          "view_own_complaints",
          "edit_own_complaints",
          "withdraw_complaints",
          "view_info",
          "get_help",
        ];

      case Role.OFFICIAL:
        return [
          "view_all_complaints",
          "update_complaint_status",
          "assign_complaints",
          "add_admin_notes",
          "resolve_complaints",
          "view_analytics",
          "manage_users",
          "view_info",
          "get_help",
        ];

      case Role.MODERATOR:
        return [
          "view_all_complaints",
          "update_complaint_status",
          "add_admin_notes",
          "resolve_complaints",
          "view_info",
          "get_help",
        ];

      case Role.SUPER_ADMIN:
        return [
          "view_all_complaints",
          "update_complaint_status",
          "assign_complaints",
          "add_admin_notes",
          "resolve_complaints",
          "view_analytics",
          "manage_users",
          "manage_admins",
          "system_settings",
          "view_system_logs",
          "export_data",
          "view_info",
          "get_help",
        ];

      default:
        return ["view_info", "submit_complaint"];
    }
  }

  /**
   * Get role-specific greeting message
   */
  static getRoleGreeting(userContext: UserContext): string {
    if (!userContext.isAuthenticated || !userContext.user) {
      return "Hello! I'm your RailMadad AI Assistant - a smart, helpful companion designed to assist you with all railway-related queries and concerns. Whether you need help with train information, station details, or want to report an issue, I'm here to help make your railway experience better. How can I assist you today?";
    }

    const { user, role } = userContext;
    const timeOfDay = this.getTimeOfDay();

    switch (role) {
      case Role.PASSENGER:
        return `${timeOfDay}, ${user.fullName}! 🚂 Welcome back to RailMadad.

I'm your RailMadad AI Assistant - your dedicated companion for all railway-related queries and concerns. I'm here to make your train journey experience smoother and help resolve any issues you might encounter.

Feel free to share your railway concerns, ask about train schedules, or let me know how I can assist you today!`;

      case Role.OFFICIAL:
        return `${timeOfDay}, ${user.fullName}! 👨‍💼 Welcome to your RailMadad Admin Dashboard. I can assist you with:

• **Review complaints** assigned to your department
• **Update complaint status** and add resolution notes
• **View analytics** and complaint trends
• **Manage passenger queries** and provide information
• **Access railway information** and policies

How can I help you manage complaints today?`;

      case Role.MODERATOR:
        return `${timeOfDay}, ${user.fullName}! 🛡️ Welcome to the Moderator Dashboard. I can assist you with:

• **Reviewing complaints** for content and validity
• **Updating complaint status** and adding notes
• **Moderating user suggestions** and feedback
• **Ensuring quality** of responses and resolutions

How can I help you moderate today?`;

      case Role.SUPER_ADMIN:
        return `${timeOfDay}, ${user.fullName}! 🔧 Welcome to RailMadad Super Admin Console. I have full system access to help you:

• **Monitor all complaints** across the system
• **Manage user accounts** and admin permissions
• **View system analytics** and performance metrics
• **Configure system settings** and policies
• **Export data** and generate reports
• **Handle escalated issues** and critical complaints

What administrative task can I assist you with?`;

      default:
        return `${timeOfDay}, ${user.fullName}! How can I assist you with RailMadad today?`;
    }
  }

  /**
   * Get appropriate time-based greeting
   */
  private static getTimeOfDay(): string {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    } else if (hour < 17) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  }

  /**
   * Get role-specific task suggestions
   */
  static getRoleTaskSuggestions(userContext: UserContext): TaskSuggestion[] {
    if (!userContext.isAuthenticated || !userContext.role) {
      return [
        {
          id: "submit_complaint",
          title: "Submit a Complaint",
          description: "Report train or station issues",
          action: "submit_complaint",
          icon: "📝",
          requiredCapability: "submit_complaint",
        },
        {
          id: "get_train_info",
          title: "Train Information",
          description: "Get train schedules and details",
          action: "get_train_info",
          icon: "🚂",
          requiredCapability: "view_info",
        },
        {
          id: "station_facilities",
          title: "Station Facilities",
          description: "Find station amenities and services",
          action: "station_facilities",
          icon: "🏢",
          requiredCapability: "view_info",
        },
      ];
    }

    switch (userContext.role) {
      case Role.PASSENGER:
        return [
          {
            id: "submit_complaint",
            title: "Submit New Complaint",
            description: "Report a new issue or problem",
            action: "submit_complaint",
            icon: "📝",
            requiredCapability: "submit_complaint",
          },
          {
            id: "check_status",
            title: "Check Complaint Status",
            description: "View status of your complaints",
            action: "check_status",
            icon: "📊",
            requiredCapability: "view_own_complaints",
          },
          {
            id: "train_info",
            title: "Train Information",
            description: "Get train schedules and details",
            action: "train_info",
            icon: "🚂",
            requiredCapability: "view_info",
          },
          {
            id: "station_facilities",
            title: "Station Facilities",
            description: "Find station amenities",
            action: "station_facilities",
            icon: "🏢",
            requiredCapability: "view_info",
          },
        ];

      case Role.OFFICIAL:
        return [
          {
            id: "review_complaints",
            title: "Review Complaints",
            description: "Review pending complaints in your department",
            action: "review_complaints",
            icon: "📋",
            requiredCapability: "view_all_complaints",
          },
          {
            id: "update_status",
            title: "Update Status",
            description: "Update complaint status and add notes",
            action: "update_status",
            icon: "✏️",
            requiredCapability: "update_complaint_status",
          },
          {
            id: "view_analytics",
            title: "View Analytics",
            description: "View department performance metrics",
            action: "view_analytics",
            icon: "📈",
            requiredCapability: "view_analytics",
          },
          {
            id: "manage_users",
            title: "Manage Users",
            description: "Manage user accounts and permissions",
            action: "manage_users",
            icon: "👥",
            requiredCapability: "manage_users",
          },
        ];

      case Role.MODERATOR:
        return [
          {
            id: "review_complaints",
            title: "Review Complaints",
            description: "Review pending complaints",
            action: "review_complaints",
            icon: "📋",
            requiredCapability: "view_all_complaints",
          },
          {
            id: "update_status",
            title: "Update Status",
            description: "Update complaint status",
            action: "update_status",
            icon: "✏️",
            requiredCapability: "update_complaint_status",
          },
        ];

      case Role.SUPER_ADMIN:
        return [
          {
            id: "system_monitor",
            title: "System Monitoring",
            description: "Monitor system-wide complaints and performance",
            action: "system_monitor",
            icon: "🖥️",
            requiredCapability: "view_system_logs",
          },
          {
            id: "user_management",
            title: "User Management",
            description: "Manage all user accounts and roles",
            action: "user_management",
            icon: "👥",
            requiredCapability: "manage_users",
          },
          {
            id: "system_analytics",
            title: "System Analytics",
            description: "View comprehensive system analytics",
            action: "system_analytics",
            icon: "📊",
            requiredCapability: "view_analytics",
          },
          {
            id: "system_settings",
            title: "System Configuration",
            description: "Configure system settings and policies",
            action: "system_settings",
            icon: "⚙️",
            requiredCapability: "system_settings",
          },
        ];

      default:
        return [
          {
            id: "get_info",
            title: "Get Information",
            description: "Get railway information and help",
            action: "get_info",
            icon: "ℹ️",
            requiredCapability: "view_info",
          },
        ];
    }
  }

  /**
   * Check if user has specific capability
   */
  static hasCapability(userContext: UserContext, capability: string): boolean {
    return userContext.capabilities.includes(capability);
  }

  /**
   * Get role-specific system prompt additions
   */
  static getRoleSystemPrompt(userContext: UserContext): string {
    if (!userContext.isAuthenticated || !userContext.user) {
      return `
USER CONTEXT: Unauthenticated visitor
CAPABILITIES: Can submit complaints, view general information
APPROACH: Be helpful and guide them through complaint submission or information requests. Encourage them to register for better tracking of complaints.`;
    }

    const { user, role } = userContext;

    switch (role) {
      case Role.PASSENGER:
        return `
USER CONTEXT: Authenticated Passenger - ${user.fullName} (${user.email})
ROLE: Railway Passenger
CAPABILITIES: Submit complaints, view own complaints, get information, provide feedback
APPROACH: 
- Be empathetic and helpful with their railway issues
- Guide them through complaint submission with proper details
- Help them track existing complaints
- Provide accurate railway information
- Use a friendly, supportive tone`;

      case Role.OFFICIAL:
        return `
USER CONTEXT: Authenticated Railway Official - ${user.fullName} (${user.email})
ROLE: Railway Official (${user.department || "Customer Service"})
EMPLOYEE ID: ${user.employeeId || "N/A"}
STATION: ${user.stationCode || "N/A"} | ZONE: ${user.zone || "N/A"}
CAPABILITIES: Review complaints, update status, manage passenger queries, access analytics
APPROACH:
- Use professional, efficient communication
- Help them manage complaints effectively
- Provide administrative guidance and policy information
- Focus on resolution and customer service excellence
- Use formal but approachable tone`;

      case Role.MODERATOR:
        return `
USER CONTEXT: Authenticated Moderator - ${user.fullName} (${user.email})
ROLE: Moderator
EMPLOYEE ID: ${user.employeeId || "N/A"}
CAPABILITIES: Review complaints, update status, moderate content
APPROACH:
- Use professional, neutral communication
- Focus on content quality and validity
- Ensure complaints are categorized correctly
- Maintain high standards for resolution notes`;

      case Role.SUPER_ADMIN:
        return `
USER CONTEXT: Authenticated Super Administrator - ${user.fullName} (${
          user.email
        })
ROLE: System Super Administrator
EMPLOYEE ID: ${user.employeeId || "ADMIN"}
CAPABILITIES: Full system access, user management, system configuration, analytics, escalation handling
APPROACH:
- Use authoritative, professional communication
- Provide comprehensive system insights and management guidance
- Help with complex administrative tasks and system oversight
- Focus on system efficiency and strategic decision support
- Use formal, executive-level tone`;

      default:
        return `
USER CONTEXT: Authenticated User - ${user.fullName}
APPROACH: Provide helpful assistance based on their needs.`;
    }
  }

  /**
   * Format user info for display
   */
  static formatUserInfo(userContext: UserContext): string {
    if (!userContext.isAuthenticated || !userContext.user) {
      return "Guest User";
    }

    const { user } = userContext;
    let info = `${user.fullName} (${user.role})`;

    if (user.employeeId) {
      info += ` - ID: ${user.employeeId}`;
    }

    if (user.department) {
      info += ` - ${user.department}`;
    }

    return info;
  }

  /**
   * Format user display information with enhanced details
   */
  static formatUserDisplayInfo(userContext: UserContext): UserDisplayInfo {
    if (!userContext.isAuthenticated || !userContext.user) {
      return {
        displayName: "Guest User",
        roleLabel: "Visitor",
        statusIndicator: "offline",
      };
    }

    const { user } = userContext;
    const roleLabels = {
      [Role.PASSENGER]: "Passenger",
      [Role.OFFICIAL]: "Railway Official",
      [Role.MODERATOR]: "Moderator",
      [Role.SUPER_ADMIN]: "Super Administrator",
    };

    let departmentInfo = "";
    if (user.department) {
      departmentInfo = user.department;
      if (user.stationCode) {
        departmentInfo += ` - ${user.stationCode}`;
      }
      if (user.zone) {
        departmentInfo += ` (${user.zone})`;
      }
    }

    let stationInfo = "";
    if (user.stationCode) {
      stationInfo = user.stationCode;
      if (user.zone) {
        stationInfo += ` - ${user.zone} Zone`;
      }
    }

    return {
      displayName: user.fullName || user.email,
      roleLabel: roleLabels[user.role] || user.role,
      departmentInfo: departmentInfo || undefined,
      stationInfo: stationInfo || undefined,
      avatarUrl: user.profilePicture,
      statusIndicator: this.validateSession(userContext) ? "online" : "away",
    };
  }

  /**
   * Get authentication prompt for unauthenticated users
   */
  static getAuthenticationPrompt(): string {
    return `Welcome to RailMadad! 🚂

To provide you with personalized assistance and track your complaints effectively, please log in with your Google account.

**Benefits of logging in:**
• Track your complaint status in real-time
• Access your complaint history
• Receive personalized assistance
• Get priority support for urgent issues

Click the login button to get started with Google authentication.`;
  }

  /**
   * Check if user should see a specific feature
   */
  static shouldShowFeature(userContext: UserContext, feature: string): boolean {
    return userContext.capabilities.includes(feature);
  }

  /**
   * Get role-specific capabilities
   */
  static getRoleCapabilities(role: Role): string[] {
    return this.getUserCapabilities(role);
  }

  /**
   * Update user context with new information and validation
   */
  static updateUserContext(updates: Partial<UserContext>): void {
    if (!this.currentContext) return;

    // Validate updates to prevent invalid state
    const validatedUpdates = this.validateContextUpdates(updates);

    const previousContext = { ...this.currentContext };

    this.currentContext = {
      ...this.currentContext,
      ...validatedUpdates,
      lastActivity: new Date(),
    };

    if (this.currentContext.sessionInfo) {
      this.currentContext.sessionInfo.lastUpdate = new Date();
    }

    // Only notify if context actually changed
    if (this.hasContextChanged(previousContext, this.currentContext)) {
      this.notifySubscribers(this.currentContext);
    }
  }

  /**
   * Validate context updates to prevent invalid state
   */
  private static validateContextUpdates(
    updates: Partial<UserContext>
  ): Partial<UserContext> {
    const validated: Partial<UserContext> = {};

    // Validate and copy allowed updates
    if (updates.preferences) {
      validated.preferences = updates.preferences;
    }

    if (updates.lastActivity) {
      validated.lastActivity = updates.lastActivity;
    }

    if (updates.capabilities) {
      validated.capabilities = updates.capabilities;
    }

    // Note: We don't allow updating user, isAuthenticated, role, or sessionInfo directly
    // These should be updated through proper authentication flows

    return validated;
  }

  /**
   * Check if context has meaningfully changed
   */
  private static hasContextChanged(
    previous: UserContext,
    current: UserContext
  ): boolean {
    // Compare key fields that would trigger UI updates
    return (
      previous.isAuthenticated !== current.isAuthenticated ||
      previous.role !== current.role ||
      JSON.stringify(previous.capabilities) !==
        JSON.stringify(current.capabilities) ||
      JSON.stringify(previous.preferences) !==
        JSON.stringify(current.preferences)
    );
  }

  /**
   * Refresh user context and validate session
   */
  static refreshContext(): UserContext {
    const context = this.getCurrentUserContext();

    if (!this.validateSession(context)) {
      this.handleSessionExpiry(context);
      return this.getCurrentUserContext();
    }

    return context;
  }

  /**
   * Clear current context (for logout)
   */
  static clearContext(): void {
    this.currentContext = null;
    localStorage.removeItem("railmadad_session");

    const unauthenticatedContext = this.createUnauthenticatedContext();
    this.notifySubscribers(unauthenticatedContext);
  }

  /**
   * Get cached context without validation (for performance)
   */
  static getCachedContext(): UserContext | null {
    return this.currentContext;
  }

  /**
   * Force refresh context from external sources
   */
  static forceRefresh(passengerUser?: any, adminUser?: any): UserContext {
    this.currentContext = null;
    return this.getCurrentUserContext(passengerUser, adminUser);
  }

  /**
   * Update context with current auth state from providers
   */
  static updateWithAuthProviders(
    passengerUser: any,
    adminUser: any
  ): UserContext {
    // Force refresh with current auth state
    return this.forceRefresh(passengerUser, adminUser);
  }

  /**
   * Get context update statistics for debugging
   */
  static getContextStats(): {
    subscriberCount: number;
    isInitialized: boolean;
    hasActiveContext: boolean;
    sessionAge?: number;
    lastActivity?: number;
  } {
    const stats = {
      subscriberCount: this.contextSubscribers.size,
      isInitialized: this.isInitialized,
      hasActiveContext: this.currentContext !== null,
    };

    if (this.currentContext && this.currentContext.sessionInfo) {
      const now = Date.now();
      return {
        ...stats,
        sessionAge: now - this.currentContext.sessionInfo.loginTime.getTime(),
        lastActivity: now - this.currentContext.lastActivity.getTime(),
      };
    }

    return stats;
  }

  /**
   * Set user context directly (for testing or special cases)
   */
  static setUserContext(user: User | null): void {
    if (user) {
      const context = this.createUserContext(user);
      this.currentContext = context;
      this.notifySubscribers(context);
    } else {
      this.clearContext();
    }
  }
}
