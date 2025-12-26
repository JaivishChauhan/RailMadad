/**
 * Local Database - Replaces Supabase with localStorage
 * No external dependencies required
 */
import { localDb } from './localDatabase';

console.log('🗄️ Using local database (localStorage) instead of Supabase');

// Export the local database as supabase-compatible clients
export const supabasePassenger = localDb;
export const supabaseAdmin = localDb;
export const supabase = localDb;

// Re-export types from localDatabase
export type { Profile, Complaint, ComplaintAttachment } from './localDatabase';
