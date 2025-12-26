// Context Manager Utility - Easy way to add and manage contexts

import { addContextSource, type ContextSource } from '../services/contextLoader';

// Helper function to easily add new context from markdown content
export const addMarkdownContext = (
  category: string,
  content: string,
  priority: number = 5
): void => {
  const contextSource: ContextSource = {
    type: 'inline',
    source: content,
    category,
    priority
  };
  
  addContextSource(contextSource);
};

// Helper function to add context from a file path
export const addContextFromFile = (
  category: string,
  filePath: string,
  priority: number = 5
): void => {
  const contextSource: ContextSource = {
    type: 'markdown',
    source: filePath,
    category,
    priority
  };
  
  addContextSource(contextSource);
};

// Predefined context templates for common scenarios
export const contextTemplates = {
  // Template for adding train-specific context
  trainContext: (trainInfo: string) => `
TRAIN-SPECIFIC CONTEXT:
${trainInfo}

This information should be used when discussing this specific train or similar trains in the same category.
`,

  // Template for adding station-specific context  
  stationContext: (stationInfo: string) => `
STATION-SPECIFIC CONTEXT:
${stationInfo}

This information should be used when discussing this specific station or similar stations.
`,

  // Template for adding seasonal context
  seasonalContext: (seasonInfo: string) => `
SEASONAL CONTEXT:
${seasonInfo}

Consider this seasonal information when providing responses about travel during this time period.
`,

  // Template for adding regional context
  regionalContext: (regionInfo: string) => `
REGIONAL CONTEXT:
${regionInfo}

Use this regional information to provide culturally appropriate and locally relevant responses.
`
};

// Easy-to-use functions for common context additions
export const addTrainContext = (trainInfo: string, priority: number = 6) => {
  addMarkdownContext('train-specific', contextTemplates.trainContext(trainInfo), priority);
};

export const addStationContext = (stationInfo: string, priority: number = 6) => {
  addMarkdownContext('station-specific', contextTemplates.stationContext(stationInfo), priority);
};

export const addSeasonalContext = (seasonInfo: string, priority: number = 4) => {
  addMarkdownContext('seasonal', contextTemplates.seasonalContext(seasonInfo), priority);
};

export const addRegionalContext = (regionInfo: string, priority: number = 5) => {
  addMarkdownContext('regional', contextTemplates.regionalContext(regionInfo), priority);
};

// Example usage function - shows how to add the train numbering context you provided
export const addTrainNumberingContext = () => {
  const trainNumberingInfo = `
INDIAN RAILWAY TRAIN NUMBERING SYSTEM:

5-Digit Train Numbers Structure:
- First digit indicates train type:
  * 0: Special trains (holiday or summer specials)
  * 1 & 2: Long-distance Mail/Express trains, including premium services like Rajdhani and Shatabdi
  * 3: Kolkata suburban trains
  * 4: Suburban trains in major cities other than Kolkata and Mumbai (Chennai, Delhi, Secunderabad)
  * 5: Passenger trains with conventional coaches
  * 6: MEMU (Mainline Electric Multiple Unit) trains
  * 7: DEMU (Diesel Electric Multiple Unit) and railcar services
  * 8: Special purpose trains, such as Suvidha Express
  * 9: Mumbai suburban trains, including the Vande Metro

- Second and third digits: Railway zone and division that operates or maintains the service
- Fourth and fifth digits: Unique serial number to distinguish the train from others in the same category

Other Numbering Systems:
- Wagon/Coaching stock: 5-digit numbers on individual coaches indicate year of manufacture and coach type (NOT train number)
- Freight trains: 11-digit system for wagons specifying wagon type, ownership, and year of manufacture

This system helps in:
1. Identifying train categories quickly
2. Understanding operational zones
3. Distinguishing between different service types
4. Proper complaint categorization and routing
`;

  addTrainContext(trainNumberingInfo, 8); // High priority for train-related queries
};

// Initialize with the train numbering context
addTrainNumberingContext();