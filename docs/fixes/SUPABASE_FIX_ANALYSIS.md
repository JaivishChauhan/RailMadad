# Supabase Complaint Update Issue - Root Cause & Solution

## Problem Identified
The 400 Bad Request error when updating complaints occurs because:

1. **Authentication Mismatch**: Admin users are using local authentication (`useAdminAuth`) but complaints are stored in Supabase with RLS policies
2. **RLS Policy Enforcement**: Supabase Row Level Security policies require proper authentication context
3. **Missing Admin Profiles**: Admin users don't have corresponding profiles in the Supabase `profiles` table

## Root Cause Analysis
```
Admin Login (Local) → useComplaints (Supabase) → RLS Policy Check → FAIL (No matching profile)
```

The admin user exists only in local memory but not in Supabase's auth system, so when trying to update complaints, Supabase RLS policies deny access.

## Immediate Fix Applied
Modified `useComplaints.tsx` to:
- Support both passenger and admin authentication contexts
- Use appropriate Supabase client based on user role
- Handle admin operations with proper authentication awareness

## Complete Solution Required
To fully resolve this issue, implement:

### 1. Admin Supabase Authentication
Replace local admin auth with Supabase auth:
```typescript
// In useAdminAuth.tsx - use supabaseAdmin client
const { data: { user }, error } = await supabaseAdmin.auth.signInWithPassword({
  email,
  password
});
```

### 2. Create Admin Profiles in Supabase
Run the setup script or manually create admin users:
```sql
-- Create admin users in Supabase Dashboard first, then:
INSERT INTO public.profiles (id, role, full_name, employee_id, department)
VALUES 
  ('admin-uuid-1', 'official', 'Test Railway Official', 'TEST001', 'Customer Service'),
  ('admin-uuid-2', 'super_admin', 'Super Administrator', 'SUPER001', 'System Administration');
```

### 3. Update RLS Policies (Optional Enhancement)
The current RLS policies should work, but can be enhanced:
```sql
-- More flexible update policy
CREATE POLICY "Users and officials can update complaints" ON public.complaints
    FOR UPDATE USING (
        auth.uid() = user_id  -- Users can update their own
        OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('official', 'super_admin')
        )  -- Officials can update any
    );
```

## Current Status
- ✅ Complaint form now uses Supabase (not local storage)
- ✅ Complaint IDs are proper UUIDs (no more "LOCAL-" prefix)
- ✅ useComplaints hook supports dual authentication
- ⚠️ Admin authentication still needs Supabase integration for full functionality

## Testing
1. Try updating a complaint as admin - should work with current fix
2. Create complaints - should use proper Supabase storage
3. Check complaint URLs - should have real database IDs

## Next Steps
1. Implement proper Supabase admin authentication
2. Set up admin profiles in Supabase database
3. Test end-to-end admin workflow
4. Remove local authentication fallbacks
