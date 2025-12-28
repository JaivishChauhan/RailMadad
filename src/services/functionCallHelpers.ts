import { FunctionCallResult } from './functionCallService';

// Helper function to process function calls in text format (alternative to native function calling)
export const extractFunctionCallFromText = (
  text: string
): null | {
  functionName: string;
  parameters: any;
  fullMatch: string;
} => {
  try {
    // Look for FUNCTION_CALL: name(
    const headerRegex = /FUNCTION_CALL:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*/;
    const headerMatch = text.match(headerRegex);

    if (!headerMatch) return null;

    const functionName = headerMatch[1];
    const startIndex = headerMatch.index! + headerMatch[0].length;

    // Find the parameter object - robust JSON extraction with brace counting
    const textAfterHeader = text.slice(startIndex);
    const openBraceIndex = textAfterHeader.indexOf("{");

    if (openBraceIndex === -1) return null;

    const jsonStartIndex = startIndex + openBraceIndex;
    let jsonEndIndex = -1;
    let braceCount = 0;
    let inString = false;
    let escape = false;

    for (let i = jsonStartIndex; i < text.length; i++) {
      const char = text[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === "\\") {
        escape = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{") {
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          if (braceCount === 0) {
            jsonEndIndex = i + 1;
            break;
          }
        }
      }
    }

    if (jsonEndIndex !== -1) {
      const jsonStr = text.substring(jsonStartIndex, jsonEndIndex);
      try {
        const parameters = JSON.parse(jsonStr);

        // Find closing parenthesis after JSON
        const remainingText = text.slice(jsonEndIndex);
        const closingParenMatch = remainingText.match(/^\s*\)/);

        const endOfMatch = closingParenMatch
          ? jsonEndIndex + closingParenMatch[0].length
          : jsonEndIndex;

        const fullMatch = text.substring(headerMatch.index!, endOfMatch);

        return { functionName, parameters, fullMatch };
      } catch (e) {
        console.error("JSON parse failed inside function extractor", e);
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting function call from text:", error);
    return null;
  }
};

// Helper function to format function calls for the model response
export const formatFunctionCallResponse = (functionName: string, result: FunctionCallResult | string): string => {
  try {
    // If result is already a string, return it
    if (typeof result === 'string') {
      return result;
    }

    // Format based on result type
    if (result.success) {
      return `The function ${functionName} was executed successfully: ${result.message}`;
    } else {
      return `Error executing ${functionName}: ${result.message || 'Unknown error'}`;
    }
  } catch (error) {
    console.error('Error formatting function call response:', error);
    return 'Error processing function result';
  }
};
