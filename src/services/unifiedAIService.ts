/**
 * Unified AI Service Module
 *
 * Provides a unified interface for AI operations that automatically routes
 * requests to the configured AI provider (Gemini or OpenRouter). This module
 * serves as the main entry point for all AI-powered features in the application.
 *
 * @module unifiedAIService
 */

import {
  getActiveProvider,
  getActiveConfig,
  isAIConfigured,
  getProvidersStatus,
  getPrioritizedProviders,
  reportRateLimit,
  type AIProvider,
} from "../config/aiConfig";

// Re-export types and configuration utilities
export * from "../config/aiConfig";

// ============================================================================
// Types
// ============================================================================

/**
 * Conversation history format (Gemini-style, used as the internal standard).
 */
export interface ConversationMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

/**
 * Multimodal content part for images/audio.
 */
export interface MultimodalPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Executes an AI operation with automatic provider fallback on rate limits.
 *
 * @param operation Callback that performs the AI operation for a given provider.
 * @returns The result of the operation.
 */
const executeWithFallback = async <T>(
  operation: (provider: AIProvider) => Promise<T>
): Promise<T> => {
  const providers = getPrioritizedProviders();
  const triedProviders = new Set<string>();
  let lastError: any;

  for (const config of providers) {
    // Skip if we've already tried this provider (e.g. multiple OpenRouter entries)
    // Note: OpenRouter service handles its own internal fallback (Primary -> Free),
    // so one attempt covers all OpenRouter options.
    if (triedProviders.has(config.provider)) continue;
    triedProviders.add(config.provider);

    try {
      return await operation(config.provider);
    } catch (error: any) {
      lastError = error;

      // Check for rate limit errors (429)
      const isRateLimit =
        error?.status === 429 ||
        error?.code === 429 ||
        error?.message?.includes("429") ||
        error?.message?.toLowerCase().includes("too many requests");

      if (isRateLimit) {
        reportRateLimit(config.provider);
        console.warn(
          `⚠️ Provider ${config.provider} rate limited. Switching to next provider...`
        );
        continue;
      }

      // For non-rate-limit errors, fail fast
      throw error;
    }
  }

  throw lastError || new Error("All AI providers failed or are rate limited.");
};

// ============================================================================
// Main Chat Function
// ============================================================================

/**
 * Sends a contextual chat message to the active AI provider.
 * This is the main entry point for all chat-based AI interactions.
 *
 * @param {string} userMessage - The user's message.
 * @param {ConversationMessage[]} conversationHistory - Previous conversation messages.
 * @param {object} additionalContext - Additional context options.
 * @param {any} userContext - User authentication and role context.
 * @param {string} systemPromptOverride - Custom system prompt override.
 * @param {MultimodalPart[]} multimodalParts - Multimodal content (images, audio).
 * @returns {Promise<string>} The AI assistant's response.
 * @throws {Error} If no AI provider is configured.
 */
export const chat = async (
  userMessage: string,
  conversationHistory: ConversationMessage[] = [],
  additionalContext?: any,
  userContext?: any,
  systemPromptOverride?: string,
  multimodalParts?: MultimodalPart[]
): Promise<string> => {
  if (!isAIConfigured()) {
    throw new Error(
      "No AI provider is configured. Please set VITE_GEMINI_API_KEY or VITE_OPENROUTER_API_KEY in your .env.local file."
    );
  }

  return executeWithFallback(async (provider) => {
    if (provider === "openrouter") {
      const { openRouterChatWithContext } = await import("./openRouterService");
      return openRouterChatWithContext(
        userMessage,
        conversationHistory,
        additionalContext,
        userContext,
        systemPromptOverride,
        multimodalParts
      );
    } else {
      const { chatWithContext } = await import("./geminiService");
      return chatWithContext(
        userMessage,
        conversationHistory,
        additionalContext,
        userContext,
        systemPromptOverride,
        multimodalParts
      );
    }
  });
};

// ============================================================================
// Complaint Analysis (Always uses Gemini or routes to OpenRouter)
// ============================================================================

/**
 * Analyzes a complaint using AI to extract category, urgency, and recommendations.
 * Routes to the active provider's implementation.
 *
 * @param {any} complaint - The complaint object to analyze.
 * @returns {Promise<object>} Analysis results with category, urgency score, etc.
 */
export const analyzeComplaint = async (complaint: any): Promise<any> => {
  return executeWithFallback(async (provider) => {
    if (provider === "openrouter") {
      // Use OpenRouter for analysis
      const { openRouterChatJSON } = await import("./openRouterService");
      const { complaintData } = await import("../data/complaintData");

      const allComplaintTypes = Array.from(
        new Set([
          "Medical Assistance",
          "Security",
          "Divyangjan Facilities",
          "Facilities for Women with Special needs",
          "Electrical Equipment",
          "Coach - Cleanliness",
          "Punctuality",
          "Catering & Vending Services",
          "Water Availability",
          "Staff Behaviour",
          "Bed Roll",
          "Coach - Maintenance",
          "Corruption / Bribery",
          "Miscellaneous",
          "Overcrowding",
          "Unreserved Ticketing",
          "Luggage / Parcels",
          "Reserved Ticketing",
          "Refund of Tickets",
          "Passenger Amenities",
          "Cleanliness",
          "Goods",
          "Other",
        ])
      );

      const prompt = `
      You are an AI assistant for a railway complaint system. Analyze the following complaint and provide a structured JSON response.
      
      Complaint Area: "${complaint.complaintArea}"
      PNR: "${complaint.pnr || "N/A"}"
      Journey Date: "${complaint.journeyDate || "N/A"}"
      Incident Date: "${complaint.incidentDate}"
      User's Complaint Type: "${complaint.complaintType}"
      User's Complaint Sub-Type: "${complaint.complaintSubType}"
      Full Description: "${complaint.description}"

      Analyze all the information and return a JSON object with:
      - category: One of [${allComplaintTypes.map((t) => `"${t}"`).join(", ")}]
      - urgencyScore: Integer from 1-10
      - summary: One sentence summary
      - keywords: Array of important keywords
      - suggestedDepartment: One of ['Operations', 'Maintenance', 'Customer Service', 'Security', 'Medical', 'Catering', 'Electrical', 'Cleaning', 'Ticketing', 'Management']
    `;

      const result = await openRouterChatJSON<{
        category: string;
        urgencyScore: number;
        summary: string;
        keywords: string[];
        suggestedDepartment: string;
      }>([{ role: "user", content: prompt }]);

      return {
        category: result.category || "Other",
        urgencyScore: result.urgencyScore || 3,
        summary: result.summary || "Analysis could not generate a summary.",
        keywords: result.keywords || [],
        suggestedDepartment: result.suggestedDepartment || "Customer Service",
      };
    } else {
      // Default to Gemini's implementation
      const { analyzeComplaintWithAI } = await import("./geminiService");
      return analyzeComplaintWithAI(complaint);
    }
  });
};

// ============================================================================
// File/Media Analysis
// ============================================================================

/**
 * Extracts complaint details from uploaded files (images, audio, video).
 * Routes to the active provider's implementation.
 *
 * @param {Array} fileParts - Array of file data with mimeType and base64 data.
 * @param {string} existingDescription - Optional existing description to enhance.
 * @returns {Promise<object>} Extracted complaint data.
 */
export const extractFromFiles = async (
  fileParts: { mimeType: string; data: string }[],
  existingDescription?: string
): Promise<any> => {
  return executeWithFallback(async (provider) => {
    if (provider === "openrouter") {
      // OpenRouter with multimodal support (images only for most models)
      const { openRouterChatJSON, convertMultimodalContent } = await import(
        "./openRouterService"
      );
      const { complaintData } = await import("../data/complaintData");

      const prompt = `
      Analyze the uploaded image(s) and extract railway complaint information.
      ${
        existingDescription
          ? `User's description: "${existingDescription}"`
          : ""
      }
      
      Return a JSON object with:
      - pnr: 10-digit PNR number if visible
      - journeyDate: Date in YYYY-MM-DD format if available
      - incidentDate: Date in YYYY-MM-DD format
      - complaintArea: "TRAIN" or "STATION"
      - complaintType: Category name
      - complaintSubType: Sub-category name
      - description: Detailed description of the issue
    `;

      // Convert file parts to OpenRouter format
      const content = convertMultimodalContent(
        prompt,
        fileParts.map((p) => ({
          inlineData: p,
        }))
      );

      const result = await openRouterChatJSON([{ role: "user", content }]);
      return result;
    } else {
      // Default to Gemini's implementation
      const { extractComplaintDetailsFromFile } = await import(
        "./geminiService"
      );
      return extractComplaintDetailsFromFile(fileParts, existingDescription);
    }
  });
};

/**
 * Extracts complaint details from a free-text complaint description.
 * Routes to the active provider's implementation so forms and UI use the
 * configured provider (OpenRouter or Gemini) according to app settings.
 *
 * @param {string} description - The user's complaint description.
 * @returns {Promise<any>} Extracted complaint data.
 */
export const extractComplaintDetailsFromText = async (
  description: string
): Promise<any> => {
  if (!description || description.trim().length < 5) return {};

  return executeWithFallback(async (provider) => {
    if (provider === "openrouter") {
      const { openRouterChatJSON } = await import("./openRouterService");
      const { complaintData } = await import("../data/complaintData");
      const { RAILWAY_CONTEXT_PROMPT } = await import("./geminiService");

      const complaintDataString = JSON.stringify(complaintData, null, 2);
      const today = new Date();
      const currentDate = today.toISOString().split("T")[0];
      const currentTime = today.toTimeString().split(" ")[0].substring(0, 5);

      const prompt = `
        You are an AI assistant for a railway complaint system. Your task is to analyze the user's complaint description and extract information to pre-fill a complaint form.

        User's Description:
        """
        ${description}
        """

        Current Date: ${currentDate}
        Current Time: ${currentTime}

        ${RAILWAY_CONTEXT_PROMPT}

        Provide a structured JSON response matching this specific schema:
        {
          "pnr": "10-digit number or null",
          "utsNumber": "UTS number or null",
          "trainNumber": "Train number or null",
          "coachNumber": "Coach identifier (e.g., S5, B1) or null",
          "seatNumber": "Seat/Berth number (e.g., 42, UB, Lower) or null",
          "journeyDate": "YYYY-MM-DD or null",
          "incidentDate": "YYYY-MM-DD or null",
          "incidentTime": "HH:mm or null",
          "complaintArea": "TRAIN or STATION",
          "complaintType": "String from list below",
          "complaintSubType": "String from list below",
          "description": "Enhanced description string",
          "nearestStation": "Station code/name or null",
          "mobileNumber": "10-digit number or null",
          "unauthorizedPeopleCount": "Number or null",
          "platformNumber": "Platform number or null"
        }

        If a piece of information is not explicitly mentioned or clearly inferred, do not include its key in the JSON response.

        **CRITICAL INSTRUCTIONS:**
        1.  **Extract Details:** Look for PNR (10 digits), UTS Number (alphanumeric), Train Number, Coach, Seat/Berth, Station names, Dates, Times, and Mobile Numbers.
        2.  **Categorization:** Determine the 'complaintArea' ('TRAIN' or 'STATION'), 'complaintType', and 'complaintSubType' based on the description. Use the provided JSON structure for valid values.
            \`\`\`json
            ${complaintDataString}
            \`\`\`
        3.  **Inference:**
            - If "today" or "now" is mentioned, use the provided Current Date/Time.
            - If a PNR or UTS number is provided, it is for a TRAIN complaint.
        4.  **Enhance Description:**
            - If the user's description is brief or unstructured, provide an enhanced version in the 'description' field.
            - Format it clearly, correcting any typos and organizing the details.
            - Do NOT invent new facts, but you can infer context (e.g., "S5" implies "Coach S5").
        5.  **Output:** Return ONLY the JSON object.

        Analyze the text and extract the data.
    `;

      const result = await openRouterChatJSON([
        { role: "user", content: prompt },
      ]);
      return result;
    } else {
      const { extractComplaintDetailsFromText } = await import(
        "./geminiService"
      );
      return extractComplaintDetailsFromText(description);
    }
  });
};

// ============================================================================
// Validation Functions (Always use local data, AI-enhanced)
// ============================================================================

/**
 * Validates a station using local data and AI enhancement.
 * These use the local railway data and don't require AI.
 */
export { geminiValidateStation as validateStation } from "./geminiService";
export { geminiValidateTrain as validateTrain } from "./geminiService";
export { geminiValidatePNR as validatePNR } from "./geminiService";

// ============================================================================
// Emergency Handling
// ============================================================================

/**
 * Handles emergency responses with appropriate escalation.
 */
export { geminiTriggerEmergency as triggerEmergency } from "./geminiService";
export { handleEmergencyResponse } from "./geminiService";
export { detectEmergencyInMessage } from "./geminiService";

// ============================================================================
// System Prompts & Context
// ============================================================================

export { RAILMADAD_CHAT_SYSTEM_PROMPT } from "./geminiService";
export { generateUserAwareSystemPrompt } from "./geminiService";
export { filterResponseByUserContext } from "./geminiService";
export { addRealTimeContext } from "./geminiService";

// ============================================================================
// Chatbot Complaint Extraction
// ============================================================================

export { extractComplaintFromChatbotMessage } from "./geminiService";
export type { ExtractedComplaintData } from "./geminiService";

// ============================================================================
// Enquiry Handling
// ============================================================================

export { geminiHandleEnquiry as handleEnquiry } from "./geminiService";

// ============================================================================
// Railway Validation Tools (for function calling)
// ============================================================================

export { railwayValidationTools } from "./geminiService";

// ============================================================================
// Provider Status & Configuration
// ============================================================================

/**
 * Gets detailed status of all AI providers.
 *
 * @returns {object} Status object with availability and active state for each provider.
 */
export const getAIStatus = () => {
  return getProvidersStatus();
};

/**
 * Checks if AI features are available.
 *
 * @returns {boolean} True if at least one provider is configured.
 */
export const isAIAvailable = (): boolean => {
  return isAIConfigured();
};

/**
 * Gets the name of the currently active AI provider.
 *
 * @returns {string} Provider name or "None" if not configured.
 */
export const getActiveProviderName = (): string => {
  const provider = getActiveProvider();
  if (provider === "gemini") return "Google Gemini";
  if (provider === "openrouter") return "OpenRouter";
  return "None";
};

/**
 * Gets the model ID being used by the active provider.
 *
 * @returns {string} Model ID or "Not configured" if no provider is active.
 */
export const getActiveModelId = (): string => {
  const config = getActiveConfig();
  return config?.primaryModel.modelId || "Not configured";
};

// ============================================================================
// Legacy Compatibility - Re-export geminiService functions directly
// ============================================================================

// These re-exports ensure backward compatibility with existing code
// that imports directly from geminiService
export { chatWithContext } from "./geminiService";
export { analyzeComplaintWithAI } from "./geminiService";
export { extractFromFiles as extractComplaintDetailsFromFile };
