#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'railmadad.db');

try {
  const db = new Database(dbPath);
  
  console.log('=== DATA QUALITY CHECK ===\n');
  
  // Check railway stations
  console.log('🚉 RAILWAY STATIONS TABLE:');
  const stationStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN station_name IS NULL OR station_name = '' THEN 1 END) as empty_names,
      COUNT(CASE WHEN station_code IS NULL OR station_code = '' THEN 1 END) as empty_codes,
      COUNT(CASE WHEN (station_name IS NULL OR station_name = '') AND (station_code IS NULL OR station_code = '') THEN 1 END) as completely_empty
    FROM railway_stations
  `).get() as any;
  
  console.log(`  Total records: ${stationStats.total}`);
  console.log(`  Empty names: ${stationStats.empty_names}`);
  console.log(`  Empty codes: ${stationStats.empty_codes}`);
  console.log(`  Completely empty: ${stationStats.completely_empty}`);
  
  // Show sample of problematic stations
  const badStations = db.prepare(`
    SELECT * FROM railway_stations 
    WHERE station_name IS NULL OR station_name = '' OR station_code IS NULL OR station_code = '' 
    LIMIT 10
  `).all() as any[];
  
  if (badStations.length > 0) {
    console.log('\n  Sample problematic stations:');
    badStations.forEach(station => {
      console.log(`    ${station.id}: code="${station.station_code}", name="${station.station_name}"`);
    });
  }
  
  // Check railway trains
  console.log('\n🚂 RAILWAY TRAINS TABLE:');
  const trainStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN train_name IS NULL OR train_name = '' THEN 1 END) as empty_names,
      COUNT(CASE WHEN train_number IS NULL OR train_number = '' THEN 1 END) as empty_numbers,
      COUNT(CASE WHEN (train_name IS NULL OR train_name = '') AND (train_number IS NULL OR train_number = '') THEN 1 END) as completely_empty
    FROM railway_trains
  `).get() as any;
  
  console.log(`  Total records: ${trainStats.total}`);
  console.log(`  Empty names: ${trainStats.empty_names}`);
  console.log(`  Empty numbers: ${trainStats.empty_numbers}`);
  console.log(`  Completely empty: ${trainStats.completely_empty}`);
  
  // Show sample of problematic trains
  const badTrains = db.prepare(`
    SELECT * FROM railway_trains 
    WHERE name IS NULL OR name = '' OR number IS NULL OR number = '' 
    LIMIT 10
  `).all() as any[];
  
  if (badTrains.length > 0) {
    console.log('\n  Sample problematic trains:');
    badTrains.forEach(train => {
      console.log(`    ${train.id}: number="${train.number}", name="${train.name}"`);
    });
  }
  
  // Check for other tables with potential issues
  console.log('\n📊 OTHER TABLES:');
  
  // Check complaints
  const complaintStats = db.prepare(`
    SELECT COUNT(*) as total FROM complaints
  `).get() as any;
  console.log(`  Complaints: ${complaintStats.total} records`);
  
  // Check profiles
  const profileStats = db.prepare(`
    SELECT COUNT(*) as total FROM profiles
  `).get() as any;
  console.log(`  Profiles: ${profileStats.total} records`);
  
  // Check documents
  const documentStats = db.prepare(`
    SELECT COUNT(*) as total FROM documents
  `).get() as any;
  console.log(`  Documents: ${documentStats.total} records`);
  
  console.log('\n✅ Data quality check completed!');
  
  db.close();
  
} catch (error) {
  console.error('❌ Error checking data quality:', error);
  process.exit(1);
}