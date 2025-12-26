// Context Loader Service - Loads and manages context from various sources
import { geminiContextData } from '../data/geminiContext';

export interface ContextSource {
  type: 'markdown' | 'json' | 'inline';
  source: string;
  category: string;
  priority: number; // Higher number = higher priority
}

// Registry of available context sources
export const contextRegistry: ContextSource[] = [
  {
    type: 'inline',
    source: 'coreRailwayData',
    category: 'railway-basics',
    priority: 10
  },
  {
    type: 'markdown',
    source: '/data/contexts/generalRailwayContext.md',
    category: 'railway-comprehensive',
    priority: 9
  },
  {
    type: 'markdown', 
    source: '/data/contexts/medicalEmergencyContext.md',
    category: 'medical-emergency',
    priority: 8
  },
  {
    type: 'markdown',
    source: '/data/contexts/cleanlinessContext.md', 
    category: 'cleanliness',
    priority: 7
  }
];

// Context cache to avoid repeated file reads
const contextCache = new Map<string, string>();

// Load context from markdown file (for development/build time)
export const loadMarkdownContext = async (filePath: string): Promise<string> => {
  // Check cache first
  if (contextCache.has(filePath)) {
    return contextCache.get(filePath)!;
  }

  try {
    // In a real application, you'd read the file here
    // For now, we'll return the content based on the file path
    let content = '';
    
    switch (filePath) {
      case '/data/contexts/generalRailwayContext.md':
        content = await getGeneralRailwayContext();
        break;
      case '/data/contexts/medicalEmergencyContext.md':
        content = await getMedicalEmergencyContext();
        break;
      case '/data/contexts/cleanlinessContext.md':
        content = await getCleanlinessContext();
        break;
      default:
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Context file not found: ${filePath}`);
        }
        return '';
    }

    // Cache the content
    contextCache.set(filePath, content);
    return content;
  } catch (error) {
    console.error(`Error loading context from ${filePath}:`, error);
    return '';
  }
};

// Get context based on categories and priorities
export const getContextByCategory = async (categories: string[]): Promise<string> => {
  const relevantSources = contextRegistry
    .filter(source => categories.includes(source.category))
    .sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)

  let combinedContext = '';

  for (const source of relevantSources) {
    let contextContent = '';

    switch (source.type) {
      case 'markdown':
        contextContent = await loadMarkdownContext(source.source);
        break;
      case 'inline':
        contextContent = getInlineContext(source.source);
        break;
      case 'json':
        // Handle JSON context if needed
        break;
    }

    if (contextContent) {
      combinedContext += `\n\n--- ${source.category.toUpperCase()} CONTEXT ---\n${contextContent}`;
    }
  }

  return combinedContext;
};

// Get inline context from the data object
const getInlineContext = (contextKey: string): string => {
  switch (contextKey) {
    case 'coreRailwayData':
      return formatCoreRailwayData(geminiContextData.coreRailwayData);
    default:
      return '';
  }
};

// Format core railway data for context
const formatCoreRailwayData = (data: any): string => {
  return `
CORE RAILWAY DATA:

Coach Types:
${Object.entries(data.coachTypes).map(([code, name]) => `- ${code}: ${name}`).join('\n')}

Berth Types:
${Object.entries(data.berthTypes).map(([code, name]) => `- ${code}: ${name}`).join('\n')}

Train Number System:
${data.trainNumbering.structure}

First Digit Meanings:
${Object.entries(data.trainNumbering.firstDigitMeaning).map(([digit, meaning]) => `- ${digit}: ${meaning}`).join('\n')}
`;
};

// Context content getters (these would normally read from files)
const getGeneralRailwayContext = async (): Promise<string> => {
  return `
COMPREHENSIVE RAILWAY CONTEXT:

Train Numbering System:
- 5-digit format with specific meanings
- First digit indicates train type (0-9)
- Second/third digits indicate zone/division
- Fourth/fifth digits are serial numbers

Emergency Numbers:
- Railway Helpline: 139
- Railway Protection Force: 182
- Medical Emergency: 108

PNR Requirements:
- Must be exactly 10 digits
- Used for ticket tracking and complaints

Station Classifications:
- A1: Major terminals (NDLS, MMCT, MAS)
- A-F: Decreasing order of importance
- 3-4 letter station codes

Cultural Considerations:
- Use respectful terms (Ji, Sahab, Madam)
- Regional language preferences vary
- Festival seasons affect travel patterns
`;
};

const getMedicalEmergencyContext = async (): Promise<string> => {
  return `
MEDICAL EMERGENCY CONTEXT:

Priority: HIGHEST - Immediate response required

Common Scenarios:
- Heart attacks, strokes, breathing difficulties
- Injuries from falls or accidents
- Pregnancy-related emergencies
- Diabetic emergencies

Response Protocol:
1. Stay calm and get exact location
2. Guide user to seek immediate help from train staff
3. Provide emergency contact numbers
4. Log complaint after emergency is handled

Emergency Contacts:
- Railway Helpline: 139
- Medical Emergency: 108
- RPF Emergency: 182
`;
};

const getCleanlinessContext = async (): Promise<string> => {
  return `
CLEANLINESS CONTEXT:

Common Issues:
- Dirty toilets and washrooms
- Unclean coaches and seats
- Garbage accumulation
- Poor maintenance

Response Times:
- Minor cleaning: 2-4 hours
- Major cleaning: 24-48 hours
- Deep cleaning: 3-7 days

Responsible Departments:
- Coach cleaning: Housekeeping
- Station cleaning: Station Master
- Toilet maintenance: Mechanical Department
`;
};

// Smart context selection based on message analysis
export const getSmartContext = async (userMessage: string): Promise<string> => {
  const message = userMessage.toLowerCase();
  const categories: string[] = [];

  // Always include basic railway context
  categories.push('railway-basics');

  // Detect specific contexts needed
  if (message.includes('emergency') || message.includes('medical') || message.includes('heart') || message.includes('accident')) {
    categories.push('medical-emergency');
  }

  if (message.includes('clean') || message.includes('dirty') || message.includes('toilet') || message.includes('washroom')) {
    categories.push('cleanliness');
  }

  // If no specific context detected, add comprehensive context
  if (categories.length === 1) {
    categories.push('railway-comprehensive');
  }

  return await getContextByCategory(categories);
};

// Clear context cache (useful for development)
export const clearContextCache = (): void => {
  contextCache.clear();
};

// Add new context source dynamically
export const addContextSource = (source: ContextSource): void => {
  contextRegistry.push(source);
  // Sort by priority
  contextRegistry.sort((a, b) => b.priority - a.priority);
};