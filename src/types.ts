export enum Role {
  PASSENGER = "PASSENGER",
  OFFICIAL = "OFFICIAL",
  SUPER_ADMIN = "SUPER_ADMIN",
  MODERATOR = "MODERATOR",
}

export interface User {
  id: string;
  email: string;
  password?: string; // Should be hashed in a real app
  role: Role;
  fullName?: string;
  phone?: string;
  // Additional fields for officials
  employeeId?: string;
  department?: string;
  stationCode?: string;
  zone?: string;
  // Enhanced fields for user awareness
  profilePicture?: string;
  lastLoginAt?: Date;
  preferredLanguage?: string;
  timezone?: string;
  // Session tracking
  currentSessionId?: string;
  sessionCount?: number;
  totalChatInteractions?: number;
  permissions?: string[];
}

// Session information interface
export interface SessionInfo {
  sessionId: string;
  loginTime: Date;
  lastUpdate: Date;
  authMethod: "google" | "email" | "admin";
  isExpired: boolean;
  // Enhanced session tracking
  ipAddress?: string;
  userAgent?: string;
  refreshCount?: number;
}

// User preferences interface
export interface UserPreferences {
  language: string;
  notifications: boolean;
  theme?: "light" | "dark";
  accessibility?: AccessibilitySettings;
}

// Accessibility settings interface
export interface AccessibilitySettings {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  reducedMotion: boolean;
}

// User display information interface
export interface UserDisplayInfo {
  displayName: string;
  roleLabel: string;
  departmentInfo?: string;
  stationInfo?: string;
  avatarUrl?: string;
  statusIndicator: "online" | "away" | "offline";
}

// Enhanced UserContext interface with session tracking and real-time updates
export interface UserContext {
  user: User | null;
  isAuthenticated: boolean;
  role: Role | null;
  capabilities: string[];
  preferences: UserPreferences;
  sessionInfo: SessionInfo;
  lastActivity: Date;
}

// Task suggestion interface
export interface TaskSuggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  icon: string;
  requiredCapability?: string;
}

export enum Status {
  REGISTERED = "REGISTERED",
  ANALYZING = "ANALYZING",
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  ESCALATED = "ESCALATED",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
  WITHDRAWN = "WITHDRAWN",
  PENDING = "PENDING", // User has taken back the complaint for editing
}

export enum MediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
}

export interface Media {
  id: string;
  type: MediaType;
  name: string; // File name
  url: string; // a data URL or placeholder
}

export interface AnalysisResult {
  id: string;
  complaintId: string;
  category: string;
  urgencyScore: number;
  summary: string;
  keywords: string[];
  suggestedDepartment?: string;
  analysisTimestamp: string;
}

export type ComplaintArea =
  | "TRAIN"
  | "STATION"
  | "SUGGESTIONS"
  | "ENQUIRY"
  | "RAIL_ANUBHAV";

export enum ComplaintSource {
  FORM = "FORM",
  CHATBOT = "CHATBOT",
}

export enum Priority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  complainantId?: string;
  userEmail?: string; // Email of the user who submitted the complaint (for filtering)
  assignedTo?: string;
  media: Media[];
  analysis?: AnalysisResult;
  source: ComplaintSource; // Track if complaint came from form or chatbot

  // New detailed fields
  pnr?: string;
  utsNumber?: string;
  journeyDate?: string; // Storing as ISO string from date input
  incidentDate: string; // Storing as ISO string
  incidentTime?: string; // Storing as HH:mm string
  complaintArea: ComplaintArea;
  complaintType: string;
  complaintSubType: string;
  location?: string;

  // Assignment fields
  department?: string;
  zone?: string;

  // Train-specific fields
  trainNumber?: string;
  trainName?: string;
  coachNumber?: string;
  seatNumber?: string;

  // Station-specific fields
  stationCode?: string;
  stationName?: string;
  nearestStation?: string;
  platformNumber?: string;

  // Dynamic fields
  unauthorizedPeopleCount?: number;

  // Legal & Consent
  declaration?: boolean;
  consentShare?: boolean;

  // Contact Info
  mobileNumber?: string;

  priority: Priority;
}
