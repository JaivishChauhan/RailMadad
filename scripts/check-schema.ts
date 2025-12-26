#!/usr/bin/env tsx

import Database from 'better-sqlite3';

try {
  const db = new Database('railmadad.db');
  
  console.log('=== DATABASE SCHEMA ===');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
  console.log('Tables:', tables.map(t => t.name));

  for (const table of tables) {
    console.log(`\n--- ${table.name} ---`);
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all() as any[];
    columns.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
  }

  db.close();
  
} catch (error) {
  console.error('❌ Error:', error);
}