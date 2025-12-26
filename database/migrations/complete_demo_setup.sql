-- ========================================
-- COMPLETE DEMO SETUP GUIDE
-- ========================================

-- PART A: Manual Steps (Required First)
-- =====================================
-- You MUST do these steps manually in Supabase Dashboard > Authentication > Users:

-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" and create these three users:

-- User 1: Passenger
-- Email: test.passenger@railmadad.demo
-- Password: demo123
-- Email Confirmed: ✓ (check this box)

-- User 2: Admin  
-- Email: test.admin@railmadad.demo
-- Password: admin123
-- Email Confirmed: ✓ (check this box)

-- User 3: Super Admin
-- Email: super.admin@railmadad.demo  
-- Password: super123
-- Email Confirmed: ✓ (check this box)

-- PART B: SQL Setup (Run After Creating Auth Users)
-- ================================================

-- Step 1: Ensure super_admin role exists 
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

-- Step 2: Get the UUIDs of the users you just created
SELECT 
    id as user_uuid,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    created_at
FROM auth.users 
WHERE email IN (
    'test.passenger@railmadad.demo',
    'test.admin@railmadad.demo', 
    'super.admin@railmadad.demo'
)
ORDER BY email;

-- Step 3: Create profiles using a function (automatic UUID lookup)
DO $$
DECLARE
    passenger_uuid UUID;
    admin_uuid UUID;
    superadmin_uuid UUID;
BEGIN
    -- Get UUIDs for each demo user
    SELECT id INTO passenger_uuid FROM auth.users WHERE email = 'test.passenger@railmadad.demo';
    SELECT id INTO admin_uuid FROM auth.users WHERE email = 'test.admin@railmadad.demo';
    SELECT id INTO superadmin_uuid FROM auth.users WHERE email = 'super.admin@railmadad.demo';
    
    -- Check if we found all users
    IF passenger_uuid IS NULL THEN
        RAISE EXCEPTION 'Passenger user not found. Please create test.passenger@railmadad.demo in Supabase Dashboard first.';
    END IF;
    
    IF admin_uuid IS NULL THEN
        RAISE EXCEPTION 'Admin user not found. Please create test.admin@railmadad.demo in Supabase Dashboard first.';
    END IF;
    
    IF superadmin_uuid IS NULL THEN
        RAISE EXCEPTION 'Super admin user not found. Please create super.admin@railmadad.demo in Supabase Dashboard first.';
    END IF;
    
    -- Create passenger profile
    INSERT INTO public.profiles (
        id, role, full_name, phone, created_at, updated_at
    ) VALUES (
        passenger_uuid, 'passenger', 'Test Passenger', '+91-9876543210', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        updated_at = NOW();
    
    -- Create admin profile
    INSERT INTO public.profiles (
        id, role, full_name, phone, employee_id, department, station_code, zone, created_at, updated_at
    ) VALUES (
        admin_uuid, 'official', 'Test Railway Official', '+91-9876543211', 'TEST001', 'Customer Service', 'NDLS', 'NR', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        employee_id = EXCLUDED.employee_id,
        department = EXCLUDED.department,
        station_code = EXCLUDED.station_code,
        zone = EXCLUDED.zone,
        updated_at = NOW();
    
    -- Create super admin profile
    INSERT INTO public.profiles (
        id, role, full_name, phone, employee_id, department, station_code, zone, created_at, updated_at
    ) VALUES (
        superadmin_uuid, 'super_admin', 'Super Administrator', '+91-9876543212', 'SUPER001', 'System Administration', 'HQ', 'HQ', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        employee_id = EXCLUDED.employee_id,
        department = EXCLUDED.department,
        station_code = EXCLUDED.station_code,
        zone = EXCLUDED.zone,
        updated_at = NOW();
    
    RAISE NOTICE 'Successfully created profiles for all demo users!';
END $$;

-- Step 4: Verify the setup
SELECT 
    p.role,
    u.email,
    p.full_name,
    p.employee_id,
    p.department,
    p.station_code,
    p.zone,
    u.email_confirmed_at IS NOT NULL as email_confirmed
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email LIKE '%@railmadad.demo'
ORDER BY 
    CASE p.role 
        WHEN 'passenger' THEN 1 
        WHEN 'official' THEN 2 
        WHEN 'super_admin' THEN 3 
    END;
