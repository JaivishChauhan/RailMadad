// Smart Railway Train Validation - Direct JSON Reference
export interface RailwayTrain {
  name: string;
  number: string;
  zone?: string;
}

let trainsData: RailwayTrain[] = [];
let trainsLoaded = false;

import DataLoaderWorker from '../workers/dataLoader.worker?worker';

// Simple load function - just get the JSON data
async function loadTrains(): Promise<void> {
  if (trainsLoaded) return;

  // Return a promise that resolves when the worker sends back data
  return new Promise((resolve, reject) => {
    try {
      const worker = new DataLoaderWorker();

      worker.onmessage = (e) => {
        const { type, data, error } = e.data;
        if (type === "SUCCESS") {
          trainsData = data;
          trainsLoaded = true;
          if (process.env.NODE_ENV === "development") {
            console.log(`Loaded ${trainsData.length} railway trains (worker)`);
          }
          worker.terminate();
          resolve();
        } else if (type === "ERROR") {
          console.error('Failed to load trains (worker):', error);
          worker.terminate();
          reject(new Error(error));
        }
      };

      worker.onerror = (err) => {
        console.error('Worker error:', err);
        worker.terminate();
        reject(err);
      };

      worker.postMessage({
        type: "LOAD_DATA",
        url: "/data/refined_train_data.json",
        kind: "trains"
      });

    } catch (error) {
      console.error('Failed to initialize worker:', error);
      reject(error);
    }
  });
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
