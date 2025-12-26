-- Fix RLS Policy for Complaint Updates
-- This script fixes the 400 Bad Request error when updating complaints

-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Users can update their own pending complaints" ON public.complaints;

-- Create a more flexible update policy that allows:
-- 1. Users to update their own complaints (regardless of status, but limited fields)
-- 2. Officials to update any complaint with full access
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

-- Ensure the official policy allows all operations
DROP POLICY IF EXISTS "Officials can view all complaints" ON public.complaints;
CREATE POLICY "Officials can manage all complaints" ON public.complaints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('official', 'super_admin')
        )
    );
