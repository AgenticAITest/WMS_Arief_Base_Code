# WMS API Endpoints Reference

## Authentication Endpoints
`/api/auth`

```
POST   /login                    - User login
POST   /register                 - User registration
POST   /register-tenant          - New tenant registration
POST   /refresh-token            - Refresh access token
POST   /forget-password          - Request password reset
POST   /reset-password           - Reset password with token
POST   /validate-username        - Check username availability
POST   /validate-tenant-code     - Check tenant code availability
```

---

## System Management Endpoints

### Users: `/api/system/user`
```
GET    /                         - List all users
GET    /:id                      - Get user details
POST   /                         - Create user
PUT    /:id                      - Update user
DELETE /:id                      - Delete user
```

### Roles: `/api/system/role`
```
GET    /                         - List all roles
GET    /:id                      - Get role details
POST   /                         - Create role
PUT    /:id                      - Update role
DELETE /:id                      - Delete role
```

### Permissions: `/api/system/permission`
```
GET    /                         - List all permissions
GET    /:id                      - Get permission details
POST   /                         - Create permission
PUT    /:id                      - Update permission
DELETE /:id                      - Delete permission
```

### Tenants: `/api/system/tenant`
```
GET    /                         - List all tenants
GET    /:id                      - Get tenant details
POST   /                         - Create tenant
PUT    /:id                      - Update tenant
DELETE /:id                      - Delete tenant
```

### Options: `/api/system/option`
```
GET    /                         - List all options
GET    /:id                      - Get option details
POST   /                         - Create option
PUT    /:id                      - Update option
DELETE /:id                      - Delete option
```

### Module Authorization: `/api/system/module-authorization`
```
GET    /                         - List module authorizations
GET    /registered-modules       - Get registered modules
GET    /:id                      - Get authorization details
POST   /                         - Create authorization
```

### Module Registry: `/api/system/module-registry`
```
GET    /                         - List all modules
GET    /:id                      - Get module details
POST   /                         - Register module
PUT    /:id                      - Update module
DELETE /:id                      - Delete module
```

### Audit Logs: `/api/audit-logs`
```
GET    /                         - List audit logs
GET    /:id                      - Get audit log details
GET    /resource/:type/:id       - Get logs by resource
```

---

## Master Data Module: `/api/modules/master-data`

### Product Management
```
GET    /product-types            - List product types
GET    /product-types/:id        - Get product type
POST   /product-types            - Create product type
PUT    /product-types/:id        - Update product type
DELETE /product-types/:id        - Delete product type

GET    /package-types            - List package types
GET    /package-types/:id        - Get package type
POST   /package-types            - Create package type
PUT    /package-types/:id        - Update package type
DELETE /package-types/:id        - Delete package type

GET    /products                  - List products
GET    /products/:id              - Get product details
POST   /products                  - Create product
PUT    /products/:id              - Update product
DELETE /products/:id              - Delete product
```

### Supplier Management
```
GET    /suppliers                 - List suppliers
GET    /suppliers/:id             - Get supplier details
POST   /suppliers                 - Create supplier
PUT    /suppliers/:id             - Update supplier
DELETE /suppliers/:id             - Delete supplier
```

### Customer Management
```
GET    /customers                 - List customers
GET    /customers/:id             - Get customer details
POST   /customers                 - Create customer
PUT    /customers/:id             - Update customer
DELETE /customers/:id             - Delete customer
```

### Transporter Management
```
GET    /transporters              - List transporters
GET    /transporters/:id          - Get transporter details
POST   /transporters              - Create transporter
PUT    /transporters/:id          - Update transporter
DELETE /transporters/:id          - Delete transporter
```

### Shipping Methods
```
GET    /shipping-methods          - List shipping methods
GET    /shipping-methods/:id      - Get shipping method
POST   /shipping-methods          - Create shipping method
PUT    /shipping-methods/:id      - Update shipping method
DELETE /shipping-methods/:id      - Delete shipping method
```

---

## Warehouse Setup Module: `/api/modules/warehouse-setup`

```
GET    /warehouses                - List warehouses
GET    /warehouses/:id            - Get warehouse details
POST   /warehouses                - Create warehouse
PUT    /warehouses/:id            - Update warehouse
DELETE /warehouses/:id            - Delete warehouse

GET    /zones                     - List zones
GET    /zones/:id                 - Get zone details
POST   /zones                     - Create zone
PUT    /zones/:id                 - Update zone
DELETE /zones/:id                 - Delete zone

GET    /aisles                    - List aisles
GET    /aisles/:id                - Get aisle details
POST   /aisles                    - Create aisle
PUT    /aisles/:id                - Update aisle
DELETE /aisles/:id                - Delete aisle

GET    /shelves                   - List shelves
GET    /shelves/:id               - Get shelf details
POST   /shelves                   - Create shelf
PUT    /shelves/:id               - Update shelf
DELETE /shelves/:id               - Delete shelf

GET    /bins                      - List bins
GET    /bins/:id                  - Get bin details
POST   /bins                      - Create bin
PUT    /bins/:id                  - Update bin
DELETE /bins/:id                  - Delete bin
```

---

## Inventory Items Module: `/api/modules/inventory-items`

### Inventory Management
```
GET    /inventory-items           - List inventory items
GET    /inventory-items/:id       - Get inventory item
POST   /inventory-items           - Create inventory item
PUT    /inventory-items/:id       - Update inventory item
DELETE /inventory-items/:id       - Delete inventory item

GET    /inventory-items/stats/summary - Get inventory statistics
GET    /stock-information         - Get stock summary by product
GET    /stock-information/:productId/locations - Get locations for product
```

### Cycle Count Management
```
GET    /cycle-counts              - List cycle counts
GET    /cycle-counts/:id          - Get cycle count details
POST   /cycle-counts              - Create cycle count
POST   /cycle-counts/:id/count    - Record counted items
POST   /cycle-counts/:id/approve  - Approve cycle count
DELETE /cycle-counts/:id          - Delete cycle count
```

### Adjustment Management
```
GET    /adjustments               - List adjustments
GET    /adjustments/:id           - Get adjustment details
POST   /adjustments               - Create adjustment
POST   /adjustments/:id/approve   - Approve adjustment
POST   /adjustments/:id/apply     - Apply adjustment
DELETE /adjustments/:id           - Delete adjustment
```

### Relocation/Putaway
```
POST   /relocations               - Move inventory between bins
POST   /relocations/:id/confirm   - Confirm relocation
```

---

## Purchase Order Module: `/api/modules/purchase-order`

```
GET    /purchase-orders           - List purchase orders
GET    /purchase-orders/:id       - Get PO details
POST   /purchase-orders           - Create PO
PUT    /purchase-orders/:id       - Update PO
DELETE /purchase-orders/:id       - Delete PO

POST   /purchase-orders/:id/approve - Approve PO
POST   /purchase-orders/:id/reject  - Reject PO

GET    /purchase-orders/:id/receive - Get receive form
POST   /purchase-orders/:id/receive - Record GRN/receipt
GET    /purchase-orders/:id/grn     - Get GRN document

POST   /purchase-orders/:id/putaway - Putaway received items
POST   /purchase-orders/:id/putaway/confirm - Confirm putaway
```

---

## Sales Order Module: `/api/modules/sales-order`

### Order Management
```
GET    /sales-orders              - List all orders
GET    /sales-orders/:id          - Get order details
GET    /sales-orders/:id/html     - Get HTML preview
POST   /sales-orders              - Create new order
PUT    /sales-orders/:id          - Update order
DELETE /sales-orders/:id          - Delete order
```

### Allocation
```
GET    /allocations               - Get orders ready for allocation
POST   /allocations/:id/confirm   - Confirm allocation
```

### Picking
```
GET    /picks                     - Get orders ready for picking
POST   /picks/:id/confirm         - Confirm pick
```

### Packing
```
GET    /packs                     - Get orders ready for packing
POST   /packs/:id/confirm         - Confirm pack
```

### Shipping
```
GET    /ships                     - Get orders ready for shipping
POST   /ships/:id/confirm         - Confirm shipment
```

### Delivery
```
GET    /deliveries                - Get shipments ready for delivery
POST   /deliveries/:id/confirm    - Confirm delivery
```

### Supporting
```
GET    /products-with-stock       - List available products with stock
GET    /workflow-steps            - Get workflow configuration
```

---

## Document Numbering Module: `/api/modules/document-numbering`

### Configuration
```
GET    /configs                   - List number configurations
GET    /configs/:id               - Get config details
POST   /configs                   - Create config
PUT    /configs/:id               - Update config
DELETE /configs/:id               - Delete config
```

### Generation
```
POST   /generate                  - Generate document number
POST   /preview                   - Preview number format
```

### Documents
```
GET    /documents                 - List generated documents
GET    /documents/:id             - Get document details
GET    /documents/by-number/:documentNumber - Get by number
GET    /documents/by-reference/:type/:id    - Get by reference
POST   /documents                 - Register document
PUT    /documents/:id             - Update document
DELETE /documents/:id             - Delete document
GET    /documents/:id/view        - View document
```

### History
```
GET    /history                   - List generation history
GET    /history/:id               - Get history entry
PUT    /history/:id               - Update history
POST   /history/:id/void          - Void a generated number
```

### Trackers
```
GET    /trackers                  - List sequence trackers
GET    /trackers/:id              - Get tracker details
```

---

## Workflow Module: `/api/modules/workflow`

```
GET    /workflows                 - List workflows
GET    /workflows/:id             - Get workflow details
POST   /workflows                 - Create workflow
PUT    /workflows/:id             - Update workflow
DELETE /workflows/:id             - Delete workflow

GET    /workflow-steps            - List all steps
GET    /workflow-steps/:id        - Get step details
POST   /workflow-steps            - Create step
PUT    /workflow-steps/:id        - Update step
DELETE /workflow-steps/:id        - Delete step
```

---

## Reports Module: `/api/modules/reports`

```
GET    /reports                   - List all reports
GET    /reports/:id               - Get report details
POST   /reports                   - Create report
PUT    /reports/:id               - Update report
DELETE /reports/:id               - Delete report
```

---

## Common Query Parameters

### Pagination
```
?page=1&limit=20
```

### Filtering
```
?search=<value>           - Full-text search
?status=<status>          - Filter by status
?productId=<id>          - Filter by product
?warehouseId=<id>        - Filter by warehouse
?customerId=<id>         - Filter by customer
```

### Sorting
```
?orderBy=createdAt       - Field to sort by
?sort=asc|desc           - Sort direction
```

---

## Response Format

All endpoints return JSON with standard structure:

**Success (2xx)**
```json
{
  "success": true,
  "data": { /* response data */ },
  "pagination": { /* if applicable */
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Error (4xx/5xx)**
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

---

## Authentication

All endpoints (except `/api/auth/*`) require:
```
Authorization: Bearer <ACCESS_TOKEN>
```

Token obtained from `/api/auth/login` response.

---

## File Locations Reference

### Routes
- System routes: `/src/server/routes/*/`
- Module routes: `/src/modules/*/server/routes/*/`

### Controllers/Services
- Module services: `/src/modules/*/server/services/*/`

### Database Schemas
- System schemas: `/src/server/lib/db/schema/`
- Module schemas: `/src/modules/*/server/lib/db/schemas/`

### Frontend Components
- Module pages: `/src/modules/*/client/pages/`
- System pages: `/src/client/pages/console/system/`

---

## Rate Limiting

All endpoints are subject to:
- **Limit:** 5000 requests
- **Window:** 15 minutes
- **Per:** IP address

Exceeding limit returns `429 Too Many Requests`

---

## Swagger Documentation

Interactive API documentation available at:
```
http://localhost:5000/api-docs
```

JSON specification at:
```
http://localhost:5000/api-docs-json
```

