# Sales Order Module

## Overview

This module provides comprehensive sales order management for warehouse operations. It handles the complete order-to-delivery lifecycle including order creation, inventory allocation, picking, packing, and shipping.

## Features

- ✅ **Order Management** - Complete CRUD operations for sales orders
- ✅ **Multi-Item Orders** - Support for orders with multiple line items
- ✅ **Inventory Allocation** - Reserve inventory for specific orders
- ✅ **Pick List Management** - Generate and track picking operations
- ✅ **Batch/Lot/Serial Tracking** - Full traceability during picking
- ✅ **Shipping Integration** - Multiple shipping methods and carriers
- ✅ **Document Generation** - Automated shipment document creation
- ✅ **Delivery Tracking** - Track shipments from dispatch to delivery
- ✅ **Workflow States** - Multi-step process management
- ✅ **Multi-Tenant Support** - Full tenant isolation

## Database Schema

The module uses 7 interconnected tables following the project's UUID-based architecture:

### 1. shipping_methods
Stores shipping carrier and method information.

**Fields:**
- `id` (UUID, PK) - Unique identifier
- `tenant_id` (UUID, FK) - Tenant isolation
- `name` (varchar) - Shipping method name
- `carrier` (varchar) - Carrier name (e.g., FedEx, UPS, DHL)
- `description` (text) - Method description
- `estimated_days` (integer) - Estimated delivery time
- `tracking_url_template` (varchar) - URL template for tracking
- `is_active` (boolean) - Active status
- `created_at`, `updated_at` (timestamp)

### 2. sales_orders
Main sales order table.

**Fields:**
- `id` (UUID, PK) - Unique identifier
- `tenant_id` (UUID, FK) - Tenant isolation
- `order_number` (varchar, unique) - Human-readable order number
- `customer_id` (UUID, FK) - Customer reference
- `billing_location_id` (UUID, FK) - Billing address
- `shipping_location_id` (UUID, FK) - Shipping address
- `shipping_method_id` (UUID, FK) - Shipping method
- `warehouse_id` (UUID, FK) - Source warehouse
- `status` (enum) - Order status: `pending`, `confirmed`, `allocated`, `picked`, `packed`, `shipped`, `delivered`, `cancelled`, `completed`
- `workflow_state` (enum) - Workflow step: `create`, `allocate`, `pick`, `pack`, `ship`, `deliver`, `complete`
- `order_date` (date) - Order placement date
- `requested_delivery_date` (date) - Customer requested date
- `actual_delivery_date` (date) - Actual delivery date
- `total_amount` (decimal) - Order total
- `tracking_number` (varchar) - Shipment tracking number
- `delivery_instructions` (text) - Special delivery notes
- `notes` (text) - Internal notes
- `created_by` (UUID, FK) - User who created the order
- `created_at`, `updated_at` (timestamp)

**Indexes:**
- Unique on `order_number`
- Indexes on `tenant_id`, `customer_id`, `status`, `warehouse_id`, `order_date`

### 3. sales_order_items
Line items for each sales order.

**Fields:**
- `id` (UUID, PK) - Unique identifier
- `sales_order_id` (UUID, FK) - Parent sales order
- `product_id` (UUID, FK) - Product reference
- `tenant_id` (UUID, FK) - Tenant isolation
- `ordered_quantity` (integer) - Quantity ordered
- `allocated_quantity` (integer) - Quantity allocated (denormalized)
- `picked_quantity` (integer) - Quantity picked (denormalized)
- `shipped_quantity` (integer) - Quantity shipped (denormalized)
- `unit_price` (decimal) - Price per unit
- `total_price` (decimal) - Line total
- `notes` (text) - Item notes
- `created_at`, `updated_at` (timestamp)

**Indexes:**
- Indexes on `tenant_id`, `sales_order_id`, `product_id`

### 4. sales_order_allocations
Links sales order items to specific inventory items (reserves stock).

**Fields:**
- `id` (UUID, PK) - Unique identifier
- `so_item_id` (UUID, FK) - Sales order item reference
- `inventory_item_id` (UUID, FK) - Inventory item being allocated
- `tenant_id` (UUID, FK) - Tenant isolation
- `allocated_quantity` (integer) - Quantity allocated from this inventory item
- `allocation_date` (timestamp) - When allocation occurred
- `allocated_by` (UUID, FK) - User who performed allocation
- `status` (varchar) - Allocation status
- `notes` (text) - Allocation notes
- `created_at`, `updated_at` (timestamp)

**Indexes:**
- Indexes on `tenant_id`, `so_item_id`, `inventory_item_id`, `status`

### 5. sales_order_picks
Picking records with batch/lot/serial tracking.

**Fields:**
- `id` (UUID, PK) - Unique identifier
- `sales_order_id` (UUID, FK) - Parent sales order
- `allocation_id` (UUID, FK) - Allocation being picked
- `tenant_id` (UUID, FK) - Tenant isolation
- `picked_quantity` (integer) - Quantity picked
- `pick_date` (timestamp) - When picked
- `picked_by` (UUID, FK) - User who picked
- `batch_number` (varchar) - Batch identifier
- `lot_number` (varchar) - Lot identifier
- `serial_number` (varchar) - Serial identifier
- `expiry_date` (date) - Product expiry
- `notes` (text) - Pick notes
- `created_at` (timestamp)

**Indexes:**
- Indexes on `tenant_id`, `sales_order_id`, `allocation_id`, `picked_by`

### 6. sales_order_shipments
Shipment documents (similar to GRN for purchase orders).

**Fields:**
- `id` (UUID, PK) - Unique identifier
- `sales_order_id` (UUID, FK) - Parent sales order
- `shipment_document_id` (UUID, FK) - Generated document reference
- `tenant_id` (UUID, FK) - Tenant isolation
- `shipment_date` (timestamp) - When shipped
- `shipped_by` (UUID, FK) - User who shipped
- `tracking_number` (varchar) - Carrier tracking number
- `carrier` (varchar) - Shipping carrier
- `estimated_delivery_date` (date) - Expected delivery
- `actual_delivery_date` (date) - Actual delivery
- `delivery_status` (enum) - Status: `pending`, `in_transit`, `out_for_delivery`, `delivered`, `failed`, `returned`
- `notes` (text) - Shipment notes
- `created_at`, `updated_at` (timestamp)

**Indexes:**
- Indexes on `tenant_id`, `sales_order_id`, `shipment_document_id`, `tracking_number`

### 7. shipment_items
Items included in each shipment.

**Fields:**
- `id` (UUID, PK) - Unique identifier
- `shipment_id` (UUID, FK) - Parent shipment
- `so_item_id` (UUID, FK) - Sales order item reference
- `pick_id` (UUID, FK) - Pick record reference
- `tenant_id` (UUID, FK) - Tenant isolation
- `shipped_quantity` (integer) - Quantity shipped
- `batch_number` (varchar) - Batch identifier
- `lot_number` (varchar) - Lot identifier
- `serial_number` (varchar) - Serial identifier
- `expiry_date` (date) - Product expiry
- `notes` (text) - Item notes
- `created_at` (timestamp)

**Indexes:**
- Indexes on `tenant_id`, `shipment_id`, `so_item_id`, `pick_id`

## Workflow States

The sales order lifecycle follows these states:

1. **create** - Order created, awaiting confirmation
2. **allocate** - Inventory allocated to order items
3. **pick** - Items picked from warehouse locations
4. **pack** - Items packed for shipment
5. **ship** - Package shipped to customer
6. **deliver** - Package delivered to customer
7. **complete** - Order fulfilled and closed

## Status Values

Order status progression:
- `pending` → `confirmed` → `allocated` → `picked` → `packed` → `shipped` → `delivered` → `completed`

Or: `cancelled` (at any point)

## Comparison with Purchase Orders

| Aspect | Purchase Order (Inbound) | Sales Order (Outbound) |
|--------|--------------------------|------------------------|
| **Main Table** | purchase_orders | sales_orders |
| **Partner** | Supplier | Customer |
| **Location** | Supplier location | Customer location |
| **Process** | Receive → Putaway | Allocate → Pick → Ship |
| **Document** | GRN (Goods Receipt Note) | Shipment Document |
| **Sub-tables** | receipt_items | shipment_items |
| **Tracking** | receivedQuantity | allocatedQuantity, pickedQuantity, shippedQuantity |

## Integration Points

- **Master Data**: Customers, customer locations, products
- **Warehouse Setup**: Warehouses for fulfillment
- **Inventory Items**: Stock allocation and picking
- **Document Numbering**: SO and shipment document generation
- **Workflow**: Multi-step approval processes (optional)
- **Audit Logs**: Full activity tracking

## API Endpoints (To Be Implemented)

### Sales Orders
- `GET /api/modules/sales-order` - List orders with pagination
- `GET /api/modules/sales-order/:id` - Get order details
- `POST /api/modules/sales-order` - Create new order
- `PUT /api/modules/sales-order/:id` - Update order
- `DELETE /api/modules/sales-order/:id` - Delete order

### Allocations
- `POST /api/modules/sales-order/:id/allocate` - Allocate inventory
- `GET /api/modules/sales-order/:id/allocations` - View allocations

### Picking
- `POST /api/modules/sales-order/:id/pick` - Record picks
- `GET /api/modules/sales-order/:id/picks` - View pick list

### Shipping
- `POST /api/modules/sales-order/:id/ship` - Create shipment
- `GET /api/modules/sales-order/:id/shipments` - View shipments
- `PUT /api/modules/sales-order/shipments/:id/track` - Update tracking

### Shipping Methods
- `GET /api/modules/sales-order/shipping-methods` - List methods
- `POST /api/modules/sales-order/shipping-methods` - Create method
- `PUT /api/modules/sales-order/shipping-methods/:id` - Update method

## Next Steps

1. ✅ Database schema created
2. ⏳ Backend API routes
3. ⏳ Frontend React components
4. ⏳ Allocation algorithm
5. ⏳ Pick list generation
6. ⏳ Shipment document templates
7. ⏳ Integration with document numbering
8. ⏳ Workflow integration
9. ⏳ Testing and validation
