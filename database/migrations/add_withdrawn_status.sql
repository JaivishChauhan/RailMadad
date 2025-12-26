-- Add WITHDRAWN status to complaint_status enum
-- This migration adds the 'withdrawn' status to allow users to take back their complaints

-- Add the new status to the enum type
ALTER TYPE complaint_status ADD VALUE 'withdrawn';

-- Update RLS policies to allow users to update their own complaints to withdrawn status
-- Users should be able to take back complaints that are still pending or in early stages
DROP POLICY IF EXISTS "Users can update their own complaints" ON public.complaints;

CREATE POLICY "Users can update their own complaints" ON public.complaints
    FOR UPDATE USING (
        auth.uid() = user_id AND (
            -- Users can always take back pending complaints
            (OLD.status = 'pending' AND NEW.status = 'withdrawn') OR
            -- Users can update withdrawn complaints (for resubmission)
            (OLD.status = 'withdrawn') OR
            -- Officials can update any complaint
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('official', 'super_admin')
            )
        )
    );

-- Add a comment explaining the withdrawn status
COMMENT ON TYPE complaint_status IS 'Status of complaints: pending (new), in_progress (being handled), resolved (fixed), closed (completed), escalated (moved up), withdrawn (taken back by user for editing)';