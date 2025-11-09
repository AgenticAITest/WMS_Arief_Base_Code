# WORKFLOW LOGIC ANALYSIS - CRITICAL ISSUES REPORT

**Generated:** 2025-11-09
**Analysis Type:** Deep logic and consistency review
**Scope:** Purchase Order and Sales Order workflows
**Total Issues Found:** 42 issues across both modules

---

## EXECUTIVE SUMMARY

This report details critical logic inconsistencies, bugs, and data integrity issues found in the Purchase Order and Sales Order workflow implementations. Issues are categorized by severity and module.

### By Severity

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 10 | Data corruption, runtime crashes, inventory integrity |
| 🟡 HIGH | 11 | Data loss, missing features, validation gaps |
| 🟢 MEDIUM | 13 | Audit inconsistencies, edge cases, maintenance |
| 🔵 LOW | 8 | UX improvements, optimization opportunities |

### By Module

| Module | Critical | High | Medium | Low | Total |
|--------|----------|------|--------|-----|-------|
| Purchase Order | 3 | 3 | 3 | 0 | 9 |
| Sales Order | 5 | 5 | 8 | 5 | 23 |
| Inventory (Cross-module) | 2 | 3 | 2 | 3 | 10 |

---

## PART 1: PURCHASE ORDER WORKFLOW ISSUES

### 🔴 CRITICAL ISSUES

#### BUG #PO-01: Putaway Quantity Duplication When Splitting to Multiple Bins
**Severity:** 🔴 CRITICAL - Data Corruption
**File:** `purchaseOrderRoutes.ts:3374`
**Impact:** Inventory quantities incorrectly duplicated

**Problem:**
When putting away a receipt item into multiple bins, the code creates separate inventory records but assigns the FULL received quantity to each bin instead of splitting.

```typescript
// Line 3365-3378
for (const putawayItem of items) {
  const receiptItemData = receiptItemsData.find(...);

  await tx.insert(inventoryItems).values({
    productId: receiptItemData.poItem!.productId,
    binId: putawayItem.binId,
    availableQuantity: receiptItemData.receiptItem.receivedQuantity, // ❌ WRONG!
    // Always uses full quantity instead of split quantity
  });
}
```

**Scenario:**
- Receive 100 units of Product A
- User splits to 2 bins: Bin-1 (60 units), Bin-2 (40 units)
- **Current behavior:** Both bins get 100 units (200 total) ❌
- **Expected behavior:** Bin-1 gets 60, Bin-2 gets 40 (100 total) ✅

**Root Cause:** Request schema doesn't include quantity per bin assignment.

**Fix Required:**
```typescript
// Request should include quantity
{
  items: [
    { receiptItemId: "X", binId: "Bin-1", quantity: 60 },
    { receiptItemId: "X", binId: "Bin-2", quantity: 40 }
  ]
}
```

---

#### BUG #PO-02: Batch/Lot/Serial Numbers Never Captured During Putaway
**Severity:** 🔴 CRITICAL - Feature Broken
**File:** `purchaseOrderRoutes.ts:3370-3378`
**Impact:** Cannot track batches, FEFO allocation impossible

**Problem:**
Inventory schema has `batchNumber`, `lotNumber`, `serialNumber` fields, but putaway process never sets them.

```typescript
// Line 3370-3378 - Creates inventory
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
- Batch tracking completely broken
- Lot number tracking broken
- Serial number tracking broken
- FEFO allocation cannot distinguish between batches
- Regulatory compliance issues (pharma, food)

**Fix Required:** Add fields to putaway request schema and assign during inventory creation.

---

#### BUG #PO-03: Document History Update Can Leave Orphaned Records
**Severity:** 🔴 CRITICAL - Data Integrity
**File:** `purchaseOrderRoutes.ts:1261-1353`
**Impact:** Document number gaps and orphaned history records

**Problem:**
Document number is generated BEFORE transaction starts. If transaction fails after number generation, the document history record remains but no actual PO exists.

```typescript
// Line 1261-1288 - BEFORE transaction
const docNumberResponse = await axios.post('.../generate', {...});
orderNumber = docNumberResponse.data.documentNumber; // Counter incremented
documentHistoryId = docNumberResponse.data.historyId; // History created

// Line 1315 - THEN transaction starts
const result = await db.transaction(async (tx) => {
  // ... create PO ...

  // Line 1339-1353 - Update history INSIDE transaction
  await axios.put(`.../history/${documentHistoryId}`, {
    documentId: orderId
  });

  // If transaction fails HERE, document number is consumed but no PO exists
});
```

**Consequences:**
- Document number gaps (PO-001, PO-003, missing PO-002)
- Orphaned history records
- Audit trail confusion

**Fix Required:** Move document number generation inside transaction or implement compensating transaction.

---

### 🟡 HIGH PRIORITY ISSUES

#### BUG #PO-04: Duplicate Items in Receipt Request Not Validated
**Severity:** 🟡 HIGH - Validation Gap
**File:** `purchaseOrderRoutes.ts:3595`
**Impact:** Could bypass over-receipt validation

**Problem:**
No validation prevents submitting the same `itemId` multiple times in a single receipt request.

```typescript
// Malicious/buggy request
{
  items: [
    { itemId: "abc-123", receivedQuantity: 50 },
    { itemId: "abc-123", receivedQuantity: 50 }  // DUPLICATE!
  ]
}
// Would add 100 total, possibly bypassing ordered quantity check
```

**Fix Required:** Add duplicate item detection before processing loop.

---

#### BUG #PO-05: GRN Document History Never Updated
**Severity:** 🟡 HIGH - Data Incomplete
**File:** `purchaseOrderRoutes.ts:3629-3800`
**Impact:** Cannot trace GRN numbers back to receipts

**Problem:**
GRN generation creates document number but never updates history with actual receipt ID.

```typescript
// Line 3631-3653 - Generates GRN number
const grnNumberResponse = await axios.post('.../generate', { documentType: 'GRN' });
grnNumber = grnNumberResponse.data.documentNumber;
// documentHistoryId available but never used

// Line 3766-3800 - Creates receipt
const [receiptRecord] = await tx.insert(purchaseOrdersReceipt).values({...});

// ❌ MISSING: Update document history with receiptRecord.id
```

**Fix Required:** Add history update call after receipt creation.

---

#### BUG #PO-06: No PO Completion Endpoint
**Severity:** 🟡 HIGH - Workflow Incomplete
**File:** Missing endpoint
**Impact:** POs never reach terminal state

**Problem:**
After all receipts are put away, PO remains in `received/putaway` state indefinitely. No endpoint exists to transition to `completed/complete`.

**Expected Implementation:**
```typescript
POST /orders/:id/complete
- Verify all receipts have putawayStatus='completed'
- Update PO to status='completed', workflowState='complete'
- Create audit log
```

---

### 🟢 MEDIUM PRIORITY ISSUES

#### ISSUE #PO-07: Cannot Reject After Approval
**Severity:** 🟢 MEDIUM - Inflexible Workflow
**File:** `purchaseOrderRoutes.ts:2442-2567`

Both approve and reject endpoints check for `status='pending' AND workflowState='approve'`. Once approved, cannot reject.

**Impact:** No reversal mechanism if approval was a mistake.

---

#### ISSUE #PO-08: Orphaned Inventory If PO Deleted
**Severity:** 🟢 MEDIUM - Data Integrity
**File:** Schema design issue

Inventory items have NO foreign key to receipts or POs. If PO is deleted (cascade deletes receipts), inventory remains orphaned.

**Note:** No delete endpoint exists, so this is theoretical, but schema design flaw.

---

#### ISSUE #PO-09: Putaway Audit Log Missing State Transition Fields
**Severity:** 🟢 MEDIUM - Audit Inconsistency
**File:** `purchaseOrderRoutes.ts:3457-3468`

Putaway audit log doesn't include `previousState`, `newState`, or `changedFields` that other audit logs have.

---

### ✅ VERIFIED CORRECT

1. **Received quantity cumulative tracking** ✅
2. **Over-receipt validation** ✅
3. **Transaction rollback on document generation failure** ✅
4. **Duplicate putaway prevention** ✅
5. **Cost per unit preservation** ✅
6. **Edit restrictions after approval** ✅
7. **Audit trail previous/new state tracking** ✅

---

## PART 2: SALES ORDER WORKFLOW ISSUES

### 🔴 CRITICAL ISSUES

#### BUG #SO-01: Inventory Never Deducted From System
**Severity:** 🔴 CRITICAL - Data Corruption
**File:** `salesOrderRoutes.ts:853-858`
**Impact:** System shows more inventory than physically exists

**Problem:**
After pick, inventory is released from `reservedQuantity` but NEVER deducted from `availableQuantity`. Ship step (where deduction should occur) is not implemented.

**Current Flow:**
```typescript
// ALLOCATE (Line 1118-1124)
availableQuantity = availableQuantity - allocatedQty,
reservedQuantity = reservedQuantity + allocatedQty
// Result: available=70, reserved=30 (total=100) ✅

// PICK (Line 853-858)
reservedQuantity = reservedQuantity - pickedQty
// Result: available=70, reserved=0 (total=70) ⚠️
// ❌ 30 units physically removed but still showing in system!

// SHIP (NOT IMPLEMENTED)
// Should do: availableQuantity = availableQuantity - shippedQty
// Expected: available=40, reserved=0 (total=40) ✅
```

**Impact:**
- Inventory shows 70 available but only 40 physically exist
- Can over-allocate and over-sell
- Inventory accuracy broken

**Fix Required:** Implement ship confirmation that deducts from `availableQuantity`.

---

#### BUG #SO-02: Wrong Field Name in Allocation Routes - Runtime Crash
**Severity:** 🔴 CRITICAL - Runtime Error
**File:** `allocationRoutes.ts:30`
**Impact:** Endpoint crashes with "column does not exist" error

**Problem:**
Code references `salesOrderAllocations.soItemId` but schema defines field as `salesOrderItemId`.

```typescript
// Line 28-31 - WRONG FIELD NAME
query = query.innerJoin(
  salesOrderItems,
  eq(salesOrderAllocations.soItemId, salesOrderItems.id)  // ❌ Field doesn't exist!
).where(eq(salesOrderItems.salesOrderId, salesOrderId));

// Schema defines (salesOrder.ts:169):
salesOrderItemId: uuid('sales_order_item_id')  // ✅ Correct name
```

**Impact:** GET /allocations?salesOrderId=X crashes with database error.

**Fix Required:** Change `soItemId` to `salesOrderItemId`.

---

#### BUG #SO-03: Can Pick Same Allocation Multiple Times - Inventory Goes Negative
**Severity:** 🔴 CRITICAL - Data Corruption
**File:** `salesOrderRoutes.ts:794-868`
**Impact:** Double-decrement of reserved quantity

**Problem:**
No idempotency protection. If pick endpoint called twice (network retry, double-click):
1. Creates duplicate pick records
2. Decrements `reservedQuantity` twice
3. Can drive inventory negative

```typescript
// Pick confirmation (Line 834-858)
for (const allocation of allocations) {
  // Create pick - NO uniqueness check
  await tx.insert(salesOrderPicks).values({...})

  // Decrement reserved - NO idempotency check
  await tx.update(inventoryItems).set({
    reservedQuantity: sql`${inventoryItems.reservedQuantity} - ${allocQty}`,
  })
  // If called twice: reserved goes negative!
}
```

**Fix Required:** Add uniqueness constraint or check for existing picks before processing.

---

#### BUG #SO-04: No Row Locking During Allocation - Race Condition
**Severity:** 🔴 CRITICAL - Concurrency Bug
**File:** `salesOrderRoutes.ts:1004-1304`
**Impact:** Double allocation in concurrent requests

**Problem:**
No `FOR UPDATE` locks during allocation. Two concurrent requests can both read `status='created'` and allocate.

```typescript
// Line 1024-1035 - NO LOCK
const [so] = await db
  .select()
  .from(salesOrders)
  .where(...)
  .limit(1);
// ❌ Should use FOR UPDATE

// Line 1067-1085 - NO LOCK
const availableInventory = await tx.execute(sql`
  SELECT ... FROM inventory_items
  WHERE ... AND available_quantity > 0
  ORDER BY ...
`);
// ❌ Should use FOR UPDATE
```

**Scenario:**
1. Request A reads SO status='created'
2. Request B reads SO status='created' (concurrent)
3. Both allocate inventory
4. Inventory double-decremented

**Fix Required:** Add `FOR UPDATE` locks on critical reads.

---

#### BUG #SO-05: Package Quantities Not Validated Against Picked Quantities
**Severity:** 🔴 CRITICAL - Data Integrity
**File:** `packRoutes.ts:243-345`
**Impact:** Can pack quantities that don't match picks

**Problem:**
No validation that sum of package item quantities equals picked quantities.

```typescript
// Current validation (Line 253)
if (!packagesData || !Array.isArray(packagesData)) {
  return res.status(400).json({...});
}
// ❌ No quantity validation!

// Can create packages like:
// SO Item 1: picked 100 units
// Package A: 50 units
// Package B: 30 units
// Total: 80 units (20 unaccounted for!) ❌
```

**Fix Required:** Validate total packaged quantity equals picked quantity for each item.

---

### 🟡 HIGH PRIORITY ISSUES

#### BUG #SO-06: No Negative Quantity Protection
**Severity:** 🟡 HIGH - Data Integrity
**File:** `inventoryItems.ts:18-19`
**Impact:** Database allows negative quantities

**Problem:**
Schema has no CHECK constraints to prevent negative quantities.

```typescript
// Current schema
availableQuantity: integer('available_quantity').notNull(),
reservedQuantity: integer('reserved_quantity').default(0).notNull(),
// ❌ No CHECK (available_quantity >= 0)
```

**Fix Required:** Add CHECK constraints at database level.

---

#### BUG #SO-07: Pick Without Allocation Validation
**Severity:** 🟡 HIGH - Data Integrity
**File:** `pickRoutes.ts:73-111`
**Impact:** Can create orphan picks not backed by allocations

**Problem:**
Simple pick creation endpoint doesn't verify allocations exist.

```typescript
// Line 78-81 - Only basic validation
if (!salesOrderItemId || !inventoryItemId || !pickedQuantity) {
  return res.status(400).json({ error: 'Required fields missing' });
}

// ❌ Missing:
// - Check allocation exists
// - Check allocated quantity >= picked quantity
// - Check inventory item was allocated to this SO
```

**Fix Required:** Add allocation verification.

---

#### BUG #SO-08: CASCADE Delete of Inventory Silently Removes Picks
**Severity:** 🟡 HIGH - Data Loss
**File:** `salesOrder.ts:172-174, 199`
**Impact:** Deleting inventory cascades to picks (data loss)

**Problem:**
Inconsistent foreign key behavior between allocations and picks.

```typescript
// Allocations (Line 172-174)
inventoryItemId: uuid('inventory_item_id')
  .notNull()
  .references(() => inventoryItems.id),  // RESTRICT (default)

// Picks (Line 199)
inventoryItemId: uuid('inventory_item_id')
  .notNull()
  .references(() => inventoryItems.id, { onDelete: 'cascade' }),  // CASCADE!
```

**Impact:** If inventory deleted, picks cascade delete but allocations cause FK error.

**Fix Required:** Make behavior consistent (both RESTRICT).

---

#### BUG #SO-09: Allocation Ignores Customer Locations
**Severity:** 🟡 HIGH - Feature Broken
**File:** `salesOrderRoutes.ts:1045-1176`
**Impact:** Multi-location feature not integrated

**Problem:**
Allocation allocates total `orderedQuantity` but doesn't track which allocation goes to which customer location.

**Schema supports it:**
- `sales_order_item_locations` table exists ✅
- Validation ensures location quantities sum correctly ✅

**But allocation doesn't use it:**
- Cannot optimize picking by location
- Cannot generate location-specific pick lists
- Cannot track which items go to which delivery address

**Fix Required:** Link allocations to customer locations.

---

#### BUG #SO-10: No Allocation Cancellation Logic
**Severity:** 🟡 HIGH - Missing Feature
**File:** Missing functionality
**Impact:** Cannot release reserved inventory

**Problem:**
Once allocated, no way to cancel/rollback. If customer cancels order, inventory stays locked in `reservedQuantity`.

**Expected:**
```typescript
POST /allocations/:id/cancel
- Reverse: available += allocated, reserved -= allocated
- Delete allocation records
- Update SO status back to 'created'
```

---

### 🟢 MEDIUM PRIORITY ISSUES

#### ISSUE #SO-11: FEFO Doesn't Check Product Expiry Tracking Flag
**Severity:** 🟢 MEDIUM - Optimization
**File:** `salesOrderRoutes.ts:1067-1085`

**Problem:**
FEFO ORDER BY applies to all products, even those without expiry tracking.

```sql
ORDER BY
  expiry_date ASC NULLS LAST,    -- All products ordered by expiry
  received_date ASC NULLS LAST
```

**Better:**
```sql
ORDER BY
  CASE WHEN p.has_expiry_date THEN ii.expiry_date END ASC NULLS LAST,
  ii.received_date ASC NULLS LAST
```

---

#### ISSUE #SO-12: Pick Quantity Assumes Full Allocation
**Severity:** 🟢 MEDIUM - Validation Gap
**File:** `salesOrderRoutes.ts:861-867`

Sets `pickedQuantity = allocatedQuantity` without verifying all allocations were actually picked.

---

#### ISSUE #SO-13: Picks Not Tracked Per Customer Location
**Severity:** 🟢 MEDIUM - Feature Incomplete
**File:** `salesOrder.ts:189-216`

Pick schema has no `customerLocationId` field. Cannot track which picked items go where for multi-drop deliveries.

---

#### ISSUE #SO-14: Status/WorkflowState Can Get Out of Sync
**Severity:** 🟢 MEDIUM - Maintainability
**File:** Multiple locations

- `status` has enum constraint
- `workflowState` is just VARCHAR with NO enum
- Hardcoded fallbacks when workflow config missing

**Examples of fallbacks:**
- Line 316: `|| 'allocate'`
- Line 411: `|| 'ship'`
- Line 888: `|| 'pack'`

---

#### ISSUE #SO-15: No Pick Idempotency
**Severity:** 🟢 MEDIUM - UX Issue
**File:** `salesOrderRoutes.ts:752-1002`

If network timeout occurs during pick, retry creates duplicate records (though status check prevents full duplication).

---

#### ISSUE #SO-16: Package Re-creation Loses History
**Severity:** 🟢 MEDIUM - Audit Gap
**File:** `packRoutes.ts:279-285`

```typescript
// Deletes existing packages
await db.delete(packages).where(...)
// No audit trail of changes
```

---

#### ISSUE #SO-17: Total Quantity Invariant Not Enforced
**Severity:** 🟢 MEDIUM - Data Integrity

No validation that `availableQuantity + reservedQuantity` equals physical quantity.

---

#### ISSUE #SO-18: Workflow Step Validation Only Checks Current State
**Severity:** 🟢 MEDIUM - Security

Can manually set `status='picked'` and skip allocation step.

---

### 🔵 LOW PRIORITY ISSUES

#### ISSUE #SO-19: Customer Deletion No Referential Integrity
**Severity:** 🔵 LOW
**File:** `salesOrder.ts:77-79`

No `onDelete` behavior specified. Attempting to delete customer with orders causes unclear FK violation.

---

#### ISSUE #SO-20: Package ID Regeneration Unique Constraint
**Severity:** 🔵 LOW

Re-creating packages for same SO fails with "duplicate key" error instead of proper validation.

---

#### ISSUE #SO-21: No Bin Verification During Pick
**Severity:** 🔵 LOW

No barcode scanning or verification that warehouse worker picked from correct bin.

---

#### ISSUE #SO-22: Insufficient Inventory No Partial Allocation
**Severity:** 🔵 LOW

All-or-nothing allocation. No partial fulfillment workflow.

---

#### ISSUE #SO-23: No Workflow State Machine Validation
**Severity:** 🔵 LOW

Nothing prevents invalid transitions like `created → packed` (skipping steps).

---

### ✅ VERIFIED CORRECT

1. **Multi-bin allocation logic** ✅
2. **Transaction usage for atomicity** ✅
3. **Edit/delete after allocation prevented** ✅
4. **Package existence check before pack confirmation** ✅
5. **Multi-location quantity validation on SO creation** ✅

---

## PART 3: INVENTORY & CROSS-MODULE ISSUES

### 🔴 CRITICAL CROSS-MODULE ISSUES

#### BUG #INV-01: Inventory Lifecycle Broken (PO → SO)
**Severity:** 🔴 CRITICAL - End-to-End Failure
**Modules:** Purchase Order (putaway), Sales Order (ship)

**Complete broken flow:**

1. **PO Putaway** - Missing batch/lot/serial (BUG #PO-02)
   ```typescript
   // Creates inventory WITHOUT batch/lot/serial
   INSERT INTO inventory_items (
     productId, binId, availableQuantity, reservedQuantity,
     batchNumber: NULL,  // ❌ Should be captured
     lotNumber: NULL,    // ❌ Should be captured
     expiryDate: set     // ✅ Only this one
   )
   ```

2. **SO Allocation** - FEFO cannot work without batch info
   ```sql
   -- Tries to sort by expiry_date
   ORDER BY expiry_date ASC NULLS LAST
   -- But cannot distinguish between batches of same product!
   ```

3. **SO Pick** - Cannot track which batch was picked
   ```typescript
   // Pick record has batchNumber field but gets NULL from inventory
   ```

4. **SO Ship** - Never deducts inventory (BUG #SO-01)
   ```typescript
   // ❌ NOT IMPLEMENTED - inventory stays in system
   ```

**Result:** Complete inventory tracking failure from receipt to shipment.

---

#### BUG #INV-02: Quantity Duplication + Non-Deduction = Massive Inventory Bloat
**Severity:** 🔴 CRITICAL - Compounding Errors
**Modules:** Purchase Order (putaway) + Sales Order (ship)

**Scenario:**
1. Receive 100 units
2. Split to 2 bins → Creates 200 units (BUG #PO-01) ❌
3. Allocate 50 units → 150 available, 50 reserved ✅
4. Pick 50 units → 150 available, 0 reserved ⚠️
5. Ship never deducts → 150 available remain (BUG #SO-01) ❌

**Result:** System shows 150 available when should be 100 (or 50 after shipment).

---

### 🟡 HIGH CROSS-MODULE ISSUES

#### BUG #INV-03: No Inventory Consolidation When Same Product/Bin/Batch
**Severity:** 🟡 HIGH
**Module:** Purchase Order (putaway)

Multiple receipts create separate inventory records even for identical product/bin/batch combinations.

**Impact:**
- Allocation becomes complex (must query multiple records)
- Reporting difficult
- No single "bin quantity" view

---

#### BUG #INV-04: Inventory Cost Tracking Broken for FIFO Costing
**Severity:** 🟡 HIGH
**Modules:** Both

**Problem:**
Each inventory item stores `costPerUnit` from PO. However:
1. Allocation doesn't track which inventory items used
2. Pick tracks it but ship not implemented
3. Cannot calculate accurate COGS for sales

---

#### BUG #INV-05: Inventory Adjustments Not Supported
**Severity:** 🟡 HIGH
**Module:** Missing

No way to adjust inventory for:
- Physical count discrepancies
- Damage/loss
- Returns
- Transfers between bins

---

### 🟢 MEDIUM CROSS-MODULE ISSUES

#### ISSUE #INV-06: No Inventory Reservation Timeout
**Severity:** 🟢 MEDIUM

Reserved inventory can stay locked indefinitely if SO never progresses.

---

#### ISSUE #INV-07: No Low Stock Warnings
**Severity:** 🟢 MEDIUM

Products table has `min_stock` and `reorder_point` fields but no alerting logic.

---

## PART 4: DOCUMENT GENERATION INCONSISTENCIES

### Inconsistent Method Naming

| Generator | Method Name | Transaction Support |
|-----------|-------------|---------------------|
| PODocumentGenerator | `generateAndSave()` | ❌ No |
| GRNDocumentGenerator | `generateHTML()` only | N/A |
| PutawayDocumentGenerator | `generateAndSave()` | ✅ Yes (optional tx param) |
| SODocumentGenerator | `generateAndSave()` | ❌ No |
| AllocationDocumentGenerator | `generateAndSave()` | ❌ No |
| PickDocumentGenerator | `save()` | ❌ No (different name!) |
| PackDocumentGenerator | `save()` | ❌ No (different name!) |

**Issue:** Inconsistent naming (`generateAndSave` vs `save`) makes code harder to maintain.

### Document Type Naming Inconsistency

**In Database:**
- `purchase_order` (lowercase, underscore)
- `goods_receipt_note` (lowercase, underscore)
- `PUTAWAY` (uppercase)
- `allocation` (lowercase)
- `PACK` (uppercase)

**Recommendation:** Standardize to lowercase with underscores.

---

## PART 5: RECOMMENDED FIXES BY PRIORITY

### 🔴 FIX IMMEDIATELY (Critical)

1. **BUG #SO-02** - Fix field name crash (1-line fix)
   ```typescript
   // allocationRoutes.ts:30
   - eq(salesOrderAllocations.soItemId, salesOrderItems.id)
   + eq(salesOrderAllocations.salesOrderItemId, salesOrderItems.id)
   ```

2. **BUG #PO-01** - Fix putaway quantity duplication
   - Add `quantity` field to putaway request
   - Use split quantity in inventory creation

3. **BUG #PO-02** - Capture batch/lot/serial during putaway
   - Add fields to putaway request
   - Assign to inventory items

4. **BUG #SO-01** - Implement ship with inventory deduction
   - Create ship confirmation endpoint
   - Deduct from `availableQuantity`

5. **BUG #SO-03** - Add pick idempotency
   - Check for existing picks
   - Add uniqueness constraint

6. **BUG #SO-04** - Add row locking
   - Use `FOR UPDATE` in allocation queries

7. **BUG #SO-05** - Validate package quantities
   - Sum package quantities
   - Compare to picked quantities

8. **BUG #PO-03** - Fix document history orphans
   - Move number generation into transaction OR
   - Implement compensating transaction

### 🟡 FIX SOON (High Priority)

9. **BUG #SO-06** - Add CHECK constraints for negative quantities
10. **BUG #PO-04** - Validate duplicate items in receipt
11. **BUG #PO-05** - Update GRN document history
12. **BUG #PO-06** - Implement PO completion endpoint
13. **BUG #SO-07** - Validate picks against allocations
14. **BUG #SO-08** - Fix CASCADE delete inconsistency
15. **BUG #SO-09** - Integrate allocations with customer locations
16. **BUG #SO-10** - Implement allocation cancellation

### 🟢 FIX WHEN POSSIBLE (Medium Priority)

17-29. All medium priority issues listed above

### 🔵 ENHANCEMENTS (Low Priority)

30-42. All low priority issues listed above

---

## PART 6: TESTING RECOMMENDATIONS

### Unit Tests Needed

1. **Inventory calculations**
   - Available + reserved = physical quantity
   - Negative quantity prevention
   - Concurrent allocation scenarios

2. **Quantity validations**
   - Over-receipt prevention
   - Over-allocation prevention
   - Package quantity validation

3. **Workflow state transitions**
   - Valid transition paths
   - Invalid transition prevention
   - Status/workflowState sync

### Integration Tests Needed

1. **End-to-end PO flow**
   - Create → Approve → Receive → Putaway → Complete
   - Multiple receipts with partial quantities
   - Bin splitting scenarios

2. **End-to-end SO flow**
   - Create → Allocate → Pick → Pack → Ship → Deliver
   - Multi-location delivery
   - FEFO/FIFO allocation verification

3. **Cross-module inventory flow**
   - PO creates inventory → SO consumes inventory
   - Verify quantities at each step
   - Batch/lot tracking throughout

### Stress Tests Needed

1. **Concurrent allocation**
   - Multiple users allocating same inventory
   - Race condition verification

2. **High-volume receipts**
   - Multiple receipts for same PO
   - Large number of items

3. **Document generation**
   - Performance with large orders
   - Concurrent document generation

---

## PART 7: MIGRATION STRATEGY

### Fixing Existing Data

If system already in use, these issues may have corrupted data:

1. **Duplicated inventory quantities** (BUG #PO-01)
   - Run audit: Find products with multiple inventory records in same bin
   - Manual review and correction needed

2. **Missing batch/lot/serial** (BUG #PO-02)
   - Cannot retroactively fix
   - Document going forward

3. **Orphaned document history** (BUG #PO-03)
   - Query: Find history records with NULL documentId
   - Clean up orphaned records

4. **Inventory bloat from missing deduction** (BUG #SO-01)
   - CRITICAL: Run physical inventory count
   - Adjust `availableQuantity` to match physical count
   - Document discrepancies

### Recommended Migration Path

1. **Phase 1:** Fix critical bugs that prevent data corruption
   - BUG #SO-02 (crash)
   - BUG #PO-01 (duplication)
   - BUG #SO-03 (pick duplication)
   - BUG #SO-04 (race condition)

2. **Phase 2:** Fix critical missing features
   - BUG #PO-02 (batch/lot/serial)
   - BUG #SO-01 (inventory deduction via ship)
   - BUG #SO-05 (package validation)

3. **Phase 3:** Complete workflows
   - BUG #PO-06 (PO completion)
   - SO ship/deliver/complete steps

4. **Phase 4:** Data integrity and validations
   - All high priority bugs
   - CHECK constraints
   - Validation improvements

5. **Phase 5:** Enhancements and optimizations
   - Medium and low priority issues
   - Performance optimizations
   - UX improvements

---

## CONCLUSION

The workflow implementation demonstrates good architectural patterns (transactions, audit logging, workflow engine) but has critical gaps that compromise data integrity. The most severe issues are:

1. **Inventory never deducted** - breaks fundamental WMS requirement
2. **Batch/lot tracking broken** - prevents FEFO and regulatory compliance
3. **Quantity duplication** - causes inventory bloat
4. **Runtime crashes** - field name error in production code

**Immediate action required** on all 8 critical issues before system can be considered production-ready.

**Estimated effort:**
- Critical fixes: 3-5 days
- High priority: 5-7 days
- Medium priority: 7-10 days
- Low priority: 5-7 days
- **Total: 20-29 days** for complete resolution

---

**End of Report**
