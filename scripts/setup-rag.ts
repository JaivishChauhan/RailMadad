import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize database
const dbPath = path.join(process.cwd(), 'railmadad.db');
const db = new Database(dbPath);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

console.log('🚀 Setting up RAG system for RailMadad documentation...');

// Documentation files to process
const DOC_FILES = [
  'README.md',
  'SETUP_INSTRUCTIONS.md',
  'USER_AWARE_SYSTEM.md',
  'DEPLOYMENT_GUIDE.md',
  'copilot-instructions.md'
];

// Chunk size for RAG
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // If we're not at the end, try to find a good breaking point
    if (end < text.length) {
      // Look for paragraph breaks, then sentence breaks
      let breakPoint = text.lastIndexOf('\n\n', end);
      if (breakPoint === -1 || breakPoint < start + chunkSize * 0.7) {
        breakPoint = text.lastIndexOf('. ', end);
        if (breakPoint === -1 || breakPoint < start + chunkSize * 0.7) {
          breakPoint = text.lastIndexOf(' ', end);
        }
      }

      if (breakPoint > start + chunkSize * 0.5) {
        end = breakPoint;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;

    if (start >= text.length) break;
  }

  return chunks;
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  console.log(`🧮 Generating embeddings for ${texts.length} chunks...`);

  for (let i = 0; i < texts.length; i += 10) { // Process in batches of 10
    const batch = texts.slice(i, i + 10);
    console.log(`  Processing batch ${Math.floor(i/10) + 1}/${Math.ceil(texts.length/10)}`);

    for (const text of batch) {
      try {
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await model.embedContent(text);
        embeddings.push(result.embedding.values);
      } catch (error) {
        console.error(`❌ Failed to generate embedding for chunk:`, error);
        // Add a zero vector as fallback
        embeddings.push(new Array(768).fill(0));
      }
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return embeddings;
}

async function setupRAGSystem() {
  console.log('📚 Processing documentation files...');

  for (const filename of DOC_FILES) {
    const filePath = path.join(process.cwd(), filename);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${filename} - file not found`);
      continue;
    }

    console.log(`📖 Processing ${filename}...`);

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileHash = crypto.createHash('md5').update(content).digest('hex');

    // Check if document already exists and is up to date
    const existingDoc = db.prepare('SELECT id, file_hash FROM documents WHERE filename = ?').get(filename) as { id: string; file_hash: string } | undefined;

    if (existingDoc && existingDoc.file_hash === fileHash) {
      console.log(`  ⏭️  ${filename} is up to date, skipping...`);
      continue;
    }

    // Insert or update document
    const docId = existingDoc?.id || crypto.randomUUID();
    console.log(`  📝 Inserting document: ${docId}, filename: ${filename}, hash: ${fileHash.substring(0, 8)}...`);
    try {
      db.prepare(`
        INSERT OR REPLACE INTO documents (id, filename, full_content, file_hash, last_modified)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(docId, filename, content, fileHash);
      console.log(`  ✅ Document inserted successfully`);
    } catch (error) {
      console.error(`  ❌ Failed to insert document:`, error);
      throw error;
    }

    // Split into chunks
    const chunks = splitIntoChunks(content, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`  ✂️  Split into ${chunks.length} chunks`);

    // Generate embeddings
    const embeddings = await generateEmbeddings(chunks);

    // Delete existing chunks for this document
    db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(docId);

    // Insert chunks with embeddings
    const insertChunk = db.prepare(`
      INSERT INTO document_chunks (id, document_id, chunk_text, chunk_index, embedding)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = crypto.randomUUID();
      const embeddingBuffer = Buffer.from(new Float32Array(embeddings[i]).buffer);

      insertChunk.run(chunkId, docId, chunks[i], i, embeddingBuffer);
    }

    console.log(`  ✅ Stored ${chunks.length} chunks with embeddings`);
  }

  // Create some test data
  console.log('🧪 Creating test data...');

  // Add a test user
  const testUserId = 'test-user-1';
  db.prepare(`
    INSERT OR IGNORE INTO profiles (id, email, role, full_name)
    VALUES (?, ?, ?, ?)
  `).run(testUserId, 'test@example.com', 'passenger', 'Test Passenger');

  // Add a test complaint
  const testComplaintId = crypto.randomUUID();
  db.prepare(`
    INSERT OR IGNORE INTO complaints (id, user_id, complaint_area, complaint_type, complaint_subtype, description, incident_date, station_code, station_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    testComplaintId,
    testUserId,
    'STATION',
    'Cleanliness',
    'Platform',
    'Platform is very dirty with garbage everywhere',
    '2025-01-15',
    'NDLS',
    'New Delhi'
  );

  console.log('✅ RAG system setup complete!');
  console.log('📊 Summary:');
  console.log(`   Documents: ${(db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number }).count}`);
  console.log(`   Chunks: ${(db.prepare('SELECT COUNT(*) as count FROM document_chunks').get() as { count: number }).count}`);
  console.log(`   Users: ${(db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number }).count}`);
  console.log(`   Complaints: ${(db.prepare('SELECT COUNT(*) as count FROM complaints').get() as { count: number }).count}`);
}

// Run the setup
setupRAGSystem()
  .then(() => {
    console.log('🎉 RAG system ready for RailMadad!');
    db.close();
  })
  .catch((error) => {
    console.error('❌ RAG setup failed:', error);
    db.close();
    process.exit(1);
  });