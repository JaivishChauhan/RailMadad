import Database from 'better-sqlite3';
import path from 'path';

// Initialize database
const dbPath = path.join(process.cwd(), 'railmadad.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

console.log('🚀 Migrating Supabase schema to SQLite...');

// Drop existing tables if they exist (for clean migration)
const tables = [
  'document_chunks',
  'documents',
  'complaint_updates',
  'complaint_attachments',
  'complaints',
  'complaint_categories',
  'railway_trains',
  'railway_stations',
  'profiles'
];
tables.forEach(table => {
  db.exec(`DROP TABLE IF EXISTS ${table}`);
});

console.log('📝 Creating SQLite schema based on Supabase...');

// Documents table (RAG storage)
db.exec(`
  CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    filename TEXT UNIQUE NOT NULL,
    full_content TEXT NOT NULL,
    file_hash TEXT,
    last_modified DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Document chunks table (RAG vectors)
db.exec(`
  CREATE TABLE document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding BLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  )
`);

// Profiles table (equivalent to Supabase profiles)
db.exec(`
  CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    role TEXT CHECK(role IN ('passenger', 'official', 'super_admin')) NOT NULL DEFAULT 'passenger',
    full_name TEXT,
    phone TEXT,
    employee_id TEXT,
    department TEXT,
    station_code TEXT,
    zone TEXT,
    email TEXT UNIQUE,
    oauth_provider TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Complaints table
db.exec(`
  CREATE TABLE complaints (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    complaint_area TEXT CHECK(complaint_area IN ('TRAIN', 'STATION')) NOT NULL,

    -- Train/Journey details
    train_number TEXT,
    train_name TEXT,
    pnr TEXT,
    coach_number TEXT,
    seat_number TEXT,
    journey_date DATE,

    -- Station details
    station_code TEXT,
    station_name TEXT,

    -- Incident details
    incident_date DATE NOT NULL,
    incident_time TEXT,
    location TEXT,

    -- Complaint categorization
    complaint_type TEXT NOT NULL,
    complaint_subtype TEXT NOT NULL,

    -- Content
    description TEXT NOT NULL,
    source TEXT DEFAULT 'manual',

    -- Status and priority
    status TEXT CHECK(status IN ('pending', 'in_progress', 'resolved', 'closed', 'escalated', 'withdrawn')) DEFAULT 'pending',
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',

    -- Assignment
    assigned_to TEXT,
    assigned_at DATETIME,

    -- Resolution
    resolution_notes TEXT,
    resolved_at DATETIME,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES profiles(id),
    FOREIGN KEY (assigned_to) REFERENCES profiles(id)
  )
`);

// Complaint attachments table
db.exec(`
  CREATE TABLE complaint_attachments (
    id TEXT PRIMARY KEY,
    complaint_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Local file path instead of Supabase Storage URL
    file_type TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id),
    FOREIGN KEY (uploaded_by) REFERENCES profiles(id)
  )
`);

// Complaint updates/comments table
db.exec(`
  CREATE TABLE complaint_updates (
    id TEXT PRIMARY KEY,
    complaint_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    update_type TEXT NOT NULL DEFAULT 'comment',
    content TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id),
    FOREIGN KEY (user_id) REFERENCES profiles(id)
  )
`);

// Railway stations reference table
db.exec(`
  CREATE TABLE railway_stations (
    id TEXT PRIMARY KEY,
    station_code TEXT UNIQUE NOT NULL,
    station_name TEXT NOT NULL,
    state TEXT,
    zone TEXT,
    division TEXT,
    latitude REAL,
    longitude REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Railway trains reference table
db.exec(`
  CREATE TABLE railway_trains (
    id TEXT PRIMARY KEY,
    train_number TEXT UNIQUE NOT NULL,
    train_name TEXT NOT NULL,
    train_type TEXT,
    source_station TEXT,
    destination_station TEXT,
    zone TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Complaint categories reference table
db.exec(`
  CREATE TABLE complaint_categories (
    id TEXT PRIMARY KEY,
    area TEXT CHECK(area IN ('TRAIN', 'STATION')) NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(area, category, subcategory)
  )
`);

// Create indexes for performance
console.log('🔍 Creating indexes...');
db.exec(`
  CREATE INDEX idx_complaints_user_id ON complaints(user_id);
  CREATE INDEX idx_complaints_status ON complaints(status);
  CREATE INDEX idx_complaints_area ON complaints(complaint_area);
  CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to);
  CREATE INDEX idx_complaints_created_at ON complaints(created_at);
  CREATE INDEX idx_complaints_incident_date ON complaints(incident_date);
  CREATE INDEX idx_complaints_train_number ON complaints(train_number);
  CREATE INDEX idx_complaints_station_code ON complaints(station_code);

  CREATE INDEX idx_complaint_attachments_complaint_id ON complaint_attachments(complaint_id);
  CREATE INDEX idx_complaint_updates_complaint_id ON complaint_updates(complaint_id);

  CREATE INDEX idx_documents_filename ON documents(filename);
  CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);

  CREATE INDEX idx_railway_stations_code ON railway_stations(station_code);
  CREATE INDEX idx_railway_stations_name ON railway_stations(station_name);
  CREATE INDEX idx_railway_trains_number ON railway_trains(train_number);
  CREATE INDEX idx_railway_trains_name ON railway_trains(train_name);
`);

// Insert complaint categories (same data as Supabase)
console.log('📊 Inserting complaint categories...');
const categories = [
  // TRAIN categories
  ['TRAIN', 'Security', 'Theft', 'Theft of passenger belongings'],
  ['TRAIN', 'Security', 'Harassment', 'Physical or verbal harassment'],
  ['TRAIN', 'Security', 'Fighting', 'Physical altercations between passengers'],
  ['TRAIN', 'Security', 'Unauthorized vendor', 'Vendors without proper authorization'],
  ['TRAIN', 'Security', 'Smoking', 'Smoking in non-smoking areas'],
  ['TRAIN', 'Security', 'Dacoity / Robbery', 'Armed robbery or dacoity'],
  ['TRAIN', 'Security', 'Others', 'Other security-related issues'],

  ['TRAIN', 'Medical Assistance', 'Passenger illness', 'Medical emergency of passenger'],
  ['TRAIN', 'Medical Assistance', 'Doctor not available at coaching', 'Medical professional unavailable'],
  ['TRAIN', 'Medical Assistance', 'First-aid box not available', 'Missing or empty first-aid supplies'],
  ['TRAIN', 'Medical Assistance', 'Others', 'Other medical assistance issues'],

  ['TRAIN', 'Electrical', 'Fan', 'Ceiling fan malfunction'],
  ['TRAIN', 'Electrical', 'Lights', 'Light fixture problems'],
  ['TRAIN', 'Electrical', 'Air conditioning', 'AC not working or poor cooling'],
  ['TRAIN', 'Electrical', 'Mobile charging point', 'Charging ports not working'],
  ['TRAIN', 'Electrical', 'Others', 'Other electrical issues'],

  ['TRAIN', 'Coach - Cleanliness', 'Coach', 'General coach cleanliness'],
  ['TRAIN', 'Coach - Cleanliness', 'Toilet', 'Toilet cleanliness and maintenance'],
  ['TRAIN', 'Coach - Cleanliness', 'Washbasin', 'Washbasin cleanliness'],
  ['TRAIN', 'Coach - Cleanliness', 'Others', 'Other cleanliness issues'],

  ['TRAIN', 'Water Availability', 'Toilet', 'Water not available in toilets'],
  ['TRAIN', 'Water Availability', 'Washbasin', 'Water not available in washbasins'],
  ['TRAIN', 'Water Availability', 'Coach', 'General water availability issues'],
  ['TRAIN', 'Water Availability', 'Others', 'Other water-related issues'],

  ['TRAIN', 'Punctuality', 'Late running', 'Train running behind schedule'],
  ['TRAIN', 'Punctuality', 'Others', 'Other punctuality issues'],

  ['TRAIN', 'Water Quality', 'Toilet', 'Poor water quality in toilets'],
  ['TRAIN', 'Water Quality', 'Washbasin', 'Poor water quality in washbasins'],
  ['TRAIN', 'Water Quality', 'Coach', 'Poor drinking water quality'],
  ['TRAIN', 'Water Quality', 'Others', 'Other water quality issues'],

  ['TRAIN', 'Staff Behaviour', 'TTE', 'Traveling Ticket Examiner behavior'],
  ['TRAIN', 'Staff Behaviour', 'Guard', 'Guard behavior issues'],
  ['TRAIN', 'Staff Behaviour', 'Conductor', 'Conductor behavior problems'],
  ['TRAIN', 'Staff Behaviour', 'Others', 'Other staff behavior issues'],

  ['TRAIN', 'Corruption / Bribery', 'TTE', 'Corruption involving TTE'],
  ['TRAIN', 'Corruption / Bribery', 'Guard', 'Corruption involving Guard'],
  ['TRAIN', 'Corruption / Bribery', 'Conductor', 'Corruption involving Conductor'],
  ['TRAIN', 'Corruption / Bribery', 'Others', 'Other corruption/bribery issues'],

  // STATION categories
  ['STATION', 'Cleanliness', 'Waiting Hall', 'Waiting area cleanliness'],
  ['STATION', 'Cleanliness', 'Toilet', 'Station toilet cleanliness'],
  ['STATION', 'Cleanliness', 'Platform', 'Platform cleanliness'],
  ['STATION', 'Cleanliness', 'Others', 'Other station cleanliness issues'],

  ['STATION', 'Water Availability', 'Waiting Hall', 'Water not available in waiting areas'],
  ['STATION', 'Water Availability', 'Toilet', 'Water not available in toilets'],
  ['STATION', 'Water Availability', 'Platform', 'Water not available on platforms'],
  ['STATION', 'Water Availability', 'Others', 'Other water availability issues'],

  ['STATION', 'Electrical', 'Waiting Hall', 'Electrical issues in waiting areas'],
  ['STATION', 'Electrical', 'Platform', 'Platform electrical problems'],
  ['STATION', 'Electrical', 'Others', 'Other electrical issues'],

  ['STATION', 'Divyangjan Facilities', 'Toilet', 'Accessible toilet facilities'],
  ['STATION', 'Divyangjan Facilities', 'Lift', 'Elevator/lift accessibility'],
  ['STATION', 'Divyangjan Facilities', 'Others', 'Other accessibility issues'],

  ['STATION', 'Facilities for Women with Special needs', 'Baby food', 'Baby food facilities'],
  ['STATION', 'Facilities for Women with Special needs', 'Others', 'Other women-specific facilities'],

  ['STATION', 'Security', 'Theft', 'Theft at station premises'],
  ['STATION', 'Security', 'Harassment', 'Harassment at station'],
  ['STATION', 'Security', 'Others', 'Other security issues'],

  ['STATION', 'Bed Roll', 'Bedding', 'Bedroll quality and availability'],
  ['STATION', 'Bed Roll', 'Others', 'Other bedroll issues'],

  ['STATION', 'Catering & Vending Services', 'Food Stall', 'Food stall issues'],
  ['STATION', 'Catering & Vending Services', 'Tea Stall', 'Tea stall problems'],
  ['STATION', 'Catering & Vending Services', 'Water Stall', 'Water vendor issues'],
  ['STATION', 'Catering & Vending Services', 'Others', 'Other catering issues'],

  ['STATION', 'Staff Behaviour', 'Booking staff', 'Ticket booking staff behavior'],
  ['STATION', 'Staff Behaviour', 'Others', 'Other staff behavior issues'],

  ['STATION', 'Corruption / Bribery', 'Booking staff', 'Corruption in ticket booking'],
  ['STATION', 'Corruption / Bribery', 'Others', 'Other corruption/bribery issues']
];

const insertCategory = db.prepare(`
  INSERT INTO complaint_categories (id, area, category, subcategory, description)
  VALUES (?, ?, ?, ?, ?)
`);

categories.forEach(([area, category, subcategory, description]) => {
  const id = `${area.toLowerCase()}_${category.toLowerCase().replace(/\s+/g, '_')}_${subcategory.toLowerCase().replace(/\s+/g, '_')}`;
  insertCategory.run(id, area, category, subcategory, description);
});

console.log(`✅ Inserted ${categories.length} complaint categories`);

console.log('🎉 Supabase schema successfully migrated to SQLite!');
console.log('📁 Database: railmadad.db');
console.log('🗂️  Tables: profiles, complaints, complaint_attachments, complaint_updates, railway_stations, railway_trains, complaint_categories');

db.close();