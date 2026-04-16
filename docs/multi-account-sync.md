# Multi-Account Sync Design

## Overview
Allow multiple users to access and manage the same inventory with role-based permissions.

## Architecture

### 1. User Authentication
- Email/password signup/login
- JWT tokens for session management
- Password reset via email

### 2. Organization Membership
```typescript
interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  invited_by: string;
  invited_at: string;
  joined_at: string;
  is_active: boolean;
}
```

### 3. Role Permissions
| Role | Permissions |
|------|-------------|
| Owner | Full access, can delete org, manage billing |
| Admin | Full access, manage users, can't delete org |
| Manager | Edit products, manage inventory, view reports |
| Staff | View products, update stock, can't delete |

### 4. Real-Time Sync Strategy
**Option A: WebSocket (recommended)**
- Persistent connection for live updates
- Immediate sync when changes occur
- Better UX but more server resources

**Option B: Polling**  
- Check for updates every 30 seconds
- Simpler, less server load
- Delayed updates acceptable

### 5. Conflict Resolution
- Last-write-wins (timestamp based)
- Version numbers for conflict detection
- Manual merge for complex conflicts

## Implementation Plan

### Phase 1: Authentication (Week 1)
- [ ] Sign up page
- [ ] Login page
- [ ] JWT token storage
- [ ] Protected routes

### Phase 2: Organization Management (Week 1-2)
- [ ] Create organization on signup
- [ ] Invite users by email
- [ ] Accept/reject invitations
- [ ] Role management

### Phase 3: Multi-User Sync (Week 2-3)
- [ ] Sync all organization data
- [ ] Real-time updates via WebSocket
- [ ] Conflict resolution UI
- [ ] Offline queue per user

### Phase 4: Permissions (Week 3-4)
- [ ] Role-based UI (hide buttons based on role)
- [ ] API permission checks
- [ ] Activity log (who changed what)

## Database Changes Needed

1. Add `users` table
2. Add `organization_members` table
3. Add `invitations` table (for pending invites)
4. Update all records to include `updated_by` field
5. Add indexes for faster sync queries

## API Endpoints Needed

```
POST /auth/signup
POST /auth/login
POST /auth/logout
POST /auth/reset-password

GET /organizations
POST /organizations
GET /organizations/:id/members
POST /organizations/:id/invite
DELETE /organizations/:id/members/:userId

GET /invitations
POST /invitations/:id/accept
POST /invitations/:id/reject

GET /sync/changes?since=timestamp
POST /sync/broadcast (WebSocket)
```

## UI Changes Needed

1. **Auth Pages**
   - Login screen
   - Signup screen
   - Password reset

2. **Organization Settings**
   - Member list
   - Invite form
   - Role dropdown

3. **Main App**
   - User avatar in header
   - Organization switcher
   - Permission-based button visibility

## Security Considerations

- Passwords: bcrypt with salt
- JWT: Short expiry (1 hour), refresh tokens
- API: Check organization membership on every request
- Data: Users can only see their organization's data
