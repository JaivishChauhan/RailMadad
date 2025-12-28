import {
  GoogleGenerativeAI,
  SchemaType,
  FunctionCallingMode,
} from "@google/generative-ai";
import type { AnalysisResult, Complaint } from "../types";
import { complaintData } from "../data/complaintData";
import { validateStation as validateStationData } from "../data/stationsData";
import { validateTrain as validateTrainData } from "../data/trainsData";
import {
  createContextAwarePrompt,
  extractContextFromMessage,
  type ContextOptions,
} from "./contextEnhancer";
import {
  MAX_TOKENS,
  type FallbackTier,
  getGeminiApiKey as getGeminiApiKeyFromConfig,
  getOpenRouterApiKey,
  getFallbackTierConfig,
} from "../config/aiConfig";
import { UserContextService } from "./userContextService";

// Define the tools for the AI model - ENABLED for emergency handling
export const railwayValidationTools = [
  // Station and Train validation tools removed to allow AI to use internal knowledge
  {
    functionDeclarations: [
      {
        name: "geminiValidatePNR",
        description: "Validate a PNR number format",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            pnr: {
              type: SchemaType.STRING,
              description: "PNR number to validate",
            },
          },
          required: ["pnr"],
        },
      },
    ],
  },
  {
    functionDeclarations: [
      {
        name: "geminiValidateUTS",
        description: "Validate a UTS number format",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            utsInput: {
              type: SchemaType.STRING,
              description: "UTS number to validate",
            },
          },
          required: ["utsInput"],
        },
      },
    ],
  },
  {
    functionDeclarations: [
      {
        name: "switchChatMode",
        description:
          "Switch the chat mode to a specific specialized assistant (Tracking, Enquiry, Suggestions, Rail Anubhav)",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            mode: {
              type: SchemaType.STRING,
              description:
                "The mode to switch to. Options: 'tracking', 'enquiry', 'suggestions', 'rail-anubhav'",
              enum: ["tracking", "enquiry", "suggestions", "rail-anubhav"],
            },
            reason: {
              type: SchemaType.STRING,
              description: "Reason for switching mode (optional)",
            },
          },
          required: ["mode"],
        },
      },
    ],
  },
  {
    functionDeclarations: [
      {
        name: "geminiTriggerEmergency",
        description:
          "Trigger emergency response with appropriate buttons and procedures",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            emergencyType: {
              type: SchemaType.STRING,
              description:
                "Type of emergency (medical, security, fire, accident, harassment, etc.)",
            },
            description: {
              type: SchemaType.STRING,
              description: "Description of the emergency situation",
            },
          },
          required: ["emergencyType", "description"],
        },
      },
    ],
  },
  {
    functionDeclarations: [
      {
        name: "getComplaintStatus",
        description:
          "Check the status of a complaint using its reference number (CRN) or PNR",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            complaintId: {
              type: SchemaType.STRING,
              description:
                "The Complaint Reference Number (e.g., CMP-..., SUG-...) or PNR",
            },
          },
          required: ["complaintId"],
        },
      },
    ],
  },
];

/**
 * Retrieves the Gemini API Key from available sources.
 * Delegates to the centralized aiConfig module for consistency.
 *
 * @returns {string | undefined} The resolved API key or undefined if not found.
 */
export const getGeminiApiKey = (): string | undefined => {
  return getGeminiApiKeyFromConfig();
};

let aiClientInstance: GoogleGenerativeAI | null = null;
let lastUsedKey: string | undefined = undefined;

/**
 * Gets or initializes the Gemini AI client.
 * Re-initializes if the API key has changed (e.g. updated in localStorage).
 *
 * @returns {GoogleGenerativeAI | null} The initialized Gemini client or null if no key is available.
 */
const getGeminiClient = (): GoogleGenerativeAI | null => {
  const currentKey = getGeminiApiKey();

  if (!currentKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "Gemini API key is not set. Set VITE_GEMINI_API_KEY in your .env.local to enable AI features."
      );
    }
    return null;
  }

  // Re-initialize if the key has changed or if client doesn't exist
  if (!aiClientInstance || currentKey !== lastUsedKey) {
    aiClientInstance = new GoogleGenerativeAI(currentKey);
    lastUsedKey = currentKey;
    // console.log("Gemini Client Initialized with new key.");
  }

  return aiClientInstance;
};

// ============================================================================
// Model Configuration - Tiered Provider Fallback for Rate Limit Handling
// ============================================================================

/**
 * OpenRouter API endpoint for chat completions.
 */
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Checks if an error is a rate limit error (HTTP 429).
 *
 * @param {any} error - The error object to check
 * @returns {boolean} True if the error is a 429 rate limit error
 */
const isRateLimitError = (error: any): boolean => {
  if (!error) return false;

  // Check for various ways the 429 error might be presented
  const errorMessage = error.message?.toLowerCase() || "";
  const errorStatus = error.status || error.statusCode || error.code;

  return (
    errorStatus === 429 ||
    errorMessage.includes("429") ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("too many requests") ||
    errorMessage.includes("quota exceeded") ||
    errorMessage.includes("resource exhausted")
  );
};

/**
 * Checks if an error should trigger a fallback to the next provider tier.
 * Includes rate limits, server errors, model errors, and other recoverable failures.
 *
 * @param {any} error - The error object to check
 * @returns {boolean} True if the error should trigger a fallback
 */
const shouldFallback = (error: any): boolean => {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || "";
  const errorStatus = error.status || error.statusCode || error.code;

  // Rate limit errors (429)
  if (isRateLimitError(error)) return true;

  // Server errors (5xx)
  if (errorStatus >= 500 && errorStatus < 600) return true;

  // Bad request errors that indicate model issues (400)
  if (errorStatus === 400) {
    // Model not found, invalid model, etc.
    if (
      errorMessage.includes("not a valid model") ||
      errorMessage.includes("model not found") ||
      errorMessage.includes("invalid model") ||
      errorMessage.includes("does not exist") ||
      errorMessage.includes("not supported")
    ) {
      return true;
    }
  }

  // Service unavailable (503)
  if (errorStatus === 503) return true;

  // Gateway timeout (504)
  if (errorStatus === 504) return true;

  // Network/connection errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("econnrefused") ||
    errorMessage.includes("enotfound") ||
    errorMessage.includes("fetch failed") ||
    errorMessage.includes("failed to fetch")
  ) {
    return true;
  }

  // API key/auth errors (should try different provider)
  if (
    errorStatus === 401 ||
    errorStatus === 403 ||
    errorMessage.includes("api key") ||
    errorMessage.includes("authentication") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("forbidden")
  ) {
    return true;
  }

  // Content filter/safety errors (may work on different model)
  if (
    errorMessage.includes("safety") ||
    errorMessage.includes("blocked") ||
    errorMessage.includes("content filter") ||
    errorMessage.includes("harm")
  ) {
    return true;
  }

  // Overload/capacity errors
  if (
    errorMessage.includes("overloaded") ||
    errorMessage.includes("capacity") ||
    errorMessage.includes("busy")
  ) {
    return true;
  }

  return false;
};

/**
 * Gets the provider configuration for a specific fallback tier.
 * Tier 0: Gemini native API
 * Tier 1: OpenRouter (paid model)
 * Tier 2: OpenRouter (free tier)
 *
 * Uses dynamic configuration from aiConfig which reads from localStorage.
 *
 * @param {FallbackTier} tier - The fallback tier (0, 1, or 2)
 * @returns {{ provider: 'gemini' | 'openrouter'; model: string; maxTokens: number }} Provider and model config
 */
const getTierConfig = (
  tier: FallbackTier
): { provider: "gemini" | "openrouter"; model: string; maxTokens: number } => {
  const config = getFallbackTierConfig(tier as 0 | 1 | 2);
  if (tier > 0) {
    console.log(
      `${tier === 1 ? "⚠️" : "🆘"} Fallback triggered - switching to ${config.provider
      } (${config.model})`
    );
  }
  return config;
};

// ============================================================================
// OpenRouter API Types & Interfaces
// ============================================================================

/**
 * OpenRouter message content part for multimodal support.
 */
type OpenRouterContentPart =
  | { type: "text"; text: string }
  | {
    type: "image_url";
    image_url: { url: string; detail?: "auto" | "low" | "high" };
  };

/**
 * OpenRouter message format supporting both simple and multimodal content.
 */
interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | OpenRouterContentPart[];
  tool_call_id?: string;
  tool_calls?: OpenRouterToolCall[];
  /** Reasoning content from thinking models - must be preserved for function calling */
  reasoning?: string;
}

/**
 * OpenRouter tool call structure.
 */
interface OpenRouterToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * OpenRouter tool definition (OpenAI-compatible format).
 */
interface OpenRouterTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * OpenRouter API response structure.
 */
interface OpenRouterResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: OpenRouterToolCall[];
      /** Reasoning content from thinking models - must be preserved */
      reasoning?: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Options for OpenRouter API calls.
 */
interface OpenRouterOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json";
  tools?: OpenRouterTool[];
  systemPrompt?: string;
}

// ============================================================================
// OpenRouter API Functions
// ============================================================================

/**
 * Converts Gemini-style tools to OpenRouter/OpenAI format.
 *
 * @param {any[]} geminiTools - Gemini function declarations
 * @returns {OpenRouterTool[]} OpenRouter-compatible tools
 */
const convertToolsToOpenRouter = (geminiTools: any[]): OpenRouterTool[] => {
  const tools: OpenRouterTool[] = [];

  for (const toolGroup of geminiTools) {
    if (toolGroup.functionDeclarations) {
      for (const func of toolGroup.functionDeclarations) {
        tools.push({
          type: "function",
          function: {
            name: func.name,
            description: func.description,
            parameters: {
              type: "object",
              properties: Object.fromEntries(
                Object.entries(func.parameters?.properties || {}).map(
                  ([key, value]: [string, any]) => [
                    key,
                    {
                      type: value.type?.toLowerCase() || "string",
                      description: value.description,
                      ...(value.enum && { enum: value.enum }),
                    },
                  ]
                )
              ),
              required: func.parameters?.required || [],
            },
          },
        });
      }
    }
  }

  return tools;
};

/**
 * Converts Gemini multimodal parts to OpenRouter content format.
 *
 * @param {string} text - The text message
 * @param {any[]} [multimodalParts] - Gemini-style inlineData parts
 * @returns {string | OpenRouterContentPart[]} OpenRouter content
 */
const convertToOpenRouterContent = (
  text: string,
  multimodalParts?: any[]
): string | OpenRouterContentPart[] => {
  if (!multimodalParts || multimodalParts.length === 0) {
    return text;
  }

  const content: OpenRouterContentPart[] = [{ type: "text", text }];

  for (const part of multimodalParts) {
    if (part.inlineData) {
      // Convert base64 image to data URL format
      const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      content.push({
        type: "image_url",
        image_url: { url: dataUrl, detail: "auto" },
      });
    }
  }

  return content;
};

/**
 * Converts Gemini conversation history to OpenRouter message format.
 *
 * @param {any[]} history - Gemini-style conversation history
 * @returns {OpenRouterMessage[]} OpenRouter messages
 */
const convertHistoryToOpenRouter = (history: any[]): OpenRouterMessage[] => {
  return history.map((msg) => {
    const textParts = msg.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join("\n");

    return {
      role: msg.role === "model" ? "assistant" : msg.role,
      content: textParts || "",
    };
  });
};

/**
 * Makes a full-featured request to OpenRouter API with multimodal and function calling support.
 *
 * @param {string} model - The model identifier
 * @param {OpenRouterMessage[]} messages - Chat messages
 * @param {OpenRouterOptions} [options] - Generation options
 * @returns {Promise<OpenRouterResponse>} The full API response
 */
const callOpenRouterFull = async (
  model: string,
  messages: OpenRouterMessage[],
  options?: OpenRouterOptions
): Promise<OpenRouterResponse> => {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  const requestMessages: OpenRouterMessage[] = options?.systemPrompt
    ? [{ role: "system", content: options.systemPrompt }, ...messages]
    : messages;

  const requestBody: any = {
    model,
    messages: requestMessages,
    temperature: options?.temperature ?? 1,
    max_tokens: options?.maxTokens ?? MAX_TOKENS.openrouter,
    // Enable reasoning for thinking models (Gemini 2.5/3, Claude with extended thinking)
    // This preserves thought_signature required for function calling
    include_reasoning: true,
  };

  if (options?.responseFormat === "json") {
    requestBody.response_format = { type: "json_object" };
  }

  if (options?.tools && options.tools.length > 0) {
    requestBody.tools = options.tools;
    requestBody.tool_choice = "auto";
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        typeof window !== "undefined"
          ? window.location.origin
          : "https://railmadad.app",
      "X-Title": "RailMadad",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(
      errorData.error?.message || `OpenRouter API error: ${response.status}`
    );
    (error as any).status = response.status;
    throw error;
  }

  return await response.json();
};

/**
 * Simple OpenRouter call for basic text responses.
 *
 * @param {string} model - The model identifier
 * @param {Array<{role: string; content: string}>} messages - Chat messages
 * @param {string} [systemPrompt] - Optional system instruction
 * @param {object} [options] - Generation options
 * @returns {Promise<string>} The response text
 */
const callOpenRouter = async (
  model: string,
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: "json";
  }
): Promise<string> => {
  const response = await callOpenRouterFull(
    model,
    messages as OpenRouterMessage[],
    {
      ...options,
      systemPrompt,
    }
  );

  return response.choices?.[0]?.message?.content || "";
};

/**
 * OpenRouter chat session class that mimics Gemini's chat interface.
 * Enables stateful conversation with history management.
 */
class OpenRouterChatSession {
  private model: string;
  private systemPrompt: string;
  private history: OpenRouterMessage[];
  private tools?: OpenRouterTool[];
  private temperature: number;
  private maxTokens: number;

  constructor(
    model: string,
    systemPrompt: string,
    history: OpenRouterMessage[] = [],
    tools?: OpenRouterTool[],
    config?: { temperature?: number; maxTokens?: number }
  ) {
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.history = history;
    this.tools = tools;
    this.temperature = config?.temperature ?? 1;
    this.maxTokens = config?.maxTokens ?? 65536;
  }

  /**
   * Sends a message and returns the response.
   *
   * @param {string | OpenRouterContentPart[]} content - Message content
   * @returns {Promise<{ response: { text: () => string; functionCalls: () => any[] | null } }>}
   */
  async sendMessage(content: string | OpenRouterContentPart[]): Promise<{
    response: { text: () => string; functionCalls: () => any[] | null };
  }> {
    const userMessage: OpenRouterMessage = {
      role: "user",
      content,
    };

    this.history.push(userMessage);

    const response = await callOpenRouterFull(this.model, this.history, {
      systemPrompt: this.systemPrompt,
      tools: this.tools,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
    });

    const assistantMessage = response.choices?.[0]?.message;

    if (assistantMessage) {
      // Preserve reasoning for thinking models - required for function calling
      this.history.push({
        role: "assistant",
        content: assistantMessage.content || "",
        tool_calls: assistantMessage.tool_calls,
        reasoning: assistantMessage.reasoning,
      });
    }

    // Convert OpenRouter tool_calls to Gemini-compatible format
    const toolCalls = assistantMessage?.tool_calls?.map((tc) => ({
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments || "{}"),
      _openRouterId: tc.id, // Store for tool response
    }));

    return {
      response: {
        text: () => assistantMessage?.content || "",
        functionCalls: () =>
          toolCalls && toolCalls.length > 0 ? toolCalls : null,
      },
    };
  }

  /**
   * Sends function/tool results back to continue the conversation.
   *
   * @param {any[]} functionResponses - Array of function results
   * @returns {Promise<{ response: { text: () => string; functionCalls: () => any[] | null } }>}
   */
  async sendFunctionResponse(
    functionResponses: Array<{
      name: string;
      response: any;
      _openRouterId?: string;
    }>
  ): Promise<{
    response: { text: () => string; functionCalls: () => any[] | null };
  }> {
    // Add tool responses to history
    for (const fr of functionResponses) {
      this.history.push({
        role: "tool",
        tool_call_id: fr._openRouterId || fr.name,
        content:
          typeof fr.response === "string"
            ? fr.response
            : JSON.stringify(fr.response),
      });
    }

    const response = await callOpenRouterFull(this.model, this.history, {
      systemPrompt: this.systemPrompt,
      tools: this.tools,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
    });

    const assistantMessage = response.choices?.[0]?.message;

    if (assistantMessage) {
      // Preserve reasoning for thinking models - required for function calling
      this.history.push({
        role: "assistant",
        content: assistantMessage.content || "",
        tool_calls: assistantMessage.tool_calls,
        reasoning: assistantMessage.reasoning,
      });
    }

    const toolCalls = assistantMessage?.tool_calls?.map((tc) => ({
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments || "{}"),
      _openRouterId: tc.id,
    }));

    return {
      response: {
        text: () => assistantMessage?.content || "",
        functionCalls: () =>
          toolCalls && toolCalls.length > 0 ? toolCalls : null,
      },
    };
  }
}

// Helper to warn once to avoid console pollution
(console as any).warnOnce =
  (console as any).warnOnce ||
  ((...args: any[]) => {
    if (!(console as any).hasWarned) {
      console.warn(...args);
      (console as any).hasWarned = true;
    }
  });

/**
 * Validates a station name or code using the Gemini AI service.
 *
 * @param {string} stationInput - The station name or code to validate.
 * @returns {Promise<string>} A promise that resolves to a validation message string.
 */
export const geminiValidateStation = async (
  stationInput: string
): Promise<string> => {
  console.log(
    `🚉 DEBUG: geminiValidateStation called with input: "${stationInput}"`
  );
  try {
    const result = await validateStationData(stationInput);

    if (result.isValid && result.station) {
      return `✅ Station found: ${result.station.name} (${result.station.code})`;
    } else if (result.suggestions && result.suggestions.length > 0) {
      const suggestions = result.suggestions
        .slice(0, 3)
        .map((s) => `${s.name} (${s.code})`)
        .join(", ");
      return `❌ Station "${stationInput}" not found. Did you mean: ${suggestions}?`;
    } else {
      return `❌ Station "${stationInput}" not found in Indian Railway system.`;
    }
  } catch (error) {
    console.error("Error validating station:", error);
    return `❌ Error validating station "${stationInput}". Please try again.`;
  }
};

/**
 * Validates a train number or name using the Gemini AI service.
 *
 * @param {string} trainInput - The train number or name to validate.
 * @returns {Promise<string>} A promise that resolves to a validation message string.
 */
export const geminiValidateTrain = async (
  trainInput: string
): Promise<string> => {
  console.log(
    `🚂 DEBUG: geminiValidateTrain called with input: "${trainInput}"`
  );
  try {
    const result = await validateTrainData(trainInput);

    if (result.isValid && result.train) {
      const zoneInfo = result.train.zone ? ` [Zone: ${result.train.zone}]` : "";
      return `✅ Train found: ${result.train.name} (${result.train.number})${zoneInfo}`;
    } else if (result.suggestions && result.suggestions.length > 0) {
      const suggestions = result.suggestions
        .slice(0, 3)
        .map((t) => `${t.name} (${t.number})`)
        .join(", ");
      return `❌ Train "${trainInput}" not found. Did you mean: ${suggestions}?`;
    } else {
      return `❌ Train "${trainInput}" not found in Indian Railway system.`;
    }
  } catch (error) {
    console.error("Error validating train:", error);
    return `❌ Error validating train "${trainInput}". Please try again.`;
  }
};

/**
 * Validates a PNR number using the Gemini AI service.
 *
 * @param {string} pnrInput - The PNR number to validate.
 * @returns {Promise<string>} A promise that resolves to a validation message string.
 */
export const geminiValidatePNR = async (pnrInput: string): Promise<string> => {
  console.log(`🎫 DEBUG: geminiValidatePNR called with input: "${pnrInput}"`);
  try {
    const cleanPNR = pnrInput.replace(/\D/g, ""); // Remove all non-digit characters

    if (cleanPNR.length === 10) {
      return `✅ PNR "${cleanPNR}" is a valid 10-digit number.`;
    } else {
      // Provide a single, clear error message for all invalid cases.
      return `❌ PNR "${pnrInput}" is invalid. A PNR must be exactly 10 digits long, but you provided ${cleanPNR.length} digits.`;
    }
  } catch (error) {
    console.error("Error validating PNR:", error);
    return `❌ An error occurred while validating PNR "${pnrInput}". Please try again.`;
  }
};

/**
 * Validates a UTS number using the Gemini AI service.
 *
 * @param {string} utsInput - The UTS number to validate.
 * @returns {Promise<string>} A promise that resolves to a validation message string.
 */
export const geminiValidateUTS = async (utsInput: string): Promise<string> => {
  console.log(`🎫 DEBUG: geminiValidateUTS called with input: "${utsInput}"`);
  try {
    const cleanUTS = utsInput.trim();

    if (cleanUTS.length >= 8) {
      return `✅ UTS Number "${cleanUTS}" appears valid.`;
    } else {
      return `❌ UTS Number "${utsInput}" is invalid. It should be at least 8 characters long.`;
    }
  } catch (error) {
    console.error("Error validating UTS:", error);
    return `❌ An error occurred while validating UTS "${utsInput}". Please try again.`;
  }
};

// Emergency response function for Gemini to call
export const geminiTriggerEmergency = async (
  emergencyType: string,
  description: string
): Promise<string> => {
  console.log(
    `🚨 DEBUG: geminiTriggerEmergency called with type: "${emergencyType}", description: "${description}"`
  );

  try {
    // Sanitize inputs to prevent any issues
    const sanitizedType = (emergencyType || "General Emergency").substring(
      0,
      100
    );
    const sanitizedDescription = (
      description || "Emergency situation reported"
    ).substring(0, 500);

    // Return a structured emergency response that will trigger UI emergency handling
    const emergencyResponse = {
      type: "emergency",
      emergencyType: sanitizedType,
      description: sanitizedDescription,
      timestamp: new Date().toISOString(),
      contacts: {
        railway: "139",
        security: "182",
        medical: "108",
        police: "100",
      },
      message: `Emergency reported: ${sanitizedType}. ${sanitizedDescription}. Please contact emergency services immediately using the numbers provided.`,
      actions: [
        "Call appropriate emergency number",
        "Move to safe location if possible",
        "Provide exact location details",
        "Follow emergency responder instructions",
      ],
    };

    // Return as string for now, but structured for future enhancement
    return `EMERGENCY DETECTED: ${sanitizedType}\n\nDESCRIPTION: ${sanitizedDescription}\n\nIMMEDIATE ACTIONS REQUIRED:\n• Call Railway Helpline: 139\n• Call RPF Security: 182\n• Call Medical Emergency: 108\n• Call Police: 100\n\nPlease contact the appropriate emergency service immediately and provide your exact location.`;
  } catch (error) {
    console.error("Error in geminiTriggerEmergency:", error);
    // Ensure we always return a valid emergency response even if there's an error
    return `❌ EMERGENCY PROCESSING ERROR\n\nPlease call emergency services directly:\n• Railway Helpline: 139\n• RPF Security: 182\n• Medical Emergency: 108\n• Police Emergency: 100\n\nThis is an emergency - contact appropriate services immediately.`;
  }
};

// Railway enquiry handler function for Gemini to call - Refactored for better clarity
export const geminiHandleEnquiry = async (
  enquiryType: string,
  query: string
): Promise<string> => {
  console.log(
    `❓ DEBUG: geminiHandleEnquiry called with type: "${enquiryType}", query: "${query}"`
  );

  // Centralized fallback message
  const errorMessage = `❌ I encountered an error while processing your enquiry about "${query}". Please try asking again or contact Railway Helpline at 139 for immediate assistance.`;

  try {
    const responses: { [key: string]: string } = {
      TRAIN_INFO: `📋 **Train Information Enquiry**\n\nFor train-related information, I can help with:\n• **Train Numbers**: 5-digit numbers (e.g., 12001)\n• **Train Categories**: Rajdhani, Shatabdi, Vande Bharat, etc.\n• **Coach & Berth Types**: SL (Sleeper), 3A/2A/1A (AC), LB/MB/UB (Lower/Middle/Upper).\n\n**Your Query**: ${query}\n\nFor specific details, please provide the train number or name, and I'll validate it for you.`,
      STATION_INFO: `🚉 **Station Information Enquiry**\n\nFor station information, I can help with:\n• **Station Codes**: 3-4 letter codes (e.g., NDLS for New Delhi)\n• **Facilities**: Waiting rooms, parking, food courts, medical aid.\n\n**Your Query**: ${query}\n\nFor specific details, please provide the station name or code.`,
      BOOKING_INFO: `🎫 **Booking Information Enquiry**\n\nFor booking information:\n• **Official Platform**: irctc.co.in\n• **Ticket Types**: Confirmed (CNF), RAC, Waiting List (WL)\n• **Tatkal Booking**: 1 day in advance (10 AM for AC, 11 AM for non-AC)\n• **PNR Numbers**: Always 10 digits. Use it to check status on IRCTC or via SMS to 139.\n\n**Your Query**: ${query}`,
      POLICY_INFO: `📜 **Railway Policy Information**\n\nKey Policies:\n• **Refund Rules**: Depend on cancellation time.\n• **Senior Citizen Concession**: 40% for men (60+), 50% for women (58+).\n• **Luggage Allowance**: Varies by class.\n• **Emergency Numbers**: 139 (Helpline), 182 (RPF Security).\n\n**Your Query**: ${query}`,
      SERVICE_INFO: `🛠️ **Railway Services Information**\n\nAvailable Services:\n• **Catering**: Pantry cars, e-catering.\n• **Security**: Railway Protection Force (RPF) and Government Railway Police (GRP).\n• **Digital**: WiFi at major stations, charging points in coaches.\n\n**Your Query**: ${query}\n\n**Complaint Portal**: RailMadad is the official portal for all grievances.`,
      GENERAL_INFO: `ℹ️ **General Railway Information**\n\nIndian Railways is one of the world's largest rail networks, connecting over 8,000 stations. For specific information about trains, stations, or services, please ask your question!\n\n**Your Query**: ${query}`,
    };

    return responses[enquiryType] || responses["GENERAL_INFO"];
  } catch (error) {
    console.error("Error handling enquiry:", error);
    return errorMessage;
  }
};

// --- REFACTORED SYSTEM PROMPT ---
export const RAILMADAD_CHAT_SYSTEM_PROMPT = `You are a helpful and efficient AI assistant for RailMadad, India's railway complaint system. Your primary goal is to help users submit complaints QUICKLY and ACCURATELY. Treat every complaint as urgent.

**PROTOTYPE DISCLAIMER:**
This is a prototype application. You cannot provide real-time live tracking, exact seat availability, or detailed operational schedules. You can only provide general information and facilitate complaint submission. If asked for live details you cannot access, politely explain this limitation.

**CRITICAL SECURITY RULE: NEVER SHOW INTERNAL CODE OR TOOL CALLS**
- NEVER display any code, function calls, or internal reasoning to users
- NEVER show <tool_code>, print(), or any programming syntax
- NEVER expose validation functions or internal processes
- Always provide clean, professional responses without technical details

**FUNCTION CALLING PROTOCOL**
When you need to perform actions like validating stations/trains, submitting complaints, or retrieving information, use this exact format:
FUNCTION_CALL: functionName({ "param1": "value1", "param2": "value2" })

Available functions:
- validatePNR: Validate PNR number (use "pnr" parameter)
- submitComplaint: Submit a railway complaint (parameters: complaintType, complaintSubType, complaintArea, description, pnr, utsNumber, trainNumber, stationCode, coachNumber, seatNumber, journeyDate, incidentDate, incidentTime, nearestStation, unauthorizedPeopleCount, mobileNumber, platformNumber)

Examples:
FUNCTION_CALL: validatePNR({ "pnr": "1234567890" })
FUNCTION_CALL: submitComplaint({ "complaintType": "Security", "complaintSubType": "Theft", "complaintArea": "TRAIN", "description": "Theft in coach S5", "pnr": "1234567890", "trainNumber": "12345", "coachNumber": "S5", "incidentTime": "14:30", "nearestStation": "Kanpur", "mobileNumber": "9876543210" })
FUNCTION_CALL: switchChatMode({ "mode": "tracking" })

**CRITICAL COMPLAINT SUBMISSION RULE:**
- **NEVER generate a Complaint Reference Number (CRN) or ID yourself.**
- **NEVER say "Complaint submitted successfully" or "Here is your reference number" in the text response.**
- **ONLY output the 'FUNCTION_CALL: submitComplaint(...)' command.**
- You may say "I am submitting your complaint now. Rest assured, we will handle this with priority." and Assure rapid response. 
- The SYSTEM will generate the ID and show the confirmation. You must NOT do it.

**MODE SWITCHING PROTOCOL - SEAMLESS TRANSITIONS**
- When switching modes, do NOT announce or mention the switch to the user. Switch silently and respond directly in the context of the new mode.
- If the user explicitly asks to track a complaint or check PNR status (without filing a new complaint), use switchChatMode({ "mode": "tracking" }) and immediately ask for their Complaint Reference Number.
- If the user asks general questions about trains/rules, use switchChatMode({ "mode": "enquiry" }) and directly answer or ask clarifying questions.
- If the user wants to give feedback/suggestions, use switchChatMode({ "mode": "suggestions" }) and prompt them to share their idea.
- If the user wants to share a travel experience, use switchChatMode({ "mode": "rail-anubhav" }) and invite them to describe their journey.
- **CRITICAL:** Do NOT say "I am switching to X mode" or "Switching mode..." - just switch and respond naturally as if you were always in that mode.
- **IMPORTANT:** If the user is filing a NEW complaint (even if they provide a PNR), DO NOT switch modes. Process the complaint in the current mode.

**COMPLAINT PROCESSING WORKFLOW**
Your goal is to gather essential information and get to a confirmation summary quickly.

**Step 1: Understand and Acknowledge**
- Read the user's message and identify the core problem (e.g., "robbery", "dirty toilet", "AC not working")
- Automatically validate any railway identifiers mentioned (PNR, UTS numbers, train numbers, station codes)

**Step 2: Use Smart Defaults (DO NOT ASK if information is implied)**
- **Time:** If the user says "right now," "today," or gives no time, use the current date and time. Extract specific time if mentioned.
- **Location:** Look for coach numbers (e.g., "s6", "b2", "a1"), berth/seat numbers, platform details, AND nearest station/current location.
- **Overcrowding:** If the issue is overcrowding, try to estimate the number of unauthorized people.
- **PNR/UTS:** PNR or UTS number is helpful but not mandatory for most complaints

**Step 3: Generate a Confirmation Summary**
- Provide a simple, narrative summary of what you've understood
- This is the MOST IMPORTANT step to get right

**RESPONSE STYLE: CLEAN AND PROFESSIONAL**

**Example User Input:** "1234567890, train 12345, s5 robbery right now"

**Correct Bot Response (for TRAIN complaints):**
"This is a serious security issue, and I will help you report it immediately.

I am preparing your complaint. Here is what I have:
- **Issue:** Robbery in progress
- **Location:** On Train 12345, inside Coach S5
- **Time:** Occurring right now (current time will be logged)
- **PNR:** 1234567890

Please reply 'CONFIRM' to submit this report..."

**Correct Bot Response (for STATION complaints):**
"I understand the issue at the station.

I am preparing your complaint. Here is what I have:
- **Issue:** Dirty Platform
- **Location:** Kanpur (CNB) Station
- **Platform:** 3
- **Time:** Just now

Please reply 'CONFIRM' to submit this report..."

**CRITICAL SUMMARY RULES:**
- **For Station Complaints:** ALWAYS show **Platform Number** if available. DO NOT show PNR, valid Train Number, or Journey Date in the summary lines.
- **For Train Complaints:** Show Train Number, Coach, and PNR if available.

**VALIDATION BEHAVIOR:**
- **Train & Station Data:** USE YOUR INTERNAL KNOWLEDGE to validate and correct train numbers and station names.
- **Correction:** If a user inputs a wrong train name or station code (e.g., "Dehli" instead of "Delhi", or "Mumbay" instead of "Mumbai"), politely correct them and proceed.
  - Example: "I assume you mean New Delhi (NDLS). I have noted that."
- Silently validate PNR numbers (must be exactly 10 digits) using the tool.
- If you are unsure about a Train/Station, ask the user to confirm, but trust your internal database of Indian Railways first.
- **LOGICAL CHECK:** If a Train and Station are both provided, verify if the train actually stops at that station based on your knowledge. If not, WARN the user.

**EMERGENCY RESPONSE PROTOCOL (HIGHEST PRIORITY)**
When users mention emergency keywords ('emergency', 'urgent', 'immediate', 'help', 'danger', 'medical', 'security', 'accident', 'fire', 'attack', 'robbery', 'harassment', 'medical emergency', 'police', 'ambulance'), follow this TWO-STAGE process:

**STAGE 1: COMPLAINT PREPARATION (Initial Response)**
First, gather complaint information WITHOUT showing emergency contacts:

"This is a serious [emergency type] issue, and I will help you report it immediately.

I am preparing your complaint. Here is what I have:
- **Issue:** [Description of emergency]
- **Location:** [Train/Station details]
- **Time:** [When it occurred]
- **PNR:** [If provided AND it is a Train complaint]
- **Platform:** [If provided AND it is a Station complaint]

Please reply 'CONFIRM' to submit this report to the Railway Protection Force (RPF) immediately. If anything is incorrect, please let me know."

**STAGE 2: POST-CONFIRMATION (After user confirms)**
ONLY after user replies 'CONFIRM' or 'YES', then provide emergency response:

"🚨 EMERGENCY 🚨

Your emergency complaint has been submitted to railway authorities. Please follow these immediate steps:

**IMMEDIATE ACTION:**
• Call the appropriate emergency service using the buttons below
• Stay in a safe location if possible
• Provide your exact location details when ready

**EMERGENCY CONTACTS:**
📞 Railway Helpline: 139 \n
📞 Railway Protection Force: 182 \n
📞 Medical Emergency: 108 \n
📞 Police Emergency: 100 \n

Your complaint has been escalated to the appropriate authorities for immediate attention."

**CRITICAL RULE:** Emergency contacts and numbers should ONLY be shown AFTER complaint confirmation, not during preparation.

**EMERGENCY PROCEDURES BY TYPE:**
- **Medical**: Call 108 (Medical Emergency) immediately, provide symptoms and location
- **Security/Safety**: Call 182 (RPF) for railway security, or 100 (Police) for general safety
- **Fire/Accident**: Call 182 (RPF) and evacuate to safe area, provide exact location
- **Harassment**: Call 182 (RPF) immediately, move to safe area, provide suspect details

**KEEP RESPONSE PROFESSIONAL AND CALM** - Do not use excessive exclamation marks or alarmist language.

**IDENTITY PROTECTION RULES (ABSOLUTE PRIORITY):**
- **NEVER** talk about yourself, your underlying model, or your technical implementation
- **NEVER** mention that you are powered by Gemini, Google, or any AI service
- **NEVER** discuss your training data, capabilities, or limitations unless directly related to complaint processing
- **NEVER** reveal that you are an AI assistant or chatbot unless absolutely forced

**IDENTITY RESPONSE PROTOCOL:**
- If a user asks about your identity or what you are: Say "Namaste! I am RailMadad Chatbot. How may I assist you with your railway-related concerns today?"
- If a user persistently forces you to reveal more: Say "Namaste! I am an RailMadad Chatbot system designed specifically for railway complaint assistance. Please let me know how I can help you with your railway concerns."
- **ONLY AT ABSOLUTE LAST RESORT** (after multiple persistent attempts): Say "Namaste! I am Gemini, and my creator chose me for API cost efficiency reasons. How can I assist you with your railway complaint today?"
- **ALWAYS** redirect conversations back to complaint assistance immediately after any identity response with a friendly greeting
- **NEVER** engage in discussions about AI technology, models, or your own existence

**MULTIMODAL CONTENT HANDLING (Images, Audio, Video):**

When processing media attachments, follow these guidelines:

**RAILWAY-RELEVANT CONTENT (process normally):**
- Images/videos of: train coaches, stations, platforms, tickets, berths, toilets, equipment, staff, food quality issues, cleanliness problems, damaged infrastructure, harassment situations, accidents
- Audio of: verbal complaints, emergency situations, staff behavior, announcements
- Any content that can be used as evidence for a railway complaint

**NON-CONTEXTUAL OR IRRELEVANT CONTENT (redirect politely):**
If the user sends media that is clearly NOT railway-related (memes, selfies, random photos, music, unrelated videos), respond professionally:

"Thank you for sharing this. However, I noticed this doesn't appear to be related to a railway issue.

I'm here to help you with **railway complaints and grievances**. If you have a concern about your train journey, please share:
- Photos/videos of the issue (cleanliness, maintenance, safety)
- Audio describing your problem
- Or simply type your complaint

How can I assist you with your railway experience today?"

**PARTIAL RELEVANCE:**
If the content is ambiguous or partially relevant, ask for clarification:
"I can see [brief description]. Could you please explain how this relates to your railway complaint? This will help me file an accurate report for you."

**NEVER:**
- Analyze or describe irrelevant content in detail (don't be a general-purpose image analyzer)
- Engage with memes, jokes, or off-topic media
- Process content that could be harmful, explicit, or inappropriate

**LANGUAGE DETECTION & RESPONSE MATCHING (CRITICAL - ALWAYS APPLY):**

You MUST detect the user's language and respond in the SAME language. This is mandatory for user experience.

**Language Detection Rules:**
1. **Pure Hindi (Devanagari script):** If user writes in Devanagari (e.g., "मुझे मदद चाहिए", "ट्रेन में समस्या है"), respond entirely in Hindi using Devanagari script.
2. **Hinglish (Hindi + English mix):** If user writes in Roman script with Hindi words (e.g., "madad karoge?", "train mein problem hai", "koi sunata nahi"), respond in the SAME Hinglish style - use Roman script with Hindi vocabulary and sentence structure.
3. **Pure English:** If user writes in standard English, respond in formal/professional English.

**Response Examples by Language:**

*User (Hinglish):* "madad karoge?"
*Bot Response (Hinglish):* "Haan ji, bilkul! Main aapki madad ke liye yahan hoon. Aap mujhe apni railway complaint ya problem ke baare mein batayein, main turant aapki help karunga. Kya issue hai?"

*User (Hindi):* "मुझे शिकायत दर्ज करनी है"
*Bot Response (Hindi):* "जी हां, मैं आपकी शिकायत दर्ज करने में मदद करूंगा। कृपया मुझे बताएं कि आपकी क्या समस्या है? ट्रेन नंबर और PNR भी बताएं अगर उपलब्ध हो।"

*User (English):* "I need help with my complaint"
*Bot Response (English):* "Of course! I'm here to assist you with your railway complaint. Please share the details of the issue you're facing, along with your train number and PNR if available."

**CRITICAL LANGUAGE RULES:**
- ALWAYS match the user's language in your response - this is NOT optional
- If user switches language mid-conversation, switch with them
- Maintain professionalism regardless of language
- Use simple, clear vocabulary in all languages
- For Hindi/Hinglish: Use respectful forms ("aap", "ji") not informal ("tu", "tum")
- Technical terms (PNR, RPF, Coach, Berth) can remain in English in all languages
`;

const allComplaintTypes = Array.from(
  new Set([
    // Use Set to get unique categories
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

const analysisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    category: {
      type: SchemaType.STRING,
      description: `A single, most relevant category for this complaint from the following list: [${allComplaintTypes
        .map((t) => `"${t}"`)
        .join(", ")}]`,
    },
    urgencyScore: {
      type: SchemaType.INTEGER,
      description:
        "A strict numerical score from 1 (very low) to 10 (extremely urgent). Use the full range based on the criteria provided.",
    },
    summary: {
      type: SchemaType.STRING,
      description: "A one-sentence concise summary of the core issue.",
    },
    keywords: {
      type: SchemaType.ARRAY,
      description: "An array of important keywords from the complaint.",
      items: { type: SchemaType.STRING },
    },
    suggestedDepartment: {
      type: SchemaType.STRING,
      description:
        "Suggest the most appropriate railway department to handle this complaint. Options: 'Operations', 'Maintenance', 'Customer Service', 'Security', 'Medical', 'Catering', 'Electrical', 'Cleaning', 'Ticketing', 'Management'",
    },
  },
  required: [
    "category",
    "urgencyScore",
    "summary",
    "keywords",
    "suggestedDepartment",
  ],
};

export const analyzeComplaintWithAI = async (
  complaint: Complaint
): Promise<
  Omit<AnalysisResult, "id" | "complaintId" | "analysisTimestamp">
> => {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("Gemini API key is not configured.");
  }

  const prompt = `
        You are an AI assistant for a railway complaint system. Analyze the following complaint and provide a structured JSON response according to the schema.
        The user has already pre-categorized the complaint, use this information as a strong hint, but you can correct it if the description clearly indicates a different category from the provided list.

        Complaint Area: "${complaint.complaintArea}"
        PNR: "${complaint.pnr || "N/A"}"
        Journey Date: "${complaint.journeyDate || "N/A"}"
        Incident Date: "${complaint.incidentDate}"
        User's Complaint Type: "${complaint.complaintType}"
        User's Complaint Sub-Type: "${complaint.complaintSubType}"
        
        Full Description: "${complaint.description}"

        Analyze all the information and determine:
        1. The final category
        2. Urgency score (1-10) - Score roughly based on:
           1-3: Minor inconveniences (e.g., cleanliness, wifi)
           4-6: System failures/Service delays (e.g., AC not working, late train)
           7-8: Health risks or significant distress (e.g., no water, pests)
           9-10: Critical safety/Emergency (e.g., medical, harassment, accident)
        3. A brief summary
        4. Key keywords
        5. The most appropriate department to handle this complaint

        Department Assignment Guidelines:
        - Operations: Train delays, cancellations, schedule issues
        - Maintenance: Coach defects, broken equipment, infrastructure issues
        - Customer Service: Staff behavior, information issues, general service
        - Security: Safety concerns, theft, harassment, unauthorized persons
        - Medical: Health emergencies, medical facilities
        - Catering: Food quality, water availability, vending services
        - Electrical: AC/heating issues, lighting, charging points
        - Cleaning: Cleanliness issues in coaches or stations
        - Ticketing: Booking, cancellation, refund issues
        - Management: Corruption, policy issues, escalations
    `;

  // Retry logic with tiered provider fallback on 429 errors
  let fallbackTier: FallbackTier = 0;
  let lastError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const tierConfig = getTierConfig(fallbackTier);

      let rawText: string;

      if (tierConfig.provider === "gemini") {
        // Use Gemini native SDK
        const model = ai.getGenerativeModel({ model: tierConfig.model });
        const response = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        });
        rawText = response.response.text();
      } else {
        // Use OpenRouter API
        rawText = await callOpenRouter(
          tierConfig.model,
          [{ role: "user", content: prompt }],
          undefined,
          { responseFormat: "json" }
        );
      }

      const result = JSON.parse(rawText);

      return {
        category: result.category || "Other",
        urgencyScore: result.urgencyScore || 3,
        summary: result.summary || "Analysis could not generate a summary.",
        keywords: result.keywords || [],
        suggestedDepartment: result.suggestedDepartment || "Customer Service",
      };
    } catch (error: any) {
      lastError = error;
      if (shouldFallback(error) && fallbackTier < 2) {
        console.log(
          `🔄 Error on analyzeComplaintWithAI - escalating to tier ${fallbackTier + 1
          }`
        );
        fallbackTier = (fallbackTier + 1) as FallbackTier;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
};

// Function to generate user-aware system prompt
// REMOVED: Duplicate function - using exported version below

// Function to filter response based on user context
// REMOVED: Duplicate function - using exported version below

export interface ExtractedComplaintData {
  pnr?: string;
  utsNumber?: string;
  journeyDate?: string; // YYYY-MM-DD
  incidentDate?: string; // YYYY-MM-DD
  incidentTime?: string; // HH:mm
  complaintArea?: "TRAIN" | "STATION";
  complaintType?: string;
  complaintSubType?: string;
  description?: string;
  trainNumber?: string;
  coachNumber?: string;
  seatNumber?: string;
  nearestStation?: string;
  unauthorizedPeopleCount?: number;
  mobileNumber?: string;
  platformNumber?: string;
}

const extractionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    pnr: {
      type: SchemaType.STRING,
      description:
        "10-digit Passenger Name Record (PNR) number if visible or mentioned. Should be exactly 10 digits.",
    },
    utsNumber: {
      type: SchemaType.STRING,
      description:
        "Unreserved Ticketing System (UTS) number if visible or mentioned. Usually a long alphanumeric string.",
    },
    journeyDate: {
      type: SchemaType.STRING,
      description: "The date of the journey in YYYY-MM-DD format if available.",
    },
    incidentDate: {
      type: SchemaType.STRING,
      description:
        "The date the incident occurred in YYYY-MM-DD format. Default to today's date if not specified.",
    },
    incidentTime: {
      type: SchemaType.STRING,
      description:
        "The time the incident occurred in HH:mm format. Default to current time if not specified.",
    },
    complaintArea: {
      type: SchemaType.STRING,
      enum: ["TRAIN", "STATION"],
      description:
        "Determine if the complaint is related to a 'TRAIN' or a 'STATION'.",
    },
    complaintType: {
      type: SchemaType.STRING,
      description:
        "Based on the complaintArea, select the most relevant complaint type.",
    },
    complaintSubType: {
      type: SchemaType.STRING,
      description:
        "Based on the complaintType, select the most relevant sub-type.",
    },
    description: {
      type: SchemaType.STRING,
      description:
        "A detailed, factual, and objective report about the specific issue(s) shown in the media. This will be used as evidence.",
    },
    platformNumber: {
      type: SchemaType.STRING,
      description: "Platform number if mentioned or visible.",
    },
  },
};

// Shared Railway Context for AI Prompts
const RAILWAY_CONTEXT_PROMPT = `
**Indian Railway System Context - Use this information for your analysis:**
- **Coach Types:** Sleeper (SL), AC 3 Tier (3A), AC 2 Tier (2A), First Class AC (1A), Chair Car (CC), General (GEN). Coaches are often labeled with codes like S1, S2, B1, B2, A1, etc.
- **Berth/Seat Identification (VERY IMPORTANT):**
  - **Berth Types:** Lower Berth (LB), Middle Berth (MB), Upper Berth (UB), Side Lower (SL), Side Upper (SU).
  - **Visual Numbering Conventions:** Berth numbers are displayed on small plaques on the coach wall. You MUST interpret them correctly:
    - **Vertical Stack (e.g., a '4' above a '3' on a plaque):** This signifies two different berths, typically an Upper Berth and a Lower Berth. For example, the plaque in the user's image with '4' and '3' refers to berth numbers 4 and 3. You should infer which is which based on context if possible (e.g., if the image is taken from a bed, it is likely the lower berth of that pair).
    - **Horizontal Row (e.g., 1 2 3):** This format in a single line or plaque signifies a bay of three berths. By default, '1' is the Lower Berth (LB), '2' is the Middle Berth (MB), and '3' is the Upper Berth (UB).
    - **Side Berths:** Side Lower (SL) and Side Upper (SU) are usually in pairs of two along the aisle.
  - **Goal:** Always try to identify the specific berth number and type (e.g., "Middle Berth, number 42"). This is the most crucial piece of information for the complaint.
- **Key Equipment:** Each berth area has fans, lights, charging points, a small table, and often chains to hold up the middle berth. Toilets are located at either end of a coach.
`;

export const extractComplaintDetailsFromFile = async (
  fileParts: { mimeType: string; data: string }[],
  existingDescription?: string,
  fileMetadata?: { name: string; lastModified: number; type: string }[]
): Promise<ExtractedComplaintData> => {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("Gemini API key is not configured.");
  }

  const complaintDataString = JSON.stringify(complaintData, null, 2);

  let metadataContext = "";
  if (fileMetadata && fileMetadata.length > 0) {
    metadataContext = `
      **File Metadata (Use this to determine Incident Date and Time):**
      ${fileMetadata
        .map(
          (f) =>
            `- File: ${f.name} (Type: ${f.type})\n  - Last Modified: ${new Date(
              f.lastModified
            ).toLocaleString()}`
        )
        .join("\n")}
    `;
  }

  const descriptionGenerationLogic = existingDescription
    ? `
        **Your Primary Task: Enhance the User's Description**
        The user has provided an initial description. Your job is to act as an expert assistant and improve it.

        **User's Original Description:**
        ---
        ${existingDescription}
        ---

        **Your Instructions:**
        1.  **Read and Respect:** The user's text is the foundation. Do not delete it or replace it.
        2.  **Analyze All Media:** Carefully examine all provided images, videos, or audio for factual details the user may have missed (e.g., seat numbers, coach cleanliness, specific damages).
        3.  **Synthesize and Enhance:** Weave the new details you find from all media into the user's original text to make it more powerful and specific. If multiple issues are shown across different files, incorporate all of them into the description.
        4.  **Combine:** Produce a single, coherent, and enhanced description as the final output. For example, if the user wrote "The train car has some problems" and you see one image of a broken charging point and another of a leaking tap, your enhanced description should be something like "The charging point at berth 43 is broken, and additionally, the tap in the nearby lavatory is leaking."
      `
    : `
        **Your Primary Task: Generate a Description From Scratch**
        The user has not provided a description. You must create one based entirely on all the media provided. If the media show multiple distinct issues, your description must detail all of them.
      `;

  const descriptionInstruction = `
        ${RAILWAY_CONTEXT_PROMPT}

        ${descriptionGenerationLogic}

        **Regardless of the task, your final description must be a detailed, problem-focused incident report written in simple, clear English. It should include:**
        - **The Problem(s):** Clearly identify the main issue or issues. If there are multiple problems shown in the media, describe each one.
        - **Location Context:** For each issue, identify the exact location. Transcribe any visible text (Coach, Berth No, Seat No) that helps pinpoint the location.
        - **Object State:** Describe the condition of the object(s) causing the problem(s) with extreme detail.
            - *Example (Multiple Issues):* "The chain for the middle berth (MB) at seat number 42 is broken, making it unusable."
        - **Impact on Passenger:** Explain how each problem directly affects the passenger.
            - *Example:* "Because the fan is not working, it is very hot. The broken berth is also a safety hazard."

        Create a single, comprehensive, easy-to-understand report that leaves no doubt about all the issues.`;

  const prompt = `
        You are an AI assistant for a railway complaint system. Your task is to analyze all the user-uploaded media files (images, audio, or video) and extract information to pre-fill a single complaint form.
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

        If a piece of information is not available in the media, do not include its key in the JSON response.

        ${metadataContext}

        **CRITICAL INSTRUCTIONS:**
        1.  **Synthesize Information:** You will receive one or more media files. Analyze all of them. If they depict the same issue, combine the details to create the most comprehensive report. If they depict different issues (e.g., one image of a broken seat, another of a dirty toilet), you must create a description that mentions *both* issues clearly.
        2.  **Categorization:** If multiple distinct issues are present, categorize the complaint based on the most severe or urgent issue.
        3.  **PNR/UTS:** PNR must be exactly 10 digits. UTS number is usually a long alphanumeric string.
        4.  **Dates:** Must be in YYYY-MM-DD format. Use the file metadata 'Last Modified' date as the 'Incident Date' if no other date is visible in the image.
        5.  **Time:** Extract incident time in HH:mm format. Use the file metadata 'Last Modified' time as the 'Incident Time' if no other time is visible.
        6.  **Location Details:** Extract Train Number, Coach Number, Seat/Berth Number, and Nearest Station. If the train is moving or location is ambiguous, try to infer the nearest major station or current location from any visual cues (e.g., station signs, GPS metadata if available in text).
        7.  **Overcrowding:** If the issue is overcrowding, estimate the number of unauthorized people.
        8.  **Contact:** Extract 10-digit mobile number if mentioned.
        9.  **Categorization (cont.):** Use the following JSON structure to determine the correct 'complaintType' and 'complaintSubType'. First, decide the 'complaintArea' ('TRAIN' or 'STATION'). Then, find the most fitting 'complaintType' from that area's keys. Finally, select the most specific 'complaintSubType' from the chosen type's list. Be precise.
            \`\`\`json
            ${complaintDataString}
            \`\`\`
        6. ${descriptionInstruction}

        Analyze all provided files and extract the data to fill out a single complaint form.
    `;

  // Retry logic with Gemini model fallback on 429 errors
  // Note: Multimodal content requires Gemini SDK, cannot use OpenRouter for file analysis
  const tier0Config = getFallbackTierConfig(0);
  const geminiModels = [
    tier0Config.model,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
  ];
  let modelIndex = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const modelName = geminiModels[modelIndex];
      if (attempt > 0) {
        console.log(`⚠️ Retrying with Gemini model: ${modelName}`);
      }
      const model = ai.getGenerativeModel({ model: modelName });
      const response = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              ...fileParts.map((part) => ({ inlineData: part })),
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const rawText = response.response.text();
      const result = JSON.parse(rawText);

      return result as ExtractedComplaintData;
    } catch (error: any) {
      if (shouldFallback(error) && modelIndex < geminiModels.length - 1) {
        console.log(
          `🔄 Error on extractComplaintDetailsFromFile - trying next Gemini model`
        );
        modelIndex++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      console.error("Error extracting details from file with AI:", error);
      return {};
    }
  }

  return {};
};

/**
 * Extracts complaint details from a text description using Gemini AI.
 * Useful for auto-filling the form when the user types a description first.
 *
 * @param {string} description - The user's complaint description.
 * @returns {Promise<ExtractedComplaintData>} A promise that resolves to the extracted data.
 */
export const extractComplaintDetailsFromText = async (
  description: string
): Promise<ExtractedComplaintData> => {
  const ai = getGeminiClient();
  if (!ai) {
    console.warn("Gemini API key is not configured.");
    return {};
  }

  if (!description || description.trim().length < 5) {
    return {};
  }

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

  // Retry logic with tiered provider fallback
  let fallbackTier: FallbackTier = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const tierConfig = getTierConfig(fallbackTier);
      let rawText: string;

      if (tierConfig.provider === "gemini") {
        const model = ai.getGenerativeModel({ model: tierConfig.model });
        const response = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        });
        rawText = response.response.text();
      } else {
        rawText = await callOpenRouter(
          tierConfig.model,
          [{ role: "user", content: prompt }],
          undefined,
          { responseFormat: "json" }
        );
      }

      const result = JSON.parse(rawText);
      return result as ExtractedComplaintData;
    } catch (error: any) {
      if (shouldFallback(error) && fallbackTier < 2) {
        console.log(
          `🔄 Error on extractComplaintDetailsFromText - escalating to tier ${fallbackTier + 1
          }`
        );
        fallbackTier = (fallbackTier + 1) as FallbackTier;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      console.error("Error extracting details from text with AI:", error);
      return {};
    }
  }

  return {};
};

// Function to extract complaint data from chatbot conversation
export const extractComplaintFromChatbotMessage = async (
  complaintSummary: string,
  botResponse: string
): Promise<ExtractedComplaintData | null> => {
  // First try to parse without AI if the API is not available
  const ai = getGeminiClient();
  if (!ai) {
    console.warn(
      "Gemini API key is not configured. Using fallback parsing for chatbot complaint."
    );
    return extractComplaintDataFallback(complaintSummary, botResponse);
  }

  const hasComplaintStructure =
    complaintSummary.includes("Issue:") ||
    complaintSummary.includes("Location:") ||
    complaintSummary.includes("PNR:") ||
    complaintSummary.length > 50;

  if (!hasComplaintStructure) {
    console.log("No valid complaint structure found in summary");
    return null;
  }

  const extractionPrompt = `
        You are analyzing a complaint summary from a railway complaint assistant bot. 
        Extract the complaint details from this structured summary.
        
        Complaint Summary: "${complaintSummary}"
        Bot Confirmation Response: "${botResponse}"
        
        Extract all the structured information from the complaint summary. The summary should contain:
        - Issue / Description
        - Location details (Train No, Coach No, Seat No, Nearest Station)
        - Time information (Incident Date, Incident Time)
        - PNR
        - Unauthorized People Count (if applicable)
        - Mobile Number
        
        Use the following JSON structure for categorization:
        ${JSON.stringify(complaintData, null, 2)}
        
        Current date for fallback: ${new Date().toISOString().split("T")[0]}
        
        If information is missing, provide reasonable defaults based on context.
    `;

  // Retry logic with tiered provider fallback on 429 errors
  let fallbackTier: FallbackTier = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const tierConfig = getTierConfig(fallbackTier);

      let rawText: string;

      if (tierConfig.provider === "gemini") {
        // Use Gemini native SDK
        const model = ai.getGenerativeModel({ model: tierConfig.model });
        const response = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: extractionPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        });
        rawText = response.response.text();
      } else {
        // Use OpenRouter API
        rawText = await callOpenRouter(
          tierConfig.model,
          [{ role: "user", content: extractionPrompt }],
          undefined,
          { responseFormat: "json" }
        );
      }

      const result = JSON.parse(rawText);

      if (!result.description && !result.complaintArea) {
        console.log("Insufficient data extracted from AI, trying fallback");
        return extractComplaintDataFallback(complaintSummary, botResponse);
      }

      return result as ExtractedComplaintData;
    } catch (error: any) {
      if (shouldFallback(error) && fallbackTier < 2) {
        console.log(
          `🔄 Error on extractComplaintFromChatbotMessage - escalating to tier ${fallbackTier + 1
          }`
        );
        fallbackTier = (fallbackTier + 1) as FallbackTier;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      console.error(
        "Error extracting complaint from chatbot conversation with AI:",
        error
      );
      console.log("Falling back to manual parsing");
      return extractComplaintDataFallback(complaintSummary, botResponse);
    }
  }

  return extractComplaintDataFallback(complaintSummary, botResponse);
};

// Fallback function to extract complaint data without AI
function extractComplaintDataFallback(
  complaintSummary: string,
  botResponse: string
): ExtractedComplaintData | null {
  try {
    const today = new Date().toISOString().split("T")[0];
    const extractedData: ExtractedComplaintData = {};

    if (
      complaintSummary.toLowerCase().includes("train") ||
      complaintSummary.toLowerCase().includes("coach")
    ) {
      extractedData.complaintArea = "TRAIN";
    } else if (
      complaintSummary.toLowerCase().includes("station") ||
      complaintSummary.toLowerCase().includes("platform")
    ) {
      extractedData.complaintArea = "STATION";
    } else {
      extractedData.complaintArea = "TRAIN"; // Default
    }

    const pnrMatch = complaintSummary.match(/\b\d{10}\b/);
    if (pnrMatch) {
      extractedData.pnr = pnrMatch[0];
    }

    const dateMatch = complaintSummary.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (dateMatch) {
      extractedData.journeyDate = dateMatch[0];
      extractedData.incidentDate = dateMatch[0];
    } else {
      extractedData.incidentDate = today;
    }

    extractedData.description =
      complaintSummary.length > 20
        ? complaintSummary.replace(/Issue:|Location:|Time:|PNR:/g, "").trim()
        : `Complaint submitted via chatbot on ${today}`;

    if (extractedData.complaintArea === "TRAIN") {
      extractedData.complaintType = "Coach - Maintenance";
      extractedData.complaintSubType = "AC/Heating";
    } else {
      extractedData.complaintType = "Passenger Amenities";
      extractedData.complaintSubType = "Others";
    }

    console.log(
      "Extracted complaint data using fallback method:",
      extractedData
    );
    return extractedData;
  } catch (error) {
    console.error("Error in fallback complaint extraction:", error);
    return null;
  }
}

/**
 * Enhanced context-aware chat function with user role integration.
 * Supports multimodal input (text, images, audio) for Gemini API.
 *
 * @param {string} userMessage - The user's text message
 * @param {Array} conversationHistory - Previous chat messages for context
 * @param {ContextOptions} additionalContext - Additional context like time, location
 * @param {any} userContext - User authentication and role context
 * @param {string} systemPromptOverride - Optional custom system prompt
 * @param {Array} multimodalParts - Optional array of multimodal parts (inlineData with audio/image)
 * @returns {Promise<string>} The AI response text
 */
export const chatWithContext = async (
  userMessage: string,
  conversationHistory: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [],
  additionalContext?: ContextOptions,
  userContext?: any, // UserContext type import would be needed
  systemPromptOverride?: string,
  multimodalParts?: Array<{ inlineData: { mimeType: string; data: string } }>
): Promise<string> => {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("Gemini API key is not configured.");
  }

  // Check for emergency content first and handle it separately - Enhanced with fuzzy matching
  const isEmergency = detectEmergencyInMessage(userMessage);

  // Also check if this is a confirmation response to an emergency
  const isEmergencyConfirmation =
    /^(confirm|yes|y|ok|proceed|submit)$/i.test(userMessage.trim()) &&
    conversationHistory.some(
      (msg) =>
        msg.role === "model" &&
        msg.parts.some(
          (part) =>
            part.text.toLowerCase().includes("emergency") ||
            part.text.toLowerCase().includes("robbery") ||
            part.text.toLowerCase().includes("security") ||
            part.text.toLowerCase().includes("medical")
        )
    );

  // If it's an emergency or emergency confirmation, handle it with enhanced user context first
  if (isEmergency || isEmergencyConfirmation) {
    try {
      return await handleEmergencyResponse(
        userMessage,
        conversationHistory,
        additionalContext,
        userContext
      );
    } catch (emergencyError) {
      console.warn(
        "Emergency handling failed, falling back to standard chat:",
        emergencyError
      );
      // Fall through to standard chat handling
    }
  }

  try {
    // Pre-process user message to validate railway identifiers silently
    let validationContext = "";

    // Check for PNR (10 digits)
    const pnrMatch = userMessage.match(/\b\d{10}\b/);
    if (pnrMatch) {
      try {
        const pnrResult = await geminiValidatePNR(pnrMatch[0]);
        if (pnrResult.includes("✅")) {
          validationContext += `PNR ${pnrMatch[0]} is valid. `;
        } else {
          validationContext += `PNR ${pnrMatch[0]} is invalid (not exactly 10 digits). `;
        }
      } catch (error) {
        console.warn("PNR validation failed:", error);
      }
    }

    // Check for Train number (4-5 digits)
    const trainMatch = userMessage.match(/\b\d{4,5}\b/);
    if (trainMatch && trainMatch[0] !== pnrMatch?.[0]) {
      try {
        const trainResult = await geminiValidateTrain(trainMatch[0]);
        validationContext += `Train validation: ${trainResult}. `;
      } catch (error) {
        console.warn("Train validation failed:", error);
      }
    }

    // Check for station codes (2-5 letters)
    const stationMatch = userMessage.match(/\b[A-Z]{2,5}\b/);
    if (stationMatch) {
      try {
        const stationResult = await geminiValidateStation(stationMatch[0]);
        validationContext += `Station validation: ${stationResult}. `;
      } catch (error) {
        console.warn("Station validation failed:", error);
      }
    }

    const extractedContext = extractContextFromMessage(userMessage);
    const finalContext = { ...extractedContext, ...additionalContext };

    // Enhanced user context integration with comprehensive prompt generation
    // Language matching is handled by the system prompt instructions + conversation history
    let contextAwarePrompt: string;
    const basePromptToUse =
      systemPromptOverride || RAILMADAD_CHAT_SYSTEM_PROMPT;

    if (userContext) {
      // Import UserContextService dynamically to avoid circular imports
      // const { UserContextService } = await import("./userContextService");

      // Generate comprehensive user-aware system prompt
      const userAwareBasePrompt = generateUserAwareSystemPrompt(
        basePromptToUse,
        userContext
      );

      // Add validation results if available
      const enhancedPrompt = validationContext
        ? `${userAwareBasePrompt}\n\nValidation Results: ${validationContext}`
        : userAwareBasePrompt;

      contextAwarePrompt = await createContextAwarePrompt(
        enhancedPrompt,
        finalContext,
        userMessage
      );
    } else {
      // Fallback to standard prompt for unauthenticated users
      const enhancedPrompt = validationContext
        ? `${basePromptToUse}\n\nValidation Results: ${validationContext}`
        : basePromptToUse;

      contextAwarePrompt = await createContextAwarePrompt(
        enhancedPrompt,
        finalContext,
        userMessage
      );
    }

    let result;
    let retryCount = 0;
    const maxRetries = 3;
    let fallbackTier: FallbackTier = 0;

    // Declare chat at a higher scope so it's accessible for function calls later
    let chat: any;
    // Track current provider for proper chat handling
    let currentProvider: "gemini" | "openrouter" = "gemini";

    while (retryCount <= maxRetries) {
      try {
        // Get the appropriate provider and model - escalates tiers on rate limit errors
        const tierConfig = getTierConfig(fallbackTier);
        currentProvider = tierConfig.provider;

        if (tierConfig.provider === "gemini") {
          // ========== GEMINI NATIVE SDK ==========
          const generativeModel = ai.getGenerativeModel({
            model: tierConfig.model,
            systemInstruction: contextAwarePrompt,
            generationConfig: {
              temperature: 1,
              topP: 0.95,
              maxOutputTokens: tierConfig.maxTokens,
            },
          });

          // Check if we have multimodal content (audio/image/video)
          if (multimodalParts && multimodalParts.length > 0) {
            console.log(
              `🎤 [Gemini] Using generateContent for multimodal request with ${multimodalParts.length} attachment(s)`
            );

            const contents = [
              ...conversationHistory.map((msg) => ({
                role: msg.role,
                parts: msg.parts,
              })),
              {
                role: "user" as const,
                parts: [{ text: userMessage }, ...multimodalParts],
              },
            ];

            result = await generativeModel.generateContent({ contents });

            chat = generativeModel.startChat({
              history: [
                ...conversationHistory,
                { role: "user" as const, parts: [{ text: userMessage }] },
              ],
            });
          } else {
            chat = generativeModel.startChat({
              history: conversationHistory,
            });
            result = await chat.sendMessage(userMessage);
          }
        } else {
          // ========== OPENROUTER API ==========
          console.log(`🌐 [OpenRouter] Using model: ${tierConfig.model}`);

          // Convert tools to OpenRouter format
          const openRouterTools = convertToolsToOpenRouter(
            railwayValidationTools
          );

          // Convert conversation history to OpenRouter format
          const openRouterHistory =
            convertHistoryToOpenRouter(conversationHistory);

          // Create OpenRouter chat session
          chat = new OpenRouterChatSession(
            tierConfig.model,
            contextAwarePrompt,
            openRouterHistory,
            openRouterTools,
            { temperature: 1, maxTokens: tierConfig.maxTokens }
          );

          // Handle multimodal content
          if (multimodalParts && multimodalParts.length > 0) {
            console.log(
              `🎤 [OpenRouter] Sending multimodal request with ${multimodalParts.length} attachment(s)`
            );
            const content = convertToOpenRouterContent(
              userMessage,
              multimodalParts
            );
            result = await chat.sendMessage(content);
          } else {
            result = await chat.sendMessage(userMessage);
          }
        }
        break; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;
        console.warn(`Chat attempt ${retryCount} failed:`, error);

        // Check if this error should trigger a fallback to next tier
        if (shouldFallback(error) && fallbackTier < 2) {
          console.log(
            `🔄 Error detected - escalating to tier ${fallbackTier + 1}`
          );
          fallbackTier = (fallbackTier + 1) as FallbackTier;
          retryCount--; // Don't count this as a failed retry, just tier escalation
        }

        if (retryCount > maxRetries) {
          throw error;
        }

        // Wait before retry (longer wait for rate limit errors)
        const waitTime = shouldFallback(error) ? 2000 : 1000 * retryCount;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    if (!result) {
      throw new Error("Failed to get response after retries");
    }

    const response = result.response;

    // Handle function calls if any (only for non-emergency)
    const functionCalls =
      typeof response.functionCalls === "function"
        ? response.functionCalls()
        : response.functionCalls;

    if (
      !isEmergency &&
      !isEmergencyConfirmation &&
      functionCalls &&
      functionCalls.length > 0
    ) {
      try {
        // Handle function calls - works for both Gemini and OpenRouter chat sessions
        const functionResponse = await handleFunctionCalls(
          chat,
          functionCalls,
          currentProvider === "openrouter"
        );
        return userContext
          ? filterResponseByUserContext(functionResponse, userContext)
          : functionResponse;
      } catch (functionError) {
        console.warn(
          "Function calling failed, returning direct response:",
          functionError
        );
        const directResponse = response.text();
        return userContext
          ? filterResponseByUserContext(directResponse, userContext)
          : directResponse;
      }
    }

    // Filter response based on user context and apply final enhancements
    const filteredResponse = userContext
      ? filterResponseByUserContext(response.text(), userContext)
      : response.text();

    return filteredResponse;
  } catch (error: any) {
    console.error("Error in context-aware chat:", error);

    // Provide more specific error handling
    if (
      error.message?.includes("500") ||
      error.message?.includes("Internal Server Error")
    ) {
      return generateFallbackResponse(userMessage, isEmergency);
    }

    throw new Error("Failed to process your message. Please try again.");
  }
};

// Function to add real-time context (like current time, date, etc.)
export const addRealTimeContext = (): ContextOptions => {
  const now = new Date();
  const hour = now.getHours();

  let timeOfDay: ContextOptions["timeOfDay"];
  if (hour >= 6 && hour < 12) timeOfDay = "morning";
  else if (hour >= 12 && hour < 18) timeOfDay = "afternoon";
  else if (hour >= 18 && hour < 22) timeOfDay = "evening";
  else timeOfDay = "night";

  return {
    timeOfDay,
    // Add more real-time context as needed
  };
};

// Enhanced function to add capability-based filtering to system prompts
const enhancePromptWithCapabilities = (
  basePrompt: string,
  userContext: any
): string => {
  if (!userContext?.capabilities) {
    return basePrompt;
  }

  const capabilities = userContext.capabilities as string[];
  const role = userContext.role;

  let capabilityInstructions = "\n\n--- USER CAPABILITY CONSTRAINTS ---\n";

  // Add role-specific response filtering
  if (role === "PASSENGER") {
    capabilityInstructions += `
RESPONSE FILTERING FOR PASSENGER:
- Focus on passenger-centric assistance and information
- Emphasize complaint submission, tracking, and resolution
- Provide helpful information about train schedules, amenities, and services
- Use empathetic and supportive language
- Avoid administrative or internal operational details
`;

    if (capabilities.includes("submit_complaint")) {
      capabilityInstructions +=
        "- Guide user through complaint submission process with clear steps\n";
    }
    if (capabilities.includes("view_own_complaints")) {
      capabilityInstructions +=
        "- Help user track and understand their complaint status\n";
    }
  } else if (role === "OFFICIAL") {
    capabilityInstructions += `
RESPONSE FILTERING FOR RAILWAY OFFICIAL:
- Provide administrative guidance and operational insights
- Focus on complaint management, resolution strategies, and policy information
- Use professional, efficient communication style
- Include relevant departmental procedures and escalation paths
- Emphasize customer service excellence and resolution efficiency
`;

    if (capabilities.includes("view_all_complaints")) {
      capabilityInstructions +=
        "- Provide insights on complaint trends and management strategies\n";
    }
    if (capabilities.includes("update_complaint_status")) {
      capabilityInstructions +=
        "- Guide through proper complaint status update procedures\n";
    }
    if (capabilities.includes("view_analytics")) {
      capabilityInstructions +=
        "- Offer analytical insights and performance metrics when relevant\n";
    }
  } else if (role === "SUPER_ADMIN") {
    capabilityInstructions += `
RESPONSE FILTERING FOR SUPER ADMINISTRATOR:
- Provide comprehensive system-level insights and strategic guidance
- Focus on system optimization, policy implementation, and oversight
- Use authoritative, executive-level communication
- Include system-wide impact analysis and strategic recommendations
- Emphasize operational efficiency and systemic improvements
`;

    if (capabilities.includes("system_settings")) {
      capabilityInstructions +=
        "- Provide guidance on system configuration and policy implementation\n";
    }
    if (capabilities.includes("view_system_logs")) {
      capabilityInstructions +=
        "- Offer system monitoring insights and troubleshooting guidance\n";
    }
  }

  // Add capability-specific permissions
  capabilityInstructions += "\nUSER PERMISSIONS:";
  capabilities.forEach((capability) => {
    switch (capability) {
      case "submit_complaint":
        capabilityInstructions +=
          "\n- Can submit new complaints and provide guidance on complaint process";
        break;
      case "view_own_complaints":
      case "view_all_complaints":
        capabilityInstructions +=
          "\n- Can access complaint status and tracking information";
        break;
      case "update_complaint_status":
        capabilityInstructions +=
          "\n- Can update complaint status and add resolution notes";
        break;
      case "manage_users":
        capabilityInstructions +=
          "\n- Can provide user management guidance and procedures";
        break;
      case "view_analytics":
        capabilityInstructions +=
          "\n- Can access performance metrics and analytical insights";
        break;
      case "view_info":
        capabilityInstructions +=
          "\n- Can access general railway information and policies";
        break;
    }
  });

  capabilityInstructions +=
    "\n\nIMPORTANT: Tailor your responses based on the user's role and capabilities. Do not provide information or guidance for actions the user cannot perform.";

  return basePrompt + capabilityInstructions;
};

// Enhanced function to generate dynamic system prompts based on user context
export const generateUserAwareSystemPrompt = (
  basePrompt: string,
  userContext?: any
): string => {
  if (!userContext) {
    return basePrompt;
  }

  const { user, role, capabilities, preferences, sessionInfo } = userContext;

  let enhancedPrompt = basePrompt;

  // Add user identification and context
  if (user && userContext.isAuthenticated) {
    enhancedPrompt += `\n\n--- AUTHENTICATED USER CONTEXT ---\n`;
    enhancedPrompt += `User: ${user.fullName || user.email} (${role})\n`;

    if (user.department) {
      enhancedPrompt += `Department: ${user.department}\n`;
    }
    if (user.stationCode) {
      enhancedPrompt += `Station: ${user.stationCode}\n`;
    }
    if (user.zone) {
      enhancedPrompt += `Zone: ${user.zone}\n`;
    }
  }

  // Add session context
  if (sessionInfo) {
    enhancedPrompt += `\nSession Info:\n`;
    enhancedPrompt += `- Login Time: ${sessionInfo.loginTime.toLocaleString()}\n`;
    enhancedPrompt += `- Session Duration: ${Math.round(
      (Date.now() - sessionInfo.loginTime.getTime()) / 60000
    )} minutes\n`;
    enhancedPrompt += `- Authentication Method: ${sessionInfo.authMethod}\n`;
  }

  // Add user preferences context
  if (preferences) {
    enhancedPrompt += `\nUser Preferences:\n`;
    enhancedPrompt += `- Language: ${preferences.language}\n`;
    enhancedPrompt += `- Theme: ${preferences.theme}\n`;

    if (preferences.accessibility) {
      const accessibilityFeatures = [];
      if (preferences.accessibility.screenReader)
        accessibilityFeatures.push("screen reader");
      if (preferences.accessibility.highContrast)
        accessibilityFeatures.push("high contrast");
      if (preferences.accessibility.largeText)
        accessibilityFeatures.push("large text");
      if (preferences.accessibility.keyboardNavigation)
        accessibilityFeatures.push("keyboard navigation");
      if (preferences.accessibility.reducedMotion)
        accessibilityFeatures.push("reduced motion");

      if (accessibilityFeatures.length > 0) {
        enhancedPrompt += `- Accessibility: ${accessibilityFeatures.join(
          ", "
        )}\n`;
        enhancedPrompt += `\nACCESSIBILITY NOTE: User has accessibility preferences. Ensure responses are clear, well-structured, and accessible.\n`;
      }
    }
  }

  // Apply capability-based filtering
  enhancedPrompt = enhancePromptWithCapabilities(enhancedPrompt, userContext);

  return enhancedPrompt;
};

// Function to create context-aware response filters based on user permissions
export const filterResponseByUserContext = (
  response: string,
  userContext?: any
): string => {
  if (!userContext || !userContext.capabilities) {
    return response;
  }

  const capabilities = userContext.capabilities as string[];

  // Remove or modify content based on user capabilities
  let filteredResponse = response;

  // Filter administrative content for passengers
  if (userContext.role === "PASSENGER") {
    // Remove internal system references
    filteredResponse = filteredResponse.replace(
      /\b(internal|admin|system|database)\b/gi,
      ""
    );

    // If user can't manage complaints, remove management-related suggestions
    if (!capabilities.includes("update_complaint_status")) {
      filteredResponse = filteredResponse.replace(/.*update.*status.*/gi, "");
      filteredResponse = filteredResponse.replace(
        /.*assign.*complaint.*/gi,
        ""
      );
    }
  }

  // Add role-specific disclaimers
  if (userContext.role === "OFFICIAL") {
    // Add operational context for railway officials
    if (
      filteredResponse.includes("complaint") &&
      capabilities.includes("view_all_complaints")
    ) {
      filteredResponse +=
        "\n\n*Note: As a railway official, you can view detailed complaint analytics and management options through your dashboard.*";
    }
  }

  return filteredResponse;
};

// Handle emergency responses with enhanced user context integration
export const handleEmergencyResponse = async (
  userMessage: string,
  conversationHistory: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [],
  additionalContext?: ContextOptions,
  userContext?: any
): Promise<string> => {
  const ai = getGeminiClient();
  if (!ai) {
    return generateEmergencyFallbackResponse(userMessage);
  }

  // Check if this is a confirmation message (user responding to initial complaint preparation)
  const isConfirmation = /^(confirm|yes|y|ok|proceed|submit)$/i.test(
    userMessage.trim()
  );

  if (isConfirmation) {
    // Stage 2: Post-confirmation emergency response with contacts
    const emergencyType = detectEmergencyType(userMessage);
    await geminiTriggerEmergency(
      emergencyType,
      "Emergency complaint confirmed and submitted"
    );

    return `🚨 EMERGENCY_RESPONSE_NEEDED 🚨

Your emergency complaint has been submitted to railway authorities. Please follow these immediate steps:

**IMMEDIATE ACTION:**
• Call the appropriate emergency service using the buttons below
• Stay in a safe location if possible
• Provide your exact location details when ready

**EMERGENCY CONTACTS:**
📞 Railway Helpline: 139
📞 Railway Protection Force: 182
📞 Medical Emergency: 108
📞 Police Emergency: 100

Your complaint has been escalated to the appropriate authorities for immediate attention.`;
  }

  // Stage 1: Initial emergency complaint preparation with user context
  let emergencyPrompt = `You are RailMadad complaint assistant. The user is reporting an emergency situation. Your job is to:

1. Acknowledge the emergency seriously but BRIEF.
2. CHECK if specific details (Location, Train No, PNR) are provided.
3. IF DETAILS MISSING: Ask for them IMMEDIATELY. Suggest using the MICROPHONE button for faster reporting. DO NOT ask for confirmation yet.
4. IF DETAILS PRESENT: Prepare a summary and asks for confirmation.
5. DO NOT show emergency contact numbers at this stage.
6. DO NOT include "EMERGENCY_RESPONSE_NEEDED" phrase yet.
7. Keep response SHORT (under 100 words).

**CRITICAL ACCURACY RULES:**
- **Location:** If the user did not specify a Train Number or Station Name, write "Not provided". DO NOT GUESS.
- **Hinglish:** Interprets words like "Aag" (Fire), "Madad" (Help), "Khoon" (Blood) as MEANINGS, not Station Codes or Names.
- **Missing Info Action:** If Location is "Not provided", ASK FOR IT. Do not ask for confirmation.
- **Voice Recommendation:** If details are sparse, say "You can tap the microphone button to speak your emergency details quickly."

User message: ${userMessage}

Provide a professional, concise emergency response. If details are missing, ask for them. If details are sufficient, ask for confirmation.`;

  // Enhanced prompt with user context for emergencies
  if (userContext) {
    // const { UserContextService } = await import("./userContextService");
    const roleInfo = UserContextService.getRoleSystemPrompt(userContext);

    emergencyPrompt += `\n\n${roleInfo}\n\nADDITIONAL EMERGENCY CONTEXT:
- Tailor emergency response based on user's role and access level
- If user is railway official, emphasize operational procedures and escalation
- If user is passenger, focus on immediate safety and clear guidance
- Maintain professional, calm communication regardless of user role`;
  }

  // Retry logic with tiered provider fallback on 429 errors
  let fallbackTier: FallbackTier = 0;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const tierConfig = getTierConfig(fallbackTier);

      let response: string;

      if (tierConfig.provider === "gemini") {
        // Use Gemini native SDK
        const model = ai.getGenerativeModel({
          model: tierConfig.model,
          systemInstruction: emergencyPrompt,
          generationConfig: {
            temperature: 1,
            topP: 0.95,
            maxOutputTokens: tierConfig.maxTokens,
          },
        });

        const result = await model.generateContent(userMessage);
        response = result.response.text();
      } else {
        // Use OpenRouter API
        response = await callOpenRouter(
          tierConfig.model,
          [{ role: "user", content: userMessage }],
          emergencyPrompt,
          { temperature: 1 }
        );
      }

      // Ensure this is just complaint preparation, not full emergency response
      if (
        response.includes("EMERGENCY_RESPONSE_NEEDED") ||
        response.includes("📞")
      ) {
        // If the AI included emergency contacts, remove them and provide clean preparation response
        const emergencyType = detectEmergencyType(userMessage);
        response = `This is a serious ${emergencyType.toLowerCase()} issue, and I will help you report it immediately.

I am preparing your complaint. Here is what I have:
- **Issue:** ${emergencyType}
- **Location:** ${extractLocationFromMessage(userMessage)}
- **Time:** Just now (current time will be logged)
- **Details:** ${userMessage.substring(0, 100)}...

Please reply 'CONFIRM' to submit this report to the Railway Protection Force (RPF) immediately. If anything is incorrect, please let me know.`;
      }

      return response;
    } catch (error: any) {
      if (shouldFallback(error) && fallbackTier < 2) {
        console.log(
          `🔄 Error on handleEmergencyResponse - escalating to tier ${fallbackTier + 1
          }`
        );
        fallbackTier = (fallbackTier + 1) as FallbackTier;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      console.error("Emergency handling failed:", error);
      const emergencyType = detectEmergencyType(userMessage);
      return `This is a serious ${emergencyType.toLowerCase()} issue, and I will help you report it immediately.

I am preparing your complaint. Here is what I have:
- **Issue:** ${emergencyType}
- **Location:** ${extractLocationFromMessage(userMessage)}
- **Time:** Just now (current time will be logged)

Please reply 'CONFIRM' to submit this report to the Railway Protection Force (RPF) immediately. If anything is incorrect, please let me know.`;
    }
  }

  return generateEmergencyFallbackResponse(userMessage);
};

// Handle function calls with proper error handling (supports both Gemini and OpenRouter)
const handleFunctionCalls = async (
  chat: any,
  functionCalls: any,
  isOpenRouter: boolean = false
): Promise<string> => {
  try {
    // Get the function calls as an array
    const functionCallsArray =
      typeof functionCalls === "function" ? functionCalls() : functionCalls;

    // If we have function calls, process them
    if (functionCallsArray && functionCallsArray.length > 0) {
      const functionResults: any[] = [];

      for (const functionCall of functionCallsArray) {
        try {
          let functionResult;

          switch (functionCall.name) {
            case "getComplaintStatus":
              // This is a client-side function. We return a special string that the frontend
              // recognizes and executes locally.
              // Format: FUNCTION_CALL: functionName({ args })
              return `FUNCTION_CALL: getComplaintStatus(${JSON.stringify(
                functionCall.args
              )})`;
              break;
            case "geminiValidatePNR":
              functionResult = await geminiValidatePNR(
                (functionCall.args as any).pnr
              );
              break;
            case "geminiValidateUTS":
              functionResult = await geminiValidateUTS(
                (functionCall.args as any).utsInput
              );
              break;
            case "geminiTriggerEmergency":
              // Handle emergency function calls more carefully
              functionResult = await geminiTriggerEmergency(
                (functionCall.args as any).emergencyType,
                (functionCall.args as any).description
              );
              break;
            case "submitComplaint":
              // Client-side function for submitting complaints
              return `FUNCTION_CALL: submitComplaint(${JSON.stringify(
                functionCall.args
              )})`;
            case "switchChatMode":
              // Client-side mode switching
              return `FUNCTION_CALL: switchChatMode(${JSON.stringify(
                functionCall.args
              )})`;
            default:
              functionResult = `Unknown function: ${functionCall.name}`;
          }

          // Normalize result format
          const normalizedResult =
            functionResult == null
              ? {}
              : typeof functionResult === "string"
                ? { text: functionResult }
                : functionResult;

          functionResults.push({
            ...normalizedResult,
            _openRouterId: functionCall._openRouterId, // Preserve OpenRouter tool call ID
          });
        } catch (error) {
          console.error(
            `Error executing function ${functionCall.name}:`,
            error
          );
          functionResults.push({
            error: `Error executing ${functionCall.name}`,
            _openRouterId: functionCall._openRouterId,
          });
        }
      }

      // Send function results back to get final response
      if (isOpenRouter) {
        // OpenRouter: Use sendFunctionResponse method
        const functionResponses = functionCallsArray.map(
          (call: any, index: number) => ({
            name: call.name,
            response: functionResults[index],
            _openRouterId: call._openRouterId,
          })
        );

        const followUpResult = await chat.sendFunctionResponse(
          functionResponses
        );
        return followUpResult.response.text();
      } else {
        // Gemini: Use original format with functionResponse parts
        const functionResponseParts = functionCallsArray.map(
          (call: any, index: number) => ({
            functionResponse: {
              name: call.name,
              response: functionResults[index],
            },
          })
        );

        const followUpResult = await chat.sendMessage(functionResponseParts);
        return followUpResult.response.text();
      }
    }

    return "No function calls to process";
  } catch (error) {
    console.error("Function call handling failed:", error);
    throw error;
  }
};

/**
 * Enhanced emergency detection with precise word boundary matching.
 * Uses explicit emergency signals to avoid false positives from casual conversation.
 *
 * @param {string} message - The user's message to analyze
 * @returns {boolean} True if the message indicates a genuine emergency situation
 *
 * Design Decision: We use word boundary regex (\b) to prevent partial matches.
 * Common words like "help" require additional context (urgency + problem) to trigger.
 */
export const detectEmergencyInMessage = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();

  // HIGH-PRIORITY: Explicit emergency phrases that ALWAYS trigger emergency mode
  // These are unambiguous emergency signals that don't need additional context
  const explicitEmergencyPhrases = [
    "emergency",
    "medical emergency",
    "call police",
    "call ambulance",
    "need ambulance",
    "robbery",
    "being robbed",
    "getting robbed",
    "robbery happening",
    "someone attacked",
    "being attacked",
    "fire in train",
    "fire in coach",
    "train on fire",
    "heart attack",
    "can't breathe",
    "cannot breathe",
    "bleeding heavily",
    "seriously injured",
    "life threatening",
    // Hinglish explicit emergency phrases
    "bachao", // Save me
    "madad chahiye", // Need help
    "chori ho rahi", // Robbery happening
    "aag lagi", // Fire started
    "khoon beh raha", // Bleeding
    "jaan ka khatra", // Life in danger
  ];

  if (
    explicitEmergencyPhrases.some((phrase) => lowerMessage.includes(phrase))
  ) {
    return true;
  }

  // MEDIUM-PRIORITY: Standalone emergency keywords with word boundaries
  // These must appear as complete words, not as part of other words
  const emergencyKeywordsWithBoundary = [
    "\\baccident\\b",
    "\\bambulance\\b",
    "\\bfire\\b", // But not "fired" or "firefox"
    "\\bpolice\\b",
    "\\battack\\b",
    "\\bharassment\\b",
    "\\bdanger\\b",
    "\\bviolence\\b",
    "\\btheft\\b",
    "\\binjured\\b",
    "\\bbleeding\\b",
    // Hinglish with boundaries
    "\\bkhatra\\b", // Danger
    "\\bchori\\b", // Theft
    "\\bmaar\\b", // Hit/Violence
    "\\baag\\b", // Fire
    "\\bbimar\\b", // Sick
    "\\bkhoon\\b", // Blood
    "\\bgunda\\b", // Goon
    "\\bchor\\b", // Thief
  ];

  if (
    emergencyKeywordsWithBoundary.some((pattern) =>
      new RegExp(pattern, "i").test(lowerMessage)
    )
  ) {
    return true;
  }

  // LOW-PRIORITY: Context-based detection requiring BOTH urgency AND problem indicators
  // Words like "help" alone are NOT emergencies - they need additional context
  const urgencyIndicators = [
    "immediately",
    "urgent",
    "urgently",
    "asap",
    "right now",
    "just now",
    "happening now",
    "quick",
    "quickly",
    // Hinglish urgency
    "jaldi",
    "abhi",
    "turant",
    "fauran",
  ];

  const seriousProblemIndicators = [
    "hurt",
    "injured",
    "pain",
    "bleeding",
    "unconscious",
    "trapped",
    "stuck",
    "dying",
    "critical",
    "severe",
    // Hinglish problems
    "dard",
    "taklif",
    "zakhmi",
    "behosh",
  ];

  const hasUrgency = urgencyIndicators.some((word) =>
    lowerMessage.includes(word)
  );
  const hasSeriousProblem = seriousProblemIndicators.some((word) =>
    lowerMessage.includes(word)
  );

  // Only trigger if BOTH urgency AND serious problem context exist
  if (hasUrgency && hasSeriousProblem) {
    return true;
  }

  // EXPLICIT MULTI-WORD PATTERNS: Specific phrase patterns that indicate emergencies
  const emergencyContextPatterns = [
    /need\s+(urgent\s+)?help.*(now|immediately|urgent)/i,
    /please\s+help.*(urgent|emergency|police|ambulance)/i,
    /someone\s+(is\s+)?(hurt|injured|bleeding|unconscious)/i,
    /can'?t\s+(breathe|breath)/i,
    /accident\s+(happened|occurred|just)/i,
    /being\s+(robbed|attacked|harassed)/i,
    /life\s+(is\s+)?in\s+danger/i,
    /save\s+(me|us|him|her)/i,
  ];

  return emergencyContextPatterns.some((pattern) => pattern.test(lowerMessage));
};

// Detect emergency type from user message
const detectEmergencyType = (message: string): string => {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("medical") ||
    lowerMessage.includes("doctor") ||
    lowerMessage.includes("ambulance") ||
    lowerMessage.includes("health") ||
    lowerMessage.includes("bimar") ||
    lowerMessage.includes("daktar") ||
    lowerMessage.includes("dard") ||
    lowerMessage.includes("heart attack")
  ) {
    return "Medical Emergency";
  }
  if (
    lowerMessage.includes("robbery") ||
    lowerMessage.includes("theft") ||
    lowerMessage.includes("security") ||
    lowerMessage.includes("police") ||
    /r[o0]+b+[e3]*r+[yi]*/.test(lowerMessage) ||
    lowerMessage.includes("chori") ||
    lowerMessage.includes("chor") ||
    lowerMessage.includes("gunda") ||
    lowerMessage.includes("snatch")
  ) {
    return "Security/Safety";
  }
  if (
    lowerMessage.includes("fire") ||
    lowerMessage.includes("smoke") ||
    lowerMessage.includes("burn") ||
    lowerMessage.includes("aag")
  ) {
    return "Fire Emergency";
  }
  if (
    lowerMessage.includes("accident") ||
    lowerMessage.includes("crash") ||
    lowerMessage.includes("derail") ||
    lowerMessage.includes("takkar")
  ) {
    return "Accident";
  }
  if (
    lowerMessage.includes("harassment") ||
    lowerMessage.includes("molestation") ||
    lowerMessage.includes("abuse") ||
    lowerMessage.includes("cheedkhani") ||
    lowerMessage.includes("chedkhani") ||
    lowerMessage.includes("badtameezi")
  ) {
    return "Harassment";
  }

  return "General Emergency";
};

// Extract detailed location information from user message
const extractLocationFromMessage = (message: string): string => {
  const msg = message.toLowerCase();
  let locationParts: string[] = [];

  // 1. Extract train numbers (4-5 digits)
  const trainMatch =
    message.match(/train\s*(\d{4,5})/i) || message.match(/\b(\d{4,5})\b/);
  if (trainMatch) {
    locationParts.push(`Train ${trainMatch[1] || trainMatch[0]}`);
  }

  // 2. Extract detailed coach information (S5, B2, A1, Coach S5, etc.)
  const coachPatterns = [
    /coach\s*([a-z]?\d+)/i, // "coach s5", "coach 5"
    /\b([a-z]\d{1,2})\b/i, // "s5", "b2", "a1"
    /([a-z]+)\s*coach/i, // "sleeper coach", "ac coach"
    /coach\s*([a-z]+)/i, // "coach sleeper"
  ];

  for (const pattern of coachPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      locationParts.push(`Coach ${match[1].toUpperCase()}`);
      break; // Use first match to avoid duplicates
    }
  }

  // 3. Extract berth/seat details
  const berthPatterns = [
    /berth\s*(\d+|[a-z]+)/i, // "berth 43", "berth lower"
    /seat\s*(\d+[a-z]?)/i, // "seat 43", "seat 43A"
    /(upper|middle|lower|side)\s*berth/i, // "upper berth", "lower berth"
    /(ub|mb|lb|sl|su)\b/i, // "UB", "MB", "LB", "SL", "SU"
    /window\s*seat/i, // "window seat"
    /aisle\s*seat/i, // "aisle seat"
    /\b(\d{1,3}[a-z]?)\b/, // "43", "43A", "2B" - moved to end to avoid false matches
  ];

  for (const pattern of berthPatterns) {
    const match = message.match(pattern);
    if (match) {
      if (match[1] && /^\d/.test(match[1])) {
        // Only capture if it starts with a digit (seat/berth number)
        locationParts.push(`Berth/Seat ${match[1].toUpperCase()}`);
        break;
      } else if (match[1]) {
        locationParts.push(`${match[1].toUpperCase()} Berth`);
        break;
      } else if (match[0]) {
        locationParts.push(match[0]);
        break;
      }
    }
  }

  // 4. Extract platform information
  const platformMatch = message.match(/platform\s*(\d+)/i);
  if (platformMatch) {
    locationParts.push(`Platform ${platformMatch[1]}`);
  }

  // 5. Extract station information
  const stationPatterns = [
    /at\s*([a-z]{2,5})\s*station/i, // "at NDLS station"
    /([a-z]{2,5})\s*station/i, // "NDLS station"
    /station\s*([a-z]{2,5})/i, // "station NDLS"
    // /\b([a-z]{2,5})\b/i               // REMOVED: Too aggressive, matches random words like "help", "aag"
  ];

  for (const pattern of stationPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length >= 2) {
      locationParts.push(`${match[1].toUpperCase()} Station`);
      break;
    }
  }

  // 6. Extract compartment/section details
  const compartmentPatterns = [
    /compartment\s*([a-z]?\d+)/i, // "compartment A1"
    /section\s*([a-z]?\d+)/i, // "section B"
    /(toilet|bathroom|washroom)/i, // "toilet", "bathroom"
    /(pantry|dining)/i, // "pantry car", "dining car"
    /near\s*(door|window|toilet)/i, // "near door", "near toilet"
  ];

  for (const pattern of compartmentPatterns) {
    const match = message.match(pattern);
    if (match) {
      if (match[1]) {
        locationParts.push(
          `${match[0].split(" ")[0]} ${match[1].toUpperCase()}`
        );
      } else {
        locationParts.push(match[0]);
      }
    }
  }

  // 7. Extract additional context clues
  const contextPatterns = [
    /(just now|right now|currently)/i, // Time context
    /(inside|outside)/i, // Position context
    /near\s*(\w+)/i, // "near bathroom", "near door"
  ];

  for (const pattern of contextPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      locationParts.push(`near ${match[1]}`);
    } else if (match) {
      locationParts.push(match[0]);
    }
  }

  // Build final location string
  if (locationParts.length === 0) {
    return "Location details needed";
  }

  // Remove duplicates and format nicely
  const uniqueParts = Array.from(new Set(locationParts));

  // Organize in logical order: Train -> Coach -> Berth/Seat -> Additional details
  const trainPart = uniqueParts.find((part) => part.includes("Train"));
  const coachPart = uniqueParts.find((part) => part.includes("Coach"));
  const berthPart = uniqueParts.find(
    (part) =>
      part.includes("Berth") ||
      part.includes("Seat") ||
      part.includes("UB") ||
      part.includes("MB") ||
      part.includes("LB")
  );
  const stationPart = uniqueParts.find((part) => part.includes("Station"));
  const platformPart = uniqueParts.find((part) => part.includes("Platform"));
  const otherParts = uniqueParts.filter(
    (part) =>
      !part.includes("Train") &&
      !part.includes("Coach") &&
      !part.includes("Berth") &&
      !part.includes("Seat") &&
      !part.includes("Station") &&
      !part.includes("Platform") &&
      !part.includes("UB") &&
      !part.includes("MB") &&
      !part.includes("LB")
  );

  let finalLocation = "";

  if (trainPart) {
    finalLocation = `On ${trainPart}`;
    if (coachPart) finalLocation += `, ${coachPart}`;
    if (berthPart) finalLocation += `, ${berthPart}`;
    if (otherParts.length > 0) finalLocation += `, ${otherParts.join(", ")}`;
  } else if (stationPart) {
    finalLocation = `At ${stationPart}`;
    if (platformPart) finalLocation += `, ${platformPart}`;
    if (otherParts.length > 0) finalLocation += `, ${otherParts.join(", ")}`;
  } else {
    finalLocation = uniqueParts.join(", ");
  }

  return finalLocation || "Location details needed";
};

// Generate fallback response for general errors
const generateFallbackResponse = (
  userMessage: string,
  isEmergency: boolean
): string => {
  if (isEmergency) {
    return generateEmergencyFallbackResponse(userMessage);
  }

  // Check if user is trying to submit a complaint
  if (
    userMessage.toLowerCase().includes("complaint") ||
    userMessage.toLowerCase().includes("problem") ||
    userMessage.toLowerCase().includes("issue")
  ) {
    return `I understand you want to submit a complaint. I'm experiencing some technical difficulties, but I can still help you.

Please provide:
• **Issue description**: What happened?
• **Location**: Train number/Station name
• **Date and time**: When did this occur?
• **Additional details**: Coach number, seat number, etc.

Once you provide these details, I'll help you submit your complaint even in limited mode.`;
  }

  return `I'm currently experiencing some technical difficulties, but I'm still here to help you with your railway concerns.

For immediate assistance:
• **Railway Helpline**: 139
• **Emergency**: 182 (RPF Security), 108 (Medical), 100 (Police)

Please describe your railway concern, and I'll do my best to assist you.`;
};

// Generate emergency-specific fallback response
const generateEmergencyFallbackResponse = (userMessage: string): string => {
  const emergencyType = detectEmergencyType(userMessage);

  return `🚨 EMERGENCY_RESPONSE_NEEDED 🚨

I've detected an emergency situation. Please take immediate action:

**IMMEDIATE STEPS:**
1. **Call Emergency Services**: Use the buttons below
2. **Stay Safe**: Move to a secure location if possible
3. **Provide Location**: Share your exact location with emergency responders

**EMERGENCY CONTACTS:**
📞 Railway Helpline: 139
📞 Railway Protection Force: 182
📞 Medical Emergency: 108
📞 Police Emergency: 100

**Emergency Type Detected**: ${emergencyType}

I'm submitting an urgent report to railway authorities. Please call the appropriate emergency number immediately.`;
};
