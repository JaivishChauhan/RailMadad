// Smart Railway Station Validation - Direct JSON Reference
export interface RailwayStation {
  name: string;
  code: string;
}

let stationsData: RailwayStation[] = [];
let stationsLoaded = false;

// Simple load function - just get the JSON data
async function loadStations(): Promise<void> {
  if (stationsLoaded) return;
  
  try {
    // Use fetch for JSON loading to avoid TypeScript import issues
    const response = await fetch('/data/indian-railway-stations-2025-08-16.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch stations data: ${response.status}`);
    }
    const rawData = await response.json();
    
    stationsData = rawData.map((station: any) => ({
      name: station.label,
      code: station.value
    }));
    
    stationsLoaded = true;
    if (process.env.NODE_ENV === 'development') {
      console.log(`Loaded ${stationsData.length} railway stations`);
    }
  } catch (error) {
    console.error('Failed to load stations:', error);
    throw error;
  }
}

// Smart validation - handles codes, names, and fuzzy matching
export async function validateStation(input: string): Promise<{
  isValid: boolean;
  station?: RailwayStation;
  suggestions?: RailwayStation[];
}> {
  await loadStations();
  
  const query = input.trim().toLowerCase();
  if (!query) return { isValid: false };
  
  // Direct match by code or name
  const exactMatch = stationsData.find(s => 
    s.code.toLowerCase() === query || 
    s.name.toLowerCase() === query
  );
  
  if (exactMatch) {
    return { isValid: true, station: exactMatch };
  }
  
  // Fuzzy search for suggestions
  const suggestions = stationsData
    .filter(s => {
      const stationName = s.name.toLowerCase();
      const stationCode = s.code.toLowerCase();
      return stationName.includes(query) || 
             stationCode.includes(query) ||
             query.includes(stationCode) ||
             stationName.startsWith(query) ||
             stationName.split(' ').some(word => word.startsWith(query));
    })
    .slice(0, 5);
  
  return { isValid: false, suggestions };
}

// Initialize database
export async function initializeStationsDatabase(): Promise<void> {
  await loadStations();
}