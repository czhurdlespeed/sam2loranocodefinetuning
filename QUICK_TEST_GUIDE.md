# Quick Test Guide - Admin Approval

## 🚀 Quick Start (5 minutes)

### 1. Setup Database Migration

```bash
# Generate migration for the new 'approved' field
npm run db:generate

# Apply the migration
npm run db:push
```

### 2. Start the Server

```bash
npm run dev
```

### 3. Test the Flow

#### A. Sign Up a User
1. Go to `http://localhost:3000/login`
2. Sign up with:
   - Email: `test@example.com`
   - Name: `Test User`
   - Password: `password123`

#### B. Check User is Unapproved
```bash
# List pending users
curl -X GET http://localhost:3000/api/admin/approve-user \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

Copy the `id` from the response.

#### C. Approve the User
```bash
# Replace USER_ID with the id from step B
curl -X POST http://localhost:3000/api/admin/approve-user \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID"}'
```

#### D. Test Login
1. Go to `http://localhost:3000/login`
2. Log in with the approved user
3. Should work! ✅

## 🔍 Visual Database Check

```bash
npm run db:studio
```

Open `http://localhost:4983` and check the `user` table - you'll see the `approved` column.

## 📝 Environment Variables Needed

Make sure `.env.local` has:
```env
DATABASE_URL=your-database-url
ADMIN_SECRET=your-secret-token
BETTER_AUTH_SECRET=your-better-auth-secret
```

## 🧪 Automated Test Script

```bash
./scripts/test-approval.sh
```

This will:
- Check if server is running
- List pending users
- Show you how to approve users

## ⚠️ Common Issues

**"User not found" when approving:**
- Make sure you copied the correct user ID
- Check the user exists in the database

**"Invalid admin secret":**
- Verify `ADMIN_SECRET` in `.env.local` matches what you're sending

**Migration fails:**
- Make sure database is accessible
- Try `npm run db:push` instead of `db:migrate`

## 🎯 What to Test

1. ✅ Sign up creates user with `approved: false`
2. ✅ Unapproved users cannot access `/api/train`
3. ✅ Admin can list pending users
4. ✅ Admin can approve users
5. ✅ Approved users can log in and use the system
6. ✅ Admin-created users are auto-approved
