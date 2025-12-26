-- Fix RLS Policies for Take Back Feature
-- Run these queries step by step

-- 1. First, add the withdrawn status to the enum (if not already done)
ALTER TYPE complaint_status ADD VALUE IF NOT EXISTS 'withdrawn';

-- 2. Check what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'complaints';

-- 3. Drop all existing update policies for complaints table
DROP POLICY IF EXISTS "Users can update their own complaints" ON public.complaints;
DROP POLICY IF EXISTS "Users can update their own pending complaints" ON public.complaints;
DROP POLICY IF EXISTS "Officials can view all complaints" ON public.complaints;
DROP POLICY IF EXISTS "Officials can manage all complaints" ON public.complaints;

-- 4. Create the new comprehensive policy for users
CREATE POLICY "Users can update their own complaints" ON public.complaints
    FOR UPDATE USING (
        -- Users can update their own complaints
        auth.uid() = user_id
        OR
        -- Officials can update any complaint
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('official', 'super_admin')
        )
    );

-- 5. Ensure officials can view and manage all complaints
CREATE POLICY "Officials can manage all complaints" ON public.complaints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('official', 'super_admin')
        )
    );

-- 6. Verify the policies were created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'complaints';

-- 7. Verify the enum was updated
SELECT unnest(enum_range(NULL::complaint_status)) AS status_values;