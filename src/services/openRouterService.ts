/**
 * OpenRouter API Service Module
 *
 * Provides a unified interface for interacting with the OpenRouter API,
 * which offers access to 300+ language models through an OpenAI-compatible
 * REST API. This service mirrors the functionality of geminiService.ts
 * to allow seamless provider switching.
 *
 * @module openRouterService
 */

import {
  getOpenRouterApiKey,
  getActiveConfig,
  OPENROUTER_MODELS,
  type AIModelConfig,
} from "../config/aiConfig";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * OpenRouter message format (OpenAI-compatible).
 */
export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string | OpenRouterContentPart[];
}

/**
 * Content part for multimodal messages.
 */
export interface OpenRouterContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string; // Can be a data URL (base64) or HTTP URL
  };
}

/**
 * OpenRouter API request body.
 */
export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  response_format?: { type: "json_object" };
  stop?: string | string[];
}

/**
 * OpenRouter API response structure.
 */
export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string;
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
 * OpenRouter error response structure.
 */
export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code?: string | number;
  };
}

// ============================================================================
// Constants
// ============================================================================

/** OpenRouter API base URL */
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/** HTTP headers for OpenRouter requests */
const getHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "HTTP-Referer":
    typeof window !== "undefined"
      ? window.location.origin
      : "https://railmadad.app",
  "X-Title": "RailMadad Railway Complaint System",
});

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Checks if an error is a rate limit error (HTTP 429).
 *
 * @param {any} error - The error object to check.
 * @returns {boolean} True if the error is a 429 rate limit error.
 */
export const isRateLimitError = (error: any): boolean => {
  if (!error) return false;

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
 * Parses an OpenRouter API error response.
 *
 * @param {Response} response - The fetch Response object.
 * @returns {Promise<Error>} A properly formatted error object.
 */
const parseErrorResponse = async (response: Response): Promise<Error> => {
  try {
    const data = (await response.json()) as OpenRouterError;
    const message =
      data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(message);
    (error as any).status = response.status;
    (error as any).code = data.error?.code;
    return error;
  } catch {
    return new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
};

// ============================================================================
// Core API Functions
// ============================================================================

/**
 * Sends a chat completion request to OpenRouter API.
 *
 * @param {OpenRouterMessage[]} messages - The conversation messages.
 * @param {object} options - Optional configuration.
 * @param {string} options.model - Model ID to use.
 * @param {number} options.maxTokens - Maximum tokens to generate.
 * @param {number} options.temperature - Response randomness (0-2).
 * @param {number} options.topP - Top-p sampling parameter.
 * @param {boolean} options.jsonMode - Whether to request JSON output.
 * @returns {Promise<string>} The assistant's response text.
 * @throws {Error} If API key is missing or request fails.
 */
export const openRouterChat = async (
  messages: OpenRouterMessage[],
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    jsonMode?: boolean;
  } = {}
): Promise<string> => {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error(
      "OpenRouter API key is not configured. Set VITE_OPENROUTER_API_KEY in your .env.local"
    );
  }

  const config = getActiveConfig();
  const modelId =
    options.model || config?.primaryModel.modelId || OPENROUTER_MODELS.primary;

  const requestBody: OpenRouterRequest = {
    model: modelId,
    messages,
    max_tokens: options.maxTokens ?? 65536,
    temperature: options.temperature ?? 1,
    top_p: options.topP ?? 0.95,
  };

  if (options.jsonMode) {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const data = (await response.json()) as OpenRouterResponse;
  return data.choices[0]?.message?.content || "";
};

/**
 * Sends a chat completion with retry logic and fallback model support.
 * Automatically retries with fallback model on rate limit errors.
 *
 * @param {OpenRouterMessage[]} messages - The conversation messages.
 * @param {object} options - Configuration options.
 * @returns {Promise<string>} The assistant's response text.
 */
export const openRouterChatWithRetry = async (
  messages: OpenRouterMessage[],
  options: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    jsonMode?: boolean;
    maxRetries?: number;
  } = {}
): Promise<string> => {
  const maxRetries = options.maxRetries ?? 2;
  let useFallback = false;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const model = useFallback
        ? OPENROUTER_MODELS.fallback
        : OPENROUTER_MODELS.primary;

      if (useFallback) {
        console.log(
          `⚠️ Rate limit hit - switching to fallback model: ${model}`
        );
      }

      return await openRouterChat(messages, {
        ...options,
        model,
      });
    } catch (error: any) {
      lastError = error;

      if (isRateLimitError(error) && !useFallback) {
        console.log(`🔄 Rate limit detected - will retry with fallback model`);
        useFallback = true;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Failed to get response after retries");
};

// ============================================================================
// Conversation Format Converters
// ============================================================================

/**
 * Converts Gemini-style conversation history to OpenRouter format.
 *
 * @param {Array} geminiHistory - Conversation history in Gemini format.
 * @param {string} systemPrompt - The system prompt to include.
 * @returns {OpenRouterMessage[]} Messages in OpenRouter format.
 */
export const convertGeminiHistoryToOpenRouter = (
  geminiHistory: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }>,
  systemPrompt?: string
): OpenRouterMessage[] => {
  const messages: OpenRouterMessage[] = [];

  // Add system prompt if provided
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  // Convert each message
  for (const msg of geminiHistory) {
    const role = msg.role === "model" ? "assistant" : "user";
    const content = msg.parts.map((p) => p.text).join("\n");
    messages.push({ role, content });
  }

  return messages;
};

/**
 * Converts multimodal parts (images) to OpenRouter content format.
 *
 * @param {string} text - The text content.
 * @param {Array} multimodalParts - Array of inline data parts.
 * @returns {OpenRouterContentPart[]} Content parts for OpenRouter.
 */
export const convertMultimodalContent = (
  text: string,
  multimodalParts?: Array<{ inlineData: { mimeType: string; data: string } }>
): OpenRouterContentPart[] => {
  const parts: OpenRouterContentPart[] = [];

  // Add text part
  if (text) {
    parts.push({ type: "text", text });
  }

  // Convert image parts (OpenRouter uses image_url format)
  if (multimodalParts) {
    for (const part of multimodalParts) {
      // Only process image types for now
      if (part.inlineData.mimeType.startsWith("image/")) {
        parts.push({
          type: "image_url",
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          },
        });
      }
    }
  }

  return parts;
};

// ============================================================================
// High-Level Chat Function (Matches geminiService.chatWithContext signature)
// ============================================================================

/**
 * Sends a contextual chat message to OpenRouter API.
 * This function mirrors the signature of chatWithContext from geminiService
 * to allow seamless provider switching.
 *
 * @param {string} userMessage - The user's message.
 * @param {Array} conversationHistory - Previous conversation messages in Gemini format.
 * @param {object} additionalContext - Additional context options.
 * @param {any} userContext - User context information.
 * @param {string} systemPromptOverride - Custom system prompt.
 * @param {Array} multimodalParts - Multimodal content (images, etc.).
 * @returns {Promise<string>} The assistant's response.
 */
export const openRouterChatWithContext = async (
  userMessage: string,
  conversationHistory: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [],
  additionalContext?: any,
  userContext?: any,
  systemPromptOverride?: string,
  multimodalParts?: Array<{ inlineData: { mimeType: string; data: string } }>
): Promise<string> => {
  // Import the system prompt from geminiService to maintain consistency
  const { RAILMADAD_CHAT_SYSTEM_PROMPT, generateUserAwareSystemPrompt } =
    await import("./geminiService");
  const { createContextAwarePrompt, extractContextFromMessage } = await import(
    "./contextEnhancer"
  );

  // Build system prompt
  let systemPrompt = systemPromptOverride || RAILMADAD_CHAT_SYSTEM_PROMPT;

  // Enhance with user context if available
  if (userContext) {
    systemPrompt = generateUserAwareSystemPrompt(systemPrompt, userContext);
  }

  // Extract and merge context
  const extractedContext = extractContextFromMessage(userMessage);
  const finalContext = { ...extractedContext, ...additionalContext };

  // Create context-aware prompt
  systemPrompt = await createContextAwarePrompt(
    systemPrompt,
    finalContext,
    userMessage
  );

  // Convert conversation history to OpenRouter format
  const messages = convertGeminiHistoryToOpenRouter(
    conversationHistory,
    systemPrompt
  );

  // Add current user message with potential multimodal content
  if (multimodalParts && multimodalParts.length > 0) {
    messages.push({
      role: "user",
      content: convertMultimodalContent(userMessage, multimodalParts),
    });
  } else {
    messages.push({
      role: "user",
      content: userMessage,
    });
  }

  // Send request with retry logic
  const response = await openRouterChatWithRetry(messages);

  // Filter response based on user context if needed
  if (userContext) {
    const { filterResponseByUserContext } = await import("./geminiService");
    return filterResponseByUserContext(response, userContext);
  }

  return response;
};

// ============================================================================
// JSON Response Function (for structured outputs)
// ============================================================================

/**
 * Sends a chat request expecting a JSON response.
 *
 * @param {OpenRouterMessage[]} messages - The conversation messages.
 * @param {object} options - Configuration options.
 * @returns {Promise<T>} The parsed JSON response.
 */
export const openRouterChatJSON = async <T = any>(
  messages: OpenRouterMessage[],
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<T> => {
  const response = await openRouterChatWithRetry(messages, {
    ...options,
    jsonMode: true,
  });

  try {
    return JSON.parse(response) as T;
  } catch (error) {
    console.error("Failed to parse JSON response:", response);
    throw new Error("Failed to parse JSON response from OpenRouter");
  }
};

// ============================================================================
// Availability Check
// ============================================================================

/**
 * Checks if OpenRouter API is configured and available.
 *
 * @returns {boolean} True if OpenRouter is configured.
 */
export const isOpenRouterConfigured = (): boolean => {
  return !!getOpenRouterApiKey();
};

/**
 * Tests the OpenRouter API connection with a simple request.
 *
 * @returns {Promise<boolean>} True if the connection is successful.
 */
export const testOpenRouterConnection = async (): Promise<boolean> => {
  try {
    const response = await openRouterChat(
      [{ role: "user", content: "Say 'OK' if you can hear me." }],
      { maxTokens: 10 }
    );
    return response.toLowerCase().includes("ok");
  } catch (error) {
    console.error("OpenRouter connection test failed:", error);
    return false;
  }
};
