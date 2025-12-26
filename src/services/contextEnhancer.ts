import { geminiContextData, getContextualInfo, getLocationContext } from '../data/geminiContext';
import { getSmartContext, getContextByCategory } from './contextLoader';

export interface ContextOptions {
  complaintType?: string;
  stationCode?: string;
  userLanguage?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  isUrgent?: boolean;
}

// Function to generate dynamic context based on conversation state
export const generateDynamicContext = async (options: ContextOptions = {}, userMessage?: string): Promise<string> => {
  const { complaintType, stationCode, userLanguage, timeOfDay, isUrgent } = options;
  
  let contextString = '\n\n--- DYNAMIC CONTEXT ---\n';
  
  // Get smart context based on user message
  if (userMessage) {
    const smartContext = await getSmartContext(userMessage);
    contextString += smartContext;
  }
  
  // Add complaint-specific context
  if (complaintType) {
    contextString += `\nComplaint Context: ${getContextualInfo(complaintType)}\n`;
  }
  
  // Add location context
  if (stationCode) {
    contextString += `\n${getLocationContext(stationCode)}\n`;
  }
  
  // Add time-based context
  if (timeOfDay) {
    const timeContext = getTimeBasedContext(timeOfDay);
    contextString += `\nTime Context: ${timeContext}\n`;
  }
  
  // Add urgency context
  if (isUrgent) {
    contextString += `\nUrgency Context: This appears to be an urgent complaint requiring immediate attention and escalation to appropriate authorities.\n`;
  }
  
  // Add cultural context based on language
  if (userLanguage && userLanguage !== 'en') {
    const culturalContext = getCulturalContext(userLanguage);
    contextString += `\nCultural Context: ${culturalContext}\n`;
    contextString += `\nLANGUAGE INSTRUCTION: Respond in ${getLanguageName(userLanguage)} (${userLanguage}) using the appropriate script. Do not switch to English or other languages.\n`;
  } else if (userLanguage === 'en') {
    contextString += `\nLANGUAGE INSTRUCTION: Respond in English.\n`;
  }
  
  // Add current railway terminology from updated context data
  contextString += `\nQuick Reference:
- Coach Types: ${Object.entries(geminiContextData.coreRailwayData.coachTypes).map(([code, name]) => `${code} (${name})`).join(', ')}
- Berth Types: ${Object.entries(geminiContextData.coreRailwayData.berthTypes).map(([code, name]) => `${code} (${name})`).join(', ')}
- Emergency Numbers: ${Object.entries(geminiContextData.quickReference.emergencyNumbers).map(([service, number]) => `${service}: ${number}`).join(', ')}
`;
  
  contextString += '\n--- END DYNAMIC CONTEXT ---\n\n';
  
  return contextString;
};

// Time-based context for better responses
const getTimeBasedContext = (timeOfDay: string): string => {
  switch (timeOfDay) {
    case 'morning':
      return 'Morning hours (6 AM - 12 PM): Peak travel time, higher complaint volume expected. Staff availability is good.';
    case 'afternoon':
      return 'Afternoon hours (12 PM - 6 PM): Regular service hours, normal response times expected.';
    case 'evening':
      return 'Evening hours (6 PM - 10 PM): Peak travel time, possible delays in non-urgent responses.';
    case 'night':
      return 'Night hours (10 PM - 6 AM): Limited staff availability, urgent complaints will be prioritized.';
    default:
      return 'Standard service hours apply.';
  }
};

// Cultural context based on detected language
const getCulturalContext = (language: string): string => {
  const culturalMap: Record<string, string> = {
    'hi': 'Hindi-speaking user: Use respectful terms like "Ji" and "Sahab/Madam". Be culturally sensitive.',
    'bn': 'Bengali-speaking user: Common in Eastern India, familiar with Kolkata and surrounding railway network.',
    'ta': 'Tamil-speaking user: Common in Southern India, familiar with Chennai and Tamil Nadu railway network.',
    'te': 'Telugu-speaking user: Common in Andhra Pradesh and Telangana, familiar with Hyderabad railway network.',
    'mr': 'Marathi-speaking user: Common in Maharashtra, familiar with Mumbai railway network.',
    'gu': 'Gujarati-speaking user: Common in Gujarat, familiar with Ahmedabad and Gujarat railway network.'
  };
  
  return culturalMap[language] || 'Multilingual user: Maintain respectful and inclusive communication.';
};

// Get full language name for context
const getLanguageName = (languageCode: string): string => {
  const languageNames: Record<string, string> = {
    'hi': 'Hindi',
    'bn': 'Bengali',
    'ta': 'Tamil', 
    'te': 'Telugu',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'en': 'English'
  };
  
  return languageNames[languageCode] || 'English';
};

// Function to create context-aware system prompt
export const createContextAwarePrompt = async (basePrompt: string, options: ContextOptions = {}, userMessage?: string): Promise<string> => {
  const dynamicContext = await generateDynamicContext(options, userMessage);
  return basePrompt + dynamicContext;
};

// Function to extract context from user message
export const extractContextFromMessage = (message: string): ContextOptions => {
  const context: ContextOptions = {};
  
  // Detect urgency keywords
  const urgentKeywords = ['emergency', 'urgent', 'immediate', 'help', 'danger', 'medical', 'security'];
  context.isUrgent = urgentKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
  
  // Detect time references
  const timeKeywords = {
    morning: ['morning', 'सुबह', 'காலை'],
    afternoon: ['afternoon', 'दोपहर', 'மதியம்'],
    evening: ['evening', 'शाम', 'மாலை'],
    night: ['night', 'रात', 'இரவு']
  };
  
  for (const [time, keywords] of Object.entries(timeKeywords)) {
    if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
      context.timeOfDay = time as any;
      break;
    }
  }
  
  // Detect station codes (3-4 letter uppercase)
  const stationMatch = message.match(/\b[A-Z]{2,4}\b/);
  if (stationMatch) {
    context.stationCode = stationMatch[0];
  }
  
  // Detect user language based on script and common words
  context.userLanguage = detectUserLanguage(message);
  
  return context;
};

// Language detection function
const detectUserLanguage = (message: string): string => {
  // Hindi/Devanagari script detection
  if (/[\u0900-\u097F]/.test(message)) {
    return 'hi';
  }
  
  // Bengali script detection
  if (/[\u0980-\u09FF]/.test(message)) {
    return 'bn';
  }
  
  // Tamil script detection
  if (/[\u0B80-\u0BFF]/.test(message)) {
    return 'ta';
  }
  
  // Telugu script detection
  if (/[\u0C00-\u0C7F]/.test(message)) {
    return 'te';
  }
  
  // Gujarati script detection
  if (/[\u0A80-\u0AFF]/.test(message)) {
    return 'gu';
  }
  
  // Marathi detection (uses Devanagari but has specific words)
  if (/[\u0900-\u097F]/.test(message) && 
      (message.includes('मराठी') || message.includes('महाराष्ट्र') || 
       message.includes('पुणे') || message.includes('मुंबई'))) {
    return 'mr';
  }
  
  // Default to English
  return 'en';
};