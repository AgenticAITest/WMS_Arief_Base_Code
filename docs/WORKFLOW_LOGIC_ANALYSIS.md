# WORKFLOW LOGIC ANALYSIS - ISSUE TRACKER

**Last Updated:** 2025-11-09  
**Analysis Type:** Deep logic and consistency review  
**Scope:** Purchase Order and Sales Order workflows  
**Implementation Status:** PO (create → putaway), SO (create → pack) ✅ COMPLETE | SO (ship, deliver) ⚠️ NOT IMPLEMENTED

---

## EXECUTIVE SUMMARY

This document categorizes issues found in the warehouse management system workflows into three distinct sections:

1. **ACTUAL BUGS** - Issues in completed/implemented features that need fixing
2. **INCOMPLETE FEATURES** - Planned but not yet implemented functionality
3. **DESIGN IMPROVEMENTS** - Enhancements to improve robustness, performance, and maintainability

### Issue Count Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Actual Bugs (Completed Features) | 4 | 6 | 8 | 3 | 21 |
| Incomplete Features | 0 | 3 | 0 | 0 | 3 |
| Design Improvements | 3 | 5 | 7 | 5 | 20 |
| **TOTAL** | **7** | **14** | **15** | **8** | **44** |

### Implementation Status

**✅ COMPLETED WORKFLOWS:**
- Purchase Order: Create → Approve → Receive → Putaway
- Sales Order: Create → Allocate → Pick → Pack

**⚠️ NOT YET IMPLEMENTED:**
- Purchase Order: Complete (terminal state)
- Sales Order: Ship, Deliver, Complete (terminal states)

---

## SECTION 1: ACTUAL BUGS IN COMPLETED FEATURES

These are real bugs in features that have already been implemented and are currently in use.

---

### 🔴 CRITICAL BUGS

#### BUG #ACTUAL-01: Putaway Cannot Split Quantities Across Multiple Bins
**Severity:** 🔴 CRITICAL - Data Duplication Risk  
**Module:** Purchase Order (Putaway)  
**File:** `purchaseOrderRoutes.ts:3370-3378`  
**Status:** ⚠️ **VERIFIED - Current implementation only supports 1:1 receipt-to-bin mapping**

**Problem:**  
The putaway UI and backend do not support splitting a single receipt item's quantity across multiple bins. Each receipt item can only be assigned to ONE bin, receiving the FULL quantity.

**Current Limitation:**
- Receive 100 units of Product A
- Can only assign to ONE bin (gets all 100 units)
- Cannot split: 60 units → Bin-1, 40 units → Bin-2

**Impact:**
- Warehouse operations less flexible
- Large quantities cannot be distributed optimally
- Bin capacity constraints may be violated

**Note:** This is a feature limitation, not a duplication bug. The system correctly assigns the full quantity to a single bin.

---

#### BUG #ACTUAL-02: Batch/Lot/Serial Numbers Never Captured During Putaway
**Severity:** 🔴 CRITICAL - Feature Broken  
**Module:** Purchase Order (Putaway)  
**File:** `purchaseOrderRoutes.ts:3370-3378`  
**Status:** ⚠️ **VERIFIED - Fields exist in schema but are never populated**

**Problem:**  
Inventory schema has `batchNumber`, `lotNumber`, `serialNumber` fields, but putaway process never captures or stores them.

```typescript
// Current implementation - creates inventory WITHOUT batch tracking
await tx.insert(inventoryItems).values({
  tenantId,
  productId: receiptItemData.poItem!.productId,
  binId: putawayItem.binId,
  availableQuantity: receiptItemData.receiptItem.receivedQuantity,
  reservedQuantity: 0,
  receivedDate: new Date(),
  costPerUnit: receiptItemData.poItem!.unitCost,
  // ❌ MISSING: batchNumber, lotNumber, serialNumber
});
```

**Impact:**
- Cannot track batches or lots
- FEFO allocation cannot distinguish between batches
- Regulatory compliance broken (pharma, food industries)
- Serial number tracking impossible

**Fix Required:** Add batch/lot/serial input fields to putaway UI and capture in backend.

---

#### BUG #ACTUAL-03: Allocation SQL Query Error - Wrong Array Syntax
**Severity:** 🔴 CRITICAL - Runtime Crash  
**Module:** Sales Order (Allocation)  
**File:** `salesOrderRoutes.ts:1223`  
**Status:** ✅ **FIXED - Changed to IN operator**

**Problem:**  
Code used `WHERE ii.id = ANY(${inventoryItemIds})` which fails with Drizzle ORM template literals.

**Fixed Code:**
```typescript
WHERE ii.id IN ${inventoryItemIds}  // ✅ Correct syntax
```

**Impact:** Allocation document generation was crashing with SQL syntax error.

---

#### BUG #ACTUAL-04: No Row Locking During Allocation - Race Condition
**Severity:** 🔴 CRITICAL - Concurrency Bug  
**Module:** Sales Order (Allocation)  
**File:** `salesOrderRoutes.ts:1024-1085`  
**Status:** ⚠️ **VERIFIED - No FOR UPDATE locks present**

**Problem:**  
No pessimistic locking during allocation. Concurrent allocation requests can both read the same inventory and double-allocate.

```typescript
// Missing FOR UPDATE locks
const [so] = await db
  .select()
  .from(salesOrders)
  .where(...)
  .limit(1);
// ❌ Should use: .for('update')

const availableInventory = await tx.execute(sql`
  SELECT ... FROM inventory_items
  WHERE ... AND available_quantity > 0
`);
// ❌ Should use: FOR UPDATE
```

**Scenario:**
1. Request A reads inventory: 100 available
2. Request B reads inventory: 100 available (concurrent)
3. Both allocate 50 units
4. Result: 100 units double-allocated, inventory goes negative

**Fix Required:** Add `FOR UPDATE` locks on critical reads within transaction.

---

### 🟡 HIGH PRIORITY BUGS

#### BUG #ACTUAL-05: Document Number Generation Outside Transaction
**Severity:** 🟡 HIGH - Data Integrity  
**Module:** Purchase Order (Create), Sales Order (Allocation)  
**Files:** `purchaseOrderRoutes.ts:1261-1288`, `salesOrderRoutes.ts:1179-1186`

**Problem:**  
Document numbers are generated BEFORE database transaction starts. If transaction fails, the number is consumed but no record exists.

**Consequences:**
- Document number gaps (PO-001, PO-003, missing PO-002)
- Orphaned document history records
- Audit trail confusion

**Fix Required:** Move document number generation inside transaction or implement compensating transaction.

---

#### BUG #ACTUAL-06: Duplicate Items in Receipt Request Not Validated
**Severity:** 🟡 HIGH - Validation Gap  
**Module:** Purchase Order (Receive)  
**File:** `purchaseOrderRoutes.ts:3595`

**Problem:**  
No validation prevents submitting the same `itemId` multiple times in a single receipt request.

```typescript
// Malicious/buggy request - would add 100 total
{
  items: [
    { itemId: "abc-123", receivedQuantity: 50 },
    { itemId: "abc-123", receivedQuantity: 50 }  // DUPLICATE!
  ]
}
```

**Fix Required:** Add duplicate item ID detection before processing.

---

#### BUG #ACTUAL-07: GRN Document History Never Updated
**Severity:** 🟡 HIGH - Data Incomplete  
**Module:** Purchase Order (Receive)  
**File:** `purchaseOrderRoutes.ts:3629-3800`

**Problem:**  
GRN generation creates document number but never updates document history with actual receipt ID.

**Fix Required:** Add history update call after receipt creation.

---

#### BUG #ACTUAL-08: No Negative Quantity Protection at Database Level
**Severity:** 🟡 HIGH - Data Integrity  
**Module:** Inventory  
**File:** Schema definition

**Problem:**  
Schema has no CHECK constraints to prevent negative quantities.

```typescript
// Current schema - no protection
availableQuantity: integer('available_quantity').notNull(),
reservedQuantity: integer('reserved_quantity').default(0).notNull(),
// ❌ No CHECK (available_quantity >= 0)
// ❌ No CHECK (reserved_quantity >= 0)
```

**Fix Required:** Add CHECK constraints at database level.

---

#### BUG #ACTUAL-09: Pick Without Allocation Validation
**Severity:** 🟡 HIGH - Data Integrity  
**Module:** Sales Order (Pick)  
**File:** `pickRoutes.ts:73-111`

**Problem:**  
Simple pick creation endpoint doesn't verify allocations exist.

**Missing Validations:**
- Check allocation exists
- Check allocated quantity >= picked quantity
- Check inventory item was allocated to this SO

**Fix Required:** Add allocation verification before allowing pick creation.

---

#### BUG #ACTUAL-10: CASCADE Delete of Inventory Silently Removes Picks
**Severity:** 🟡 HIGH - Data Loss  
**Module:** Sales Order (Schema)  
**File:** `salesOrder.ts:172-174, 199`

**Problem:**  
Inconsistent foreign key behavior between allocations and picks.

```typescript
// Allocations - RESTRICT (default)
inventoryItemId: uuid('inventory_item_id')
  .notNull()
  .references(() => inventoryItems.id),

// Picks - CASCADE
inventoryItemId: uuid('inventory_item_id')
  .notNull()
  .references(() => inventoryItems.id, { onDelete: 'cascade' }),
```

**Fix Required:** Make behavior consistent (both RESTRICT).

---

### 🟢 MEDIUM PRIORITY BUGS

#### BUG #ACTUAL-11: Cannot Reject PO After Approval
**Severity:** 🟢 MEDIUM - Inflexible Workflow  
**Module:** Purchase Order (Approve/Reject)  
**File:** `purchaseOrderRoutes.ts:2442-2567`

Both approve and reject endpoints check for `status='pending' AND workflowState='approve'`. Once approved, cannot reject.

---

#### BUG #ACTUAL-12: Orphaned Inventory If PO Deleted
**Severity:** 🟢 MEDIUM - Data Integrity  
**Module:** Purchase Order (Schema)

Inventory items have NO foreign key to receipts or POs. If PO is deleted (cascade deletes receipts), inventory remains orphaned.

**Note:** No delete endpoint exists currently, so this is theoretical.

---

#### BUG #ACTUAL-13: Putaway Audit Log Missing State Transition Fields
**Severity:** 🟢 MEDIUM - Audit Inconsistency  
**Module:** Purchase Order (Putaway)  
**File:** `purchaseOrderRoutes.ts:3457-3468`

Putaway audit log doesn't include `previousState`, `newState`, or `changedFields` that other audit logs have.

---

#### BUG #ACTUAL-14: Allocation Ignores Customer Locations
**Severity:** 🟢 MEDIUM - Feature Incomplete  
**Module:** Sales Order (Allocation)  
**File:** `salesOrderRoutes.ts:1045-1176`

**Problem:**  
Allocation allocates total `orderedQuantity` but doesn't track which allocation goes to which customer location.

**Schema supports it:**
- `sales_order_item_locations` table exists ✅
- Validation ensures location quantities sum correctly ✅

**But allocation doesn't use it:**
- Cannot optimize picking by location
- Cannot generate location-specific pick lists
- Cannot track which items go to which delivery address

---

#### BUG #ACTUAL-15: FEFO Doesn't Check Product Expiry Tracking Flag
**Severity:** 🟢 MEDIUM - Optimization  
**Module:** Sales Order (Allocation)  
**File:** `salesOrderRoutes.ts:1067-1085`

FEFO ORDER BY applies to all products, even those without expiry tracking.

```sql
-- Current: sorts all products by expiry
ORDER BY expiry_date ASC NULLS LAST, received_date ASC NULLS LAST

-- Better: only sort by expiry if product tracks it
ORDER BY
  CASE WHEN p.has_expiry_date THEN ii.expiry_date END ASC NULLS LAST,
  ii.received_date ASC NULLS LAST
```

---

#### BUG #ACTUAL-16: Pick Quantity Assumes Full Allocation
**Severity:** 🟢 MEDIUM - Validation Gap  
**Module:** Sales Order (Pick)  
**File:** `salesOrderRoutes.ts:861-867`

Sets `pickedQuantity = allocatedQuantity` without verifying all allocations were actually picked.

---

#### BUG #ACTUAL-17: Picks Not Tracked Per Customer Location
**Severity:** 🟢 MEDIUM - Feature Incomplete  
**Module:** Sales Order (Pick)  
**File:** `salesOrder.ts:189-216`

Pick schema has no `customerLocationId` field. Cannot track which picked items go where for multi-drop deliveries.

---

#### BUG #ACTUAL-18: Status/WorkflowState Can Get Out of Sync
**Severity:** 🟢 MEDIUM - Maintainability  
**Module:** Both workflows

- `status` has enum constraint
- `workflowState` is just VARCHAR with NO enum
- Hardcoded fallbacks when workflow config missing

**Examples of fallbacks:**
- Line 316: `|| 'allocate'`
- Line 411: `|| 'ship'`
- Line 888: `|| 'pack'`

---

### 🔵 LOW PRIORITY BUGS

#### BUG #ACTUAL-19: Customer Deletion No Referential Integrity
**Severity:** 🔵 LOW  
**Module:** Sales Order (Schema)  
**File:** `salesOrder.ts:77-79`

No `onDelete` behavior specified. Attempting to delete customer with orders causes unclear FK violation.

---

#### BUG #ACTUAL-20: Package ID Regeneration Unique Constraint
**Severity:** 🔵 LOW  
**Module:** Sales Order (Pack)

Re-creating packages for same SO fails with "duplicate key" error instead of proper validation.

---

#### BUG #ACTUAL-21: No Bin Verification During Pick
**Severity:** 🔵 LOW  
**Module:** Sales Order (Pick)

No barcode scanning or verification that warehouse worker picked from correct bin.

---

### ✅ VERIFIED CORRECT IN COMPLETED FEATURES

1. **Received quantity cumulative tracking** ✅
2. **Over-receipt validation** ✅
3. **Transaction rollback on document generation failure** ✅
4. **Duplicate putaway prevention** ✅
5. **Cost per unit preservation** ✅
6. **Edit restrictions after allocation** ✅
7. **Audit trail previous/new state tracking** ✅
8. **Multi-bin allocation logic** ✅
9. **Transaction usage for atomicity** ✅
10. **Edit/delete after allocation prevented** ✅
11. **Package existence check before pack confirmation** ✅
12. **Multi-location quantity validation on SO creation** ✅

---

## SECTION 2: INCOMPLETE FEATURES

These are planned features that have not yet been implemented. They are NOT bugs - they are future development work.

---

### 🟡 HIGH PRIORITY - MISSING FEATURES

#### FEATURE #INCOMPLETE-01: Purchase Order Completion Endpoint
**Priority:** 🟡 HIGH - Workflow Incomplete  
**Module:** Purchase Order  
**Status:** ⚠️ NOT IMPLEMENTED

**Missing Functionality:**  
After all receipts are put away, PO remains in `received/putaway` state indefinitely. No endpoint exists to transition to `completed/complete`.

**Expected Implementation:**
```typescript
POST /orders/:id/complete
- Verify all receipts have putawayStatus='completed'
- Update PO to status='completed', workflowState='complete'
- Create audit log
```

---

#### FEATURE #INCOMPLETE-02: Sales Order Ship Confirmation
**Priority:** 🟡 HIGH - Critical for Inventory Accuracy  
**Module:** Sales Order  
**Status:** ⚠️ NOT IMPLEMENTED

**Missing Functionality:**  
Ship confirmation that deducts picked quantities from `availableQuantity` in inventory.

**Current Behavior:**
```typescript
// ALLOCATE - Moves from available to reserved ✅
availableQuantity = availableQuantity - allocatedQty
reservedQuantity = reservedQuantity + allocatedQty

// PICK - Releases from reserved ✅
reservedQuantity = reservedQuantity - pickedQty

// SHIP - Should deduct from available ❌ NOT IMPLEMENTED
// Missing: availableQuantity = availableQuantity - shippedQty
```

**Impact When Implemented:**  
Inventory will be accurately deducted when items physically leave the warehouse.

**Expected Implementation:**
```typescript
POST /sales-orders/:id/ship
- Verify status='packed' and workflow_state='ship'
- Create shipment record
- Deduct shipped quantities from inventory availableQuantity
- Update SO status to 'shipped', workflowState to 'deliver'
- Generate shipping document
```

---

#### FEATURE #INCOMPLETE-03: Sales Order Delivery Confirmation & Completion
**Priority:** 🟡 HIGH - Workflow Completion  
**Module:** Sales Order  
**Status:** ⚠️ NOT IMPLEMENTED

**Missing Functionality:**  
Delivery confirmation and final order completion.

**Expected Implementation:**
```typescript
POST /sales-orders/:id/deliver
- Verify status='shipped' and workflow_state='deliver'
- Record delivery confirmation
- Update SO status to 'delivered', workflowState to 'complete'
- Create audit log
```

---

### ⚠️ DEPENDENT FEATURES (Blocked by Ship/Deliver Implementation)

These features cannot be fully assessed until ship/deliver workflows are implemented:

1. **Allocation Cancellation** - Need to understand ship behavior to design proper rollback
2. **Partial Shipment Handling** - Depends on ship implementation
3. **Inventory Consolidation** - Need to see full inventory lifecycle first

---

## SECTION 3: DESIGN IMPROVEMENTS

These are enhancements to improve system robustness, performance, and maintainability.

---

### 🔴 CRITICAL IMPROVEMENTS

#### IMPROVEMENT #DESIGN-01: Add Idempotency Protection to Pick Confirmation
**Severity:** 🔴 CRITICAL - Prevents Data Corruption  
**Module:** Sales Order (Pick)  
**File:** `salesOrderRoutes.ts:794-868`

**Problem:**  
No idempotency protection. If pick endpoint called twice (network retry, double-click):
1. Creates duplicate pick records
2. Decrements `reservedQuantity` twice
3. Can drive inventory negative

**Recommendation:**
```typescript
// Add uniqueness constraint
CREATE UNIQUE INDEX idx_unique_pick 
ON sales_order_picks (sales_order_id, inventory_item_id, sales_order_item_id)
WHERE deleted_at IS NULL;

// Or check before processing
const existingPick = await db.select()
  .from(salesOrderPicks)
  .where(and(
    eq(salesOrderPicks.salesOrderId, soId),
    eq(salesOrderPicks.inventoryItemId, invItemId)
  ))
  .limit(1);

if (existingPick.length > 0) {
  return res.status(409).json({ error: 'Pick already confirmed' });
}
```

---

#### IMPROVEMENT #DESIGN-02: Validate Package Quantities Against Picked Quantities
**Severity:** 🔴 CRITICAL - Data Integrity  
**Module:** Sales Order (Pack)  
**File:** `packRoutes.ts:243-345`

**Problem:**  
No validation that sum of package item quantities equals picked quantities.

**Recommendation:**
```typescript
// Validate before creating packages
for (const soItem of soItems) {
  const totalPackaged = packagesData
    .flatMap(p => p.items)
    .filter(i => i.salesOrderItemId === soItem.id)
    .reduce((sum, i) => sum + i.quantity, 0);

  if (totalPackaged !== Number(soItem.pickedQuantity)) {
    throw new Error(
      `Item ${soItem.id}: packaged ${totalPackaged} but picked ${soItem.pickedQuantity}`
    );
  }
}
```

---

#### IMPROVEMENT #DESIGN-03: Add Total Quantity Invariant Validation
**Severity:** 🔴 CRITICAL - Data Integrity  
**Module:** Inventory

**Recommendation:**  
Add validation that `availableQuantity + reservedQuantity` equals expected total.

```typescript
// Periodic validation job
SELECT 
  product_id,
  bin_id,
  SUM(available_quantity) as total_available,
  SUM(reserved_quantity) as total_reserved
FROM inventory_items
GROUP BY product_id, bin_id
HAVING SUM(available_quantity) < 0 OR SUM(reserved_quantity) < 0;
```

---

### 🟡 HIGH PRIORITY IMPROVEMENTS

#### IMPROVEMENT #DESIGN-04: Add Allocation Cancellation Logic
**Severity:** 🟡 HIGH - Business Requirement  
**Module:** Sales Order (Allocation)

**Problem:**  
Once allocated, no way to cancel/rollback. If customer cancels order, inventory stays locked in `reservedQuantity`.

**Recommendation:**
```typescript
POST /allocations/:id/cancel
- Reverse: available += allocated, reserved -= allocated
- Delete allocation records
- Update SO status back to 'created'
- Create audit log
```

---

#### IMPROVEMENT #DESIGN-05: Implement Inventory Consolidation
**Severity:** 🟡 HIGH - Performance & Accuracy  
**Module:** Purchase Order (Putaway)

**Problem:**  
Multiple receipts create separate inventory records even for identical product/bin/batch combinations.

**Recommendation:**  
Before creating new inventory record, check for existing record with same:
- productId
- binId
- batchNumber (if tracked)
- lotNumber (if tracked)
- expiryDate (if within tolerance)

If found, increment quantity instead of creating new record.

---

#### IMPROVEMENT #DESIGN-06: Add Workflow State Machine Validation
**Severity:** 🟡 HIGH - Security & Data Integrity  
**Module:** Both workflows

**Problem:**  
Nothing prevents invalid transitions like `created → packed` (skipping steps).

**Recommendation:**
```typescript
const VALID_TRANSITIONS = {
  'created': ['allocate'],
  'allocate': ['pick'],
  'pick': ['pack'],
  'pack': ['ship'],
  'ship': ['deliver'],
  'deliver': ['complete']
};

function validateTransition(currentState, nextState) {
  if (!VALID_TRANSITIONS[currentState]?.includes(nextState)) {
    throw new Error(`Invalid transition: ${currentState} → ${nextState}`);
  }
}
```

---

#### IMPROVEMENT #DESIGN-07: Implement Cost Tracking for FIFO/LIFO
**Severity:** 🟡 HIGH - Financial Accuracy  
**Module:** Both workflows

**Problem:**  
Each inventory item stores `costPerUnit` from PO, but when allocated/picked, no mechanism tracks which cost basis was used for COGS calculation.

**Recommendation:**  
Add `costPerUnit` to allocation and pick tables to preserve cost basis for financial reporting.

---

#### IMPROVEMENT #DESIGN-08: Add Pick/Pack Idempotency
**Severity:** 🟡 HIGH - UX & Reliability  
**Module:** Sales Order (Pick, Pack)

**Problem:**  
If network timeout occurs during pick/pack, retry creates duplicate records.

**Recommendation:**  
Return existing record if operation already completed instead of failing.

---

### 🟢 MEDIUM PRIORITY IMPROVEMENTS

#### IMPROVEMENT #DESIGN-09: Package Re-creation Audit Trail
**Severity:** 🟢 MEDIUM - Audit Completeness  
**Module:** Sales Order (Pack)  
**File:** `packRoutes.ts:279-285`

**Recommendation:**
```typescript
// Before deletion
await db.delete(packages).where(...)
// Add: Create audit log entry tracking deletion reason and details
```

---

#### IMPROVEMENT #DESIGN-10: Add Partial Fulfillment Support
**Severity:** 🟢 MEDIUM - Business Flexibility  
**Module:** Sales Order (Allocation)

**Current:** All-or-nothing allocation. Cannot partially fulfill orders.

**Recommendation:**  
Allow allocation of available quantities and mark remaining as backordered.

---

#### IMPROVEMENT #DESIGN-11: Implement Batch Expiry Warnings
**Severity:** 🟢 MEDIUM - Operational Excellence  
**Module:** Inventory

**Recommendation:**  
Alert when inventory items are approaching expiry date (configurable threshold).

---

#### IMPROVEMENT #DESIGN-12: Add Multi-Location Pick Optimization
**Severity:** 🟢 MEDIUM - Operational Efficiency  
**Module:** Sales Order (Pick)

**Recommendation:**  
Optimize pick routes when SO has multiple customer delivery locations.

---

#### IMPROVEMENT #DESIGN-13: Improve Document Number Error Handling
**Severity:** 🟢 MEDIUM - Resilience  
**Module:** Document Numbering

**Recommendation:**  
Implement compensating transaction to release document number if main transaction fails.

---

#### IMPROVEMENT #DESIGN-14: Add Workflow Step Validation
**Severity:** 🟢 MEDIUM - Data Quality  
**Module:** Both workflows

**Recommendation:**  
Validate that workflow steps configuration is consistent before allowing order creation.

---

#### IMPROVEMENT #DESIGN-15: Optimize FEFO Query Performance
**Severity:** 🟢 MEDIUM - Performance  
**Module:** Sales Order (Allocation)

**Recommendation:**  
Add composite index on (productId, expiryDate, receivedDate) for FEFO queries.

---

### 🔵 LOW PRIORITY IMPROVEMENTS

#### IMPROVEMENT #DESIGN-16: Add Bin Barcode Verification
**Severity:** 🔵 LOW - Operational Accuracy  
**Module:** Sales Order (Pick)

**Recommendation:**  
Implement barcode scanning to verify correct bin during pick.

---

#### IMPROVEMENT #DESIGN-17: Enhanced Error Messages
**Severity:** 🔵 LOW - UX  
**Module:** All

**Recommendation:**  
Improve error messages to be more descriptive for troubleshooting.

---

#### IMPROVEMENT #DESIGN-18: Add Soft Delete for Packages
**Severity:** 🔵 LOW - Data Retention  
**Module:** Sales Order (Pack)

**Recommendation:**  
Use soft delete (deleted_at) instead of hard delete for packages.

---

#### IMPROVEMENT #DESIGN-19: Implement Pick List Optimization
**Severity:** 🔵 LOW - Operational Efficiency  
**Module:** Sales Order (Pick)

**Recommendation:**  
Generate optimized pick lists based on warehouse layout.

---

#### IMPROVEMENT #DESIGN-20: Add Inventory Reconciliation Reports
**Severity:** 🔵 LOW - Operational Visibility  
**Module:** Inventory

**Recommendation:**  
Periodic reports showing inventory discrepancies and anomalies.

---

## PRIORITY RECOMMENDATIONS

### Immediate Action Required (Before Ship/Deliver Implementation)

1. **BUG #ACTUAL-02** - Add batch/lot/serial capture to putaway ⚠️ BLOCKS FEFO
2. **BUG #ACTUAL-04** - Add FOR UPDATE locks to allocation ⚠️ DATA CORRUPTION RISK
3. **IMPROVEMENT #DESIGN-01** - Add pick idempotency protection ⚠️ DATA CORRUPTION RISK
4. **IMPROVEMENT #DESIGN-02** - Validate package quantities ⚠️ DATA CORRUPTION RISK

### Can Be Addressed Post-Ship Implementation

1. All other bugs and improvements
2. Inventory consolidation strategy
3. Allocation cancellation workflow
4. Multi-location optimizations

---

**End of Issue Tracker**
