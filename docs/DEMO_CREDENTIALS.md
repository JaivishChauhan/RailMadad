# 🧪 Demo Credentials for RailMadad

This file contains the test/demo credentials for the RailMadad platform. These backdoor accounts are automatically created when the application starts and are designed for public demonstrations and testing.

## 🔐 Test Accounts

### Passenger Account
- **Email**: `test.passenger@railmadad.demo`
- **Password**: `demo123`
- **Role**: Passenger
- **Purpose**: Test complaint filing, tracking, and passenger features
- **Access**: Can file complaints, track status, use AI chatbot

### Admin Account
- **Email**: `test.admin@railmadad.demo`  
- **Password**: `admin123`
- **Role**: Railway Official
- **Purpose**: Test complaint management and admin features
- **Access**: Dashboard, complaint management, user management

### Super Admin Account
- **Email**: `super.admin@railmadad.demo`
- **Password**: `super123`
- **Role**: Super Administrator
- **Purpose**: Full system access and administration
- **Access**: All admin features + super admin panel + system management

## 🚀 How to Use

1. **For Passengers**: Use the passenger credentials to experience:
   - Filing complaints through the AI chatbot
   - Multilingual support (Hindi, English, etc.)
   - Voice and file uploads
   - Complaint tracking and status updates

2. **For Admins**: Use admin credentials to experience:
   - Complaint management dashboard
   - Status updates and assignment
   - User management
   - Complaint analytics

3. **For Super Admins**: Use super admin credentials for:
   - All admin features
   - System administration panel
   - Demo credentials overview
   - Advanced system controls

## 🔧 Implementation Details

### Automatic Setup
- Backdoor accounts are automatically created on app startup
- Uses `ensureBackdoorUsersExist()` function in `services/backdoorService.ts`
- Creates both Supabase auth users and profile records
- Safe to run multiple times (checks for existing accounts)

### Security Notes
- These are demo accounts only - not for production use
- Passwords are hardcoded for demonstration purposes
- Accounts are created with confirmed email status
- All accounts use the `.demo` domain to clearly indicate test status

### Login Process
1. When user enters demo credentials, system checks `checkBackdoorCredentials()`
2. If match found, attempts `backdoorLogin()` which:
   - Creates Supabase auth user if needed
   - Creates profile record with proper role
   - Signs user in automatically
3. Falls back to normal authentication if backdoor fails

## 🎯 Perfect for Public Demos

These credentials make it easy for anyone to test the RailMadad platform:

- **No registration required** - just use the provided credentials
- **Immediate access** - accounts work right away
- **Full feature testing** - experience all platform capabilities
- **Clear differentiation** - easy to understand different user roles
- **Persistent data** - actions are saved in the Supabase database

## 🛠️ Developer Notes

### Updating Credentials
To change the demo credentials, edit `BACKDOOR_CREDENTIALS` in `services/backdoorService.ts`:

```typescript
export const BACKDOOR_CREDENTIALS = {
  passenger: {
    email: 'your.passenger@demo.com',
    password: 'newpassword',
    // ... other fields
  },
  // ... admin and superAdmin
};
```

### Disabling Backdoor
To disable backdoor authentication for production:
1. Remove `ensureBackdoorUsersExist()` call from `App.tsx`
2. Remove backdoor logic from auth hooks
3. Remove test credential display from login pages

### Environment-Based Control
Consider adding environment variable control:
```typescript
const isDemoMode = import.meta.env.VITE_ENABLE_DEMO === 'true';
```

## 📱 UI Integration

The demo credentials are elegantly integrated into the login pages:
- **Toggle button** to show/hide credentials
- **Color-coded** credential boxes (green for passenger, blue for admin, purple for super admin)
- **Clear descriptions** of what each account can do
- **Copy-friendly format** for easy credential entry

This makes the platform immediately accessible to testers and evaluators!
