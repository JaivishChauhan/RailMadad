-- Fix User ID Mapping for Complaints
-- This script addresses the issue where complaints were stored with custom generated UUIDs
-- instead of the actual Supabase auth user IDs

-- First, let's see what we have in the database
-- Check if there are any complaints with user_ids that don't match auth.users
SELECT 
    c.id as complaint_id,
    c.user_id as complaint_user_id,
    c.description,
    c.created_at,
    CASE 
        WHEN au.id IS NOT NULL THEN 'Valid Auth User'
        ELSE 'Invalid/Missing Auth User'
    END as auth_status
FROM public.complaints c
LEFT JOIN auth.users au ON c.user_id = au.id
ORDER BY c.created_at DESC;

-- If you find complaints with invalid user_ids, you'll need to either:
-- 1. Delete them if they're test data
-- 2. Map them to the correct auth user IDs if they're real complaints

-- Example: Delete complaints with invalid user_ids (ONLY if they're test data)
-- DELETE FROM public.complaints 
-- WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Example: Update complaints to use correct auth user ID (if you know the mapping)
-- UPDATE public.complaints 
-- SET user_id = 'correct-auth-user-id'
-- WHERE user_id = 'old-generated-user-id';

-- Check profiles table as well
SELECT 
    p.id as profile_id,
    p.full_name,
    p.role,
    CASE 
        WHEN au.id IS NOT NULL THEN 'Valid Auth User'
        ELSE 'Invalid/Missing Auth User'
    END as auth_status
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;