#!/bin/bash

# Quick test script for admin approval system
# Usage: ./scripts/test-approval.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found${NC}"
    echo "Please create .env.local with DATABASE_URL and ADMIN_SECRET"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check required variables
if [ -z "$ADMIN_SECRET" ]; then
    echo -e "${RED}Error: ADMIN_SECRET not set in .env.local${NC}"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set in .env.local${NC}"
    exit 1
fi

BASE_URL="${NEXT_PUBLIC_BETTER_AUTH_URL:-http://localhost:3000}"

echo -e "${GREEN}=== Testing Admin Approval System ===${NC}\n"

# Step 1: Check if server is running
echo -e "${YELLOW}Step 1: Checking if server is running...${NC}"
if ! curl -s -f "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${RED}Error: Server is not running at $BASE_URL${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}\n"

# Step 2: List pending users
echo -e "${YELLOW}Step 2: Listing pending users...${NC}"
PENDING_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/approve-user" \
  -H "Authorization: Bearer $ADMIN_SECRET")

if echo "$PENDING_RESPONSE" | grep -q "Invalid admin secret"; then
    echo -e "${RED}Error: Invalid ADMIN_SECRET${NC}"
    exit 1
fi

PENDING_COUNT=$(echo "$PENDING_RESPONSE" | grep -o '"pendingUsers"' | wc -l || echo "0")
echo "$PENDING_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PENDING_RESPONSE"
echo ""

# Step 3: Instructions for manual testing
echo -e "${YELLOW}Step 3: Manual Testing Steps${NC}"
echo "1. Sign up a new user at: $BASE_URL/login"
echo "2. Try to log in - should fail with approval message"
echo "3. Approve the user using the API (see below)"
echo "4. Try to log in again - should succeed"
echo ""

# Step 4: Show how to approve a user
echo -e "${YELLOW}Step 4: To approve a user, run:${NC}"
echo "curl -X POST $BASE_URL/api/admin/approve-user \\"
echo "  -H \"Authorization: Bearer \$ADMIN_SECRET\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"userId\": \"USER_ID_HERE\"}'"
echo ""

# Step 5: Database check
echo -e "${YELLOW}Step 5: Check database with Drizzle Studio${NC}"
echo "Run: npm run db:studio"
echo "Then check the 'user' table for the 'approved' column"
echo ""

echo -e "${GREEN}=== Test Setup Complete ===${NC}"
echo "Next steps:"
echo "1. Sign up a user in the browser"
echo "2. Check pending users: curl -X GET $BASE_URL/api/admin/approve-user -H \"Authorization: Bearer \$ADMIN_SECRET\""
echo "3. Approve the user using the command above"
echo "4. Try logging in again"
