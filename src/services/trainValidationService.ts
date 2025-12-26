// Train Validation Service
import { validateTrain, type RailwayTrain } from '../data/trainsData';

export interface TrainValidationResult {
  isValid: boolean;
  trainNumber?: string;
  trainName?: string;
  train?: RailwayTrain;
  suggestions?: RailwayTrain[];
  message: string;
}

/**
 * Train Validation Service Class
 * Provides validation for train numbers and names with singleton pattern
 */
export class TrainValidationService {
  private static instance: TrainValidationService | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): TrainValidationService {
    if (!TrainValidationService.instance) {
      TrainValidationService.instance = new TrainValidationService();
    }
    return TrainValidationService.instance;
  }

  /**
   * Validate a train number or name
   */
  async validateTrainNumber(trainInput: string): Promise<TrainValidationResult> {
    try {
      const result = await validateTrain(trainInput);
      
      return {
        isValid: result.isValid,
        trainNumber: result.train?.number,
        trainName: result.train?.name,
        train: result.train,
        suggestions: result.suggestions,
        message: result.isValid 
          ? `Train ${result.train?.name} (${result.train?.number}) found`
          : `Train "${trainInput}" not found`
      };
    } catch (error) {
      console.error('Train validation error:', error);
      return {
        isValid: false,
        message: `Error validating train: ${trainInput}`,
        suggestions: []
      };
    }
  }

  /**
   * Search trains by name or number
   */
  async searchTrains(query: string): Promise<RailwayTrain[]> {
    try {
      const result = await validateTrain(query);
      return result.suggestions || [];
    } catch (error) {
      console.error('Train search error:', error);
      return [];
    }
  }
}

// Extract train references from text - Updated for Indian Railway 5-digit system
export function extractTrainReferences(message: string): string[] {
  // Indian train numbers are typically 5 digits, but also handle 4-6 digit variations
  const trainNumberPattern = /\b(\d{4,6})\b/g;
  const trainNamePattern = /\b[A-Za-z\s]+(?:express|mail|passenger|special|rajdhani|shatabdi|duronto|metro|memu|demu)\b/gi;
  
  const matches: string[] = [];
  
  // Extract train numbers (prioritize 5-digit numbers)
  const numberMatches = message.match(trainNumberPattern);
  if (numberMatches) {
    matches.push(...numberMatches);
  }
  
  // Extract train names
  const nameMatches = message.match(trainNamePattern);
  if (nameMatches) {
    matches.push(...nameMatches);
  }
  
  return matches ? Array.from(new Set(matches.map(m => m.trim()))) : [];
}

// Check if message needs train validation - Enhanced for Indian Railway system
export function needsTrainValidation(message: string): boolean {
  // Check for 5-digit train numbers (primary Indian railway pattern)
  const hasFiveDigitNumber = /\b\d{5}\b/.test(message);
  
  // Check for 4-6 digit numbers (variations)
  const hasTrainNumber = /\b\d{4,6}\b/.test(message);
  
  // Check for train-related keywords
  const hasTrainKeywords = /\b(train|express|rajdhani|shatabdi|duronto|mail|passenger|special|memu|demu|metro|vande)\b/i.test(message);
  
  return hasFiveDigitNumber || (hasTrainNumber && hasTrainKeywords) || hasTrainKeywords;
}

// Smart train validation
export async function smartTrainValidation(message: string): Promise<{
  hasTrainReferences: boolean;
  validatedTrains: RailwayTrain[];
  invalidReferences: string[];
  suggestions: RailwayTrain[];
  enhancedMessage: string;
}> {
  const trainReferences = extractTrainReferences(message);
  
  if (trainReferences.length === 0) {
    return {
      hasTrainReferences: false,
      validatedTrains: [],
      invalidReferences: [],
      suggestions: [],
      enhancedMessage: message
    };
  }
  
  const validatedTrains: RailwayTrain[] = [];
  const invalidReferences: string[] = [];
  const allSuggestions: RailwayTrain[] = [];
  let enhancedMessage = message;
  
  for (const ref of trainReferences) {
    const result = await validateTrain(ref);
    
    if (result.isValid && result.train) {
      validatedTrains.push(result.train);
      enhancedMessage = enhancedMessage.replace(
        new RegExp(`\\b${ref}\\b`, 'gi'),
        `${result.train.name} (${result.train.number})`
      );
    } else {
      invalidReferences.push(ref);
      if (result.suggestions) {
        allSuggestions.push(...result.suggestions.slice(0, 2));
      }
    }
  }
  
  return {
    hasTrainReferences: true,
    validatedTrains,
    invalidReferences,
    suggestions: allSuggestions.slice(0, 5),
    enhancedMessage
  };
}