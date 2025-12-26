# User-Complaint Association in RailMadad

## Overview

Complaints in RailMadad **are** associated with users, but the implementation uses a simplified approach suitable for the demo/prototype nature of this application.

## How It Works

### Association Mechanism

When a complaint is created (via form, chatbot, or AI function call), the current user's email is stored with the complaint:

```typescript
(complaint as any).userEmail = user.email;
```

This is an ad-hoc field added at runtime, not part of the formal `Complaint` TypeScript interface.

### Filtering Logic

The `useComplaintsLocal.tsx` hook filters complaints based on user role:

| Role                                | Behavior                                              |
| ----------------------------------- | ----------------------------------------------------- |
| **Admin / Super Admin / Moderator** | Sees ALL complaints in the system                     |
| **Passenger**                       | Only sees complaints where `userEmail === user.email` |
| **Unauthenticated**                 | Sees no complaints                                    |

### Code Reference

```typescript
// From useComplaintsLocal.tsx - refreshComplaints function
if (isAdmin) {
  // Admins see all complaints
  setComplaints(storedComplaints);
} else if (isPassenger && user) {
  // Passengers only see their own complaints (by email match)
  const userComplaints = storedComplaints.filter(
    (c) => (c as any).userEmail === user.email
  );
  setComplaints(userComplaints);
} else {
  setComplaints([]);
}
```

## Why This Approach?

### 1. Demo/Prototype Simplicity

This is a prototype application. Using email-based association with localStorage provides quick iteration without database schema changes.

### 2. Existing `complainantId` Field

The `Complaint` interface does include a formal `complainantId?: string` field, but it is **not currently utilized** in the local storage implementation. This field is intended for future Supabase integration where proper foreign key relationships can be established.

### 3. localStorage Limitations

Since the demo uses localStorage (not a real database), there are no foreign key constraints. Email matching provides a simple, human-readable association.

## Known Limitations

1. **Type Safety**: The `userEmail` field uses `as any` type casting, bypassing TypeScript checks
2. **No Migration Path**: Existing complaints without `userEmail` will not be associated with any user
3. **Email Changes**: If a user changes their email, they lose access to old complaints

## Future Improvements

For production deployment with Supabase:

1. Use the formal `complainantId` field with proper UUID references
2. Establish foreign key relationships in the database
3. Add row-level security (RLS) policies for complaint access
4. Migrate from email-based to ID-based association

## Testing User Association

1. Log in as different passengers (e.g., `passenger@demo.com`, `test@example.com`)
2. Submit complaints from each account
3. Verify each user only sees their own complaints on the Status page
4. Log in as admin to verify all complaints are visible

---

_Last Updated: December 27, 2025_
