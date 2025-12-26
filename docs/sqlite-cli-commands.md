# SQLite CLI Data Cleanup Commands

## Basic SQLite CLI Usage
```bash
# Open database
sqlite3 railmadad.db

# Enable better formatting
.mode column
.headers on
.width 12 20 8

# Show all tables
.tables

# Show table schema
.schema railway_stations
```

## Data Quality Analysis
```sql
-- Check for empty/null values
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN station_name = '' OR station_name IS NULL THEN 1 END) as empty_names,
  COUNT(CASE WHEN station_code = '' OR station_code IS NULL THEN 1 END) as empty_codes
FROM railway_stations;

-- Check station code length distribution
SELECT 
  LENGTH(station_code) as code_length, 
  COUNT(*) as count 
FROM railway_stations 
GROUP BY LENGTH(station_code) 
ORDER BY code_length;

-- Find stations with unusual names
SELECT station_code, station_name 
FROM railway_stations 
WHERE LENGTH(station_name) < 3 OR LENGTH(station_name) > 50 
LIMIT 10;

-- Check for duplicates
SELECT station_code, COUNT(*) as count 
FROM railway_stations 
GROUP BY station_code 
HAVING COUNT(*) > 1;
```

## Data Cleanup Operations
```sql
-- Remove completely empty records (if any)
DELETE FROM railway_stations 
WHERE (station_name IS NULL OR station_name = '') 
  AND (station_code IS NULL OR station_code = '');

-- Trim whitespace from all string fields
UPDATE railway_stations SET 
  station_name = TRIM(station_name),
  station_code = TRIM(station_code);

-- Convert codes to uppercase (if needed)
UPDATE railway_stations SET 
  station_code = UPPER(station_code);

-- Remove stations with invalid codes (optional - be careful!)
-- DELETE FROM railway_stations WHERE LENGTH(station_code) < 2;
```

## Export Clean Data
```sql
-- Export to CSV
.mode csv
.output clean_stations.csv
SELECT * FROM railway_stations WHERE LENGTH(station_code) >= 3;
.output stdout
.mode column
```

## Backup Before Cleaning
```bash
# Create backup
sqlite3 railmadad.db ".backup backup_$(date +%Y%m%d).db"

# Or export as SQL
sqlite3 railmadad.db ".dump" > backup_$(date +%Y%m%d).sql
```