-- Database Update Queries for Take Back Feature
-- Run these queries in your Supabase SQL editor or database client

-- 1. Add 'withdrawn' status to the complaint_status enum
ALTER TYPE complaint_status ADD VALUE 'withdrawn';

-- 2. Update the RLS policy to allow users to take back and resubmit their own complaints
DROP POLICY IF EXISTS "Users can update their own pending complaints" ON public.complaints;

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

-- 3. Add a comment to document the withdrawn status
COMMENT ON TYPE complaint_status IS 'Status of complaints: pending (new), in_progress (being handled), resolved (fixed), closed (completed), escalated (moved up), withdrawn (taken back by user for editing)';

-- 4. Verify the enum was updated correctly
SELECT unnest(enum_range(NULL::complaint_status)) AS status_values;

-- 5. Check existing complaints (optional - for verification)
SELECT status, COUNT(*) as count 
FROM public.complaints 
GROUP BY status 
ORDER BY status;

-- 6. Test query to ensure RLS policies work (replace with actual user ID for testing)
-- SELECT * FROM public.complaints WHERE user_id = 'your-test-user-id';