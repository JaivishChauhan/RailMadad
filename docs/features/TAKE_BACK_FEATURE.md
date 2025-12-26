# Take Back Complaint Feature

## Overview
The "Take Back" feature allows users to withdraw their complaints from the system, edit them, and resubmit them. This gives users more control over their complaints and allows them to make corrections or add additional information.

## Feature Components

### 1. New Status: WITHDRAWN
- Added `WITHDRAWN` status to the `Status` enum in `types.ts`
- Updated database schema to support `withdrawn` status in `complaint_status` enum
- Updated status mapping functions in `useComplaints.tsx`
- Added styling for withdrawn status in `Badge.tsx` (red background)

### 2. Take Back Functionality
- **Function**: `takeBackComplaint(id: string)` in `useComplaints.tsx`
- **Purpose**: Allows users to withdraw their complaints
- **Restrictions**: Only works for complaints in `REGISTERED` or `ANALYZING` status
- **Database**: Updates complaint status to `withdrawn` and `updated_at` timestamp
- **Security**: Users can only take back their own complaints (enforced by RLS)

### 3. Edit & Resubmit Functionality
- **Function**: `resubmitComplaint(id: string, updatedData, mediaFiles)` in `useComplaints.tsx`
- **Purpose**: Allows users to update withdrawn complaints and resubmit them
- **Features**:
  - Updates only changed fields
  - Allows adding new media files
  - Resets status to `pending` when resubmitted
  - Preserves existing media files

### 4. User Interface Updates

#### ComplaintStatusPage.tsx
- Added "Take Back" button for eligible complaints
- Added "Edit & Resubmit" button for withdrawn complaints
- Added loading states and error handling
- Shows appropriate buttons based on complaint status

#### EditComplaintPage.tsx (New)
- Full-featured form for editing withdrawn complaints
- Pre-populated with existing complaint data
- Supports both TRAIN and STATION complaint types
- Allows adding additional media files
- Validates required fields
- Handles form submission and navigation

### 5. Database Schema Updates
- Added `withdrawn` to `complaint_status` enum
- Updated RLS policies to allow users to update their own complaints to withdrawn status
- Created migration script `add_withdrawn_status.sql`

### 6. Routing
- Added new route `/edit-complaint/:id` in `App.tsx`
- Protected with `PassengerRoute` component
- Wrapped with `ComplaintProvider` for data access

## User Workflow

### Taking Back a Complaint
1. User navigates to "My Complaints" page
2. For complaints in `REGISTERED` or `ANALYZING` status, a "Take Back" button appears
3. User clicks "Take Back"
4. Complaint status changes to `WITHDRAWN`
5. Button changes to "Edit & Resubmit"

### Editing and Resubmitting
1. User clicks "Edit & Resubmit" on a withdrawn complaint
2. Navigates to `/edit-complaint/:id` page
3. Form is pre-populated with existing complaint data
4. User can modify any field and add new media
5. User clicks "Resubmit Complaint"
6. Complaint is updated and status changes back to `pending`
7. User is redirected to "My Complaints" page

## Business Rules

### When Can Users Take Back Complaints?
- Complaint status must be `REGISTERED` or `ANALYZING`
- User must be the original complainant
- Once taken back, complaint status becomes `WITHDRAWN`

### What Can Users Edit?
- Description
- Complaint type and subtype
- Incident date and location
- All train-specific fields (for train complaints)
- All station-specific fields (for station complaints)
- Can add new media files (existing files are preserved)

### What Happens After Resubmission?
- Status resets to `pending`
- `updated_at` timestamp is updated
- Complaint goes through normal processing workflow again
- AI analysis may be triggered again (if implemented)

## Security Considerations

### Row Level Security (RLS)
- Users can only take back their own complaints
- Users can only edit their own withdrawn complaints
- Database enforces these restrictions at the query level

### Input Validation
- All form inputs are validated on the client side
- Required fields are enforced
- File uploads are restricted to allowed types

### State Management
- Loading states prevent double-submissions
- Error handling provides user feedback
- Optimistic updates for better UX

## Technical Implementation

### Database Changes
```sql
-- Add withdrawn status to enum
ALTER TYPE complaint_status ADD VALUE 'withdrawn';

-- Update RLS policy for user updates
CREATE POLICY "Users can update their own complaints" ON public.complaints
    FOR UPDATE USING (
        auth.uid() = user_id AND (
            (OLD.status = 'pending' AND NEW.status = 'withdrawn') OR
            (OLD.status = 'withdrawn') OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('official', 'super_admin'))
        )
    );
```

### API Functions
```typescript
// Take back a complaint
const takeBackComplaint = async (id: string): Promise<boolean>

// Resubmit a complaint with updates
const resubmitComplaint = async (
  id: string, 
  updatedData: Partial<NewComplaintData>, 
  mediaFiles: File[] = []
): Promise<boolean>
```

### UI Components
- Updated `ComplaintStatusPage` with conditional buttons
- New `EditComplaintPage` with comprehensive form
- Updated `Badge` component with withdrawn status styling

## Future Enhancements

### Possible Improvements
1. **Version History**: Track all versions of a complaint
2. **Reason for Withdrawal**: Ask users why they're taking back complaints
3. **Time Limits**: Set time limits for how long complaints can be taken back
4. **Notification System**: Notify officials when complaints are withdrawn/resubmitted
5. **Bulk Operations**: Allow taking back multiple complaints at once
6. **Draft Mode**: Allow saving edits as drafts before resubmitting

### Analytics Opportunities
- Track withdrawal rates by complaint type
- Measure time between withdrawal and resubmission
- Analyze what fields users most commonly edit
- Monitor resubmission success rates

## Testing Checklist

### Functional Testing
- [ ] Can take back eligible complaints
- [ ] Cannot take back ineligible complaints
- [ ] Edit form pre-populates correctly
- [ ] Can update all editable fields
- [ ] Can add new media files
- [ ] Resubmission works correctly
- [ ] Status updates properly
- [ ] Navigation works correctly

### Security Testing
- [ ] Users cannot take back others' complaints
- [ ] Users cannot edit others' complaints
- [ ] RLS policies work correctly
- [ ] Input validation prevents malicious data

### UI/UX Testing
- [ ] Buttons appear/disappear correctly
- [ ] Loading states work properly
- [ ] Error messages are helpful
- [ ] Form validation provides feedback
- [ ] Mobile responsiveness works

## Deployment Notes

### Database Migration
1. Run `add_withdrawn_status.sql` to add the new status
2. Update RLS policies as needed
3. Test with sample data

### Code Deployment
1. Deploy updated frontend code
2. Verify routing works correctly
3. Test end-to-end workflow
4. Monitor for errors in production

This feature significantly improves user experience by giving users more control over their complaints while maintaining security and data integrity.