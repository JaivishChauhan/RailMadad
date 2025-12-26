import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'railmadad.db');

// Initialize database with proper error handling
let db: Database.Database;

try {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL'); // Better concurrency
  console.log('✅ Database connected:', DB_PATH);
} catch (error) {
  console.error('❌ Database connection failed:', error);
  throw error;
}

// Prepared statements for better performance
export const statements = {
  // Documents
  insertDocument: db.prepare(`
    INSERT OR REPLACE INTO documents (filename, full_content, file_hash, last_modified)
    VALUES (?, ?, ?, ?)
  `),

  getDocument: db.prepare(`
    SELECT * FROM documents WHERE filename = ?
  `),

  // Chunks
  insertChunk: db.prepare(`
    INSERT INTO document_chunks (document_id, chunk_text, chunk_index, embedding)
    VALUES (?, ?, ?, ?)
  `),

  getChunksByDocument: db.prepare(`
    SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index
  `),

  // Users
  insertUser: db.prepare(`
    INSERT OR REPLACE INTO users (id, email, role, oauth_provider)
    VALUES (?, ?, ?, ?)
  `),

  getUserById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),

  getUserByEmail: db.prepare(`
    SELECT * FROM users WHERE email = ?
  `),

  // Complaints
  insertComplaint: db.prepare(`
    INSERT INTO complaints (id, user_id, category, description, station, train, status, embedding)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getComplaintsByUser: db.prepare(`
    SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC
  `),

  getComplaintsByStatus: db.prepare(`
    SELECT * FROM complaints WHERE status = ? ORDER BY created_at DESC
  `),

  updateComplaintStatus: db.prepare(`
    UPDATE complaints SET status = ? WHERE id = ?
  `)
};

// Legacy export for backward compatibility
export const initializeDatabase = () => db;
export { db };
export default db;