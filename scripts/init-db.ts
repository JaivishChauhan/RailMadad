import Database from 'better-sqlite3';
import path from 'path';

// Initialize database
const dbPath = path.join(process.cwd(), 'railmadad.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

console.log('🚀 Initializing RailMadad database...');

// Ensure legacy tables are dropped to avoid schema mismatches
db.exec(`DROP TABLE IF EXISTS document_chunks;`);
db.exec(`DROP TABLE IF EXISTS documents;`);

// Create documents table (for RAG - stores full text)
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT UNIQUE NOT NULL,
    full_content TEXT NOT NULL,
    file_hash TEXT,
    last_modified DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create chunks table (for RAG search)
db.exec(`
  CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding BLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  )
`);
// Create users table (for authentication)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    role TEXT CHECK(role IN ('passenger', 'official')),
    oauth_provider TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create complaints table
db.exec(`
  CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    category TEXT,
    description TEXT,
    station TEXT,
    train TEXT,
    status TEXT DEFAULT 'pending',
    embedding BLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Create indexes for better performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(filename);
  CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
  CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
`);

console.log('✅ Database tables created successfully!');
console.log('📁 Database file: railmadad.db');
console.log('🗂️  Tables created: documents, document_chunks, users, complaints');

db.close();