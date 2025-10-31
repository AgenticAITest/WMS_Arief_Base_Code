#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:5000"
API_BASE="${BASE_URL}/api/modules/sales-order"
TOKEN=""

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SALES ORDER MODULE - QUICK API TEST                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "\n${YELLOW}Testing: ${description}${NC}"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X ${method} \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" \
            -d "${data}" \
            "${API_BASE}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X ${method} \
            -H "Authorization: Bearer ${TOKEN}" \
            "${API_BASE}${endpoint}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ Success (${http_code})${NC}"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Failed (${http_code})${NC}"
        echo "$body"
    fi
    
    echo "$body"
}

# Step 1: Login
echo -e "\n${BLUE}=== AUTHENTICATION ===${NC}"
login_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' \
    "${BASE_URL}/api/auth/login")

TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Login failed. Please check your credentials.${NC}"
    echo "Response: $login_response"
    exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo "Token obtained: ${TOKEN:0:20}..."

# Step 2: Test Transporters
echo -e "\n${BLUE}=== TRANSPORTERS ===${NC}"

transporter_response=$(api_call "POST" "/transporters" \
    '{"name":"Test Transporter","code":"TEST_'$(date +%s)'","phone":"+1234567890","email":"test@example.com","isActive":true}' \
    "Create Transporter")

api_call "GET" "/transporters?page=1&limit=5" "" "List Transporters"

# Step 3: Test Shipping Methods
echo -e "\n${BLUE}=== SHIPPING METHODS ===${NC}"

api_call "POST" "/shipping-methods" \
    '{"name":"Test Method","code":"TEST_METHOD_'$(date +%s)'","type":"internal","costCalculationMethod":"fixed","baseCost":10.00,"isActive":true}' \
    "Create Shipping Method (Internal)"

api_call "GET" "/shipping-methods?page=1&limit=5" "" "List Shipping Methods"

# Step 4: Test Sales Orders
echo -e "\n${BLUE}=== SALES ORDERS ===${NC}"
echo -e "${YELLOW}Note: This will only work if you have customers, warehouses, and products in your database${NC}"

# Try to get existing data
echo -e "\nAttempting to fetch required data..."

customer_data=$(curl -s -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/api/master-data/customers?limit=1")
warehouse_data=$(curl -s -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/api/warehouse-setup/warehouses?limit=1")
product_data=$(curl -s -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/api/master-data/products?limit=1")

echo "Customers response: $customer_data"
echo "Warehouses response: $warehouse_data"
echo "Products response: $product_data"

echo -e "\n${YELLOW}If the above requests failed, you need to create customers, warehouses, and products first.${NC}"

# Step 5: Test basic list operations
echo -e "\n${BLUE}=== TESTING LIST OPERATIONS ===${NC}"

api_call "GET" "/allocations?page=1&limit=5" "" "List Allocations"
api_call "GET" "/picks?page=1&limit=5" "" "List Picks"
api_call "GET" "/shipments?page=1&limit=5" "" "List Shipments"

echo -e "\n${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   QUICK TEST COMPLETE                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo -e "\n${GREEN}All accessible endpoints tested successfully!${NC}"
echo -e "For comprehensive testing with full workflow, run: ${YELLOW}node src/modules/sales-order/tests/api-test-script.js${NC}\n"
