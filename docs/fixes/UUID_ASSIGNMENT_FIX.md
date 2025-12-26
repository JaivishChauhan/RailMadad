# UUID Assignment Issue Fix

## Problem Description

**Error**: `22P02 - invalid input syntax for type uuid: "Operations"`

**Root Cause**: The application was incorrectly trying to assign department names (like "Operations", "Customer Service") to the `assigned_to` field in the database, which expects a UUID of a specific railway official.

## Database Schema Context

In `supabase_schema.sql`, the `assigned_to` field is defined as:
```sql
assigned_to UUID REFERENCES public.profiles(id),
```

This field should only contain UUIDs of actual railway officials from the `profiles` table, not department names.

## Where the Issue Occurred

### 1. useComplaints.tsx (Line ~259)
**Before**:
```typescript
const updates: any = {
  assigned_to: analysisData.suggestedDepartment || 'Customer Service'
};
```

**After**:
```typescript
const updates: any = {};
// Don't auto-assign to department names, only to actual official UUIDs
```

### 2. AdminComplaintDetailPage.tsx (Line ~262)
**Before**: Button that would set `assignedTo` to `suggestedDepartment`
```typescript
onClick={() => setAssignedTo(complaint.analysis?.suggestedDepartment || '')}
```

**After**: Removed the button and changed the interface to clarify it needs UUIDs:
- Label changed from "Assign To (Dept/Official ID)" to "Assign To Official (UUID)"
- Placeholder changed to "Enter official's UUID or email"
- AI suggestion now shows as guidance only, not clickable assignment

### 3. useComplaintsSupabase.tsx (Line 245)
Similar fix applied to remove department name assignment.

## Solution Approach

1. **Removed automatic assignment**: AI analysis no longer automatically assigns complaints to department names
2. **Clarified UI**: Made it clear that assignment requires actual official UUIDs
3. **Preserved AI suggestions**: Department recommendations are still shown as guidance for admins

## Proper Usage

- **AI Analysis**: Provides `suggestedDepartment` as a string (e.g., "Operations")
- **Display**: Show department suggestion to help admins choose the right official
- **Assignment**: Admin manually enters the UUID of a specific official from that department
- **Database**: Only stores valid UUIDs in the `assigned_to` field

## Future Improvements

Consider implementing:
1. A dropdown to select officials by name/email that maps to their UUIDs
2. A separate `suggested_department` field in the database for AI recommendations
3. Department-based official lookup functionality

## Testing

After this fix:
- ✅ No more UUID parsing errors
- ✅ TypeScript compilation passes
- ✅ Complaint submission works without 400 Bad Request errors
- ✅ AI analysis runs without trying to assign invalid UUIDs
