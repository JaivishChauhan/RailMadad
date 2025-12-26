/**
 * useComplaints Hook - Main Entry Point
 * 
 * This module re-exports the local/demo version of the complaints hook.
 * For localStorage-based operation, all imports from this file will use
 * the in-memory/localStorage implementation instead of Supabase.
 * 
 * To switch to Supabase:
 * 1. Rename useComplaintsSupabase.tsx to useComplaints.tsx
 * 2. Or update the export below to point to the Supabase version
 */

// Re-export everything from the local/demo version
export { ComplaintProvider, useComplaints } from './useComplaintsLocal';
