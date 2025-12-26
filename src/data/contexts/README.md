# Context System for RailMadad AI Assistant

This directory contains context files that provide additional information to the Gemini AI assistant for better, more accurate responses.

## File Structure

```
data/contexts/
├── README.md                           # This file
├── generalRailwayContext.md           # Comprehensive railway information
├── medicalEmergencyContext.md         # Medical emergency protocols
├── cleanlinessContext.md              # Cleanliness complaint handling
└── [other context files]             # Add more as needed
```

## How to Add New Context

### Method 1: Create a Markdown File
1. Create a new `.md` file in this directory
2. Write your context in clear, structured markdown
3. Register it in `services/contextLoader.ts`

### Method 2: Use the Context Manager (Recommended)
```typescript
import { addMarkdownContext } from '../utils/contextManager';

// Add new context easily
addMarkdownContext('your-category', `
YOUR CONTEXT CONTENT HERE:
- Point 1
- Point 2
- Point 3
`, 7); // Priority level (1-10)
```

### Method 3: Use Templates
```typescript
import { addTrainContext } from '../utils/contextManager';

addTrainContext(`
Your train-specific information here
`);
```

## Context Categories

- `railway-basics`: Core railway terminology and data
- `railway-comprehensive`: Detailed railway system information
- `medical-emergency`: Medical emergency protocols
- `cleanliness`: Cleanliness-related complaint handling
- `food-safety`: Food and catering safety information
- `accessibility`: Divyangjan (accessibility) facilities
- `women-safety`: Women safety protocols
- `seasonal`: Season-specific travel information
- `regional`: Region-specific cultural context

## Priority Levels

- **10**: Critical system information (always included)
- **8-9**: High priority (emergency, safety)
- **6-7**: Medium priority (specific complaint types)
- **4-5**: Low priority (general information)
- **1-3**: Background information (rarely used)

## Best Practices

1. **Be Specific**: Write context that directly helps with complaint handling
2. **Use Clear Structure**: Organize information with headers and bullet points
3. **Keep Updated**: Regularly review and update context files
4. **Test Impact**: Verify that new context improves AI responses
5. **Avoid Duplication**: Check existing contexts before adding new ones

## Examples

### Adding Train Numbering Context (as requested)
```typescript
import { addTrainContext } from '../utils/contextManager';

addTrainContext(`
INDIAN RAILWAY TRAIN NUMBERING:
- 5-digit format: [Type][Zone][Serial]
- First digit meanings:
  * 0: Special trains
  * 1-2: Express trains
  * 3: Kolkata suburban
  * 4: Other suburban
  * 5: Passenger trains
  * 6: MEMU
  * 7: DEMU
  * 8: Special purpose
  * 9: Mumbai suburban
`, 8);
```

### Adding Regional Context
```typescript
import { addRegionalContext } from '../utils/contextManager';

addRegionalContext(`
SOUTH INDIAN CONTEXT:
- Languages: Tamil, Telugu, Kannada, Malayalam
- Major stations: Chennai Central, Bangalore, Hyderabad
- Cultural considerations: Use respectful terms
- Peak seasons: Festival times vary by state
`);
```

## Integration

The context system automatically:
1. Detects relevant contexts based on user messages
2. Loads appropriate context files
3. Combines contexts by priority
4. Provides enhanced information to the AI

## Maintenance

- Review contexts monthly for accuracy
- Update emergency numbers and procedures as needed
- Add new contexts based on common complaint patterns
- Remove outdated information promptly