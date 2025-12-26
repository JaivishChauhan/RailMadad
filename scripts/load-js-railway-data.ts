import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Initialize database
const dbPath = path.join(process.cwd(), "railmadad.db");
const db = new Database(dbPath);

console.log("🚂 Loading JS Railway data into SQLite...");

// Load stations from JS file
function loadStationsFromJS() {
  const stationsFile = path.join(process.cwd(), "scripts", "station_data.js");

  if (!fs.existsSync(stationsFile)) {
    console.log("❌ Station JS file not found:", stationsFile);
    return;
  }

  console.log("📍 Loading railway stations from JS...");

  // Read and evaluate the JS file to get the array
  const jsContent = fs.readFileSync(stationsFile, "utf-8");

  // Extract the array from the JS file using regex
  const arrayMatch = jsContent.match(/var arrStationList = (\[.*?\]);/s);
  if (!arrayMatch) {
    console.log("❌ Could not find arrStationList in station_data.js");
    return;
  }

  const stationsData = JSON.parse(arrayMatch[1]);

  // Clear existing stations
  console.log("🗑️  Clearing existing stations...");
  db.prepare("DELETE FROM railway_stations").run();

  const insertStation = db.prepare(`
    INSERT INTO railway_stations (id, station_code, station_name, state, zone, division, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (const station of stationsData) {
    const id = crypto.randomUUID();
    insertStation.run(
      id,
      station.code || "",
      station.name || "",
      null, // state
      null, // zone
      null, // division
      null, // latitude
      null // longitude
    );
    count++;
  }

  console.log(`✅ Loaded ${count} railway stations`);
}

// Load trains from JS file
function loadTrainsFromJS() {
  const trainsFile = path.join(process.cwd(), "scripts", "train_data.js");

  if (!fs.existsSync(trainsFile)) {
    console.log("❌ Train JS file not found:", trainsFile);
    return;
  }

  console.log("🚄 Loading railway trains from JS...");

  // Read and evaluate the JS file to get the array
  const jsContent = fs.readFileSync(trainsFile, "utf-8");

  // Extract the array from the JS file using regex
  const arrayMatch = jsContent.match(/var arrTrainList = (\[.*?\]);/s);
  if (!arrayMatch) {
    console.log("❌ Could not find arrTrainList in train_data.js");
    return;
  }

  const trainsArray = JSON.parse(arrayMatch[1]);

  // Clear existing trains
  console.log("🗑️  Clearing existing trains...");
  db.prepare("DELETE FROM railway_trains").run();

  const insertTrain = db.prepare(`
    INSERT INTO railway_trains (id, train_number, train_name, train_type, source_station, destination_station, zone, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (const trainEntry of trainsArray) {
    // Parse "00001- TEST FOR CCLMS" format
    const parts = trainEntry.split("- ");
    if (parts.length !== 2) continue;

    const trainNumber = parts[0].trim();
    const trainName = parts[1].trim();

    const id = crypto.randomUUID();
    insertTrain.run(
      id,
      trainNumber,
      trainName,
      null, // train_type
      null, // source_station
      null, // destination_station
      null, // zone
      1 // is_active = true
    );
    count++;
  }

  console.log(`✅ Loaded ${count} railway trains`);
}

// Main execution
try {
  loadStationsFromJS();
  loadTrainsFromJS();

  console.log("📊 Final counts:");
  console.log(
    `   Stations: ${
      (
        db.prepare("SELECT COUNT(*) as count FROM railway_stations").get() as {
          count: number;
        }
      ).count
    }`
  );
  console.log(
    `   Trains: ${
      (
        db.prepare("SELECT COUNT(*) as count FROM railway_trains").get() as {
          count: number;
        }
      ).count
    }`
  );

  console.log("🎉 JS Railway data loaded successfully!");
} catch (error) {
  console.error("❌ Failed to load JS railway data:", error);
} finally {
  db.close();
}
