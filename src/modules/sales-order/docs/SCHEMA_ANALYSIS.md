# Sales Order Schema Analysis

## Overview

The sales order schema has been designed with comprehensive shipping and packaging capabilities, following the modular architecture patterns established in the purchase order module.

## Complete Table Structure

### Core Tables (9 total)

1. **transporters** - Third-party shipping carriers
2. **shipping_methods** - Shipping methods (internal/third-party)
3. **sales_orders** - Main sales order table
4. **sales_order_items** - Order line items
5. **sales_order_allocations** - Inventory reservation
6. **sales_order_picks** - Pick records with traceability
7. **shipments** - Shipment documents (1 per sales order)
8. **packages** - Physical packages within a shipment
9. **package_items** - Products within each package

## Schema Analysis vs. Original Proposal

### What Was Added

✅ **transporters** table - Manages third-party carriers
- Supports multi-tenant isolation
- Geographic service areas (JSONB)
- Active/inactive status

✅ **Enhanced shipping_methods**
- Differentiates between `internal` and `third_party` methods
- Links to transporters for third-party methods
- Cost calculation methods (fixed, weight_based, volumetric_based)
- Database constraint ensures proper transporter linkage

✅ **Package management**
- `packages` table for multi-package shipments
- `package_items` for granular product tracking
- Barcode support for scanning
- Dimensions and weight tracking

✅ **Allocation & Pick tracking**
- `sales_order_allocations` - Links to specific inventory items
- `sales_order_picks` - Records picking with batch/lot/serial numbers
- Full traceability from order to shipment

### Key Improvements Over Original Proposal

1. **UUID Primary Keys** - All tables use UUIDs instead of serial integers
   - Matches project standards
   - Better for distributed systems
   - More secure

2. **Multi-Package Support** - One shipment can have multiple packages
   - Real-world scenario: Large orders split across boxes
   - Each package independently tracked

3. **Transporter Separation** - Dedicated table for carriers
   - Reusable across shipping methods
   - Service area tracking
   - Contact information management

4. **Cost Calculation Types** - Flexible pricing models
   - Fixed rate
   - Weight-based
   - Volumetric-based

5. **Workflow Integration** - Built-in workflow states
   - Matches purchase order pattern
   - Supports customizable workflows per tenant

## Database Constraints & Business Rules

### Unique Constraints

1. `transporters`: Unique (tenant_id, name)
2. `shipping_methods`: Unique (tenant_id, name)
3. `sales_orders`: Unique (order_number)
4. `shipments`: 
   - Unique (shipment_number)
   - Unique (tenant_id, sales_order_id) - **One shipment per order**
5. `packages`: Unique (barcode)

### Check Constraints

1. **shipping_methods**: Method type validation
   ```sql
   (method_type = 'internal' AND transporter_id IS NULL) OR
   (method_type = 'third_party' AND transporter_id IS NOT NULL)
   ```
   - Internal methods must NOT have a transporter
   - Third-party methods must HAVE a transporter

### Cascade Deletes

- `sales_order_items` → CASCADE on sales_order delete
- `sales_order_allocations` → CASCADE on SO item delete
- `sales_order_picks` → CASCADE on sales_order delete
- `shipments` → CASCADE on sales_order delete
- `packages` → CASCADE on shipment delete
- `package_items` → CASCADE on package delete

## Workflow States

### Sales Order Status Flow
```
pending → confirmed → allocated → picked → packed → shipped → delivered → completed
                                                              ↓
                                                          cancelled
```

### Workflow States
```
create → allocate → pick → pack → ship → deliver → complete
```

### Shipment Status
```
ready → in_transit → delivered
         ↓
      failed / returned
```

## Data Flow: Order to Delivery

1. **Order Creation** (`create` state)
   - Sales order created with items
   - Status: `pending`
   - Workflow state: `create`

2. **Inventory Allocation** (`allocate` state)
   - System/user allocates inventory items to order items
   - Records created in `sales_order_allocations`
   - Links specific inventory items to SO items
   - Status: `allocated`
   - `allocatedQuantity` updated on SO items

3. **Picking** (`pick` state)
   - Warehouse staff picks allocated items
   - Records batch/lot/serial numbers
   - Records created in `sales_order_picks`
   - Status: `picked`
   - `pickedQuantity` updated on SO items

4. **Packing** (`pack` state)
   - Items packed into physical packages
   - Multiple packages per shipment supported
   - `packages` and `package_items` created
   - Status: `packed`

5. **Shipping** (`ship` state)
   - Shipment record created (one per order)
   - Shipment document generated
   - Transporter and shipping method assigned
   - Tracking number assigned
   - Status: `shipped`
   - Workflow state: `ship`

6. **Delivery** (`deliver` state)
   - Tracking updates received
   - Actual delivery date recorded
   - Status: `delivered`
   - Workflow state: `complete`

## Denormalized Fields

Following the purchase order pattern, we maintain denormalized quantities for performance:

### On `sales_order_items`:
- `allocated_quantity` - Total allocated from allocations table
- `picked_quantity` - Total picked from picks table
- `shipped_quantity` - Total shipped from package_items table

**Benefits:**
- Fast queries without JOINs
- Easy validation (ordered ≥ allocated ≥ picked ≥ shipped)
- Performance at scale

**Maintenance:**
- Updated via application logic on allocation/pick/ship
- Can be recalculated from child tables if needed

## Indexes Strategy

### High-Traffic Queries
- All tenant_id columns (multi-tenant filtering)
- Foreign keys (JOIN operations)
- Status fields (filtering/reporting)
- Tracking numbers (lookup)
- Order dates (time-based queries)

### Unique Indexes
- Order numbers (fast lookup)
- Shipment numbers (tracking)
- Barcodes (scanning)

## Comparison with Purchase Orders

| Feature | Purchase Order (Inbound) | Sales Order (Outbound) |
|---------|--------------------------|------------------------|
| **Partner** | Supplier | Customer |
| **Location** | Supplier location | Customer location (billing/shipping) |
| **Method** | Delivery/Pickup | Shipping method + transporter |
| **Process** | Receive → Putaway | Allocate → Pick → Pack → Ship |
| **Document** | GRN (Goods Receipt Note) | Shipment document |
| **Sub-process** | receipt_items | allocations → picks → packages → package_items |
| **Tracking** | receivedQuantity | allocatedQuantity, pickedQuantity, shippedQuantity |
| **Physical Units** | Not tracked | Packages with barcodes |

## Missing Tables (Intentionally)

The following were in the original proposal but were excluded for valid reasons:

❌ **None** - All proposed tables have been implemented with enhancements

## Additional Considerations

### Future Enhancements

1. **Returns Management**
   - `sales_order_returns` table
   - `return_items` table
   - Reverse logistics

2. **Shipment Events**
   - `shipment_tracking_events` table
   - Real-time tracking updates
   - Integration with carrier APIs

3. **Shipping Cost Details**
   - `shipping_cost_details` table
   - Itemized cost breakdown
   - Currency support

4. **Multi-Shipment Orders**
   - Currently: 1 shipment per order (constraint)
   - Future: Remove constraint for partial shipments
   - Add `partial_shipment_allowed` flag

5. **Customer Portal**
   - Order tracking
   - Shipment notifications
   - Proof of delivery

## Conclusion

The schema is **comprehensive and production-ready** with:

✅ Full order-to-delivery lifecycle
✅ Multi-package support
✅ Transporter/carrier management  
✅ Internal & third-party shipping
✅ Batch/lot/serial traceability
✅ UUID-based architecture
✅ Multi-tenant isolation
✅ Database constraints for data integrity
✅ Denormalized fields for performance
✅ Proper indexes for scale

The schema follows the established project patterns and is ready for implementation.
