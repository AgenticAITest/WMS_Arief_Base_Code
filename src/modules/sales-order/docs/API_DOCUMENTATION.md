# Sales Order Module - API Documentation

**Base URL:** `/api/modules/sales-order`

**Authentication:** All endpoints require Bearer token authentication

**Module Authorization:** Requires `sales-order` module to be enabled for tenant

## API Endpoints

### 1. Transporters API

Manage third-party shipping carriers (FedEx, UPS, DHL, etc.)

#### List Transporters
```
GET /transporters?page=1&limit=10&search=fedex
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search by name or code

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "FedEx",
      "code": "FEDEX",
      "contactPerson": "John Doe",
      "phone": "+1234567890",
      "email": "contact@fedex.com",
      "website": "https://fedex.com",
      "serviceAreas": {"regions": ["US", "CA"]},
      "isActive": true,
      "notes": "Express delivery",
      "createdAt": "2025-10-31T...",
      "updatedAt": "2025-10-31T...",
      "createdBy": "uuid",
      "updatedBy": "uuid"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### Get Transporter by ID
```
GET /transporters/:id
```

#### Create Transporter
```
POST /transporters
Content-Type: application/json

{
  "name": "FedEx",
  "code": "FEDEX",
  "contactPerson": "John Doe",
  "phone": "+1234567890",
  "email": "contact@fedex.com",
  "website": "https://fedex.com",
  "serviceAreas": {"regions": ["US", "CA"]},
  "isActive": true,
  "notes": "Express delivery"
}
```

**Required Fields:** `name`, `code`

#### Update Transporter
```
PUT /transporters/:id
```

#### Delete Transporter
```
DELETE /transporters/:id
```

---

### 2. Shipping Methods API

Manage shipping methods (both internal and third-party)

#### List Shipping Methods
```
GET /shipping-methods?page=1&limit=10&search=express&type=third_party
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `search` (string): Search by name or code
- `type` (string): Filter by type (`internal` or `third_party`)

**Response:** Returns shipping methods with associated transporter data

#### Create Shipping Method
```
POST /shipping-methods
Content-Type: application/json

{
  "name": "FedEx Express",
  "code": "FEDEX_EXPRESS",
  "type": "third_party",
  "transporterId": "uuid",
  "costCalculationMethod": "weight_based",
  "baseCost": 10.00,
  "estimatedDays": 2,
  "isActive": true,
  "description": "2-day express delivery"
}
```

**Required Fields:** `name`, `code`, `type`

**Validation Rules:**
- If `type` = `third_party`, `transporterId` is required
- If `type` = `internal`, `transporterId` must be null

**Cost Calculation Methods:**
- `fixed` - Flat rate
- `weight_based` - Based on weight
- `volume_based` - Based on volume
- `distance_based` - Based on distance

---

### 3. Sales Orders API

Manage customer sales orders with line items

#### List Sales Orders
```
GET /sales-orders?page=1&limit=10&search=SO-001&status=confirmed
```

**Query Parameters:**
- `search` (string): Search by order number or notes
- `status` (string): Filter by status

**Status Values:**
- `draft` - Initial state
- `confirmed` - Order confirmed
- `allocated` - Inventory allocated
- `picking` - Being picked
- `picked` - Picking complete
- `shipped` - Shipped to customer
- `delivered` - Delivered
- `cancelled` - Cancelled

#### Get Sales Order by ID
```
GET /sales-orders/:id
```

**Response:** Returns order with all line items

#### Create Sales Order
```
POST /sales-orders
Content-Type: application/json

{
  "orderNumber": "SO-001",
  "customerId": "uuid",
  "customerLocationId": "uuid",
  "warehouseId": "uuid",
  "orderDate": "2025-10-31",
  "expectedDeliveryDate": "2025-11-05",
  "priority": "normal",
  "currency": "USD",
  "paymentTerms": "Net 30",
  "notes": "Customer notes",
  "internalNotes": "Internal notes",
  "items": [
    {
      "productId": "uuid",
      "quantity": 10,
      "unitPrice": 25.50,
      "discountPercentage": 5,
      "taxPercentage": 8.5,
      "notes": "Item notes"
    }
  ]
}
```

**Required Fields:** `orderNumber`, `customerId`, `warehouseId`, `orderDate`, `items` (at least one)

**Priority Levels:** `low`, `normal`, `high`, `urgent`

#### Update Sales Order
```
PUT /sales-orders/:id
```

#### Delete Sales Order
```
DELETE /sales-orders/:id
```

**Note:** Deletes order and all associated items (cascade delete)

---

### 4. Allocations API

Manage inventory allocations for sales order items

#### List Allocations
```
GET /allocations?page=1&limit=10&salesOrderId=uuid
```

**Query Parameters:**
- `salesOrderId` (string): Filter by sales order

#### Create Allocation
```
POST /allocations
Content-Type: application/json

{
  "salesOrderItemId": "uuid",
  "inventoryItemId": "uuid",
  "allocatedQuantity": 5,
  "notes": "Allocated from bin A1"
}
```

**Required Fields:** `salesOrderItemId`, `inventoryItemId`, `allocatedQuantity`

**Effect:** Updates the `allocated_quantity` on the sales order item

---

### 5. Picks API

Manage picking records for sales orders

#### List Picks
```
GET /picks?page=1&limit=10&salesOrderId=uuid
```

#### Create Pick
```
POST /picks
Content-Type: application/json

{
  "salesOrderId": "uuid",
  "allocationId": "uuid",
  "pickedQuantity": 5,
  "batchNumber": "BATCH-001",
  "lotNumber": "LOT-001",
  "serialNumber": "SN-001",
  "expiryDate": "2026-12-31",
  "notes": "Picked from zone A"
}
```

**Required Fields:** `salesOrderId`, `allocationId`, `pickedQuantity`

**Traceability Fields:** `batchNumber`, `lotNumber`, `serialNumber` (for lot tracking)

---

### 6. Shipments API

Manage shipments and packages

#### List Shipments
```
GET /shipments?page=1&limit=10&search=SHIP-001&status=in_transit
```

**Query Parameters:**
- `search` (string): Search by shipment number or tracking number
- `status` (string): Filter by status

**Status Values:**
- `ready` - Ready to ship
- `in_transit` - In transit
- `delivered` - Delivered
- `failed` - Delivery failed
- `returned` - Returned

#### Get Shipment by ID
```
GET /shipments/:id
```

**Response:** Returns shipment with all packages

#### Create Shipment
```
POST /shipments
Content-Type: application/json

{
  "salesOrderId": "uuid",
  "shipmentNumber": "SHIP-001",
  "transporterId": "uuid",
  "shippingMethodId": "uuid",
  "trackingNumber": "1Z999AA10123456784",
  "shippingDate": "2025-10-31T10:00:00Z",
  "deliveryDate": "2025-11-03T15:00:00Z",
  "totalWeight": 25.5,
  "totalVolume": 0.5,
  "totalCost": 45.00,
  "notes": "Fragile items",
  "packages": [
    {
      "packageNumber": "PKG-001",
      "barcode": "123456789",
      "dimensions": "30x20x10 cm",
      "weight": 12.5
    }
  ]
}
```

**Required Fields:** `salesOrderId`, `shipmentNumber`

**Constraint:** One shipment per sales order (unique constraint)

#### Update Shipment
```
PUT /shipments/:id
```

#### Delete Shipment
```
DELETE /shipments/:id
```

---

### 7. Packages API

Manage packages within shipments

#### List Packages
```
GET /packages?shipmentId=uuid
```

**Query Parameters:**
- `shipmentId` (string): **Required** - Filter by shipment

#### Create Package
```
POST /packages
Content-Type: application/json

{
  "shipmentId": "uuid",
  "packageNumber": "PKG-001",
  "barcode": "123456789",
  "dimensions": "30x20x10 cm",
  "weight": 12.5,
  "items": [
    {
      "productId": "uuid",
      "quantity": 5
    }
  ]
}
```

**Required Fields:** `shipmentId`, `packageNumber`

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (no module access)
- `404` - Not Found
- `500` - Internal Server Error

**Common Error Messages:**
- `"Unauthorized"` - Invalid or missing authentication token
- `"Access denied. This module is not authorized for your tenant."` - Module not enabled
- `"Required fields missing"` - Missing required fields in request body
- `"...  already exists"` - Unique constraint violation (code, number, etc.)
- `"... not found"` - Resource doesn't exist or doesn't belong to tenant

---

## Multi-Tenant Isolation

All endpoints automatically filter by `tenantId` from the authenticated user's active tenant. Users can only access data belonging to their tenant.

---

## Workflow

### Typical Sales Order Lifecycle:

1. **Create Order** → `POST /sales-orders`
2. **Allocate Inventory** → `POST /allocations` (one or more)
3. **Pick Items** → `POST /picks` (one or more)
4. **Create Shipment** → `POST /shipments` (with packages)
5. **Update Tracking** → `PUT /shipments/:id` (update status to `in_transit`)
6. **Mark Delivered** → `PUT /shipments/:id` (update status to `delivered`)
7. **Update Order Status** → `PUT /sales-orders/:id` (status: `delivered`)

### Status Progression:

```
draft → confirmed → allocated → picking → picked → shipped → delivered
           ↓
       cancelled (at any time)
```

---

## Database Tables

The following tables support these APIs:

1. **transporters** - Shipping carriers
2. **shipping_methods** - Shipping options
3. **sales_orders** - Main orders
4. **sales_order_items** - Order line items
5. **sales_order_allocations** - Inventory reservations
6. **sales_order_picks** - Pick records
7. **shipments** - Shipment tracking
8. **packages** - Physical packages
9. **package_items** - Package contents

All tables include:
- UUID primary keys
- Multi-tenant isolation (`tenant_id`)
- Audit timestamps (`created_at`, `updated_at`)
- User tracking (`created_by`, `updated_by` where applicable)

---

## Rate Limiting

All API endpoints are subject to the application's rate limiting:
- **5000 requests per 15 minutes per IP**

---

## Swagger Documentation

Interactive API documentation available at:
```
GET /api-docs
```

JSON specification available at:
```
GET /api-docs-json
```
