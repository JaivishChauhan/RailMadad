import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Initialize database
const dbPath = path.join(process.cwd(), 'railmadad.db');
const db = new Database(dbPath);

console.log('🚂 Loading Indian Railway data into SQLite...');

// Load stations data
function loadStationsData() {
  const stationsFile = path.join(process.cwd(), 'public', 'data', 'indian-railway-stations-2025-08-16.json');
  
  if (!fs.existsSync(stationsFile)) {
    console.log('❌ Stations file not found:', stationsFile);
    return;
  }

  console.log('📍 Loading railway stations...');
  const stationsData = JSON.parse(fs.readFileSync(stationsFile, 'utf-8'));
  
  // Clear existing stations
  db.prepare('DELETE FROM railway_stations').run();
  
  const insertStation = db.prepare(`
    INSERT OR IGNORE INTO railway_stations (id, station_code, station_name, state, zone, division, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (const station of stationsData) {
    const id = crypto.randomUUID();
    const result = insertStation.run(
      id,
      station.value || '', // station code is in 'value' field
      station.label || '', // station name is in 'label' field
    );
    if (result.changes > 0) count++;
  }

  console.log(`✅ Loaded ${count} railway stations`);
}

// Load trains data
function loadTrainsData() {
  const trainsFile = path.join(process.cwd(), 'public', 'data', 'indian-railways-trains-2025-08-16.json');
  
  if (!fs.existsSync(trainsFile)) {
    console.log('❌ Trains file not found:', trainsFile);
    return;
  }

  console.log('🚄 Loading railway trains...');
  const trainsData = JSON.parse(fs.readFileSync(trainsFile, 'utf-8'));
  
  // Clear existing trains
  db.prepare('DELETE FROM railway_trains').run();
  
  const insertTrain = db.prepare(`
    INSERT OR IGNORE INTO railway_trains (id, train_number, train_name, train_type, source_station, destination_station, zone, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (const train of trainsData) {
    const id = crypto.randomUUID();
    const result = insertTrain.run(
      id,
      train.value || '', // train number is in 'value' field
      train.label || '', // train name is in 'label' field
      1 // is_active = true
    );
    if (result.changes > 0) count++;
  }

  console.log(`✅ Loaded ${count} railway trains`);
}

// Main execution
try {
  loadStationsData();
  loadTrainsData();
  
  console.log('📊 Final counts:');
  console.log(`   Stations: ${(db.prepare('SELECT COUNT(*) as count FROM railway_stations').get() as {count: number}).count}`);
  console.log(`   Trains: ${(db.prepare('SELECT COUNT(*) as count FROM railway_trains').get() as {count: number}).count}`);
  
  console.log('🎉 Railway data loaded successfully!');
} catch (error) {
  console.error('❌ Failed to load railway data:', error);
} finally {
  db.close();
}
