-- RailMadad Backdoor Demo Accounts Setup
-- Run these queries in your Supabase SQL Editor to create demo accounts

-- Note: These queries create the profile records. 
-- You'll still need to create the auth users through Supabase Dashboard > Authentication > Users
-- or use the Supabase client library with admin privileges.

-- ========================================
-- STEP 1: Create Auth Users (Manual Step)
-- ========================================
-- Go to Supabase Dashboard > Authentication > Users and create these users:
-- 1. Email: test.passenger@railmadad.demo, Password: demo123, Email Confirmed: ✓
-- 2. Email: test.admin@railmadad.demo, Password: admin123, Email Confirmed: ✓  
-- 3. Email: super.admin@railmadad.demo, Password: super123, Email Confirmed: ✓

-- ========================================
-- STEP 2: Update Database Schema (if needed)
-- ========================================
-- Ensure the user_role enum includes super_admin
DO $$ 
BEGIN
    -- Check if super_admin already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'user_role' AND e.enumlabel = 'super_admin'
    ) THEN
        -- Add super_admin to the enum if it doesn't exist
        ALTER TYPE user_role ADD VALUE 'super_admin';
    END IF;
END $$;

-- ========================================
-- STEP 3: Insert/Update Profile Records
-- ========================================
-- Replace the UUIDs below with the actual UUIDs from the auth.users table
-- You can get these UUIDs by running: SELECT id, email FROM auth.users WHERE email LIKE '%@railmadad.demo';

-- Passenger Profile
INSERT INTO public.profiles (
    id, 
    role, 
    full_name, 
    phone, 
    employee_id, 
    department, 
    station_code, 
    zone,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001', -- Replace with actual UUID from auth.users
    'passenger',
    'Test Passenger',
    '+91-9876543210',
    NULL,
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    updated_at = NOW();

-- Admin/Official Profile  
INSERT INTO public.profiles (
    id,
    role,
    full_name,
    phone,
    employee_id,
    department,
    station_code,
    zone,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000002', -- Replace with actual UUID from auth.users
    'official',
    'Test Railway Official',
    '+91-9876543211',
    'TEST001',
    'Customer Service',
    'NDLS',
    'NR',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    employee_id = EXCLUDED.employee_id,
    department = EXCLUDED.department,
    station_code = EXCLUDED.station_code,
    zone = EXCLUDED.zone,
    updated_at = NOW();

-- Super Admin Profile
INSERT INTO public.profiles (
    id,
    role,
    full_name,
    phone,
    employee_id,
    department,
    station_code,
    zone,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000003', -- Replace with actual UUID from auth.users
    'super_admin',
    'Super Administrator',
    '+91-9876543212',
    'SUPER001',
    'System Administration',
    'HQ',
    'HQ',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    employee_id = EXCLUDED.employee_id,
    department = EXCLUDED.department,
    station_code = EXCLUDED.station_code,
    zone = EXCLUDED.zone,
    updated_at = NOW();

-- ========================================
-- STEP 4: Verification Query
-- ========================================
-- Run this to verify the accounts were created correctly
SELECT 
    p.id,
    u.email,
    p.role,
    p.full_name,
    p.employee_id,
    p.department,
    p.station_code,
    p.zone,
    u.email_confirmed_at IS NOT NULL as email_confirmed
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email LIKE '%@railmadad.demo'
ORDER BY p.role;

-- ========================================
-- ALTERNATIVE: Complete Setup Query (Advanced)
-- ========================================
-- If you have RLS policies that might interfere, you can temporarily disable them:
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- Run the INSERT statements above
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 5: Get the UUIDs for Profile Updates
-- ========================================
-- After creating auth users manually, run this query to get their UUIDs:
SELECT 
    id as user_uuid,
    email,
    email_confirmed_at IS NOT NULL as confirmed
FROM auth.users 
WHERE email IN (
    'test.passenger@railmadad.demo',
    'test.admin@railmadad.demo', 
    'super.admin@railmadad.demo'
)
ORDER BY email;

-- Copy these UUIDs and replace the placeholder UUIDs in the INSERT statements above
