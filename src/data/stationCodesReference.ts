// Common Indian Railway Station Codes Reference
// This file contains commonly used station codes for quick reference

export const STATION_CODE_REFERENCE = {
  'Major Cities': {
    'Mumbai Central': 'MMCT',
    'Chhatrapati Shivaji Maharaj Terminus': 'CSMT',
    'New Delhi': 'NDLS', 
    'Chennai Central': 'MAS',
    'Howrah': 'HWH',
    'Bangalore City': 'SBC',
    'Hyderabad': 'HYB',
    'Ahmedabad': 'ADI',
    'Pune': 'PUNE',
    'Kolkata': 'KOAA'
  },
  'Gujarat Stations': {
    'Gandhidham': 'GIMB',
    'Ahmedabad': 'ADI',
    'Surat': 'ST',
    'Vadodara': 'BRC',
    'Rajkot': 'RJT',
    'Bhavnagar': 'BVC',
    'Jamnagar': 'JAM',
    'Anand': 'ANND',
    'Mehsana': 'MSH',
    'Palanpur': 'PNU'
  },
  'Common Aliases': {
    'GIMB': ['Gandhidham', 'Gandhidam', 'Gandhinagar'],
    'ADI': ['Ahmedabad', 'Ahmadabad', 'Amdavad'],
    'BRC': ['Vadodara', 'Baroda'],
    'MMCT': ['Mumbai Central', 'Bombay Central'],
    'CSMT': ['CST', 'VT', 'Victoria Terminus', 'Mumbai CST'],
    'NDLS': ['New Delhi', 'Delhi'],
    'MAS': ['Chennai Central', 'Madras Central'],
    'SBC': ['Bangalore', 'Bengaluru'],
    'HWH': ['Howrah'],
    'HYB': ['Hyderabad', 'Secunderabad']
  }
};

// Helper function to get station code tips for chatbot
export function getStationCodeTips(): string {
  return `
**Common Station Codes:**
• GIMB - Gandhidham
• ADI - Ahmedabad  
• BRC - Vadodara
• ST - Surat
• MMCT - Mumbai Central
• NDLS - New Delhi
• MAS - Chennai Central
• SBC - Bangalore City

**Tips for Station Names:**
• You can use either the full name or the code
• Common spellings are accepted (e.g., "Gandhinagar" for Gandhidham)
• If unsure, try the major city name first
`;
}

// Get suggestions based on partial input
export function getStationCodeSuggestions(input: string): string[] {
  const suggestions: string[] = [];
  const lowerInput = input.toLowerCase();
  
  // Check all station categories
  Object.values(STATION_CODE_REFERENCE).forEach(category => {
    if (typeof category === 'object') {
      Object.entries(category).forEach(([name, code]) => {
        if (Array.isArray(code)) {
          // This is an alias entry
          code.forEach(alias => {
            if (alias.toLowerCase().includes(lowerInput)) {
              suggestions.push(`${name} (${Object.keys(STATION_CODE_REFERENCE['Common Aliases']).find(k => 
                STATION_CODE_REFERENCE['Common Aliases'][k as keyof typeof STATION_CODE_REFERENCE['Common Aliases']].includes(alias)
              )})`);
            }
          });
        } else {
          // This is a regular station entry
          if (name.toLowerCase().includes(lowerInput) || code.toLowerCase().includes(lowerInput)) {
            suggestions.push(`${name} (${code})`);
          }
        }
      });
    }
  });
  
  return [...new Set(suggestions)].slice(0, 5); // Remove duplicates and limit to 5
}
