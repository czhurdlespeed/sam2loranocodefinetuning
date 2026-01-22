# Testing Admin Approval System Locally

This guide walks you through testing the admin approval workflow locally.

## Prerequisites

1. **Database Setup**: Make sure your `.env.local` has `DATABASE_URL` configured
2. **Admin Secret**: Set `ADMIN_SECRET` in `.env.local`:
   ```bash
   ADMIN_SECRET=your-secret-token-here
   ```

## Step 1: Run Database Migration

First, you need to add the `approved` field to your database:

```bash
# Generate the migration
npm run db:generate

# Apply the migration
npm run db:migrate

# Or push directly (for development)
npm run db:push
```

This will add the `approved` boolean column to your `user` table with a default value of `false`.

## Step 2: Start Your Development Server

```bash
npm run dev
```

Your app should be running at `http://localhost:3000`

## Step 3: Test the Sign-Up Flow

### 3.1. Sign Up a New User

1. Go to `http://localhost:3000/login`
2. Click "Sign Up" or navigate to the sign-up form
3. Fill in:
   - Email: `testuser@example.com`
   - Name: `Test User`
   - Password: `testpassword123`
4. Submit the form

**Expected Result:**
- User account is created
- User is NOT automatically logged in (because `autoSignIn: false`)
- User has `approved: false` in the database

### 3.2. Verify User is Unapproved

You can check the database using Drizzle Studio:

```bash
npm run db:studio
```

Navigate to the `user` table and verify:
- The new user exists
- `approved` column is `false`

Or query directly:
```sql
SELECT id, email, name, approved FROM "user" WHERE email = 'testuser@example.com';
```

## Step 4: Test Login Blocking (Unapproved User)

### 4.1. Try to Log In

1. Go to `http://localhost:3000/login`
2. Try to log in with:
   - Email: `testuser@example.com`
   - Password: `testpassword123`

**Expected Result:**
- Login should fail or show a message about pending approval
- User should NOT be able to access protected routes

### 4.2. Try to Access Protected Route

If you somehow get a session, try accessing:
- `http://localhost:3000` (main page - should check approval)
- Or make a direct API call to `/api/train`

**Expected Result:**
- Should return `403 Forbidden` with message: "Your account is pending admin approval..."

## Step 5: Test Admin Approval

### 5.1. List Pending Users

```bash
curl -X GET http://localhost:3000/api/admin/approve-user \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "pendingUsers": [
    {
      "id": "user-uuid-here",
      "email": "testuser@example.com",
      "name": "Test User",
      "createdAt": "2025-01-23T..."
    }
  ]
}
```

### 5.2. Approve a User

Get the user ID from the previous step, then:

```bash
curl -X POST http://localhost:3000/api/admin/approve-user \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-from-previous-step"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User approved successfully",
  "user": {
    "id": "user-uuid-here",
    "email": "testuser@example.com",
    "name": "Test User"
  }
}
```

### 5.3. Verify User is Approved

Check the database again:
```sql
SELECT id, email, name, approved FROM "user" WHERE email = 'testuser@example.com';
```

The `approved` column should now be `true`.

## Step 6: Test Approved User Access

### 6.1. Log In as Approved User

1. Go to `http://localhost:3000/login`
2. Log in with the approved user credentials

**Expected Result:**
- Login should succeed
- User should be redirected to the main page
- User should be able to access all features

### 6.2. Test Protected Route

Try to start a training job or access any protected endpoint.

**Expected Result:**
- Should work normally
- No "pending approval" errors

## Step 7: Test Admin-Created Users

Admin-created users should be automatically approved:

### 7.1. Create User via Admin API

```bash
curl -X POST http://localhost:3000/api/admin/create-user \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admincreated@example.com",
    "name": "Admin Created User",
    "password": "securepassword123"
  }'
```

### 7.2. Verify Auto-Approval

Check the database:
```sql
SELECT id, email, name, approved FROM "user" WHERE email = 'admincreated@example.com';
```

**Expected Result:**
- `approved` should be `true` (automatically approved)

### 7.3. Test Login

Try logging in with this user - it should work immediately without approval.

## Step 8: Test Edge Cases

### 8.1. Try to Approve Already Approved User

```bash
curl -X POST http://localhost:3000/api/admin/approve-user \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "already-approved-user-id"
  }'
```

**Expected Result:**
- Should return `400 Bad Request` with message: "User is already approved"

### 8.2. Try to Approve Non-Existent User

```bash
curl -X POST http://localhost:3000/api/admin/approve-user \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "non-existent-uuid"
  }'
```

**Expected Result:**
- Should return `404 Not Found` with message: "User not found"

### 8.3. Test Without Admin Secret

```bash
curl -X POST http://localhost:3000/api/admin/approve-user \
  -H "Authorization: Bearer wrong-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "some-user-id"
  }'
```

**Expected Result:**
- Should return `401 Unauthorized`

## Quick Test Script

Here's a complete test script you can run:

```bash
#!/bin/bash

# Set your admin secret
ADMIN_SECRET="your-admin-secret-here"
BASE_URL="http://localhost:3000"

echo "=== Testing Admin Approval System ==="

# 1. Sign up a user (via better-auth - you'll need to do this manually in browser)
echo "1. Sign up a user at $BASE_URL/login"
echo "   Email: testuser@example.com"
echo "   Password: testpassword123"
read -p "Press enter after signing up..."

# 2. List pending users
echo -e "\n2. Listing pending users..."
PENDING_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/approve-user" \
  -H "Authorization: Bearer $ADMIN_SECRET")
echo "$PENDING_RESPONSE" | jq '.'

# Extract user ID (requires jq)
USER_ID=$(echo "$PENDING_RESPONSE" | jq -r '.pendingUsers[0].id')
echo -e "\nFound user ID: $USER_ID"

# 3. Approve user
echo -e "\n3. Approving user..."
APPROVE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/approve-user" \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\"}")
echo "$APPROVE_RESPONSE" | jq '.'

# 4. Verify approval
echo -e "\n4. Verifying user can now log in..."
echo "   Try logging in at $BASE_URL/login"
echo "   User should now be able to access all features!"

echo -e "\n=== Test Complete ==="
```

## Using Drizzle Studio for Visual Testing

1. Start Drizzle Studio:
   ```bash
   npm run db:studio
   ```

2. Open `http://localhost:4983` in your browser

3. Navigate to the `user` table

4. You can:
   - See all users and their `approved` status
   - Manually toggle `approved` to test different scenarios
   - View user relationships

## Troubleshooting

### Issue: Migration fails
- Make sure your database is running
- Check `DATABASE_URL` in `.env.local`
- Try `npm run db:push` instead of `db:migrate`

### Issue: Can't approve users
- Verify `ADMIN_SECRET` is set correctly
- Check the authorization header format: `Bearer YOUR_SECRET`
- Check server logs for errors

### Issue: Users can still log in without approval
- Verify `autoSignIn: false` in `src/lib/auth.ts`
- Check that the `approved` field exists in the database
- Verify the authorization check in `/api/train` is working

### Issue: Better-auth sign-up doesn't set approved to false
- The database default should handle this
- If not, you may need to use the custom sign-up endpoint at `/api/auth/sign-up-with-approval`
- Or manually set `approved: false` after sign-up

## Next Steps

After testing, you may want to:
1. Create an admin UI page for approving users
2. Add email notifications when users are approved
3. Add a message on the login page for pending users
4. Add logging/audit trail for approvals
