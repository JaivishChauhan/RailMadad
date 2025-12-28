import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// Part type is now used inline for multimodal parts
import {
  Mic,
  Paperclip,
  Send,
  X,
  Bot,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Loader2,
  Maximize2,
  Minimize2,
  MessageSquarePlus,
} from "lucide-react";
import {
  chatWithContext,
  addRealTimeContext,
  detectEmergencyInMessage,
  handleEmergencyResponse,
} from "../services/geminiService";
import { chatWithRailAnubhav } from "../services/railAnubhavService";
import { chatWithEnquiry } from "../services/enquiryService";
import { chatWithSuggestions } from "../services/suggestionService";
import { chatWithTracking } from "../services/trackingService";
import {
  functionCallService,
  type FunctionCallResult,
} from "../services/functionCallService";
import { extractFunctionCallFromText } from "../services/functionCallHelpers";
import { useComplaints } from "../hooks/useComplaints";
import { usePassengerAuth } from "../hooks/usePassengerAuth";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useUserAwareness } from "../hooks/useUserAwareness";
import { UserContextService } from "../services/userContextService";
import { Role, type UserContext } from "../types";
import Logo from "./ui/Logo";
import LanguageSelector from "./ui/LanguageSelector";
import { useUserAwareTranslation } from "../hooks/useI18n";
import "../utils/i18nSetup";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { isAIConfigured } from "../config/aiConfig";

// Helper to convert file to base64 string
const fileToBase64 = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * MarkdownRenderer - Renders markdown content with proper styling and security.
 *
 * @param {object} props - Component props
 * @param {string} props.content - The markdown content to render
 * @param {boolean} [props.isUser=false] - Whether this is a user message (affects styling)
 * @returns {JSX.Element} Rendered markdown content
 *
 * Uses react-markdown with remark-gfm for GitHub Flavored Markdown support:
 * - Tables, strikethrough, task lists, autolinks
 * - Code blocks with syntax styling
 * - Safe rendering (no XSS vulnerabilities)
 */
const MarkdownRenderer: React.FC<{ content: string; isUser?: boolean }> = ({
  content,
  isUser = false,
}) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Style headings appropriately
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mt-3 mb-2 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold mt-3 mb-1.5 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0">
            {children}
          </h3>
        ),
        // Paragraphs with proper spacing
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
        ),
        // Styled inline code
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code
                className={cn(
                  "px-1.5 py-0.5 rounded text-xs font-mono",
                  isUser
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
                {...props}
              >
                {children}
              </code>
            );
          }
          // Code block
          return (
            <code
              className={cn(
                "block p-3 rounded-lg text-xs font-mono overflow-x-auto",
                isUser
                  ? "bg-primary-foreground/10 text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
              {...props}
            >
              {children}
            </code>
          );
        },
        // Code block wrapper
        pre: ({ children }) => (
          <pre className="my-2 overflow-hidden rounded-lg">{children}</pre>
        ),
        // Styled lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1 ml-1">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1 ml-1">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        // Styled links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "underline underline-offset-2 transition-colors",
              isUser
                ? "text-primary-foreground/90 hover:text-primary-foreground"
                : "text-primary hover:text-primary/80"
            )}
          >
            {children}
          </a>
        ),
        // Styled blockquotes
        blockquote: ({ children }) => (
          <blockquote
            className={cn(
              "border-l-3 pl-3 my-2 italic",
              isUser
                ? "border-primary-foreground/40 text-primary-foreground/80"
                : "border-primary/40 text-muted-foreground"
            )}
          >
            {children}
          </blockquote>
        ),
        // Styled tables (GFM)
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table
              className={cn(
                "min-w-full text-xs border-collapse rounded-lg overflow-hidden",
                isUser ? "border-primary-foreground/20" : "border-border"
              )}
            >
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead
            className={cn(isUser ? "bg-primary-foreground/10" : "bg-muted")}
          >
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold border-b">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-b border-border/50">{children}</td>
        ),
        // Horizontal rule
        hr: () => (
          <hr
            className={cn(
              "my-3",
              isUser ? "border-primary-foreground/20" : "border-border"
            )}
          />
        ),
        // Strong and emphasis
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        // Strikethrough (GFM)
        del: ({ children }) => <del className="line-through">{children}</del>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export type ChatMode =
  | "general"
  | "rail-anubhav"
  | "enquiry"
  | "suggestions"
  | "tracking";

/** Session storage key for persisting chat messages across page navigations */
const CHAT_SESSION_KEY = "railmadad_chat_session";

/**
 * Saves messages to sessionStorage for persistence during the browser session.
 * Filters out non-serializable properties (like Blob attachments) before saving.
 *
 * @param {Message[]} messages - Array of chat messages to persist
 * @param {ChatMode} mode - Current chat mode to namespace the storage
 */
const saveChatSession = (messages: Message[], mode: ChatMode): void => {
  try {
    // Filter out non-serializable data (blobs, complex objects)
    const serializableMessages = messages.map((msg) => ({
      id: msg.id,
      text: msg.text,
      isUser: msg.isUser,
      isEmergency: msg.isEmergency,
      emergencyNumbers: msg.emergencyNumbers,
      showActionButton: msg.showActionButton,
      actionButtonText: msg.actionButtonText,
      actionButtonUrl: msg.actionButtonUrl,
      // Exclude: isTypingIndicator, userContext, authStateChange, functionCallResult, attachment (contains Blob)
    }));
    sessionStorage.setItem(
      `${CHAT_SESSION_KEY}_${mode}`,
      JSON.stringify(serializableMessages)
    );
  } catch (error) {
    console.warn("Failed to save chat session:", error);
  }
};

/**
 * Loads previously saved messages from sessionStorage.
 *
 * @param {ChatMode} mode - Current chat mode to retrieve the correct session
 * @returns {Message[] | null} Array of messages if found, null otherwise
 */
const loadChatSession = (mode: ChatMode): Message[] | null => {
  try {
    const saved = sessionStorage.getItem(`${CHAT_SESSION_KEY}_${mode}`);
    if (saved) {
      return JSON.parse(saved) as Message[];
    }
  } catch (error) {
    console.warn("Failed to load chat session:", error);
  }
  return null;
};

/**
 * Clears the chat session from sessionStorage for a given mode.
 *
 * @param {ChatMode} mode - Chat mode whose session should be cleared
 */
const clearChatSession = (mode: ChatMode): void => {
  try {
    sessionStorage.removeItem(`${CHAT_SESSION_KEY}_${mode}`);
  } catch (error) {
    console.warn("Failed to clear chat session:", error);
  }
};

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  requireAuthentication?: boolean;
  initialMessage?: string | null;
  initialFullScreen?: boolean;
  mode?: ChatMode;
}

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  isTypingIndicator?: boolean;
  isEmergency?: boolean;
  emergencyNumbers?: Array<{ label: string; number: string }>;
  userContext?: UserContext;
  authStateChange?: {
    type: "login" | "logout" | "session_expired" | "role_change";
    previousContext?: UserContext;
    newContext?: UserContext;
    timestamp: Date;
  };
  functionCallResult?: FunctionCallResult;
  showActionButton?: boolean;
  actionButtonText?: string;
  actionButtonUrl?: string;
  attachment?: {
    type: "image" | "audio";
    url: string;
    file?: Blob;
  };
}

const Chatbot: React.FC<ChatbotProps> = ({
  isOpen,
  onClose,
  requireAuthentication = false,
  initialMessage = null,
  initialFullScreen = false,
  mode = "general",
}) => {
  const navigate = useNavigate();
  // Initialize messages from session storage if available, preserving chat across page navigations
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedSession = loadChatSession(mode);
    return savedSession || [];
  });
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isVideoWarningOpen, setIsVideoWarningOpen] = useState(false);
  const [authErrors, setAuthErrors] = useState<string[]>([]);
  const lastAuthStateRef = useRef<{
    isAuthenticated: boolean;
    role: Role | null;
    userId: string | null;
  } | null>(null);
  const lastProcessedMessageRef = useRef<string | null>(null);
  // Full Screen State
  const [isFullScreen, setIsFullScreen] = useState(initialFullScreen);

  const {
    userContext: currentUserContext,
    isLoading: contextLoading,
    error: contextError,
    refreshContext,
    clearError: clearContextError,
  } = useUserAwareness("chatbot-main");

  const { t, language, isRTL, formatTime } =
    useUserAwareTranslation(currentUserContext);

  const passengerAuth = usePassengerAuth();
  const adminAuth = useAdminAuth();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);
  const nextIdRef = useRef<number>(1);
  const currentTypingIdRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { addComplaintFromFunctionCall, complaints } = useComplaints();

  useEffect(() => {
    functionCallService.setComplaintService({
      addComplaint: addComplaintFromFunctionCall,
      getComplaints: () => complaints,
    });
  }, [addComplaintFromFunctionCall, complaints]);

  const [pendingFile, setPendingFile] = useState<{
    blob: Blob;
    type: "image" | "audio";
    previewUrl: string;
  } | null>(null);

  // State for drag-and-drop visual feedback
  const [isDragging, setIsDragging] = useState(false);

  // Counter to handle nested drag events properly
  const dragCounterRef = useRef(0);

  // Update isFullScreen when initialFullScreen prop changes (useful if re-opening)
  useEffect(() => {
    setIsFullScreen(initialFullScreen);
  }, [initialFullScreen, isOpen]);

  // Persist messages to session storage whenever they change
  useEffect(() => {
    // Only save if there are actual messages (not just typing indicators)
    const meaningfulMessages = messages.filter((m) => !m.isTypingIndicator);
    if (meaningfulMessages.length > 0) {
      saveChatSession(meaningfulMessages, mode);
    }
  }, [messages, mode]);

  /**
   * Clears current chat and starts a new conversation.
   * Removes session storage and resets message state.
   * A fresh greeting will be displayed on the next render cycle.
   */
  const handleNewChat = useCallback(() => {
    clearChatSession(mode);
    setMessages([]);
    setUserInput("");
    setPendingFile(null);
    nextIdRef.current = 1;
  }, [mode]);

  /**
   * Handles authentication state changes (login, logout, etc.).
   *
   * @param {any} previousState - The previous authentication state.
   * @param {any} newState - The new authentication state.
   * @param {UserContext} newContext - The updated user context.
   */
  const handleAuthStateChange = useCallback(
    (previousState: any, newState: any, newContext: UserContext) => {
      let changeType: "login" | "logout" | "session_expired" | "role_change";

      // Determine the type of change
      if (!previousState.isAuthenticated && newState.isAuthenticated) {
        changeType = "login";
      } else if (previousState.isAuthenticated && !newState.isAuthenticated) {
        changeType = "logout";
      } else if (
        previousState.role !== newState.role &&
        newState.isAuthenticated
      ) {
        changeType = "role_change";
      } else {
        changeType = "session_expired";
      }

      // Note: We are deliberately NOT showing messages in the chatbot for auth state changes
      // as per user requirement "dont show in chatbot".

      if (changeType === "login") {
        setAuthErrors([]);
        clearContextError();
      }
    },
    [clearContextError]
  );

  useEffect(() => {
    if (!currentUserContext) return;

    const currentAuthState = {
      isAuthenticated: currentUserContext.isAuthenticated,
      role: currentUserContext.role,
      userId: currentUserContext.user?.id || null,
    };

    if (lastAuthStateRef.current) {
      const lastState = lastAuthStateRef.current;
      const authChanged =
        lastState.isAuthenticated !== currentAuthState.isAuthenticated ||
        lastState.role !== currentAuthState.role ||
        lastState.userId !== currentAuthState.userId;

      if (authChanged) {
        handleAuthStateChange(lastState, currentAuthState, currentUserContext);
      }
    }

    lastAuthStateRef.current = currentAuthState;
  }, [currentUserContext, handleAuthStateChange]);

  useEffect(() => {
    const checkAuthErrors = () => {
      const errors: string[] = [];
      if (contextError) errors.push(`Context Error: ${contextError}`);
      if (currentUserContext?.sessionInfo?.isExpired)
        errors.push("Session has expired");

      if (
        !passengerAuth.loading &&
        !adminAuth.loading &&
        !contextLoading &&
        currentUserContext
      ) {
        const passengerAuthState = !!passengerAuth.user;
        const adminAuthState = !!adminAuth.user;
        const contextAuthState = currentUserContext.isAuthenticated;

        if (
          contextAuthState &&
          currentUserContext.user &&
          !passengerAuthState &&
          !adminAuthState
        ) {
          errors.push("Authentication state mismatch detected");
        } else if (
          (passengerAuthState || adminAuthState) &&
          !contextAuthState
        ) {
          errors.push("Authentication state mismatch detected");
        } else if (contextAuthState && currentUserContext.user) {
          const contextUserId = currentUserContext.user.id;
          const passengerUserId = passengerAuth.user?.id;
          const adminUserId = adminAuth.user?.id;

          if (contextUserId && (passengerUserId || adminUserId)) {
            if (
              contextUserId !== passengerUserId &&
              contextUserId !== adminUserId
            ) {
              errors.push("User identity mismatch detected");
            }
          }
        }
      }
      setAuthErrors(errors);
    };

    if (!passengerAuth.loading && !adminAuth.loading && !contextLoading) {
      checkAuthErrors();
    }
  }, [
    contextError,
    currentUserContext,
    passengerAuth,
    adminAuth,
    contextLoading,
  ]);

  const handleAuthRecovery = useCallback(async () => {
    try {
      setAuthErrors([]);
      clearContextError();
      await refreshContext();

      const recoveryMessage: Message = {
        id: getNextId(),
        text: "🔄 Attempting to restore your session... Please wait.",
        isUser: false,
        userContext: currentUserContext || undefined,
      };

      setMessages((prev) => [...prev, recoveryMessage]);
    } catch (error) {
      setAuthErrors((prev) => [...prev, "Recovery attempt failed"]);
    }
  }, [refreshContext, clearContextError, currentUserContext]);

  const getFallbackMessage = useCallback(() => {
    if (
      currentUserContext?.isAuthenticated &&
      currentUserContext.user &&
      authErrors.length === 0
    )
      return null;

    if (authErrors.length > 0) {
      return {
        text: `⚠️ **Authentication Issues Detected:**\n${authErrors
          .map((error) => `• ${error}`)
          .join(
            "\n"
          )}\n\nI can still help with basic information, but for full functionality, please try logging in again.`,
        showRecovery: true,
      };
    }

    if (contextError) {
      return {
        text: `⚠️ **Session Issue:** ${contextError}\n\nI can provide basic assistance, but some features may be limited. Please try refreshing your session.`,
        showRecovery: true,
      };
    }

    if (currentUserContext?.sessionInfo?.isExpired) {
      return {
        text: `⏰ **Session Expired:** Your login session has expired.\n\nPlease log in again to access all features and personalized assistance.`,
        showRecovery: false,
      };
    }

    return null;
  }, [authErrors, contextError, currentUserContext]);

  // Helper for mode-specific placeholders
  const getPlaceholderText = (currentMode: ChatMode) => {
    switch (currentMode) {
      case "rail-anubhav":
        return "Share your travel experience...";
      case "enquiry":
        return "Ask about trains, fares, or rules...";
      case "suggestions":
        return "Type your suggestion here...";
      case "tracking":
        return "Enter PNR or Complaint ID to track...";
      default:
        return t("chatbot.placeholder") || "Type your message...";
    }
  };

  // Helper for mode-specific greetings
  const getModeSpecificGreeting = (
    currentMode: ChatMode,
    context: UserContext | null
  ) => {
    // Mode-specific overrides take precedence
    switch (currentMode) {
      case "rail-anubhav":
        return `Welcome to **Rail Anubhav**! 🚆\n\nWe value your feedback. Please share your recent travel experience with us. Mentioning the **Train No.** and **Date of Journey** helps us improve specific services.`;
      case "enquiry":
        return `Hello! I am your **Enquiry Assistant**. ℹ️\n\nAsk me about:\n• Train Schedules & Status\n• PNR Status\n• Fare Rules & Concessions\n• Station Facilities\n\n(Note: I cannot file complaints in this mode.)`;
      case "suggestions":
        return `We value your ideas! 💡\n\nPlease share your **suggestions** to help us improve Indian Railways. Your innovative ideas can make a difference!`;
      case "tracking":
        return `Track your concern here. 🕵️‍♂️\n\nPlease share your **Complaint Reference Number** or **PNR Number** to check the current status of your grievance.`;
      case "general":
      default:
        // Fallback to existing logic for 'general' mode
        if (context?.isAuthenticated && context.user) {
          const userName = context.user.fullName?.split(" ")[0] || "Traveler";
          const roleName =
            context.role === Role.PASSENGER
              ? "Passenger"
              : context.role === Role.OFFICIAL
                ? "Official"
                : "Admin";

          const isDashboard =
            window.location.pathname.startsWith("/dashboard") ||
            window.location.pathname.startsWith("/admin");

          let msg = `Welcome back, ${userName}! 🚆\n\n`;

          if (context.role === Role.PASSENGER) {
            msg += `I'm here to help with your journey. You can ask me to **track a complaint**, **check PNR status**, or **file a new grievance**. How can I assist you today?`;
          } else if (isDashboard) {
            msg += `Ready to assist you with your **${roleName}** duties. I can help analyze reports, manage complaints, or look up passenger details. What's on your agenda?`;
          } else {
            msg += `You are currently viewing the public portal. I can assist you with general inquiries here, or you can switch to the **Dashboard** for ${roleName} tasks.`;
          }
          return msg;
        } else {
          return `Hi there! 👋 Welcome to RailMadad.\n\nI can answer your questions about trains, stations, and services. For personalized help like **tracking complaints** or **PNR status**, please **Log In** to unlock full features.\n\nHow can I help you right now?`;
        }
    }
  };

  useEffect(() => {
    // Only set initial greeting if chat is just opening and empty
    // But ALSO if the mode changes? No, usually mode change implies a reset or new context.
    // If the user switches modes while chat is open, we might want to announce the new mode.
    // However, the current logic only runs on mount (isOpen change) or empty messages.
    // Let's keep it simple: if empty messages, show greeting.

    if (
      isOpen &&
      messages.length === 0 &&
      currentUserContext &&
      !contextLoading
    ) {
      // Use centralized AI config which checks localStorage first (for Super Admin configured keys)
      const hasAIConfigured = isAIConfigured();

      let greetingMessage: string;

      if (!hasAIConfigured) {
        // Offline fallback logic
        greetingMessage = currentUserContext.isAuthenticated
          ? `Welcome back! (Offline Mode) 🚆`
          : `Hello! I'm your RailMadad assistant (Offline Mode).`;
      } else {
        greetingMessage = getModeSpecificGreeting(mode, currentUserContext);
      }

      const fallbackInfo = getFallbackMessage();
      if (fallbackInfo) {
        greetingMessage += `\n\n---\n${fallbackInfo.text}`;
        if (fallbackInfo.showRecovery) {
          greetingMessage += `\n\n🔄 *Tip: Refresh to restore session.*`;
        }
      }

      setMessages([
        {
          id: getNextId(),
          text: greetingMessage,
          isUser: false,
          userContext: currentUserContext,
        },
      ]);
    }
    // Listen for mode changes to potentially reset/update greeting?
    // If we want the greeting to update when mode changes (e.g. via button click), we need to clear messages or append new greeting.
    // For now, let's just use existing dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    messages.length,
    currentUserContext,
    contextLoading,
    getFallbackMessage,
    mode,
  ]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const getNextId = () => {
    nextIdRef.current += 1;
    return nextIdRef.current;
  };

  const addMessage = (
    text: string,
    isUser: boolean,
    customId?: number,
    userContext?: UserContext,
    attachment?: Message["attachment"]
  ) => {
    const id = customId || getNextId();
    setMessages((prev) => [
      ...prev,
      {
        id,
        text,
        isUser,
        userContext: userContext || currentUserContext || undefined,
        attachment,
      },
    ]);
    return id;
  };

  const addTypingIndicator = () => {
    const id = getNextId();
    setMessages((prev) => [
      ...prev,
      { id, text: "", isUser: false, isTypingIndicator: true },
    ]);
    currentTypingIdRef.current = id;
    return id;
  };

  const updateMessageText = (
    id: number,
    text: string,
    extra?: Partial<Message>
  ) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text, ...(extra || {}) } : m))
    );
  };

  const typeMessage = async (text: string, messageId: number) => {
    setIsLoading(false);
    const speedBase = 12;
    // Ensure we start from 0
    let i = 0;

    // Safety: ensure text exists
    if (!text) {
      currentTypingIdRef.current = null;
      return;
    }

    const typeNext = () => {
      // If we've switched to typing another message, stop this one
      // But actually, for this specific messageId, we should just finish it?
      // For now, let's just ensure we don't crash.

      const step = text.length > 200 ? 5 : 3; // Speed up slightly for long text
      i = Math.min(i + step, text.length);
      const partial = text.slice(0, i);
      updateMessageText(messageId, partial);

      if (i < text.length) {
        const ch = text[i];
        const delay = ch === "\n" ? speedBase * 4 : speedBase;
        setTimeout(typeNext, delay);
      } else {
        currentTypingIdRef.current = null;
      }
    };

    setTimeout(typeNext, speedBase);
  };

  const handleFunctionCall = useCallback(
    async (functionName: string, parameters: any): Promise<void> => {
      try {
        // Handle client-side mode switching directly - switch silently without visible message
        if (functionName === "switchChatMode") {
          const targetMode = parameters.mode;

          // Dispatch event to switch mode seamlessly in the background
          const event = new CustomEvent("railmadad:openChat", {
            detail: { mode: targetMode },
          });
          document.dispatchEvent(event);

          // Return silently - no visible message to user; the mode will change
          // and the AI will respond naturally in the new mode's context
          return;
        }

        const result = await functionCallService.executeFunction(
          functionName,
          parameters
        );
        const responseText = result.message;
        let actionButton = null;

        if (result.redirectTo) {
          actionButton = {
            showActionButton: true,
            actionButtonText: getActionButtonText(functionName, result),
            actionButtonUrl: result.redirectTo,
          };
        }

        const responseMessage: Message = {
          id: getNextId(),
          text: responseText,
          isUser: false,
          userContext: currentUserContext || undefined,
          functionCallResult: result,
          ...actionButton,
        };

        setMessages((prev) => [...prev, responseMessage]);

        if (result.requiresAuth) {
          setTimeout(() => {
            const authMessage: Message = {
              id: getNextId(),
              text: "🔐 Would you like me to redirect you to the login page?",
              isUser: false,
              showActionButton: true,
              actionButtonText: "Go to Login",
              actionButtonUrl: result.redirectTo || "/passenger-login",
            };
            setMessages((prev) => [...prev, authMessage]);
          }, 1000);
        }
      } catch (error) {
        const errorMessage: Message = {
          id: getNextId(),
          text: `❌ Sorry, I encountered an error while processing your request. Please try again.`,
          isUser: false,
          userContext: currentUserContext || undefined,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    },
    [currentUserContext]
  );

  const getActionButtonText = (
    functionName: string,
    result: FunctionCallResult
  ): string => {
    if (result.requiresAuth) return "Login Required";
    switch (functionName) {
      case "submitComplaint":
      case "submit_complaint":
        return result.success ? "View Complaint" : "Try Again";
      case "getComplaintStatus":
      case "get_complaint_status":
        return "View Details";
      case "getUserComplaints":
      case "get_user_complaints":
        return "View All Complaints";
      case "switchChatMode":
        return "Switch Mode";
      default:
        return "Continue";
    }
  };

  // Helper to choose the right chat service
  const getChatService = (currentMode: ChatMode) => {
    switch (currentMode) {
      case "rail-anubhav":
        return chatWithRailAnubhav;
      case "enquiry":
        return chatWithEnquiry;
      case "suggestions":
        return chatWithSuggestions;
      case "tracking":
        return chatWithTracking;
      case "general":
      default:
        return chatWithContext;
    }
  };

  const handleSendMessage = useCallback(
    async (text: string, file?: { blob: Blob; type: "image" | "audio" }) => {
      let attachment: Message["attachment"] | undefined;
      if (file) {
        const url = URL.createObjectURL(file.blob);
        attachment = { type: file.type, url, file: file.blob };
      }

      // Don't duplicate text in the message if we have an attachment, unless there is valid text.
      // The previous logic was `[Sent ${file.type}] ${text}`. We can keep it clean now.
      const displayText = text;

      addMessage(
        displayText,
        true,
        undefined,
        currentUserContext || undefined,
        attachment
      );
      setIsLoading(true);
      const placeholderId = addTypingIndicator();

      try {
        // Use centralized AI config which checks localStorage first (for Super Admin configured keys)
        const hasAIConfigured = isAIConfigured();
        if (!hasAIConfigured) {
          // ... (Keep existing rule-based logic logic if apiKey missing - simplifying for brevity but preserving handling)
          // For brevity in rewrite, assuming apiKey is present or using simple fallback.
          // Actually, I should preserve the logic.
          let response = "Thank you for your message. ";
          if (
            text.toLowerCase().includes("complaint") ||
            text.toLowerCase().includes("problem")
          ) {
            response +=
              "I can see you have a railway complaint. Please provide details like Train number, Date, and Description.";
          } else {
            response +=
              "I'm here to help with Complaints, Information, and Suggestions. How can I assist?";
          }
          updateMessageText(placeholderId, "", { isTypingIndicator: false });
          setIsLoading(false);
          setTimeout(() => updateMessageText(placeholderId, response), 1000);
          return;
        }

        let messageText =
          text ||
          "Please analyze the attached audio/file and respond to what you hear or see.";

        // Prepare multimodal parts if file is attached (audio or image)
        let multimodalParts:
          | Array<{ inlineData: { mimeType: string; data: string } }>
          | undefined;
        if (file) {
          const base64Data = await fileToBase64(file.blob);
          multimodalParts = [
            { inlineData: { mimeType: file.blob.type, data: base64Data } },
          ];
          console.log(
            `🎤 Preparing multimodal message with ${file.type} attachment (${file.blob.type})`
          );
        }

        const allMessages = messages.filter((m) => !m.isTypingIndicator);
        const firstUserIndex = allMessages.findIndex((m) => m.isUser);
        const history =
          firstUserIndex >= 0
            ? allMessages.slice(firstUserIndex).map((m) => ({
              role: m.isUser ? ("user" as const) : ("model" as const),
              parts: [{ text: m.text }],
            }))
            : [];

        const timeContext = addRealTimeContext();
        let rawResponse: string | any;

        // Check for emergency or emergency confirmation (text-only messages)
        // IMPORTANT: Only treat as emergency confirmation if the PREVIOUS bot message was
        // an actual emergency complaint preparation, NOT a regular complaint confirmation.
        // Regular complaints may contain words like "confirm" or "security" but are not emergencies.
        const lastModelMessage = messages.filter((m) => !m.isUser).pop();
        const lastModelText = lastModelMessage?.text?.toLowerCase() || "";

        // Strict emergency indicators that only appear in actual emergency preparations
        const emergencyPreparationIndicators = [
          "railway protection force (rpf)", // Only in emergency preparation responses
          "serious security issue", // Emergency-specific phrasing
          "serious medical issue", // Emergency-specific phrasing
          "serious fire issue", // Emergency-specific phrasing
          "robbery", // Direct emergency keyword in bot response
          "being attacked", // Direct emergency context
          "life threatening", // Emergency severity indicator
          "immediate danger", // Emergency severity indicator
          "emergency complaint", // Explicit emergency complaint context
        ];

        const wasEmergencyPreparation = emergencyPreparationIndicators.some(
          (indicator) => lastModelText.includes(indicator)
        );

        const isEmergencyConfirmation =
          /^(confirm|yes|y|ok|proceed|submit)$/i.test(messageText.trim()) &&
          lastModelMessage &&
          wasEmergencyPreparation;

        // PRIORITY ORDER:
        // 1. Multimodal content (audio/image/video) - ALWAYS goes through chatWithContext for AI analysis
        // 2. Emergency text messages - handled by handleEmergencyResponse
        // 3. Regular text messages - routed through mode-specific services

        if (multimodalParts && multimodalParts.length > 0) {
          // Multimodal content - let the AI analyze audio/image/video and detect emergencies itself
          console.log(
            `📎 Routing multimodal request through chatWithContext (mode: ${mode}, contains ${multimodalParts.length} attachment(s))`
          );
          rawResponse = await chatWithContext(
            messageText,
            history,
            timeContext,
            currentUserContext,
            undefined,
            multimodalParts
          );
        } else if (
          detectEmergencyInMessage(messageText) ||
          isEmergencyConfirmation
        ) {
          // Text-only emergency messages
          console.log(
            "🚨 Emergency detected in text message - using emergency handler"
          );
          rawResponse = await handleEmergencyResponse(
            messageText,
            history,
            timeContext,
            currentUserContext
          );
        } else {
          // Regular text-only messages - use mode-specific service

          // Auto-detect tracking intent (Complaint ID or PNR)
          // Regex for Complaint ID: CMP/SUG/EXP/LOCAL followed by alphanumeric
          // Regex for PNR: 10 digits
          const complaintRegex =
            /\b(CMP|SUG|EXP|LOCAL)-[A-Z0-9]+(-[A-Z0-9]+)?\b/i;
          const pnrRegex = /\b\d{10}\b/;

          let currentMode = mode;
          let chatService = getChatService(mode);

          // If in general mode and tracking pattern detected, switch to tracking mode
          if (
            mode === "general" &&
            (complaintRegex.test(messageText) || pnrRegex.test(messageText))
          ) {
            console.log(
              "🔍 Auto-switching to tracking mode based on input pattern"
            );

            // Dispatch event to switch mode seamlessly
            const event = new CustomEvent("railmadad:openChat", {
              detail: { mode: "tracking" },
            });
            document.dispatchEvent(event);

            currentMode = "tracking";
            chatService = chatWithTracking;
          }

          rawResponse = await chatService(
            messageText,
            history,
            timeContext,
            currentUserContext
          );
        }

        const response =
          typeof rawResponse === "string"
            ? rawResponse
            : (rawResponse as any)?.text || JSON.stringify(rawResponse);

        if (
          response &&
          response.trim().length > 0 &&
          !/FUNCTION_CALL:/i.test(response) &&
          messages.length <= 2
        ) {
          updateMessageText(placeholderId, "", { isTypingIndicator: false });
          await typeMessage(response, placeholderId);
          return;
        }

        // Use robust function call extractor
        const functionCallInfo = extractFunctionCallFromText(response);

        if (functionCallInfo) {
          const { functionName, parameters, fullMatch } = functionCallInfo;

          try {
            await handleFunctionCall(functionName, parameters);

            // For mode switches, suppress ALL text output - mode switch is seamless
            if (functionName === "switchChatMode") {
              setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
              setIsLoading(false);

              const modePrompts: Record<string, string> = {
                tracking:
                  "Please provide your **Complaint Reference Number** so I can look up the status for you.",
                enquiry:
                  "What would you like to know about Indian Railways? I can help with train schedules, fare rules, station facilities, and more.",
                suggestions:
                  "I'd love to hear your suggestion! Please share your idea to help improve Indian Railways.",
                "rail-anubhav":
                  "Please share your recent travel experience. Mentioning the **Train Number** and **Date of Journey** helps us improve specific services.",
              };
              const targetMode = parameters.mode;
              const contextualPrompt =
                modePrompts[targetMode] || "How can I assist you?";

              setTimeout(() => {
                const contextMessage: Message = {
                  id: getNextId(),
                  text: contextualPrompt,
                  isUser: false,
                  userContext: currentUserContext || undefined,
                };
                setMessages((prev) => [...prev, contextMessage]);
              }, 100);
              return;
            }

            // Remove the function call text from the response
            let cleanResponse = response.replace(fullMatch, "").trim();

            // Safety cleanup for any lingering prefixes like "FUNCTION_CALL:" if not captured
            if (cleanResponse.includes("FUNCTION_CALL:")) {
              cleanResponse = cleanResponse.replace(/FUNCTION_CALL:[\s\S]*/, "").trim();
            }

            if (cleanResponse) {
              updateMessageText(placeholderId, "", { isTypingIndicator: false });
              await typeMessage(cleanResponse, placeholderId);
            } else {
              setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
            }
            return;
          } catch (e) {
            console.error("Error handling function call:", e);
            // Fall through to show error or sanitized message
          }
        }

        // Redundant block removed as it is now covered above


        if (
          response.includes("EMERGENCY_RESPONSE_NEEDED") ||
          response.toLowerCase().includes("emergency detected")
        ) {
          const emergencyNumbers = [
            { label: "Railway Helpline", number: "139" },
            { label: "Police", number: "100" },
          ];
          updateMessageText(placeholderId, response, {
            isTypingIndicator: false,
            isEmergency: true,
            emergencyNumbers,
          });
          setIsLoading(false);
          return;
        }

        if (!response.trim()) {
          updateMessageText(placeholderId, "I understand. How can I help?", {
            isTypingIndicator: false,
          });
          setIsLoading(false);
          return;
        }

        // Safety: Always strip any FUNCTION_CALL text that wasn't matched by the regex
        // This prevents raw function call syntax from showing to users
        // Match and remove any loose FUNCTION_CALL patterns to be safe
        const sanitizedResponse = response
          .replace(/FUNCTION_CALL:[\s\S]*/g, "") // Aggressively remove if still present
          .trim();

        updateMessageText(placeholderId, "", { isTypingIndicator: false });
        await typeMessage(
          sanitizedResponse ||
          "I understand. Is there anything else I can help with?",
          placeholderId
        );
      } catch (error) {
        updateMessageText(placeholderId, "Sorry, I encountered an error.", {
          isTypingIndicator: false,
        });
        setIsLoading(false);
      }
    },
    [
      addMessage,
      addTypingIndicator,
      updateMessageText,
      addComplaintFromFunctionCall,
      messages,
      mode,
    ]
  );

  useEffect(() => {
    // Pre-fill the input field with the initial message, but do NOT auto-send.
    // The user should manually press Send to initiate the conversation.
    if (
      isOpen &&
      initialMessage &&
      initialMessage !== lastProcessedMessageRef.current
    ) {
      lastProcessedMessageRef.current = initialMessage;
      setTimeout(() => {
        setUserInput(initialMessage);
      }, 500);
    }
  }, [isOpen, initialMessage]);

  const handleEmergencyDial = (number: string, label: string) => {
    window.open(`tel:${number}`, "_self");
    addMessage(`📞 Calling ${label} (${number})...`, false);
  };

  const handleFormSubmit = () => {
    const text = userInput.trim();
    if (text === "" && !pendingFile) return;

    if (pendingFile) {
      handleSendMessage(text, {
        blob: pendingFile.blob,
        type: pendingFile.type,
      });
      setPendingFile(null);
    } else {
      handleSendMessage(text);
    }
    setUserInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit();
    }
  };

  /**
   * Handles file selection from the paperclip button.
   * Supports images, audio, and video files. Validates file size (max 7MB).
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File size limit: 7MB for all media types
    if (file.size > 7 * 1024 * 1024) {
      alert("File size exceeds 7MB limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Determine file type and set pending file for preview
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPendingFile({
          blob: file,
          type: "image",
          previewUrl: e.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("audio/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPendingFile({
          blob: file,
          type: "audio",
          previewUrl: e.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      // Video is now supported by Gemini multimodal
      const reader = new FileReader();
      reader.onload = (e) => {
        setPendingFile({
          blob: file,
          type: "image", // Using 'image' type for preview UI, but blob.type will be video/*
          previewUrl: e.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
      console.log(
        `📹 Video file selected: ${file.name} (${(
          file.size /
          1024 /
          1024
        ).toFixed(2)}MB)`
      );
    } else {
      alert("Unsupported file type. Supported: Images, Audio, Video.");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * Processes a file (from file input, paste, or drag-drop) and sets it as pending attachment.
   * Validates file size (max 7MB) and type, creates preview URL, and updates state.
   *
   * @param {File | Blob} file - The file to process
   * @param {string} [source='unknown'] - Source of the file for logging purposes
   * @returns {boolean} True if file was processed successfully, false otherwise
   */
  const processFile = useCallback((file: File | Blob, source: string = 'unknown'): boolean => {
    // File size limit: 7MB for all media types
    if (file.size > 7 * 1024 * 1024) {
      alert("File size exceeds 7MB limit.");
      return false;
    }

    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isAudio && !isVideo) {
      alert("Unsupported file type. Supported: Images, Audio, Video.");
      return false;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const previewUrl = readerEvent.target?.result as string;

      if (isImage || isVideo) {
        setPendingFile({
          blob: file,
          type: "image",
          previewUrl,
        });
        console.log(
          `📎 ${isVideo ? 'Video' : 'Image'} attached via ${source}: ${(file as File).name || 'clipboard'} (${(
            file.size / 1024 / 1024
          ).toFixed(2)}MB)`
        );
      } else if (isAudio) {
        setPendingFile({
          blob: file,
          type: "audio",
          previewUrl,
        });
        console.log(
          `🎵 Audio attached via ${source}: ${(file as File).name || 'clipboard'} (${(
            file.size / 1024 / 1024
          ).toFixed(2)}MB)`
        );
      }
    };
    reader.readAsDataURL(file);
    return true;
  }, []);

  /**
   * Fetches an image from a URL and converts it to a Blob for attachment.
   * Validates that the URL points to a valid image/media file.
   *
   * @param {string} url - The URL to fetch the image from
   * @returns {Promise<boolean>} True if image was fetched successfully
   */
  const fetchImageFromUrl = useCallback(async (url: string): Promise<boolean> => {
    try {
      console.log(`🌐 Fetching image from URL: ${url}`);
      const response = await fetch(url, { mode: 'cors' });

      if (!response.ok) {
        console.warn(`Failed to fetch image: HTTP ${response.status}`);
        return false;
      }

      const contentType = response.headers.get('content-type') || '';
      const isImage = contentType.startsWith('image/');
      const isAudio = contentType.startsWith('audio/');
      const isVideo = contentType.startsWith('video/');

      if (!isImage && !isAudio && !isVideo) {
        console.warn(`URL does not point to a media file: ${contentType}`);
        return false;
      }

      const blob = await response.blob();
      return processFile(blob, 'URL');
    } catch (error) {
      console.warn(`Failed to fetch image from URL:`, error);
      return false;
    }
  }, [processFile]);

  /**
   * Checks if a string is a valid URL pointing to a media file.
   *
   * @param {string} text - The text to check
   * @returns {boolean} True if text is a media URL
   */
  const isMediaUrl = (text: string): boolean => {
    try {
      const url = new URL(text);
      const pathname = url.pathname.toLowerCase();
      const mediaExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
        '.mp3', '.wav', '.ogg', '.aac', '.flac',
        '.mp4', '.webm', '.mov', '.avi', '.mkv'
      ];
      return mediaExtensions.some(ext => pathname.endsWith(ext)) ||
        url.hostname.includes('imgur') ||
        url.hostname.includes('giphy') ||
        url.hostname.includes('unsplash') ||
        url.hostname.includes('pexels');
    } catch {
      return false;
    }
  };

  /**
   * Handles paste events from the textarea to support:
   * 1. Pasting files directly (images, audio, video)
   * 2. Pasting URLs to media files (will fetch and attach)
   *
   * @param {React.ClipboardEvent<HTMLTextAreaElement>} e - The paste event
   */
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;

    // Check for files first (direct file paste)
    if (clipboardData?.files && clipboardData.files.length > 0) {
      const file = clipboardData.files[0];
      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/");
      const isVideo = file.type.startsWith("video/");

      if (isImage || isAudio || isVideo) {
        e.preventDefault();
        processFile(file, 'paste');
        return;
      }
    }

    // Check for URL in text (paste image URL)
    const pastedText = clipboardData?.getData('text/plain')?.trim();
    if (pastedText && isMediaUrl(pastedText)) {
      e.preventDefault();
      // Show loading state
      const originalPlaceholder = textareaRef.current?.placeholder;
      if (textareaRef.current) {
        textareaRef.current.placeholder = 'Fetching image from URL...';
      }

      const success = await fetchImageFromUrl(pastedText);

      // Restore placeholder
      if (textareaRef.current && originalPlaceholder) {
        textareaRef.current.placeholder = originalPlaceholder;
      }

      if (!success) {
        // If fetch failed, allow the URL to be pasted as text
        setUserInput(prev => prev + pastedText);
      }
      return;
    }

    // Default: allow normal text paste
  };

  /**
   * Handles drag enter event for the drop zone.
   * Uses a counter to properly handle nested elements.
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;

    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  /**
   * Handles drag leave event for the drop zone.
   * Uses a counter to properly handle nested elements.
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  /**
   * Handles drag over event to allow dropping.
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Handles file drop event.
   * Processes the first dropped file and sets it as pending attachment.
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0], 'drag-drop');
    }
  }, [processFile]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) =>
        audioChunksRef.current.push(event.data);
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setRecordedAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Could not access microphone.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);
  const handleReRecord = () => setRecordedAudio(null);
  /**
   * Handles the submission of a recorded audio message.
   * Sends the audio blob along with any optional text input to the chat service.
   * Closes the modal and resets all recording-related states after submission.
   */
  const handleSubmitRecording = () => {
    if (recordedAudio) {
      // Send audio with optional text message
      const messageText = userInput.trim() || "[Voice Message]";
      handleSendMessage(messageText, { blob: recordedAudio, type: "audio" });
      setUserInput("");
      setRecordedAudio(null);
    }
    setIsVoiceModalOpen(false);
  };

  useEffect(() => {
    if (recordedAudio && audioPreviewRef.current) {
      audioPreviewRef.current.src = URL.createObjectURL(recordedAudio);
      audioPreviewRef.current.load();
    }
  }, [recordedAudio]);

  const shouldShowAuthPrompt =
    requireAuthentication && !currentUserContext?.isAuthenticated;

  // Header Gradient based on role - maintaining existing logic but using shadcn
  const headerVariantClass = currentUserContext?.isAuthenticated
    ? currentUserContext.role === Role.SUPER_ADMIN
      ? "bg-gradient-to-r from-purple-600 to-purple-800"
      : currentUserContext.role === Role.OFFICIAL
        ? "bg-gradient-to-r from-blue-600 to-blue-800"
        : "bg-gradient-to-r from-primary to-primary/80" // Passenger / Default
    : "bg-gradient-to-r from-primary to-primary/80";

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className={cn(
            "p-0 gap-0 flex flex-col h-full transition-all duration-300",
            isFullScreen
              ? "inset-x-0 w-full max-w-none sm:max-w-none border-none"
              : "w-full border-l border-border sm:max-w-md"
          )}
          hideCloseButton
        >
          {/* Header */}
          <div
            className={cn(
              "flex justify-between items-center p-4 shadow-sm shrink-0 bg-background/80 backdrop-blur-md border-b sticky top-0 z-10"
            )}
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shadow-sm",
                    currentUserContext?.isAuthenticated
                      ? "bg-primary/10"
                      : "bg-muted"
                  )}
                >
                  {currentUserContext?.isAuthenticated &&
                    currentUserContext.user?.profilePicture ? (
                    <Avatar className="h-10 w-10 border-2 border-background">
                      <AvatarImage
                        src={currentUserContext.user.profilePicture}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {currentUserContext.user.fullName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Bot className="h-6 w-6 text-primary" />
                  )}
                </div>
                {currentUserContext?.isAuthenticated && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white"></span>
                  </span>
                )}
              </div>

              <div className="flex flex-col">
                <h2 className="text-base font-semibold text-foreground leading-tight">
                  {currentUserContext?.isAuthenticated
                    ? currentUserContext.user?.fullName?.split(" ")[0] || "User"
                    : "Rail Madad"}
                </h2>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-4 px-1.5 font-normal bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {currentUserContext?.isAuthenticated
                      ? currentUserContext.role === Role.PASSENGER
                        ? "Passenger"
                        : currentUserContext.role === Role.OFFICIAL
                          ? "Official"
                          : "Admin"
                      : "AI Assistant"}
                  </Badge>
                  {currentUserContext?.isAuthenticated && (
                    <span className="text-[10px] text-muted-foreground">
                      • Online
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                title="New Chat"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors hidden sm:flex"
                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
              >
                {isFullScreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          {shouldShowAuthPrompt ? (
            <div className="flex-grow flex flex-col items-center justify-center p-6 bg-muted/30">
              <div className="text-center space-y-6 max-w-sm">
                <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Authentication Required</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {UserContextService.getAuthenticationPrompt()}
                  </p>
                </div>
                <div className="space-y-3 w-full">
                  <Button
                    className="w-full"
                    onClick={() => (window.location.href = "/passenger-login")}
                  >
                    Login as Passenger
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => (window.location.href = "/admin-login")}
                  >
                    Login as Official
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={chatMessagesRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-start gap-3",
                    msg.isUser ? "justify-end" : "justify-start"
                  )}
                >
                  {!msg.isUser && (
                    <Avatar className="h-8 w-8 border shadow-sm">
                      <AvatarFallback className="bg-slate-200">
                        <Bot className="h-4 w-4 text-slate-600" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <Card
                    className={cn(
                      "max-w-[85%] border shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 duration-300",
                      msg.isUser
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                        : "bg-card text-card-foreground rounded-2xl rounded-tl-sm border-muted/60"
                    )}
                  >
                    <CardContent className="p-3 text-sm">
                      {msg.isTypingIndicator ? (
                        <div className="flex gap-1 h-5 items-center">
                          <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
                        </div>
                      ) : (
                        <>
                          {msg.authStateChange && (
                            <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider opacity-80">
                              {msg.authStateChange.type === "login" && (
                                <CheckCircle className="h-3 w-3" />
                              )}
                              {msg.authStateChange.type === "logout" && (
                                <XCircle className="h-3 w-3" />
                              )}
                              <span>
                                {msg.authStateChange.type.replace("_", " ")}
                              </span>
                            </div>
                          )}
                          {/* Image Attachment */}
                          {msg.attachment &&
                            msg.attachment.type === "image" && (
                              <div
                                className={cn(
                                  "mb-2 rounded-lg overflow-hidden border shadow-sm max-w-[200px]",
                                  msg.isUser ? "ml-auto" : ""
                                )}
                              >
                                <img
                                  src={msg.attachment.url}
                                  alt="Attachment"
                                  className="w-full h-auto"
                                />
                              </div>
                            )}
                          {/* Audio Attachment */}
                          {msg.attachment &&
                            msg.attachment.type === "audio" && (
                              <div
                                className={cn(
                                  "mb-2 rounded-xl overflow-hidden border shadow-sm p-2 bg-muted/50",
                                  msg.isUser ? "ml-auto" : ""
                                )}
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div
                                    className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center",
                                      msg.isUser
                                        ? "bg-primary-foreground/20"
                                        : "bg-primary/10"
                                    )}
                                  >
                                    <Mic
                                      className={cn(
                                        "h-4 w-4",
                                        msg.isUser
                                          ? "text-primary-foreground"
                                          : "text-primary"
                                      )}
                                    />
                                  </div>
                                  <span
                                    className={cn(
                                      "text-xs font-medium",
                                      msg.isUser
                                        ? "text-primary-foreground/80"
                                        : "text-muted-foreground"
                                    )}
                                  >
                                    🎤 Voice Message
                                  </span>
                                </div>
                                <audio
                                  src={msg.attachment.url}
                                  controls
                                  className="w-full h-8"
                                  style={{ minWidth: "180px" }}
                                />
                              </div>
                            )}
                          <MarkdownRenderer
                            content={msg.text}
                            isUser={msg.isUser}
                          />
                          {msg.showActionButton && msg.actionButtonUrl && (
                            <Button
                              size="sm"
                              variant={msg.isUser ? "secondary" : "default"}
                              className="mt-3 w-full"
                              onClick={() => {
                                // Close the chatbot before navigating
                                onClose();
                                navigate(msg.actionButtonUrl!);
                              }}
                            >
                              {msg.actionButtonText || "Continue"}
                            </Button>
                          )}
                          {msg.isEmergency && msg.emergencyNumbers && (
                            <div className="mt-3 space-y-2">
                              {msg.emergencyNumbers.map((num, i) => (
                                <Button
                                  key={i}
                                  variant="destructive"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() =>
                                    handleEmergencyDial(num.number, num.label)
                                  }
                                >
                                  📞 Call {num.label}: {num.number}
                                </Button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                  {msg.isUser && (
                    <Avatar className="h-8 w-8 border shadow-sm">
                      <AvatarImage
                        src={currentUserContext?.user?.profilePicture}
                      />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer Input */}
          <div className="p-4 bg-background/50 backdrop-blur-sm border-t">
            {pendingFile && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg w-fit animate-in fade-in slide-in-from-bottom-2">
                <div className="relative">
                  {pendingFile.type === "image" ? (
                    <img
                      src={pendingFile.previewUrl}
                      alt="Preview"
                      className="h-16 w-16 object-cover rounded-md border"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-primary/10 flex items-center justify-center rounded-md border">
                      <Mic className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full shadow-sm"
                    onClick={() => setPendingFile(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground px-2">
                  <p className="font-medium">Attached {pendingFile.type}</p>
                  <p>Ready to send</p>
                </div>
              </div>
            )}
            {/* Drop Zone Wrapper */}
            <div
              className={cn(
                "relative flex items-end gap-2 bg-muted/30 p-1.5 rounded-3xl border transition-all shadow-sm",
                isDragging
                  ? "border-primary border-2 bg-primary/5 ring-4 ring-primary/20"
                  : "focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50"
              )}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Drag Overlay */}
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-3xl z-10 pointer-events-none">
                  <div className="flex items-center gap-2 text-primary font-medium text-sm">
                    <Paperclip className="h-5 w-5 animate-bounce" />
                    <span>Drop file here</span>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept="image/*,audio/*,video/*"
                className="hidden"
              />

              <div className="flex gap-0.5 pb-0.5 pl-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>

              <Textarea
                ref={textareaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyPress}
                onPaste={handlePaste}
                placeholder={getPlaceholderText(mode)}
                className="min-h-[40px] max-h-32 py-2.5 px-2 resize-none w-full bg-transparent border-none shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60"
                rows={1}
              />

              <Button
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full mb-1 mr-1 transition-all",
                  userInput.trim() || pendingFile
                    ? "bg-primary opacity-100 scale-100"
                    : "bg-muted text-muted-foreground opacity-50 scale-90"
                )}
                disabled={isLoading || (!userInput.trim() && !pendingFile)}
                onClick={handleFormSubmit}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {authErrors.length > 0 && (
              <div className="mt-2 text-[10px] text-destructive flex items-center justify-between bg-destructive/5 px-3 py-1.5 rounded-full border border-destructive/20 animate-in fade-in slide-in-from-bottom-1">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" /> {authErrors[0]}
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-destructive font-semibold"
                  onClick={handleAuthRecovery}
                >
                  Retry
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Voice Recording Dialog */}
      <Dialog
        open={isVoiceModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Cleanup when closing
            if (isRecording) stopRecording();
            setRecordedAudio(null);
          }
          setIsVoiceModalOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {t("chatbot.voiceRecording.title") || "Voice Recording"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t("chatbot.voiceRecording.subtitle") || "Record your message"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-6">
            {recordedAudio ? (
              <div className="w-full space-y-4">
                <div className="bg-muted p-3 rounded-xl border">
                  <audio ref={audioPreviewRef} controls className="w-full" />
                </div>
                <Button
                  variant="ghost"
                  onClick={handleReRecord}
                  className="w-full text-muted-foreground"
                >
                  🔄 Record Again
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                {/* Audio Wave Animation Container */}
                <div className="relative flex items-center justify-center">
                  {/* Outer Ripple Effects - Only visible when recording */}
                  {isRecording && (
                    <>
                      <span
                        className="absolute w-32 h-32 rounded-full bg-destructive/20 animate-ping"
                        style={{ animationDuration: "2s" }}
                      />
                      <span
                        className="absolute w-28 h-28 rounded-full bg-destructive/30 animate-ping"
                        style={{
                          animationDuration: "1.5s",
                          animationDelay: "0.2s",
                        }}
                      />
                      <span className="absolute w-24 h-24 rounded-full bg-destructive/40 animate-pulse" />
                    </>
                  )}

                  {/* Main Record Button */}
                  <Button
                    variant={isRecording ? "destructive" : "default"}
                    size="lg"
                    className={cn(
                      "rounded-full h-20 w-20 shadow-xl z-10 transition-all duration-300",
                      isRecording ? "scale-110" : "hover:scale-105"
                    )}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    {isRecording ? (
                      <div className="h-7 w-7 bg-white rounded-sm" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                  </Button>
                </div>

                {/* Audio Wave Bars - Visible when recording */}
                {isRecording && (
                  <div className="flex items-center justify-center gap-1 h-10">
                    {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                      <div
                        key={bar}
                        className="w-1.5 bg-destructive rounded-full"
                        style={{
                          animation: `wave-bar 0.8s ease-in-out infinite`,
                          animationDelay: `${bar * 0.1}s`,
                          height: "8px",
                        }}
                      />
                    ))}
                    <style>{`
                      @keyframes wave-bar {
                        0%, 100% { height: 8px; opacity: 0.5; }
                        50% { height: 32px; opacity: 1; }
                      }
                    `}</style>
                  </div>
                )}

                {/* Status Text */}
                <div className="text-center">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isRecording ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {isRecording ? "🔴 Recording..." : "Tap to Speak"}
                  </p>
                  {isRecording && (
                    <p className="text-xs text-muted-foreground mt-1 animate-pulse">
                      Tap the button again to stop
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Optional text input */}
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Add a message (optional)..."
              className="text-center"
            />
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                if (isRecording) stopRecording();
                setRecordedAudio(null);
                setIsVoiceModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!recordedAudio}
              onClick={handleSubmitRecording}
            >
              {recordedAudio ? "🎤 Send Voice" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Warning Dialog */}
      <Dialog open={isVideoWarningOpen} onOpenChange={setIsVideoWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Unsupported File Type
            </DialogTitle>
            <DialogDescription>
              {t("errors.videoNotSupported") ||
                "Video files are not supported at this time."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsVideoWarningOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Chatbot;
