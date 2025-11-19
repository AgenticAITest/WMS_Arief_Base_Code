# Warehouse Management System (WMS) - Comprehensive Analysis

## Executive Summary
This is a full-stack warehouse management system built with modern technologies. It features a modular architecture with React frontend, Express backend, PostgreSQL database using Drizzle ORM, and comprehensive workflow management.

---

## 1. OVERALL ARCHITECTURE & INFRASTRUCTURE

### Technology Stack
- **Frontend:** React 19.1.0, TypeScript, React Router 7.8.0, Tailwind CSS 4.1.11
- **Backend:** Express 5.1.0, Node.js, TypeScript
- **Database:** PostgreSQL with Drizzle ORM 0.44.4
- **UI Components:** shadcn/ui components with Radix UI
- **Documentation:** Swagger/OpenAPI 3.0.0
- **Authentication:** JWT (Access Token, Refresh Token, Password Reset)
- **File Upload:** Express File Upload
- **Rate Limiting:** Express Rate Limit
- **Email:** Nodemailer

### Deployment
- Development: Vite + Nodemon with hot reload
- Production: tsx runner
- CORS enabled for all origins
- Rate limiting: 5000 requests per 15-minute window per IP

---

## 2. MODULAR STRUCTURE

### Core Modules (9 Main Modules)

#### A. MASTER DATA MANAGEMENT
**Location:** `/src/modules/master-data`

**Purpose:** Central repository for all business entities and master data

**Sub-Components:**

1. **Product Management**
   - Product Types (categories, classifications)
   - Package Types (packaging specifications)
   - Products (SKU, name, dimensions, temperature requirements)
   - Fields: SKU, name, description, minimum stock level, reorder point, weight, dimensions, expiry date support

2. **Supplier Management**
   - Suppliers (company details, contact information)
   - Supplier Locations (pickup locations, delivery addresses)
   - Fields: Name, contact person, email, phone, tax ID, address, coordinates

3. **Customer Management**
   - Customers (buyer information)
   - Customer Locations (delivery addresses, multiple locations per customer)
   - Fields: Name, contact person, email, phone, tax ID, address, coordinates

4. **Transporter Management**
   - Transporter details for shipping
   - Integrated with shipping workflow

5. **Shipping Methods**
   - Shipping method definitions
   - Cost and delivery time specifications

**API Routes:** `/api/modules/master-data`
- GET/POST/PUT/DELETE `/product-types`
- GET/POST/PUT/DELETE `/package-types`
- GET/POST/PUT/DELETE `/products`
- GET/POST/PUT/DELETE `/suppliers`
- GET/POST/PUT/DELETE `/transporters`
- GET/POST/PUT/DELETE `/shipping-methods`

**Database Tables:**
- product_types
- package_types
- products
- suppliers
- supplier_locations
- customers
- customer_locations
- transporters
- shipping_methods

---

#### B. WAREHOUSE SETUP MODULE
**Location:** `/src/modules/warehouse-setup`

**Purpose:** Configure warehouse physical structure and policies

**Structure (Hierarchical):**
- Warehouse → Zones → Aisles → Shelves → Bins

**Components:**

1. **Warehouse Configuration**
   - Picking strategy (FEFO, FIFO)
   - Auto-assign bins setting
   - Batch/Expiry tracking requirements

2. **Zones** - Physical warehouse sections
3. **Aisles** - Subdivisions within zones
4. **Shelves** - Storage levels
5. **Bins** - Individual storage locations
   - Fields: Name, barcode, max weight/volume, current weight/volume, fixed SKU, category, temperature requirements, accessibility score

**API Routes:** `/api/modules/warehouse-setup`
- GET/POST/PUT/DELETE `/warehouses`
- GET/POST/PUT/DELETE `/zones`
- GET/POST/PUT/DELETE `/aisles`
- GET/POST/PUT/DELETE `/shelves`
- GET/POST/PUT/DELETE `/bins`

**Database Tables:**
- warehouses
- warehouse_configs
- zones
- aisles
- shelves
- bins

**Frontend Pages:**
- WarehouseSetupList
- WarehouseSetupManagement
- WarehouseSetupAdd

---

#### C. INVENTORY ITEMS MODULE
**Location:** `/src/modules/inventory-items`

**Purpose:** Manage stock levels and locations

**Sub-Modules:**

1. **Inventory Management**
   - Track inventory items by bin location
   - Supports batch/lot/serial number tracking
   - Expiry date tracking
   - Cost per unit tracking
   - Available vs Reserved quantity

2. **Cycle Count Management**
   - Schedule cycle counts
   - Count types: partial, full
   - Variance tracking and approval workflow
   - Variance threshold configuration
   - Reason codes for discrepancies

3. **Adjustment Management**
   - Regular adjustments (manual stock corrections)
   - Cycle count-based adjustments
   - Approval workflow
   - Audit trail of changes

4. **Relocation/Putaway**
   - Move inventory between bins
   - Auto-assignment based on warehouse rules

**API Routes:** `/api/modules/inventory-items`
- GET/POST/PUT/DELETE `/inventory-items`
- GET `/inventory-items/stats/summary`
- GET `/stock-information` (aggregated by product)
- GET `/stock-information/{productId}/locations`
- GET/POST/PUT/DELETE `/cycle-counts`
- GET/POST `/adjustments`
- GET/POST `/relocations`

**Database Tables:**
- inventory_items (available_quantity, reserved_quantity)
- cycle_counts
- cycle_count_items
- adjustments
- adjustment_items

**Frontend Pages:**
- InventoryItemsList
- InventoryItemsAdd
- StockInformation
- CycleCountCreate
- CycleCountHistory
- CycleCountApprove
- AdjustmentCreate
- Adjustment
- Relocate

---

#### D. PURCHASE ORDER MODULE
**Location:** `/src/modules/purchase-order`

**Purpose:** Manage vendor purchase orders and receiving

**Workflow States:** create → approve → receive → putaway → complete

**Statuses:** pending → approved → rejected → incomplete → received → completed

**Features:**

1. **Purchase Order Creation**
   - Multiple items per PO
   - Supplier selection and location
   - Delivery method (delivery vs pickup)
   - Expected delivery date

2. **PO Approval Workflow**
   - Approval/Rejection capability
   - Workflow state management

3. **Goods Receipt (GRN)**
   - Receive items against PO
   - Partial/full receipt capability
   - Generate GRN document

4. **Putaway Process**
   - Assign received items to bins
   - Auto-assignment or manual placement
   - Putaway document generation

5. **Document Generation**
   - PO Document
   - GRN (Goods Receipt Note)
   - Putaway Document

**API Routes:** `/api/modules/purchase-order`
- GET/POST/PUT/DELETE `/purchase-orders`
- POST `/purchase-orders/{id}/approve`
- POST `/purchase-orders/{id}/reject`
- POST `/purchase-orders/{id}/receive`
- POST `/purchase-orders/{id}/putaway`
- GET `/purchase-orders/{id}/grn`

**Database Tables:**
- purchase_orders (status, workflow_state, delivery_method)
- purchase_order_items
- purchase_orders_receipt
- receipt_items

**Frontend Pages:**
- PurchaseOrderList
- PurchaseOrderCreate
- PurchaseOrderAdd
- PurchaseOrderApprove
- PurchaseOrderReceive
- PurchaseOrderPutaway
- PurchaseOrderPlaceholder

---

#### E. SALES ORDER MODULE
**Location:** `/src/modules/sales-order`

**Purpose:** Complete order fulfillment workflow

**Workflow States:** allocate → pick → pack → ship → deliver → complete

**Statuses:** created → allocated → picked → packed → shipped → delivered

**Components:**

1. **Sales Order Management**
   - Customer and delivery location selection
   - Multi-item orders with line numbers
   - Requested delivery date tracking
   - Order status tracking

2. **Inventory Allocation**
   - FEFO (First Expiry First Out) or FIFO logic
   - Automatic allocation based on availability
   - Allocation document generation
   - Supports batch/lot/serial tracking

3. **Picking Process**
   - Pick list generation
   - Bin location identification
   - Batch/expiry date tracking
   - Pick document generation
   - Multiple picks per item (if inventory spread across locations)

4. **Packing Process**
   - Package creation
   - Package item assignment
   - Weight and volume tracking
   - Dimensional information
   - Pack document generation

5. **Shipping Process**
   - Shipment creation
   - Transporter assignment
   - Shipping method selection
   - Tracking number management
   - Shipment document generation

6. **Delivery Process**
   - Delivery confirmation
   - Multiple delivery locations per order
   - Delivery proof and documentation
   - Delivery document generation

**API Routes:** `/api/modules/sales-order`
- GET/POST/PUT/DELETE `/sales-orders`
- GET `/sales-orders/{id}/html` (HTML preview)
- GET `/sales-orders/{id}` (detail with items)
- GET `/allocations` (allocatable orders)
- POST `/allocations/{id}/confirm`
- GET `/picks` (pickable orders)
- POST `/picks/{id}/confirm`
- GET `/packs` (packable orders)
- POST `/packs/{id}/confirm`
- GET `/ships` (shippable orders)
- POST `/ships/{id}/confirm`
- GET `/deliveries` (deliverable orders)
- POST `/deliveries/{id}/confirm`
- GET `/products-with-stock` (available products)
- GET `/workflow-steps` (workflow configuration)
- GET/POST/PUT/DELETE `/shipping-methods`

**Database Tables:**
- sales_orders
- sales_order_items
- sales_order_item_locations
- sales_order_allocations
- sales_order_picks
- shipments
- packages
- package_items
- deliveries
- delivery_items

**Frontend Pages:**
- SalesOrderCreate
- SalesOrderAllocate
- SalesOrderPick
- SalesOrderPack
- SalesOrderShip
- SalesOrderDeliver

---

#### F. DOCUMENT NUMBERING MODULE
**Location:** `/src/modules/document-numbering`

**Purpose:** Centralized document number generation with configurable formats

**Features:**

1. **Document Number Configuration**
   - Flexible number format with placeholders
   - Support for 1-2 user-defined prefixes
   - Auto-increment counter
   - Period-based reset (daily, monthly, yearly)
   - Prefix combinations

2. **Document Number Generation**
   - API endpoint for generating numbers
   - Preview before actual generation
   - Thread-safe sequence generation
   - Integration with all document types

3. **Sequence Tracking**
   - Tracks sequences per document type and period
   - Reset on period change
   - Maintains counter state

4. **Generated Documents Registry**
   - Stores generated documents metadata
   - Reference tracking (sales order, PO, etc.)
   - File storage paths
   - Document versioning

5. **History and Auditing**
   - Complete audit trail of all generated numbers
   - Void capability for rejected documents
   - Previous state tracking

**Document Types:**
- SO (Sales Orders)
- ALLOC (Allocations)
- PICK (Pick Lists)
- PACK (Packing)
- SHIP (Shipments)
- DELIVER (Deliveries)
- PO (Purchase Orders)
- GRN (Goods Receipt Notes)
- PUTAWAY (Putaway Documents)

**API Routes:** `/api/modules/document-numbering`
- GET/POST/PUT/DELETE `/configs`
- POST `/generate`
- POST `/preview`
- GET/POST/PUT/DELETE `/documents`
- GET `/documents/by-number/{documentNumber}`
- GET `/documents/by-reference/{referenceType}/{referenceId}`
- GET `/history`
- PUT `/history/{id}`
- POST `/history/{id}/void`
- GET `/trackers`

**Database Tables:**
- document_number_config
- document_sequence_tracker
- document_number_history
- generated_documents

---

#### G. WORKFLOW MODULE
**Location:** `/src/modules/workflow`

**Purpose:** Configure approval and processing workflows

**Features:**

1. **Workflow Definition**
   - Workflow types (SALES_ORDER, PURCHASE_ORDER, etc.)
   - Tenant-specific workflows
   - Default workflow per type
   - Active/inactive status

2. **Workflow Steps**
   - Sequential step management
   - Step keys (create, allocate, pick, pack, ship, deliver)
   - Step ordering
   - Initial and terminal step marking
   - Required fields per step

3. **Workflow State Management**
   - Tracks current state of orders/POs
   - Validates state transitions
   - Integration with resource status changes

**API Routes:** `/api/modules/workflow`
- GET/POST/PUT/DELETE `/workflows`
- GET/POST/PUT/DELETE `/workflow-steps`

**Database Tables:**
- workflows
- workflow_steps

**Frontend Pages:**
- WorkflowList
- WorkflowAdd
- WorkflowSettings

---

#### H. REPORTS MODULE
**Location:** `/src/modules/reports`

**Purpose:** Analytics and reporting capabilities

**Planned Reports:**
- Inventory summary and aging
- Stock movement reports
- Sales order fulfillment metrics
- Purchase order status
- Warehouse utilization
- Cycle count variance reports
- Adjustment history

**API Routes:** `/api/modules/reports`
- GET/POST `/reports`
- GET `/reports/{id}`

**Database Tables:**
- reports

**Frontend Pages:**
- Reports dashboard

---

#### I. SAMPLE MODULE
**Location:** `/src/modules/sample-module`

**Purpose:** Template reference for creating new modules

**Demonstrates:**
- Complete CRUD operations
- Server-side pagination
- Client-side search/filtering
- Form validation
- Multi-tenant support
- Standard module structure

---

## 3. SYSTEM MODULES & AUTHENTICATION

### System Routes: `/api/system/*`

#### A. Authentication
**Route:** `/api/auth`

**Endpoints:**
- POST `/login` - User login (returns JWT tokens)
- POST `/register` - User registration
- POST `/register-tenant` - New tenant registration
- POST `/refresh-token` - Token refresh
- POST `/forget-password` - Password reset request
- POST `/reset-password` - Reset password with token
- POST `/validate-username` - Username availability check
- POST `/validate-tenant-code` - Tenant code availability check

**Tokens:**
- ACCESS_TOKEN - Short-lived JWT (typical: 1 hour)
- REFRESH_TOKEN - Long-lived JWT (typical: 7 days)
- RESET_PASSWORD_TOKEN - Password reset JWT

**Password Security:** bcryptjs hashing (3.0.2)

---

#### B. User Management
**Route:** `/api/system/user`

**Features:**
- User creation/modification
- Tenant assignment
- Role assignment
- Permission assignment
- User status (active/inactive)
- Avatar support
- Email management

**Fields:** username, fullname, email, status, avatar, activeTenantId

---

#### C. Role-Based Access Control (RBAC)
**Route:** `/api/system/role`

**Features:**
- Role creation per tenant
- System roles (fixed)
- Custom roles
- Permission assignment to roles
- Role description

**System Roles:**
- ADMIN
- USER
- SYSADMIN

---

#### D. Permission Management
**Route:** `/api/system/permission`

**Feature-Level Permissions:**
- module.view
- module.create
- module.edit
- module.delete

**Module-Specific Permissions:**
- master-data.{view, create, edit, delete}
- purchase-order.{view, create, edit, delete, approve}
- sales-order.{view, create, edit, delete, allocate, pick, pack, ship, deliver}
- inventory-items.{view, create, edit, delete}
- workflow.{view, create, edit, delete}
- reports.{view, create, edit, delete}
- document-numbering.{view, create, edit, delete}
- warehouse-setup.{view, create, edit, delete}

---

#### E. Tenant Management
**Route:** `/api/system/tenant`

**Features:**
- Multi-tenant isolation
- Tenant code (unique identifier)
- Tenant name and description
- Tenant configuration
- User-tenant association

---

#### F. Options/Settings
**Route:** `/api/system/option`

**Purpose:** System configuration key-value pairs
- Tenant-specific settings
- Application parameters
- Feature flags

---

#### G. Module Authorization
**Route:** `/api/system/module-authorization`

**Features:**
- Per-tenant module access control
- Module enable/disable per tenant
- Role-module permissions

---

#### H. Module Registry
**Route:** `/api/system/module-registry`

**Purpose:** System admin management of module installations

---

### Middleware & Security

**Authentication Middleware:**
- JWT verification
- Token extraction from Authorization header
- User context injection to requests
- Status: 401 for unauthorized

**Authorization Middleware:**
- Role-based checks
- Permission-based checks
- Module-level authorization
- Status: 403 for forbidden

**Validation Middleware:**
- Zod schema validation
- Request body validation
- Query parameter validation

**Module Authorization Middleware:**
- Checks if user's tenant has access to module
- Prevents unauthorized module access

---

## 4. AUDIT LOGGING & COMPLIANCE

**Route:** `/api/audit-logs`

**Features:**
- Complete audit trail for all operations
- Action tracking (create, read, update, delete, approve, reject, etc.)
- Resource type and ID tracking
- Changed fields documentation
- Previous/new state tracking
- User and IP address logging
- Module-specific audit entries
- Timestamp recording
- Document path references

**Audit Table Indexes:**
- tenant_idx
- created_at_idx (descending)
- resource_idx (type + ID)
- tenant_time_idx (compound)

**Tracked Events:**
- All CRUD operations
- Workflow state changes
- Approvals/rejections
- Document generation
- Inventory movements
- Adjustments
- Cycle count operations

---

## 5. DATABASE SCHEMA OVERVIEW

### System Tables (45+ tables total)

#### Core Tables:
1. **sys_tenant** - Tenant master record
2. **sys_user** - User accounts
3. **sys_role** - Role definitions
4. **sys_permission** - Permission definitions
5. **sys_user_tenant** - User-tenant assignments
6. **sys_user_role** - User-role assignments
7. **sys_role_permission** - Role-permission assignments
8. **sys_option** - System options/settings
9. **audit_logs** - Audit trail
10. **sys_module_auth** - Module authorization
11. **sys_module_registry** - Module registry

#### Master Data Tables (9 tables):
- product_types
- package_types
- products
- suppliers
- supplier_locations
- customers
- customer_locations
- transporters
- shipping_methods

#### Warehouse Structure Tables (5 tables):
- warehouses
- warehouse_configs
- zones
- aisles
- shelves
- bins

#### Inventory Tables (3 tables):
- inventory_items
- cycle_counts
- cycle_count_items
- adjustments
- adjustment_items

#### Purchase Order Tables (4 tables):
- purchase_orders
- purchase_order_items
- purchase_orders_receipt
- receipt_items

#### Sales Order Tables (9 tables):
- sales_orders
- sales_order_items
- sales_order_item_locations
- sales_order_allocations
- sales_order_picks
- shipments
- packages
- package_items
- deliveries
- delivery_items

#### Document Management Tables (4 tables):
- document_number_config
- document_sequence_tracker
- document_number_history
- generated_documents

#### Workflow Tables (2 tables):
- workflows
- workflow_steps

#### Reports Tables (1 table):
- reports

#### Sample Module Tables (1 table):
- sample_module

---

## 6. KEY FEATURES & CAPABILITIES

### 6.1 Inventory Management
- Multi-location inventory tracking
- FEFO (First Expiry First Out) picking strategy
- Batch/Lot/Serial number tracking
- Expiry date management
- Cost per unit tracking
- Available vs Reserved quantity differentiation
- Stock information aggregation by product
- Minimum stock level monitoring
- Reorder point tracking

### 6.2 Picking & Allocation
- Automatic allocation based on availability
- Expiry-based FEFO sorting
- Multiple allocation sources per order
- Batch/lot tracking through picking
- Pick list generation with bin locations
- Warehouse hierarchy visualization (Warehouse > Zone > Aisle > Shelf > Bin)
- Accessibility scoring for bin selection

### 6.3 Order Management
- Multi-item orders
- Partial fulfillment capability
- Multiple delivery locations per order
- Requested delivery date tracking
- Order status tracking through workflow
- Total amount calculation
- Notes and instructions support

### 6.4 Document Management
- Configurable document numbering
- Auto-incrementing sequences
- Period-based resets (daily/monthly/yearly)
- Prefix customization
- HTML document generation
- Document storage and retrieval
- Shipment labels/documents
- GRN (Goods Receipt Notes)
- Putaway documents
- Pick lists
- Packing lists
- Delivery documents

### 6.5 Workflow Management
- State machine implementation
- Workflow steps ordering
- Workflow type support (Sales Orders, Purchase Orders)
- Tenant-specific workflows
- Default workflow designation
- Step-level required field configuration
- Initial and terminal step marking

### 6.6 Multi-Tenancy
- Complete data isolation per tenant
- Tenant-specific workflows
- Tenant-specific permissions
- Tenant configuration options
- User-tenant assignments
- Role-tenant isolation

### 6.7 Security
- JWT token-based authentication
- Password hashing with bcryptjs
- Rate limiting (5000 req/15 min per IP)
- CORS support
- Role-based access control (RBAC)
- Permission-based access control (PBAC)
- Module-level authorization
- Audit logging of all changes

### 6.8 Reporting & Analytics
- Inventory statistics (total items, available, reserved)
- Stock information aggregation
- Product-level quantity summary
- Location-level detail view
- Variance reports (from cycle counts)
- Adjustment history tracking

---

## 7. API ENDPOINT SUMMARY

### System Endpoints (40+ endpoints)
```
/api/auth/*
/api/system/user/*
/api/system/role/*
/api/system/permission/*
/api/system/tenant/*
/api/system/option/*
/api/system/module-authorization/*
/api/system/module-registry/*
/api/audit-logs/*
```

### Master Data Endpoints (25+ endpoints)
```
/api/modules/master-data/product-types/*
/api/modules/master-data/package-types/*
/api/modules/master-data/products/*
/api/modules/master-data/suppliers/*
/api/modules/master-data/transporters/*
/api/modules/master-data/shipping-methods/*
```

### Warehouse Setup Endpoints (20+ endpoints)
```
/api/modules/warehouse-setup/warehouses/*
/api/modules/warehouse-setup/zones/*
/api/modules/warehouse-setup/aisles/*
/api/modules/warehouse-setup/shelves/*
/api/modules/warehouse-setup/bins/*
```

### Inventory Endpoints (30+ endpoints)
```
/api/modules/inventory-items/inventory-items/*
/api/modules/inventory-items/stock-information/*
/api/modules/inventory-items/cycle-counts/*
/api/modules/inventory-items/adjustments/*
```

### Purchase Order Endpoints (15+ endpoints)
```
/api/modules/purchase-order/purchase-orders/*
/api/modules/purchase-order/receipts/*
/api/modules/purchase-order/putaway/*
```

### Sales Order Endpoints (40+ endpoints)
```
/api/modules/sales-order/sales-orders/*
/api/modules/sales-order/allocations/*
/api/modules/sales-order/picks/*
/api/modules/sales-order/packs/*
/api/modules/sales-order/shipments/*
/api/modules/sales-order/deliveries/*
/api/modules/sales-order/shipping-methods/*
```

### Document Numbering Endpoints (15+ endpoints)
```
/api/modules/document-numbering/configs/*
/api/modules/document-numbering/generate
/api/modules/document-numbering/documents/*
/api/modules/document-numbering/history/*
/api/modules/document-numbering/trackers/*
```

### Workflow Endpoints (10+ endpoints)
```
/api/modules/workflow/workflows/*
/api/modules/workflow/workflow-steps/*
```

### Reports Endpoints (5+ endpoints)
```
/api/modules/reports/reports/*
```

---

## 8. FRONTEND STRUCTURE

### Core Pages
- **Auth Pages:** Login, Register, Password Reset
- **Dashboard:** Dashboard with charts and KPIs
- **System Pages:** User, Role, Tenant, Option management

### Module Pages

**Master Data:**
- Product management
- Supplier management
- Customer management
- Transporter management

**Warehouse Setup:**
- Warehouse configuration
- Zone/Aisle/Shelf/Bin management

**Inventory:**
- Inventory list
- Stock information view
- Cycle count creation and approval
- Adjustment creation
- Relocation management

**Purchase Order:**
- PO list and creation
- Approval workflow
- Goods receipt
- Putaway management

**Sales Order:**
- Order creation
- Allocation process
- Picking process
- Packing process
- Shipping process
- Delivery process

**Workflow:**
- Workflow configuration
- Step management
- Settings

---

## 9. DATA FLOW EXAMPLES

### Complete Sales Order Workflow
1. **Create SO** → Validates customer, products, locations
2. **Allocate** → Matches inventory using FEFO logic
3. **Pick** → Retrieves items from bins, updates inventory
4. **Pack** → Creates packages with picked items
5. **Ship** → Assigns transporter, generates shipment document
6. **Deliver** → Confirms delivery to customer locations
7. **Complete** → Final status update

### Purchase Order to Putaway
1. **Create PO** → Supplier and items specified
2. **Approve/Reject** → Workflow approval
3. **Receive** → GRN generation, item receipt
4. **Putaway** → Assign bins, update inventory
5. **Complete** → Mark as finished

### Cycle Count & Adjustment
1. **Schedule Count** → Define scope and threshold
2. **Count Items** → Record physical quantities
3. **Approve** → Review variances
4. **Generate Adjustments** → Create adjustment records
5. **Apply** → Update inventory system

---

## 10. TECHNOLOGY DETAILS

### Frontend Technologies
- React 19.1 with TypeScript
- React Router 7.8 for navigation
- React Hook Form for forms
- Zod for schema validation
- Tailwind CSS 4.1.11 for styling
- Recharts for visualizations
- Framer Motion for animations
- Radix UI for accessible components
- DnD Kit for drag-and-drop
- TanStack React Table for data tables
- Sonner for toast notifications

### Backend Technologies
- Express 5.1 with TypeScript
- Drizzle ORM 0.44 for database access
- PostgreSQL with Postgres driver 3.4.7
- Bcryptjs for password hashing
- JWT for authentication
- Swagger/OpenAPI for documentation
- Nodemailer for email
- Fast-CSV for CSV operations
- File Upload support
- Rate limiting

### Build & Development
- Vite for bundling (dev mode: hot reload)
- tsx for TypeScript execution
- Nodemon for auto-restart
- Drizzle Kit for database management
- Module scaffolding scripts

---

## 11. CONFIGURATION & SETUP

### Environment Variables Required
```
ACCESS_TOKEN_SECRET
REFRESH_TOKEN_SECRET
RESET_PASSWORD_TOKEN_SECRET
BASE_URL
DATABASE_URL
MAIL_HOST (for Nodemailer)
MAIL_USER
MAIL_PASSWORD
```

### Database Scripts
```bash
npm run db:push        # Push schema
npm run db:generate    # Generate migrations
npm run db:migrate     # Run migrations
npm run db:seed        # Seed basic data
npm run db:seed-master-data # Seed master data
npm run db:studio      # Visual database manager
```

### Module Management
```bash
npm run create-module      # Create new module
npm run add-page           # Add page to module
npm run register-module    # Register module
```

---

## 12. KEY INTEGRATION POINTS

1. **Document Numbering Integration:**
   - All modules call document-numbering API to generate numbers
   - Automatic sequence tracking per document type
   - Historical tracking of all generated numbers

2. **Workflow Integration:**
   - All orders/POs follow configured workflows
   - State tracking in resource tables
   - Status updates based on workflow progression

3. **Audit Logging Integration:**
   - All state changes logged to audit_logs
   - Resource tracking with type and ID
   - User and timestamp recording

4. **Multi-Tenant Integration:**
   - All queries filtered by tenant_id
   - Tenant isolation enforced at database level
   - Module authorization per tenant

5. **Inventory Integration:**
   - SO allocation reduces available_quantity
   - SO picking reduces reserved_quantity
   - Adjustments update inventory directly
   - PO receipt adds to inventory

---

## 13. PERFORMANCE OPTIMIZATIONS

- **Indexes:** Strategic indexing on frequently searched columns (tenant_id, status, created_at, etc.)
- **Pagination:** Server-side pagination on all list endpoints (default 10-20 items per page)
- **Lazy Loading:** Document loading only on demand
- **Caching:** Client-side caching for workflow definitions
- **Query Optimization:** Drizzle ORM with selective field loading
- **Rate Limiting:** 5000 requests per 15-minute window
- **Compound Indexes:** (tenant_id, status), (tenant_id, created_at), etc.

---

## 14. CURRENT DEVELOPMENT STATUS

### Completed Modules
- Master Data Management
- Warehouse Setup
- Inventory Items (with Cycle Count & Adjustment)
- Purchase Orders (create through putaway)
- Sales Orders (complete workflow)
- Document Numbering
- Workflow Management
- Authentication & Authorization
- Audit Logging

### Recent Changes (from git history)
- Remove edit and apply buttons from adjustment details view
- Add edit button from list view
- Update audit log action names for adjustments
- Saved progress on loop completion

---

## SUMMARY

This is a **production-ready warehouse management system** with:
- **9 functional modules** covering the complete warehouse operation lifecycle
- **40+ API endpoints** with proper authentication and authorization
- **Complete multi-tenancy** support with role-based access control
- **Comprehensive audit trail** for compliance
- **Modern tech stack** with React, Express, and PostgreSQL
- **Scalable modular architecture** for easy extension
- **Full CRUD operations** for all major entities
- **Workflow state management** for complex business processes
- **Document generation** for official records
- **Inventory optimization** with FEFO picking strategy

