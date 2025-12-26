# Fix: Complaints Not Showing for Logged-in Users

## Problem Description
Users logged in with Google OAuth were not seeing their submitted complaints in the "My Complaints" page, even though they were successfully authenticated.

## Root Cause Analysis

### 1. User ID Mismatch
The main issue was a mismatch between how user IDs were handled in different parts of the system:

- **Authentication**: `usePassengerAuth` correctly used the actual Supabase auth user ID (`authUser.id`)
- **Complaint Storage**: `useComplaints` was generating custom deterministic UUIDs based on email using `getUserSupabaseId()`
- **Database Queries**: RLS policies expected `auth.uid()` but complaints were stored with custom UUIDs

### 2. Frontend Filtering Issue
The `ComplaintStatusPage` was filtering complaints using `c.complainantId === user?.id`, but:
- The `convertSupabaseToAppComplaint` function wasn't setting the `complainantId` field
- The filtering was redundant since `useComplaints` already filters at the database level for passengers

## Solution Implemented

### 1. Fixed User ID Consistency
- **Removed** the `getUserSupabaseId()` function that generated custom UUIDs
- **Updated** `useComplaints` to use the actual Supabase auth user ID (`user.id`) directly
- This ensures complaints are stored with the correct `user_id` that matches `auth.uid()`

### 2. Fixed Frontend Filtering
- **Removed** redundant filtering in `ComplaintStatusPage` since database-level filtering is sufficient
- **Added** `complainantId` mapping in `convertSupabaseToAppComplaint` for consistency

### 3. Updated RLS Policy Compatibility
- The existing RLS policies now work correctly because:
  ```sql
  CREATE POLICY "Users can view their own complaints" ON public.complaints
      FOR SELECT USING (auth.uid() = user_id);
  ```
- `auth.uid()` now matches the `user_id` stored in complaints

## Files Modified

1. **`hooks/useComplaints.tsx`**:
   - Removed `getUserSupabaseId()` function
   - Updated complaint creation to use `user.id` directly
   - Updated complaint fetching to use `user.id` directly
   - Added `complainantId` mapping in conversion function

2. **`pages/passenger/ComplaintStatusPage.tsx`**:
   - Removed redundant client-side filtering
   - Simplified to just sort complaints (filtering happens at DB level)

3. **`fix_user_id_mapping.sql`** (new):
   - Diagnostic queries to check for user ID mismatches
   - Templates for cleaning up any existing invalid data

## Testing Steps

1. **Login with Google OAuth**
2. **Submit a new complaint** - should work correctly now
3. **Navigate to "My Complaints"** - should show the complaint
4. **Check browser console** - should see successful database queries with correct user IDs

## Database Cleanup (if needed)

If there are existing complaints with invalid user IDs, run the diagnostic queries in `fix_user_id_mapping.sql` to identify and clean them up.

## Prevention

This issue was caused by mixing two different user ID systems. Going forward:
- Always use the actual Supabase auth user ID (`authUser.id`)
- Don't generate custom UUIDs for users who already have Supabase auth IDs
- Ensure RLS policies align with how user IDs are stored

## Verification

The fix ensures that:
1. ✅ Google OAuth users can see their complaints
2. ✅ RLS policies work correctly
3. ✅ No redundant filtering in the frontend
4. ✅ Consistent user ID usage throughout the system