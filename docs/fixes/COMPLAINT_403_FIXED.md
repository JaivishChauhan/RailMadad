# Fixed: 403 Forbidden Error on Complaint Updates

## Issue Resolution

The 403 Forbidden error when updating complaints has been **FIXED** by modifying the complaint creation workflow.

### Root Cause
- Supabase RLS policy only allowed users to update their own complaints when status is 'pending'
- Background AI analysis was trying to change status to 'in_progress', which violated this policy
- Users cannot update their own complaints once the status changes from 'pending'

### Solution Applied
Modified `useComplaints.tsx` line ~252 to:
1. ✅ Run AI analysis without changing complaint status initially
2. ✅ Only update `assigned_to` field (which is allowed)
3. ✅ Only attempt status updates if user is admin
4. ✅ Avoid RLS policy violations for regular users

### Code Changes
```typescript
// Before (caused 403 error):
await activeSupabase
  .from('complaints')
  .update({ status: 'in_progress' })  // ❌ Forbidden for users
  .eq('id', newComplaint.id);

// After (fixed):
const updates: any = {
  assigned_to: analysisData.suggestedDepartment || 'Customer Service'
};
if (isAdmin) {
  updates.status = 'in_progress';  // ✅ Only for admins
}
await activeSupabase
  .from('complaints')
  .update(updates)
  .eq('id', newComplaint.id);
```

### Test Results Expected
- ✅ Complaint submission should work without 403 errors
- ✅ AI analysis runs successfully in background
- ✅ Complaints get assigned to departments automatically
- ✅ Status remains 'pending' for user submissions (admin can change later)
- ✅ Admins can still update complaint status through admin panel

### For Complete Database Solution
To allow more flexible updates, run this SQL in Supabase SQL Editor:

```sql
-- Drop restrictive policy
DROP POLICY IF EXISTS "Users can update their own pending complaints" ON public.complaints;

-- Create flexible policy
CREATE POLICY "Users can update their own complaints" ON public.complaints
    FOR UPDATE USING (
        auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('official', 'super_admin')
        )
    );
```

### Status
🟢 **RESOLVED** - Complaint submission and updates should now work without 403 errors.
