import { FunctionCallResult } from './functionCallService';

// Helper function to process function calls in text format (alternative to native function calling)
export const extractFunctionCallFromText = (text: string): null | { 
  functionName: string;
  parameters: any;
} => {
  try {
    // Match function calls in text format: FUNCTION_CALL: functionName({ "param": "value" })
    const functionCallPattern = /FUNCTION_CALL:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*(\{.*?\})\s*\)/s;
    const match = text.match(functionCallPattern);
    
    if (match) {
      const [_, functionName, parametersStr] = match;
      
      // Parse parameters JSON
      const parameters = JSON.parse(parametersStr);
      
      return {
        functionName,
        parameters
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting function call from text:', error);
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
