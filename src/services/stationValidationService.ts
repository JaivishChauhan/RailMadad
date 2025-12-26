// Simple Station Validation Service
import { validateStation, type RailwayStation } from '../data/stationsData';

export interface StationValidationResult {
  isValid: boolean;
  originalInput: string;
  validatedStation?: RailwayStation;
  suggestions?: RailwayStation[];
  responseMessage: string;
  shouldAskForClarification: boolean;
}

// Extract station references from text
export function extractStationNames(text: string): string[] {
  // Common non-railway words to exclude
  const excludeWords = /\b(hi|hello|hey|ok|no|yes|bye|thanks|thank|you|please|help|problem|issue|complaint|good|bad|fine|nice|sorry|excuse|me|the|and|or|but|in|on|at|to|from|with|by|for|of|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|can|may|might)\b/i;
  
  // Look for explicit station patterns or codes
  const stationPatterns = [
    // Station codes (3-5 uppercase letters)
    /\b[A-Z]{3,5}\b/g,
    // Words followed by station-related terms
    /\b[A-Za-z\s]{3,20}(?:\s+(?:station|stn|junction|jn|central|terminal|railway))\b/gi
  ];
  
  const matches: string[] = [];
  
  for (const pattern of stationPatterns) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }
  
  // Filter out common words and return unique matches
  const filtered = matches
    .map(m => m.trim())
    .filter(m => !excludeWords.test(m) && m.length >= 2);
  
  return Array.from(new Set(filtered));
}

// Check if message needs station validation
export function needsStationValidation(message: string): boolean {
  // Common non-railway words that should NOT trigger station validation
  const commonWords = /\b(hi|hello|hey|ok|no|yes|bye|thanks|thank|you|please|help|problem|issue|complaint|good|bad|fine|nice|sorry|excuse|me)\b/i;
  
  // If the message contains common conversational words, don't validate as station
  if (commonWords.test(message)) {
    return false;
  }
  
  // Only validate if it contains explicit railway terms or looks like a station code
  return /\b(station|stn|junction|jn|terminal|central|railway|train|platform|pf)\b/i.test(message) ||
         /\b[A-Z]{3,5}\b/.test(message); // Station codes are typically 3-5 uppercase letters
}

// Smart validation with suggestions
export async function smartStationValidation(input: string): Promise<StationValidationResult> {
  const result = await validateStation(input);

  if (result.isValid && result.station) {
    return {
      isValid: true,
      originalInput: input,
      validatedStation: result.station,
      responseMessage: `Found ${result.station.name} (${result.station.code})`,
      shouldAskForClarification: false
    };
  }

  if (result.suggestions && result.suggestions.length > 0) {
    const suggestionText = result.suggestions
      .map(s => `${s.name} (${s.code})`)
      .join(', ');

    return {
      isValid: false,
      originalInput: input,
      suggestions: result.suggestions,
      responseMessage: `Station "${input}" not found. Did you mean: ${suggestionText}?`,
      shouldAskForClarification: true
    };
  }

  return {
    isValid: false,
    originalInput: input,
    responseMessage: `Station "${input}" not found. Please provide the correct station name or code.`,
    shouldAskForClarification: true
  };
}