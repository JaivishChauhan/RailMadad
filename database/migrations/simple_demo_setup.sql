-- ========================================
-- SIMPLE SETUP: RailMadad Demo Accounts
-- ========================================

-- STEP 1: Add super_admin to user_role enum (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'user_role' AND e.enumlabel = 'super_admin'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'super_admin';
    END IF;
END $$;

-- STEP 2: Get UUIDs of existing demo users (run this first to get UUIDs)
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

-- STEP 3: Replace UUIDs below and run profile inserts
-- Copy the UUIDs from the query above and replace the placeholders below

-- Passenger Profile (replace UUID)
INSERT INTO public.profiles (id, role, full_name, phone, created_at, updated_at) 
VALUES ('REPLACE_WITH_PASSENGER_UUID', 'passenger', 'Test Passenger', '+91-9876543210', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, updated_at = NOW();

-- Admin Profile (replace UUID)  
INSERT INTO public.profiles (id, role, full_name, phone, employee_id, department, station_code, zone, created_at, updated_at)
VALUES ('REPLACE_WITH_ADMIN_UUID', 'official', 'Test Railway Official', '+91-9876543211', 'TEST001', 'Customer Service', 'NDLS', 'NR', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, employee_id = EXCLUDED.employee_id, department = EXCLUDED.department, station_code = EXCLUDED.station_code, zone = EXCLUDED.zone, updated_at = NOW();

-- Super Admin Profile (replace UUID)
INSERT INTO public.profiles (id, role, full_name, phone, employee_id, department, station_code, zone, created_at, updated_at)
VALUES ('REPLACE_WITH_SUPERADMIN_UUID', 'super_admin', 'Super Administrator', '+91-9876543212', 'SUPER001', 'System Administration', 'HQ', 'HQ', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, employee_id = EXCLUDED.employee_id, department = EXCLUDED.department, station_code = EXCLUDED.station_code, zone = EXCLUDED.zone, updated_at = NOW();

-- STEP 4: Verify setup
SELECT 
    p.role,
    u.email,
    p.full_name,
    p.employee_id,
    p.department,
    u.email_confirmed_at IS NOT NULL as email_confirmed
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email LIKE '%@railmadad.demo'
ORDER BY p.role;
