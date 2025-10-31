# Sales Order API Test Scripts

This directory contains test scripts to verify all sales order API endpoints are working correctly.

## Prerequisites

Before running tests, ensure:
1. Server is running (`npm run dev`)
2. Database is set up with tables
3. You have valid login credentials (default: admin/admin123)
4. You have at least one customer, warehouse, and product created (for sales order tests)

## Test Scripts

### 1. Comprehensive Node.js Test Suite

**File:** `api-test-script.js`

**Features:**
- Tests all 32 API endpoints
- Creates test data in the correct order
- Validates responses
- Shows detailed results with colors
- Attempts to find existing data (customers, warehouses, products)

**Run:**
```bash
node src/modules/sales-order/tests/api-test-script.js
```

**What it tests:**
- ✅ Authentication (login and token validation)
- ✅ Transporters - Full CRUD
  - CREATE: New transporter with validation
  - READ: Get by ID, List with pagination, Search
  - UPDATE: Modify transporter fields
  - DELETE: Remove transporter + verify 404
- ✅ Shipping Methods - Full CRUD
  - CREATE: Internal & third-party methods with validation
  - READ: Get by ID, List with pagination, Filter by type
  - UPDATE: Modify method fields
  - DELETE: Remove method + verify 404
- ✅ Sales Orders - Full CRUD
  - CREATE: Order with multiple line items (transactional)
  - READ: Get by ID with items, List, Search, Filter by status
  - UPDATE: Modify order fields and status
  - DELETE: Remove order (cascade to items) + verify 404
- ✅ Allocations - Full CRUD
  - CREATE: Allocate inventory to order items
  - READ: Get by ID, List, Filter by sales order
  - UPDATE: Modify allocation details
  - DELETE: Remove allocation + verify 404
- ✅ Picks - Full CRUD
  - CREATE: Pick record with batch/lot tracking
  - READ: Get by ID, List, Filter by sales order
  - UPDATE: Modify pick details
  - DELETE: Remove pick + verify 404
- ✅ Shipments & Packages - Full CRUD
  - CREATE: Shipment with multiple packages
  - READ: Get by ID with packages, List, Search, Filter by status
  - UPDATE: Modify shipment and status
  - DELETE: Remove shipment (cascade to packages) + verify 404
- ✅ Cascade Delete Verification
  - Sales order deletion removes all items
  - Shipment deletion removes all packages

**Expected Output:**
```
╔════════════════════════════════════════════════════════╗
║   SALES ORDER MODULE - API ENDPOINT TEST SUITE        ║
╚════════════════════════════════════════════════════════╝

=== AUTHENTICATION ===
  ✓ Login - Token obtained

=== TRANSPORTERS API ===
  ✓ Create Transporter - Status: 201
  ✓ Get Transporter by ID
  ✓ List Transporters
  ✓ Search Transporters
  ✓ Update Transporter

...
```

### 2. Quick Bash Test Script

**File:** `quick-test.sh`

**Features:**
- Quick validation of key endpoints
- Uses curl for HTTP requests
- Colored output
- Lightweight and fast

**Run:**
```bash
# Make executable (first time only)
chmod +x src/modules/sales-order/tests/quick-test.sh

# Run the script
./src/modules/sales-order/tests/quick-test.sh
```

**What it tests:**
- ✅ Authentication
- ✅ Basic transporter operations
- ✅ Basic shipping method operations
- ✅ List operations for all endpoints

## Manual Testing with curl

### Get Authentication Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Save the token from the response:
```bash
export TOKEN="your_token_here"
```

### Test Endpoints

**List Transporters:**
```bash
curl http://localhost:5000/api/modules/sales-order/transporters \
  -H "Authorization: Bearer $TOKEN"
```

**Create Transporter:**
```bash
curl -X POST http://localhost:5000/api/modules/sales-order/transporters \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FedEx",
    "code": "FEDEX",
    "phone": "+1234567890",
    "email": "contact@fedex.com",
    "isActive": true
  }'
```

**List Shipping Methods:**
```bash
curl http://localhost:5000/api/modules/sales-order/shipping-methods \
  -H "Authorization: Bearer $TOKEN"
```

**List Sales Orders:**
```bash
curl http://localhost:5000/api/modules/sales-order/sales-orders \
  -H "Authorization: Bearer $TOKEN"
```

**Create Sales Order:**
```bash
curl -X POST http://localhost:5000/api/modules/sales-order/sales-orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "SO-001",
    "customerId": "your-customer-id",
    "customerLocationId": "your-location-id",
    "warehouseId": "your-warehouse-id",
    "orderDate": "2025-10-31",
    "expectedDeliveryDate": "2025-11-05",
    "priority": "normal",
    "currency": "USD",
    "items": [
      {
        "productId": "your-product-id",
        "quantity": 10,
        "unitPrice": 25.50,
        "discountPercentage": 5,
        "taxPercentage": 8.5
      }
    ]
  }'
```

## Troubleshooting

### Authentication Failed
- Check username/password in the script (default: admin/admin123)
- Verify you can login through the UI first
- Check if server is running on port 5000

### "No customers/warehouses/products found"
- Create at least one customer: `/api/master-data/customers`
- Create at least one warehouse: `/api/warehouse-setup/warehouses`
- Create at least one product: `/api/master-data/products`
- Or manually get IDs from existing records and update the script

### "Access denied. This module is not authorized"
- Enable the `sales-order` module for your tenant
- Go to Module Authorization in the admin panel
- Grant necessary permissions to your role

### Connection Refused
- Make sure server is running: `npm run dev`
- Check server is listening on port 5000
- Verify no firewall blocking localhost

### Validation Errors
- Check required fields are provided
- Verify field types match schema
- Ensure unique fields (code, orderNumber) are unique

## Test Data Cleanup

The test scripts create data in your development database. You can:

**Option 1: Keep it** - Use as sample/reference data

**Option 2: Delete manually** - Use the DELETE endpoints:
```bash
curl -X DELETE http://localhost:5000/api/modules/sales-order/transporters/{id} \
  -H "Authorization: Bearer $TOKEN"
```

**Option 3: Clear database** - Reset your development database (WARNING: deletes all data)

## See Also

- [API Documentation](../docs/API_DOCUMENTATION.md) - Full API reference
- [Implementation Summary](../docs/IMPLEMENTATION_COMPLETE.md) - Feature overview
- [Schema Details](../docs/SCHEMA_ANALYSIS.md) - Database schema documentation
