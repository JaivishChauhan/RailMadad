// Smart Railway Station Validation - Direct JSON Reference
export interface RailwayStation {
  name: string;
  code: string;
}

let stationsData: RailwayStation[] = [];
let stationsLoaded = false;

import DataLoaderWorker from '../workers/dataLoader.worker?worker';

// Simple load function - just get the JSON data
async function loadStations(): Promise<void> {
  if (stationsLoaded) return;

  // Return a promise that resolves when the worker sends back data
  return new Promise((resolve, reject) => {
    try {
      const worker = new DataLoaderWorker();

      worker.onmessage = (e) => {
        const { type, data, error } = e.data;
        if (type === "SUCCESS") {
          stationsData = data;
          stationsLoaded = true;
          if (process.env.NODE_ENV === 'development') {
            console.log(`Loaded ${stationsData.length} railway stations (worker)`);
          }
          worker.terminate();
          resolve();
        } else if (type === "ERROR") {
          console.error('Failed to load stations (worker):', error);
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
        url: '/data/indian-railway-stations-2025-08-16.json',
        kind: 'stations'
      });

    } catch (error) {
      console.error('Failed to initialize worker:', error);
      reject(error);
    }
  });
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