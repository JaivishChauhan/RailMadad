// Smart Railway Train Validation - Direct JSON Reference
export interface RailwayTrain {
  name: string;
  number: string;
  zone?: string;
}

let trainsData: RailwayTrain[] = [];
let trainsLoaded = false;

// Simple load function - just get the JSON data
async function loadTrains(): Promise<void> {
  if (trainsLoaded) return;

  try {
    // Use fetch for JSON loading to avoid TypeScript import issues
    const response = await fetch("/data/refined_train_data.json");
    if (!response.ok) {
      throw new Error(`Failed to fetch trains data: ${response.status}`);
    }
    const rawData = await response.json();

    trainsData = rawData
      .map((train: any) => ({
        name: train.train_name,
        number: train.train_number,
        zone: train.zone,
      }))
      .filter((train: RailwayTrain) => train.number && train.number.trim()); // Only keep trains with valid numbers

    trainsLoaded = true;
    if (process.env.NODE_ENV === "development") {
      console.log(`Loaded ${trainsData.length} railway trains`);
    }
  } catch (error) {
    console.error("Failed to load trains:", error);
    throw error;
  }
}

// Smart validation - handles numbers, names, and fuzzy matching
export async function validateTrain(input: string): Promise<{
  isValid: boolean;
  train?: RailwayTrain;
  suggestions?: RailwayTrain[];
}> {
  await loadTrains();

  const query = input.trim().toLowerCase();
  if (!query) return { isValid: false };

  // Direct match by number or name
  const exactMatch = trainsData.find(
    (t) => t.number.toLowerCase() === query || t.name.toLowerCase() === query
  );

  if (exactMatch) {
    return { isValid: true, train: exactMatch };
  }

  // Fuzzy search for suggestions
  const suggestions = trainsData
    .filter((t) => {
      const trainName = t.name.toLowerCase();
      const trainNumber = t.number.toLowerCase();
      return (
        trainName.includes(query) ||
        trainNumber.includes(query) ||
        query.includes(trainNumber) ||
        trainName.startsWith(query)
      );
    })
    .slice(0, 5);

  return { isValid: false, suggestions };
}

// Initialize database
export async function initializeTrainsDatabase(): Promise<void> {
  await loadTrains();
}
