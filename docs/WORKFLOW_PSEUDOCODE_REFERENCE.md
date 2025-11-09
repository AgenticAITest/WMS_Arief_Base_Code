# WORKFLOW PSEUDOCODE REFERENCE

**Purpose:** Complete pseudocode/logic documentation for Purchase Order and Sales Order workflows
**Generated:** 2025-11-09
**Author:** Workflow Analysis Agent

---

## TABLE OF CONTENTS

1. [Workflow Engine Architecture](#workflow-engine-architecture)
2. [Purchase Order Workflow](#purchase-order-workflow)
3. [Sales Order Workflow](#sales-order-workflow)
4. [Document Generation System](#document-generation-system)
5. [Inventory Management Logic](#inventory-management-logic)
6. [Known Issues & Gaps](#known-issues--gaps)

---

## WORKFLOW ENGINE ARCHITECTURE

### Database Tables

```sql
-- Workflow definitions
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants,
  name VARCHAR(255),
  type VARCHAR(50),              -- 'PURCHASE_ORDER', 'SALES_ORDER'
  is_default BOOLEAN,             -- One default per type per tenant
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Workflow steps
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows ON DELETE CASCADE,
  step_key VARCHAR(50),           -- 'create', 'approve', 'receive', etc.
  step_name VARCHAR(255),         -- Display name
  step_order INTEGER,             -- Sequence order
  is_active BOOLEAN,
  is_initial BOOLEAN,             -- Starting step
  is_terminal BOOLEAN,            -- Ending step
  required_fields JSONB,          -- Field validation (not currently used)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Seeded Workflows

**Purchase Order Steps:**
```
1. create (initial)
2. approve
3. receive
4. putaway
5. complete (terminal)
```

**Sales Order Steps:**
```
1. create (initial)
2. allocate
3. pick
4. pack
5. ship
6. deliver
7. complete (terminal)
```

### State Transition Pattern

**Pseudocode used throughout:**
```javascript
FUNCTION transitionWorkflow(orderId, currentStepKey) {
  // 1. Fetch workflow configuration
  workflowSteps = SELECT stepKey, stepOrder
                  FROM workflow_steps
                  WHERE workflowId = (
                    SELECT id FROM workflows
                    WHERE tenantId = currentTenantId
                      AND type = orderType
                      AND isDefault = true
                      AND isActive = true
                  )
                  ORDER BY stepOrder ASC;

  // 2. Find current step index
  currentIndex = workflowSteps.findIndex(step => step.stepKey == currentStepKey);

  // 3. Get next step (or default if not found)
  IF (currentIndex >= 0 AND currentIndex + 1 < workflowSteps.length) {
    nextStepKey = workflowSteps[currentIndex + 1].stepKey;
  } ELSE {
    nextStepKey = DEFAULT_NEXT_STEP; // fallback
  }

  // 4. Return next step
  RETURN nextStepKey;
}
```

**Important:** Orders store `workflowState` as a VARCHAR containing the step key (not a foreign key reference).

---

## PURCHASE ORDER WORKFLOW

### Overview

**State Fields:**
- `status`: pending, approved, rejected, incomplete, received, completed
- `workflowState`: create, approve, receive, putaway, complete

**State Progression:**
```
CREATE (pending/approve)
  → APPROVE (approved/receive)
  → RECEIVE (received/putaway OR incomplete/receive)
  → PUTAWAY (received/putaway - no status change)
  → COMPLETE (❌ NOT IMPLEMENTED)
```

---

### STEP 1: CREATE PURCHASE ORDER

**Endpoint:** `POST /api/modules/purchase-order/orders`
**File:** `src/modules/purchase-order/server/routes/purchaseOrderRoutes.ts:1196-1524`

**Pseudocode:**

```javascript
FUNCTION createPurchaseOrder(requestData, userId, tenantId) {
  // === VALIDATION ===
  IF (!requestData.supplierId) THROW Error("Supplier required");
  IF (!requestData.warehouseId) THROW Error("Warehouse required");
  IF (!requestData.deliveryMethod IN ['delivery', 'pickup']) THROW Error("Invalid delivery method");
  IF (requestData.deliveryMethod == 'pickup' AND !requestData.supplierLocationId) {
    THROW Error("Supplier location required for pickup");
  }
  IF (!requestData.items OR requestData.items.length == 0) {
    THROW Error("At least one item required");
  }

  // === CALCULATE TOTALS ===
  totalAmount = SUM(items.map(item => item.orderedQuantity * item.unitCost));

  // === GENERATE DOCUMENT NUMBER ===
  docConfig = SELECT * FROM document_number_config WHERE documentType = 'PO' AND tenantId = tenantId;

  response = HTTP_POST("/api/modules/document-numbering/generate", {
    documentType: 'PO',
    prefix1: docConfig.prefix1Value,  // e.g., warehouse code
    prefix2: docConfig.prefix2Value   // e.g., category
  });

  orderNumber = response.orderNumber;         // e.g., "PO-2501-WH1-LOCAL-0001"
  documentHistoryId = response.documentHistoryId;

  // === DATABASE TRANSACTION BEGIN ===
  BEGIN TRANSACTION;

  TRY {
    // Create PO record
    poId = UUID();
    INSERT INTO purchase_orders VALUES (
      id: poId,
      tenantId: tenantId,
      orderNumber: orderNumber,
      supplierId: requestData.supplierId,
      supplierLocationId: requestData.supplierLocationId,
      warehouseId: requestData.warehouseId,
      deliveryMethod: requestData.deliveryMethod,
      status: 'pending',
      workflowState: 'approve',  // ← Goes directly to approve state
      orderDate: requestData.orderDate,
      expectedDeliveryDate: requestData.expectedDeliveryDate,
      totalAmount: totalAmount,
      notes: requestData.notes,
      createdBy: userId
    );

    // Update document history with actual PO ID
    HTTP_PUT("/api/modules/document-numbering/history/" + documentHistoryId, {
      documentId: poId
    });

    // Create PO items
    FOR EACH item IN requestData.items {
      itemId = UUID();
      INSERT INTO purchase_order_items VALUES (
        id: itemId,
        purchaseOrderId: poId,
        productId: item.productId,
        tenantId: tenantId,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: 0,  // ← Starts at zero
        unitCost: item.unitCost,
        totalCost: item.orderedQuantity * item.unitCost,
        expectedExpiryDate: item.expectedExpiryDate,
        notes: item.notes
      );
    }

    // Generate PO HTML document
    poData = {
      id: poId,
      tenantId: tenantId,
      orderNumber: orderNumber,
      orderDate: requestData.orderDate,
      expectedDeliveryDate: requestData.expectedDeliveryDate,
      deliveryMethod: requestData.deliveryMethod,
      totalAmount: totalAmount,
      notes: requestData.notes,
      supplierName: supplier.name,
      supplierEmail: supplier.email,
      supplierPhone: supplier.phone,
      locationAddress: location.address,
      warehouseName: warehouse.name,
      warehouseAddress: warehouse.address,
      createdByName: user.name,
      items: items  // with SKU, name, quantities, costs
    };

    result = PODocumentGenerator.generateAndSave(poData, userId);
    filePath = result.filePath;  // e.g., "storage/purchase-order/documents/tenants/{tid}/po/2025/PO-XXX.html"
    documentId = result.documentId;

    // Create audit log
    INSERT INTO audit_logs VALUES (
      tenantId: tenantId,
      userId: userId,
      module: 'purchase-order',
      action: 'create',
      resourceType: 'purchase_order',
      resourceId: poId,
      description: "Created purchase order " + orderNumber + " for supplier " + supplier.name,
      changedFields: {
        orderNumber: orderNumber,
        supplierId: requestData.supplierId,
        warehouseId: requestData.warehouseId,
        deliveryMethod: requestData.deliveryMethod,
        totalAmount: totalAmount,
        itemCount: items.length,
        status: 'pending',
        workflowState: 'approve'
      },
      documentPath: filePath,
      ipAddress: request.ipAddress,
      status: 'success'
    );

    COMMIT TRANSACTION;

    RETURN {
      success: true,
      data: { id: poId, orderNumber: orderNumber, status: 'pending', workflowState: 'approve' }
    };

  } CATCH (error) {
    ROLLBACK TRANSACTION;
    THROW error;
  }
}
```

**Database Changes:**
- ✅ `purchase_orders`: 1 new record (status=pending, workflowState=approve)
- ✅ `purchase_order_items`: N new records (receivedQuantity=0)
- ✅ `generated_documents`: 1 new record (PO HTML)
- ✅ `document_number_history`: 1 updated record
- ✅ `audit_logs`: 1 new record

**Documents Generated:**
- PO Document (HTML) at `storage/purchase-order/documents/tenants/{tid}/po/{year}/{orderNumber}.html`

---

### STEP 2: APPROVE PURCHASE ORDER

**Endpoint:** `POST /api/modules/purchase-order/orders/:id/approve`
**File:** `src/modules/purchase-order/server/routes/purchaseOrderRoutes.ts:2419-2502`

**Pseudocode:**

```javascript
FUNCTION approvePurchaseOrder(poId, userId, tenantId) {
  // === VALIDATION ===
  po = SELECT * FROM purchase_orders WHERE id = poId AND tenantId = tenantId;

  IF (!po) THROW Error("Purchase order not found");

  IF (po.status != 'pending' OR po.workflowState != 'approve') {
    THROW Error("Cannot approve purchase order: current status is " + po.status + "/" + po.workflowState);
  }

  // === DATABASE TRANSACTION BEGIN ===
  BEGIN TRANSACTION;

  TRY {
    // Update PO status
    UPDATE purchase_orders SET
      status = 'approved',
      workflowState = 'receive',  // ← Advances to receive state
      updatedAt = NOW(),
      updatedBy = userId
    WHERE id = poId;

    // Create audit log
    INSERT INTO audit_logs VALUES (
      tenantId: tenantId,
      userId: userId,
      module: 'purchase-order',
      action: 'approve',
      resourceType: 'purchase_order',
      resourceId: poId,
      description: "Approved purchase order " + po.orderNumber,
      previousState: 'pending/approve',
      newState: 'approved/receive',
      changedFields: {
        status: { from: 'pending', to: 'approved' },
        workflowState: { from: 'approve', to: 'receive' }
      },
      ipAddress: request.ipAddress,
      status: 'success'
    );

    COMMIT TRANSACTION;

    RETURN { success: true, message: "Purchase order approved successfully" };

  } CATCH (error) {
    ROLLBACK TRANSACTION;
    THROW error;
  }
}
```

**Alternative Path: REJECT**

```javascript
FUNCTION rejectPurchaseOrder(poId, userId, tenantId, reason) {
  // Validation same as approve

  UPDATE purchase_orders SET
    status = 'rejected',
    workflowState = 'create',  // ← Sends back to create state for rework
    updatedAt = NOW()
  WHERE id = poId;

  // Audit log with rejection reason
}
```

**Database Changes:**
- ✅ `purchase_orders`: status → approved, workflowState → receive
- ✅ `audit_logs`: 1 new record

**Documents Generated:** None (existing PO document remains valid)

---

### STEP 3: RECEIVE ITEMS (GRN Creation)

**Endpoint:** `POST /api/modules/purchase-order/receive/:id/submit`
**File:** `src/modules/purchase-order/server/routes/purchaseOrderRoutes.ts:3557-3895`

**Pseudocode:**

```javascript
FUNCTION receiveItems(poId, receivedItems, notes, userId, tenantId) {
  // === VALIDATION ===
  IF (!receivedItems OR receivedItems.length == 0) {
    THROW Error("Items array is required");
  }

  po = SELECT * FROM purchase_orders WHERE id = poId AND tenantId = tenantId;

  IF (!po) THROW Error("Purchase order not found");

  IF (po.workflowState != 'receive') {
    THROW Error("Cannot receive items: current workflow state is " + po.workflowState);
  }

  // === VALIDATE RECEIVED QUANTITIES ===
  FOR EACH receivedItem IN receivedItems {
    poItem = SELECT * FROM purchase_order_items WHERE id = receivedItem.poItemId;

    newTotal = poItem.receivedQuantity + receivedItem.receivedQuantity;

    IF (newTotal > poItem.orderedQuantity) {
      THROW Error("Cannot receive " + newTotal + " units. Ordered quantity is " + poItem.orderedQuantity);
    }
  }

  // === DATABASE TRANSACTION BEGIN ===
  BEGIN TRANSACTION;

  TRY {
    // Update received quantities (cumulative/denormalized)
    FOR EACH receivedItem IN receivedItems {
      UPDATE purchase_order_items SET
        receivedQuantity = receivedQuantity + receivedItem.receivedQuantity
      WHERE id = receivedItem.poItemId;
    }

    // Generate GRN document number
    response = HTTP_POST("/api/modules/document-numbering/generate", {
      documentType: 'GRN'
    });

    grnNumber = response.orderNumber;  // e.g., "GRN-2501-0001"

    // Fetch data for GRN document
    supplier = SELECT * FROM suppliers WHERE id = po.supplierId;
    warehouse = SELECT * FROM warehouses WHERE id = po.warehouseId;
    receiver = SELECT * FROM users WHERE id = userId;

    allItems = SELECT
                 poi.id,
                 p.sku AS productSku,
                 p.name AS productName,
                 poi.orderedQuantity,
                 poi.receivedQuantity,
                 poi.receivedQuantity - poi.orderedQuantity AS discrepancy
               FROM purchase_order_items poi
               JOIN products p ON poi.productId = p.id
               WHERE poi.purchaseOrderId = poId;

    // Build GRN items with current receipt data
    grnItems = [];
    FOR EACH receivedItem IN receivedItems {
      item = allItems.find(i => i.id == receivedItem.poItemId);
      grnItems.push({
        productSku: item.productSku,
        productName: item.productName,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: receivedItem.receivedQuantity,  // This receipt only
        discrepancy: receivedItem.receivedQuantity - item.orderedQuantity,
        expiryDate: receivedItem.expiryDate,
        discrepancyNote: receivedItem.discrepancyNote
      });
    }

    // Generate GRN HTML document
    grnData = {
      grnNumber: grnNumber,
      tenantId: tenantId,
      poNumber: po.orderNumber,
      poId: po.id,
      receiptDate: NOW(),
      receivedByName: receiver.name,
      supplierName: supplier.name,
      warehouseName: warehouse.name,
      warehouseAddress: warehouse.address,
      warehouseCity: warehouse.city,
      notes: notes,
      items: grnItems
    };

    grnHtml = GRNDocumentGenerator.generateHTML(grnData);

    // Save GRN HTML file
    year = YEAR(NOW());
    dirPath = "storage/purchase-order/documents/tenants/" + tenantId + "/grn/" + year;
    CREATE_DIRECTORY(dirPath);

    filePath = dirPath + "/" + grnNumber + ".html";
    WRITE_FILE(filePath, grnHtml);

    // Create receipt record
    receiptId = UUID();
    INSERT INTO purchase_orders_receipt VALUES (
      id: receiptId,
      purchaseOrderId: poId,
      grnDocumentId: NULL,  // ← Set later
      tenantId: tenantId,
      receivedBy: userId,
      notes: notes,
      putawayStatus: 'pending'  // ← Awaiting putaway
    );

    // Create GRN document record in generated_documents
    grnDocId = UUID();
    INSERT INTO generated_documents VALUES (
      id: grnDocId,
      tenantId: tenantId,
      documentType: 'goods_receipt_note',
      documentNumber: grnNumber,
      referenceType: 'purchase_order_receipt',  // ← Links to receipt, not PO
      referenceId: receiptId,
      files: {
        html: {
          path: filePath,
          size: FILE_SIZE(filePath),
          generated_at: NOW()
        }
      },
      version: 1,
      generatedBy: userId
    );

    // Update receipt with GRN document ID
    UPDATE purchase_orders_receipt SET
      grnDocumentId = grnDocId
    WHERE id = receiptId;

    // Create receipt items
    FOR EACH receivedItem IN receivedItems {
      INSERT INTO receipt_items VALUES (
        receiptId: receiptId,
        poItemId: receivedItem.poItemId,
        tenantId: tenantId,
        receivedQuantity: receivedItem.receivedQuantity,  // ← Quantity in THIS receipt
        expiryDate: receivedItem.expiryDate,
        discrepancyNote: receivedItem.discrepancyNote
      );
    }

    // Determine if PO is fully received
    allItems = SELECT * FROM purchase_order_items WHERE purchaseOrderId = poId;

    allFullyReceived = TRUE;
    FOR EACH item IN allItems {
      IF (item.receivedQuantity < item.orderedQuantity) {
        allFullyReceived = FALSE;
        BREAK;
      }
    }

    // Update PO status
    IF (allFullyReceived) {
      newStatus = 'received';
      newWorkflowState = 'putaway';
    } ELSE {
      newStatus = 'incomplete';
      newWorkflowState = 'receive';  // ← Stays in receive state
    }

    UPDATE purchase_orders SET
      status = newStatus,
      workflowState = newWorkflowState,
      updatedAt = NOW()
    WHERE id = poId;

    // Create audit log
    INSERT INTO audit_logs VALUES (
      tenantId: tenantId,
      userId: userId,
      module: 'purchase-order',
      action: 'receive',
      resourceType: 'receipt',
      resourceId: receiptId,
      description: "Created GRN " + grnNumber + " for PO " + po.orderNumber,
      previousState: po.status + '/' + po.workflowState,
      newState: newStatus + '/' + newWorkflowState,
      changedFields: {
        grnNumber: grnNumber,
        itemsReceived: receivedItems.length,
        status: { from: po.status, to: newStatus },
        workflowState: { from: po.workflowState, to: newWorkflowState }
      },
      documentPath: filePath,
      ipAddress: request.ipAddress,
      status: 'success'
    );

    COMMIT TRANSACTION;

    RETURN { success: true, grnNumber: grnNumber, receiptId: receiptId };

  } CATCH (error) {
    ROLLBACK TRANSACTION;
    THROW error;
  }
}
```

**Key Behaviors:**
- **Partial receipts supported**: If not all items fully received, PO stays in `incomplete/receive` state
- **Multiple GRNs possible**: Each receipt creates a new GRN document
- **Received quantities are cumulative**: `receivedQuantity` is denormalized in `purchase_order_items`
- **Inventory NOT created yet**: Items are received but not yet put away in bins

**Database Changes:**
- ✅ `purchase_order_items`: receivedQuantity updated (cumulative)
- ✅ `purchase_orders_receipt`: 1 new record (putawayStatus=pending)
- ✅ `receipt_items`: N new records (one per received item)
- ✅ `generated_documents`: 1 new record (GRN)
- ✅ `purchase_orders`: Status updated (received/incomplete), workflowState updated (putaway/receive)
- ✅ `audit_logs`: 1 new record

**Documents Generated:**
- GRN Document (HTML) at `storage/purchase-order/documents/tenants/{tid}/grn/{year}/{grnNumber}.html`

---

### STEP 4: PUTAWAY CONFIRMATION

**Endpoint:** `POST /api/modules/purchase-order/putaway/:id/confirm`
**File:** `src/modules/purchase-order/server/routes/purchaseOrderRoutes.ts:3279-3501`

**Pseudocode:**

```javascript
FUNCTION confirmPutaway(receiptId, binAssignments, userId, tenantId) {
  // === VALIDATION ===
  IF (!binAssignments OR binAssignments.length == 0) {
    THROW Error("Items array is required");
  }

  FOR EACH assignment IN binAssignments {
    IF (!assignment.binId) {
      THROW Error("All items must have bin locations assigned");
    }
  }

  // === FETCH RECEIPT DATA ===
  receipt = SELECT r.*, po.orderNumber, po.supplierId, po.warehouseId, gd.documentNumber AS grnNumber
            FROM purchase_orders_receipt r
            JOIN purchase_orders po ON r.purchaseOrderId = po.id
            LEFT JOIN generated_documents gd ON r.grnDocumentId = gd.id
            WHERE r.id = receiptId AND r.tenantId = tenantId;

  IF (!receipt) THROW Error("Receipt not found");

  IF (receipt.putawayStatus == 'completed') {
    THROW Error("Receipt has already been put away");
  }

  // === DATABASE TRANSACTION BEGIN ===
  BEGIN TRANSACTION;

  TRY {
    // Get receipt items
    receiptItems = SELECT ri.*, p.id AS productId, p.sku, p.name, poi.unitCost
                   FROM receipt_items ri
                   JOIN purchase_order_items poi ON ri.poItemId = poi.id
                   JOIN products p ON poi.productId = p.id
                   WHERE ri.receiptId = receiptId;

    // Get bin location details
    bins = SELECT b.id, b.code, s.name AS shelfName, a.name AS aisleName, z.name AS zoneName
           FROM bins b
           JOIN shelves s ON b.shelfId = s.id
           JOIN aisles a ON s.aisleId = a.id
           JOIN zones z ON a.zoneId = z.id
           WHERE b.id IN (binAssignments.map(a => a.binId));

    // CREATE INVENTORY ITEMS (PHYSICAL INVENTORY)
    inventoryRecords = [];
    FOR EACH assignment IN binAssignments {
      receiptItem = receiptItems.find(i => i.id == assignment.receiptItemId);

      inventoryId = UUID();
      INSERT INTO inventory_items VALUES (
        id: inventoryId,
        tenantId: tenantId,
        productId: receiptItem.productId,
        binId: assignment.binId,
        availableQuantity: receiptItem.receivedQuantity,  // ← From receipt
        reservedQuantity: 0,
        receivedDate: TODAY(),
        costPerUnit: receiptItem.unitCost,  // ← From PO for COGS tracking
        batchNumber: assignment.batchNumber,
        lotNumber: assignment.lotNumber,
        serialNumber: assignment.serialNumber,
        expiryDate: receiptItem.expiryDate
      );

      bin = bins.find(b => b.id == assignment.binId);
      locationPath = bin.zoneName + " > " + bin.aisleName + " > " + bin.shelfName + " > " + bin.code;

      inventoryRecords.push({
        productSku: receiptItem.sku,
        productName: receiptItem.name,
        quantity: receiptItem.receivedQuantity,
        binLocation: locationPath,
        batchNumber: assignment.batchNumber,
        lotNumber: assignment.lotNumber,
        expiryDate: receiptItem.expiryDate
      });
    }

    // Generate putaway document number
    response = HTTP_POST("/api/modules/document-numbering/generate", {
      documentType: 'PUTAWAY'
    });

    putawayNumber = response.orderNumber;  // e.g., "PUTAWAY-2501-0001"

    // Generate putaway HTML document
    putawayData = {
      putawayNumber: putawayNumber,
      tenantId: tenantId,
      grnNumber: receipt.grnNumber,
      poNumber: receipt.orderNumber,
      putawayDate: NOW(),
      putawayByName: user.name,
      supplierName: supplier.name,
      warehouseName: warehouse.name,
      items: inventoryRecords
    };

    putawayHtml = PutawayDocumentGenerator.generateHTML(putawayData);

    // Save putaway HTML file
    year = YEAR(NOW());
    dirPath = "storage/purchase-order/documents/tenants/" + tenantId + "/putaway/" + year;
    CREATE_DIRECTORY(dirPath);

    filePath = dirPath + "/" + putawayNumber + ".html";
    WRITE_FILE(filePath, putawayHtml);

    // Create putaway document record
    INSERT INTO generated_documents VALUES (
      tenantId: tenantId,
      documentType: 'putaway',
      documentNumber: putawayNumber,
      referenceType: 'purchase_order_receipt',
      referenceId: receiptId,
      files: {
        html: {
          path: filePath,
          size: FILE_SIZE(filePath),
          generated_at: NOW()
        }
      },
      version: 1,
      generatedBy: userId
    );

    // Update receipt status
    UPDATE purchase_orders_receipt SET
      putawayStatus = 'completed',
      updatedAt = NOW()
    WHERE id = receiptId;

    // Create audit log
    INSERT INTO audit_logs VALUES (
      tenantId: tenantId,
      userId: userId,
      module: 'purchase-order',
      action: 'putaway_confirm',
      resourceType: 'receipt',
      resourceId: receiptId,
      description: "Confirmed putaway " + putawayNumber + " for GRN " + receipt.grnNumber,
      changedFields: {
        putawayNumber: putawayNumber,
        itemsCount: binAssignments.length,
        putawayStatus: { from: 'pending', to: 'completed' }
      },
      documentPath: filePath,
      ipAddress: request.ipAddress,
      status: 'success'
    );

    COMMIT TRANSACTION;

    RETURN { success: true, putawayNumber: putawayNumber };

  } CATCH (error) {
    ROLLBACK TRANSACTION;
    THROW error;
  }
}
```

**⚠️ CRITICAL: THIS IS WHERE PHYSICAL INVENTORY IS CREATED**

When putaway is confirmed, actual `inventory_items` records are created with:
- `availableQuantity` = received quantity (ready for allocation)
- `reservedQuantity` = 0 (nothing allocated yet)
- Bin location assigned
- Cost per unit preserved from PO

**Database Changes:**
- ✅ `inventory_items`: N new records (PHYSICAL INVENTORY CREATED)
- ✅ `generated_documents`: 1 new record (Putaway document)
- ✅ `purchase_orders_receipt`: putawayStatus → completed
- ✅ `audit_logs`: 1 new record

**Documents Generated:**
- Putaway Document (HTML) at `storage/purchase-order/documents/tenants/{tid}/putaway/{year}/{putawayNumber}.html`

---

### STEP 5: COMPLETE (❌ NOT IMPLEMENTED)

**Expected Behavior:**
```javascript
FUNCTION completePurchaseOrder(poId, userId, tenantId) {
  // Verify all receipts are put away
  receipts = SELECT * FROM purchase_orders_receipt WHERE purchaseOrderId = poId;

  FOR EACH receipt IN receipts {
    IF (receipt.putawayStatus != 'completed') {
      THROW Error("Cannot complete PO: Not all receipts have been put away");
    }
  }

  // Update PO to completed
  UPDATE purchase_orders SET
    status = 'completed',
    workflowState = 'complete',
    updatedAt = NOW()
  WHERE id = poId;

  // Audit log
}
```

**Current Reality:**
- ❌ No endpoint exists for completion
- ❌ PO stays in `received/putaway` state indefinitely
- ❌ No automatic trigger after all receipts are put away

---

## SALES ORDER WORKFLOW

### Overview

**State Fields:**
- `status`: created, allocated, picked, packed, shipped, delivered, completed
- `workflowState`: create, allocate, pick, pack, ship, deliver, complete

**State Progression:**
```
CREATE (created/allocate)
  → ALLOCATE (allocated/pick)
  → PICK (picked/pack)
  → PACK (packed/ship)
  → SHIP (❌ NOT IMPLEMENTED)
  → DELIVER (❌ NOT IMPLEMENTED)
  → COMPLETE (❌ NOT IMPLEMENTED)
```

---

### STEP 1: CREATE SALES ORDER

**Endpoint:** `POST /api/modules/sales-order/sales-orders`
**File:** `src/modules/sales-order/server/routes/salesOrderRoutes.ts:246-556`

**Pseudocode:**

```javascript
FUNCTION createSalesOrder(requestData, userId, tenantId) {
  // === VALIDATION ===
  IF (!requestData.customerId) THROW Error("Customer required");
  IF (!requestData.orderDate) THROW Error("Order date required");
  IF (!requestData.items OR requestData.items.length == 0) {
    THROW Error("At least one item required");
  }

  // Validate multi-location delivery
  FOR EACH item IN requestData.items {
    IF (!item.locations OR item.locations.length == 0) {
      THROW Error("Each item must have at least one delivery location");
    }

    locationTotal = SUM(item.locations.map(loc => loc.quantity));
    IF (locationTotal != item.orderedQuantity) {
      THROW Error("Location quantities must sum to ordered quantity for item " + item.productId);
    }
  }

  // === CALCULATE TOTALS ===
  totalAmount = SUM(items.map(item => item.orderedQuantity * item.unitPrice));

  // === GENERATE DOCUMENT NUMBER ===
  response = HTTP_POST("/api/modules/document-numbering/generate", {
    documentType: 'SO'
  });

  orderNumber = response.orderNumber;  // e.g., "SO-2501-0001"
  documentHistoryId = response.documentHistoryId;

  // === DETERMINE WORKFLOW STATE ===
  workflowSteps = SELECT stepKey, stepOrder
                  FROM workflow_steps ws
                  JOIN workflows w ON ws.workflowId = w.id
                  WHERE w.tenantId = tenantId
                    AND w.type = 'SALES_ORDER'
                    AND w.isDefault = true
                    AND w.isActive = true
                  ORDER BY ws.stepOrder ASC;

  // Initial state is second step (after 'create')
  IF (workflowSteps.length >= 2) {
    initialWorkflowState = workflowSteps[1].stepKey;  // Usually 'allocate'
  } ELSE {
    initialWorkflowState = 'allocate';  // Default fallback
  }

  // === DATABASE TRANSACTION BEGIN ===
  BEGIN TRANSACTION;

  TRY {
    // Create sales order
    soId = UUID();
    INSERT INTO sales_orders VALUES (
      id: soId,
      tenantId: tenantId,
      orderNumber: orderNumber,
      customerId: requestData.customerId,
      shippingLocationId: requestData.shippingLocationId,
      shippingMethodId: requestData.shippingMethodId,
      orderDate: requestData.orderDate,
      requestedDeliveryDate: requestData.requestedDeliveryDate,
      totalAmount: totalAmount,
      status: 'created',
      workflowState: initialWorkflowState,  // Usually 'allocate'
      deliveryInstructions: requestData.deliveryInstructions,
      notes: requestData.notes,
      createdBy: userId
    );

    // Update document history
    HTTP_PUT("/api/modules/document-numbering/history/" + documentHistoryId, {
      documentId: soId
    });

    // Create sales order items
    lineNumber = 1;
    FOR EACH item IN requestData.items {
      itemId = UUID();
      INSERT INTO sales_order_items VALUES (
        id: itemId,
        salesOrderId: soId,
        lineNumber: lineNumber++,
        productId: item.productId,
        tenantId: tenantId,
        orderedQuantity: item.orderedQuantity,
        allocatedQuantity: 0,  // ← Starts at zero
        pickedQuantity: 0,     // ← Starts at zero
        unitPrice: item.unitPrice,
        totalPrice: item.orderedQuantity * item.unitPrice
      );

      // Create item locations (multi-location delivery support)
      FOR EACH location IN item.locations {
        INSERT INTO sales_order_item_locations VALUES (
          salesOrderItemId: itemId,
          customerLocationId: location.customerLocationId,
          tenantId: tenantId,
          quantity: location.quantity,
          deliveryNotes: location.deliveryNotes
        );
      }
    }

    COMMIT TRANSACTION;

  } CATCH (error) {
    ROLLBACK TRANSACTION;
    THROW error;
  }

  // === GENERATE SO DOCUMENT (outside transaction) ===
  soData = {
    id: soId,
    tenantId: tenantId,
    orderNumber: orderNumber,
    orderDate: requestData.orderDate,
    requestedDeliveryDate: requestData.requestedDeliveryDate,
    customerName: customer.name,
    customerEmail: customer.email,
    totalAmount: totalAmount,
    deliveryInstructions: requestData.deliveryInstructions,
    notes: requestData.notes,
    items: items  // with multi-location breakdown
  };

  result = SODocumentGenerator.generateAndSave(soData, userId);
  filePath = result.filePath;

  // === AUDIT LOG ===
  INSERT INTO audit_logs VALUES (
    tenantId: tenantId,
    userId: userId,
    module: 'sales-order',
    action: 'create',
    resourceType: 'sales_order',
    resourceId: soId,
    description: "Created sales order " + orderNumber + " for customer " + customer.name,
    changedFields: {
      orderNumber: orderNumber,
      customerId: requestData.customerId,
      totalAmount: totalAmount,
      itemCount: items.length,
      status: 'created',
      workflowState: initialWorkflowState
    },
    documentPath: filePath,
    ipAddress: request.ipAddress,
    status: 'success'
  );

  RETURN { success: true, data: { id: soId, orderNumber: orderNumber } };
}
```

**Key Features:**
- **Multi-location delivery**: Each item can be split across multiple customer locations
- **Location validation**: Sum of location quantities must equal ordered quantity
- **Workflow-driven initial state**: Fetches workflow config to determine starting state

**Database Changes:**
- ✅ `sales_orders`: 1 new record (status=created, workflowState=allocate)
- ✅ `sales_order_items`: N new records (allocatedQuantity=0, pickedQuantity=0)
- ✅ `sales_order_item_locations`: M new records (multi-location support)
- ✅ `generated_documents`: 1 new record (SO HTML)
- ✅ `document_number_history`: 1 updated record
- ✅ `audit_logs`: 1 new record

**Documents Generated:**
- SO Document (HTML) at `storage/sales-order/documents/tenants/{tid}/so/{year}/{orderNumber}.html`

---

### STEP 2: ALLOCATE INVENTORY (FEFO/FIFO)

**Endpoint:** `POST /api/modules/sales-order/allocations/:id/confirm`
**File:** `src/modules/sales-order/server/routes/salesOrderRoutes.ts:1004-1304`

**Pseudocode:**

```javascript
FUNCTION allocateInventory(soId, userId, tenantId) {
  // === VALIDATION ===
  so = SELECT * FROM sales_orders WHERE id = soId AND tenantId = tenantId;

  IF (!so) THROW Error("Sales order not found");

  IF (so.status != 'created' OR so.workflowState != 'allocate') {
    THROW Error("Cannot allocate: current status is " + so.status + "/" + so.workflowState);
  }

  soItems = SELECT * FROM sales_order_items WHERE salesOrderId = soId;

  IF (soItems.length == 0) THROW Error("Sales order has no items");

  // === DATABASE TRANSACTION BEGIN ===
  BEGIN TRANSACTION;

  TRY {
    allAllocations = [];

    // FEFO/FIFO INVENTORY ALLOCATION
    FOR EACH soItem IN soItems {
      remainingToAllocate = soItem.orderedQuantity;

      // Fetch available inventory using FEFO/FIFO ordering
      availableInventory = SELECT
                             id,
                             availableQuantity,
                             reservedQuantity,
                             expiryDate,
                             batchNumber,
                             lotNumber,
                             receivedDate,
                             createdAt
                           FROM inventory_items
                           WHERE tenantId = tenantId
                             AND productId = soItem.productId
                             AND availableQuantity > 0
                           ORDER BY
                             expiryDate ASC NULLS LAST,      -- FEFO: Earliest expiry first
                             receivedDate ASC NULLS LAST,    -- FIFO: Oldest received first
                             createdAt ASC                   -- Tiebreaker: oldest record
                           FOR UPDATE;  // Lock rows

      IF (availableInventory.length == 0) {
        ROLLBACK TRANSACTION;
        THROW Error("Insufficient inventory for product " + soItem.productId);
      }

      // Allocate from available inventory
      FOR EACH inventoryItem IN availableInventory {
        IF (remainingToAllocate <= 0) BREAK;

        allocateQty = MIN(remainingToAllocate, inventoryItem.availableQuantity);

        // Create allocation record
        allocationId = UUID();
        INSERT INTO sales_order_allocations VALUES (
          id: allocationId,
          salesOrderItemId: soItem.id,
          inventoryItemId: inventoryItem.id,
          tenantId: tenantId,
          allocatedQuantity: allocateQty,
          allocatedBy: userId
        );

        // Update inventory: reduce available, increase reserved
        UPDATE inventory_items SET
          availableQuantity = availableQuantity - allocateQty,
          reservedQuantity = reservedQuantity + allocateQty
        WHERE id = inventoryItem.id;

        allAllocations.push({
          inventoryItemId: inventoryItem.id,
          quantity: allocateQty,
          batchNumber: inventoryItem.batchNumber,
          lotNumber: inventoryItem.lotNumber,
          expiryDate: inventoryItem.expiryDate
        });

        remainingToAllocate -= allocateQty;
      }

      // Verify full allocation
      IF (remainingToAllocate > 0) {
        ROLLBACK TRANSACTION;
        THROW Error("Could not allocate full quantity. Short by " + remainingToAllocate + " units");
      }

      // Update SO item allocated quantity
      UPDATE sales_order_items SET
        allocatedQuantity = orderedQuantity
      WHERE id = soItem.id;
    }

    // Get next workflow step
    nextStep = transitionWorkflow(soId, 'allocate');  // Usually returns 'pick'

    // Update SO status
    UPDATE sales_orders SET
      status = 'allocated',
      workflowState = nextStep,  // Usually 'pick'
      updatedBy = userId,
      updatedAt = NOW()
    WHERE id = soId;

    COMMIT TRANSACTION;

  } CATCH (error) {
    ROLLBACK TRANSACTION;
    THROW error;
  }

  // === GENERATE ALLOCATION DOCUMENT (outside transaction) ===
  response = HTTP_POST("/api/modules/document-numbering/generate", {
    documentType: 'ALLOC'
  });

  allocationNumber = response.orderNumber;  // e.g., "ALLOC-2501-0001"

  // Fetch allocation details with bin locations
  allocDetails = SELECT
                   soa.allocatedQuantity,
                   ii.batchNumber,
                   ii.lotNumber,
                   ii.expiryDate,
                   b.code AS binCode,
                   s.name AS shelfName,
                   a.name AS aisleName,
                   z.name AS zoneName
                 FROM sales_order_allocations soa
                 JOIN inventory_items ii ON soa.inventoryItemId = ii.id
                 JOIN bins b ON ii.binId = b.id
                 JOIN shelves s ON b.shelfId = s.id
                 JOIN aisles a ON s.aisleId = a.id
                 JOIN zones z ON a.zoneId = z.id
                 WHERE soa.salesOrderItemId IN (soItems.map(i => i.id));

  allocData = {
    id: soId,
    tenantId: tenantId,
    allocationNumber: allocationNumber,
    orderNumber: so.orderNumber,
    orderDate: so.orderDate,
    customerName: customer.name,
    totalAmount: so.totalAmount,
    allocatedByName: user.name,
    items: [
      // For each SO item, include allocations with bin locations
    ]
  };

  result = AllocationDocumentGenerator.generateAndSave(allocData, userId);
  filePath = result.filePath;

  // === AUDIT LOG ===
  INSERT INTO audit_logs VALUES (
    action: 'allocate',
    description: "Allocated inventory for SO " + so.orderNumber,
    changedFields: {
      allocationNumber: allocationNumber,
      status: { from: 'created', to: 'allocated' },
      workflowState: { from: 'allocate', to: nextStep }
    },
    documentPath: filePath
  );

  RETURN { success: true, allocationNumber: allocationNumber };
}
```

**FEFO/FIFO Algorithm:**
```sql
ORDER BY
  expiry_date ASC NULLS LAST,      -- Items WITH expiry go first (earliest)
  received_date ASC NULLS LAST,    -- Items WITHOUT expiry go by received date
  created_at ASC                   -- Final tiebreaker
```

**Inventory State Change:**
```
Before Allocation:
  available_quantity = 100, reserved_quantity = 0

After Allocating 30 units:
  available_quantity = 70, reserved_quantity = 30

Total in system: 100 (unchanged)
```

**Database Changes:**
- ✅ `sales_order_allocations`: N new records (tracking which inventory allocated)
- ✅ `inventory_items`: availableQuantity ↓, reservedQuantity ↑
- ✅ `sales_order_items`: allocatedQuantity = orderedQuantity
- ✅ `sales_orders`: status → allocated, workflowState → pick
- ✅ `generated_documents`: 1 new record (ALLOC)
- ✅ `audit_logs`: 1 new record

**Documents Generated:**
- ALLOC Document (HTML) at `storage/sales-order/allocations/tenants/{tid}/{year}/{allocationNumber}.html`

---

### STEP 3: PICK INVENTORY

**Endpoint:** `POST /api/modules/sales-order/picks/:id/confirm`
**File:** `src/modules/sales-order/server/routes/salesOrderRoutes.ts:752-1002`

**Pseudocode:**

```javascript
FUNCTION confirmPick(soId, userId, tenantId) {
  // === VALIDATION ===
  so = SELECT * FROM sales_orders WHERE id = soId AND tenantId = tenantId;

  IF (!so) THROW Error("Sales order not found");

  IF (so.status != 'allocated' OR so.workflowState != 'pick') {
    THROW Error("Cannot pick: current status is " + so.status + "/" + so.workflowState);
  }

  soItems = SELECT * FROM sales_order_items WHERE salesOrderId = soId;

  // === DATABASE TRANSACTION BEGIN ===
  BEGIN TRANSACTION;

  TRY {
    allPicks = [];

    FOR EACH soItem IN soItems {
      // Get allocations for this item
      allocations = SELECT * FROM sales_order_allocations
                    WHERE salesOrderItemId = soItem.id;

      FOR EACH allocation IN allocations {
        // Get inventory details
        inventoryItem = SELECT ii.*,
                               b.code AS binCode,
                               s.name AS shelfName,
                               a.name AS aisleName,
                               z.name AS zoneName
                        FROM inventory_items ii
                        JOIN bins b ON ii.binId = b.id
                        JOIN shelves s ON b.shelfId = s.id
                        JOIN aisles a ON s.aisleId = a.id
                        JOIN zones z ON a.zoneId = z.id
                        WHERE ii.id = allocation.inventoryItemId;

        // Create pick record
        pickId = UUID();
        INSERT INTO sales_order_picks VALUES (
          id: pickId,
          salesOrderItemId: soItem.id,
          inventoryItemId: allocation.inventoryItemId,
          tenantId: tenantId,
          pickedQuantity: allocation.allocatedQuantity,  // Pick what was allocated
          pickedBy: userId,
          batchNumber: inventoryItem.batchNumber,
          lotNumber: inventoryItem.lotNumber
        );

        // Update inventory: reduce reserved quantity
        UPDATE inventory_items SET
          reservedQuantity = reservedQuantity - allocation.allocatedQuantity
        WHERE id = allocation.inventoryItemId;

        // ⚠️ IMPORTANT: availableQuantity is NOT reduced here!
        // It was already reduced during allocation

        locationPath = inventoryItem.zoneName + " > " +
                       inventoryItem.aisleName + " > " +
                       inventoryItem.shelfName + " > " +
                       inventoryItem.binCode;

        allPicks.push({
          productId: soItem.productId,
          quantity: allocation.allocatedQuantity,
          binLocation: locationPath,
          batchNumber: inventoryItem.batchNumber,
          lotNumber: inventoryItem.lotNumber,
          serialNumber: inventoryItem.serialNumber,
          expiryDate: inventoryItem.expiryDate
        });
      }

      // Update SO item picked quantity
      UPDATE sales_order_items SET
        pickedQuantity = allocatedQuantity
      WHERE id = soItem.id;
    }

    // Get next workflow step
    nextStep = transitionWorkflow(soId, 'pick');  // Usually returns 'pack'

    // Update SO status
    UPDATE sales_orders SET
      status = 'picked',
      workflowState = nextStep,  // Usually 'pack'
      updatedBy = userId,
      updatedAt = NOW()
    WHERE id = soId;

    COMMIT TRANSACTION;

  } CATCH (error) {
    ROLLBACK TRANSACTION;
    THROW error;
  }

  // === GENERATE PICK DOCUMENT (outside transaction) ===
  response = HTTP_POST("/api/modules/document-numbering/generate", {
    documentType: 'PICK'
  });

  pickNumber = response.orderNumber;  // e.g., "PICK-2501-0001"

  pickData = {
    id: soId,
    tenantId: tenantId,
    pickNumber: pickNumber,
    orderNumber: so.orderNumber,
    orderDate: so.orderDate,
    customerName: customer.name,
    pickedByName: user.name,
    items: allPicks  // with bin locations and batch/lot info
  };

  result = PickDocumentGenerator.save(pickData, userId);
  filePath = result.filePath;

  // === AUDIT LOG ===
  INSERT INTO audit_logs VALUES (
    action: 'pick',
    description: "Confirmed pick " + pickNumber + " for SO " + so.orderNumber,
    changedFields: {
      pickNumber: pickNumber,
      itemsPicked: allPicks.length,
      status: { from: 'allocated', to: 'picked' },
      workflowState: { from: 'pick', to: nextStep }
    },
    documentPath: filePath
  );

  RETURN { success: true, pickNumber: pickNumber };
}
```

**⚠️ CRITICAL INVENTORY STATE:**
```
After Allocation:
  available_quantity = 70, reserved_quantity = 30

After Picking 30 units:
  available_quantity = 70, reserved_quantity = 0

Total in system: 70

⚠️ THE 30 PICKED UNITS ARE IN LIMBO!
   - Not available (reduced during allocation)
   - Not reserved (released during pick)
   - NOT DEDUCTED FROM SYSTEM (should happen at ship - not implemented)
```

**Database Changes:**
- ✅ `sales_order_picks`: N new records (tracking picks with batch/lot/serial)
- ✅ `inventory_items`: reservedQuantity ↓ (available unchanged!)
- ✅ `sales_order_items`: pickedQuantity = allocatedQuantity
- ✅ `sales_orders`: status → picked, workflowState → pack
- ✅ `generated_documents`: 1 new record (PICK)
- ✅ `audit_logs`: 1 new record

**Documents Generated:**
- PICK Document (HTML) at `storage/sales-order/picks/tenants/{tid}/{year}/{pickNumber}.html`

---

### STEP 4: PACK INTO PACKAGES

**Endpoint (Step 4a):** `POST /api/modules/sales-order/packs/:id/packages`
**Endpoint (Step 4b):** `POST /api/modules/sales-order/packs/:id/confirm`
**File:** `src/modules/sales-order/server/routes/packRoutes.ts:243-519`

**Pseudocode - Create Packages:**

```javascript
FUNCTION createPackages(soId, packages, userId, tenantId) {
  // === VALIDATION ===
  so = SELECT * FROM sales_orders WHERE id = soId AND tenantId = tenantId;

  IF (!so) THROW Error("Sales order not found");

  IF (!packages OR packages.length == 0) {
    THROW Error("At least one package is required");
  }

  // === DATABASE TRANSACTION BEGIN ===
  BEGIN TRANSACTION;

  TRY {
    // Delete existing packages (allows re-packing)
    DELETE FROM packages WHERE salesOrderId = soId AND tenantId = tenantId;
    // (Cascades to package_items)

    // Create packages
    packageNumber = 1;
    FOR EACH pkg IN packages {
      packageId = "PKG-" + so.orderNumber + "-" + ZERO_PAD(packageNumber, 3);

      INSERT INTO packages VALUES (
        packageId: packageId,
        packageNumber: packageNumber,
        salesOrderId: soId,
        tenantId: tenantId,
        length: pkg.length,
        width: pkg.width,
        height: pkg.height,
        weight: pkg.weight,
        shipmentId: NULL  // Not shipped yet
      );

      // Create package items
      FOR EACH item IN pkg.items {
        INSERT INTO package_items VALUES (
          packageId: packageId,
          salesOrderItemId: item.salesOrderItemId,
          productId: item.productId,
          tenantId: tenantId,
          quantity: item.quantity
        );
      }

      packageNumber++;
    }

    COMMIT TRANSACTION;

    RETURN { success: true, packageCount: packages.length };

  } CATCH (error) {
    ROLLBACK TRANSACTION;
    THROW error;
  }
}
```

**Pseudocode - Confirm Packing:**

```javascript
FUNCTION confirmPacking(soId, userId, tenantId) {
  // === VALIDATION ===
  so = SELECT * FROM sales_orders WHERE id = soId AND tenantId = tenantId;

  IF (!so) THROW Error("Sales order not found");

  IF (so.status != 'picked' OR so.workflowState != 'pack') {
    THROW Error("Cannot pack: current status is " + so.status + "/" + so.workflowState);
  }

  packages = SELECT * FROM packages WHERE salesOrderId = soId;

  IF (packages.length == 0) {
    THROW Error("No packages found. Please create packages first");
  }

  // === DATABASE TRANSACTION BEGIN ===
  BEGIN TRANSACTION;

  TRY {
    // Get next workflow step
    nextStep = transitionWorkflow(soId, 'pack');  // Usually returns 'ship'

    // Update SO status
    UPDATE sales_orders SET
      status = 'packed',
      workflowState = nextStep,  // Usually 'ship'
      updatedBy = userId,
      updatedAt = NOW()
    WHERE id = soId;

    COMMIT TRANSACTION;

  } CATCH (error) {
    ROLLBACK TRANSACTION;
    THROW error;
  }

  // === GENERATE PACK DOCUMENT (outside transaction) ===
  response = HTTP_POST("/api/modules/document-numbering/generate", {
    documentType: 'PACK'
  });

  packNumber = response.orderNumber;  // e.g., "PACK-2501-0001"

  // Fetch package details
  packageDetails = SELECT p.*, pi.quantity, prod.sku, prod.name
                   FROM packages p
                   JOIN package_items pi ON p.packageId = pi.packageId
                   JOIN products prod ON pi.productId = prod.id
                   WHERE p.salesOrderId = soId;

  packData = {
    id: soId,
    tenantId: tenantId,
    packNumber: packNumber,
    orderNumber: so.orderNumber,
    orderDate: so.orderDate,
    customerName: customer.name,
    packedByName: user.name,
    packages: packageDetails  // with dimensions, weights, items
  };

  result = PackDocumentGenerator.save(packData, userId);
  filePath = result.filePath;

  // === AUDIT LOG ===
  INSERT INTO audit_logs VALUES (
    action: 'pack',
    description: "Confirmed packing " + packNumber + " for SO " + so.orderNumber,
    changedFields: {
      packNumber: packNumber,
      packageCount: packages.length,
      status: { from: 'picked', to: 'packed' },
      workflowState: { from: 'pack', to: nextStep }
    },
    documentPath: filePath
  );

  RETURN { success: true, packNumber: packNumber, packageCount: packages.length };
}
```

**Database Changes:**
- ✅ `packages`: N new records (or replaced if re-packing)
- ✅ `package_items`: M new records (items per package)
- ✅ `sales_orders`: status → packed, workflowState → ship
- ✅ `generated_documents`: 1 new record (PACK)
- ✅ `audit_logs`: 1 new record

**No Inventory Changes:** Packing does not affect inventory

**Documents Generated:**
- PACK Document (HTML) at `storage/sales-order/packs/tenants/{tid}/{year}/{packNumber}.html`

---

### STEP 5: SHIP (❌ NOT IMPLEMENTED)

**Current State:**
- Basic shipment CRUD exists in `shipmentRoutes.ts`
- UI page is placeholder

**Expected Implementation:**

```javascript
FUNCTION confirmShipment(soId, shipmentData, userId, tenantId) {
  // === VALIDATION ===
  so = SELECT * FROM sales_orders WHERE id = soId;

  IF (so.status != 'packed' OR so.workflowState != 'ship') {
    THROW Error("Cannot ship: current status is " + so.status);
  }

  packages = SELECT * FROM packages WHERE salesOrderId = soId;

  // === DATABASE TRANSACTION BEGIN ===
  BEGIN TRANSACTION;

  TRY {
    // Create shipment
    shipmentId = UUID();
    INSERT INTO shipments VALUES (
      id: shipmentId,
      tenantId: tenantId,
      salesOrderId: soId,
      transporterId: shipmentData.transporterId,
      trackingNumber: shipmentData.trackingNumber,
      shippedDate: NOW(),
      estimatedDeliveryDate: shipmentData.estimatedDeliveryDate
    );

    // Link packages to shipment
    UPDATE packages SET
      shipmentId = shipmentId
    WHERE salesOrderId = soId;

    // ⚠️ CRITICAL: DEDUCT INVENTORY
    picks = SELECT * FROM sales_order_picks WHERE salesOrderItemId IN (
      SELECT id FROM sales_order_items WHERE salesOrderId = soId
    );

    FOR EACH pick IN picks {
      // Finally deduct from available quantity
      UPDATE inventory_items SET
        availableQuantity = availableQuantity - pick.pickedQuantity
      WHERE id = pick.inventoryItemId;

      // ⚠️ THIS IS WHERE INVENTORY ACTUALLY LEAVES THE SYSTEM
    }

    // Get next workflow step
    nextStep = transitionWorkflow(soId, 'ship');  // Returns 'deliver'

    // Update SO status
    UPDATE sales_orders SET
      status = 'shipped',
      workflowState = nextStep,
      updatedBy = userId,
      updatedAt = NOW()
    WHERE id = soId;

    COMMIT TRANSACTION;

  } CATCH (error) {
    ROLLBACK TRANSACTION;
    THROW error;
  }

  // Generate SHIP document
  // Audit log

  RETURN { success: true, trackingNumber: shipmentData.trackingNumber };
}
```

**⚠️ MISSING CRITICAL LOGIC:**
```
Currently after pick:
  available_quantity = 70, reserved_quantity = 0, total = 70

SHOULD happen at ship:
  available_quantity = 70 - 30 = 40, total = 40

ACTUAL: Inventory never deducted! Gap in implementation.
```

---

### STEP 6: DELIVER (❌ NOT IMPLEMENTED)

**Expected Implementation:**

```javascript
FUNCTION confirmDelivery(soId, deliveryProof, userId, tenantId) {
  // Update delivery status
  UPDATE shipments SET
    actualDeliveryDate = NOW(),
    deliveryProof = deliveryProof
  WHERE salesOrderId = soId;

  // Get next workflow step
  nextStep = transitionWorkflow(soId, 'deliver');  // Returns 'complete'

  // Update SO status
  UPDATE sales_orders SET
    status = 'delivered',
    workflowState = nextStep
  WHERE id = soId;

  // Audit log
}
```

---

### STEP 7: COMPLETE (❌ NOT IMPLEMENTED)

**Expected Implementation:**

```javascript
FUNCTION completeSalesOrder(soId, userId, tenantId) {
  // Final validation
  // Update status to completed
  UPDATE sales_orders SET
    status = 'completed',
    workflowState = 'complete'
  WHERE id = soId;

  // Audit log
}
```

---

## DOCUMENT GENERATION SYSTEM

### Architecture

**Common Pattern:**
```javascript
CLASS DocumentGenerator {
  STATIC FUNCTION generateHTML(data) {
    // Build HTML string with embedded CSS
    RETURN htmlString;
  }

  STATIC ASYNC FUNCTION generateAndSave(data, userId, version = 1) {
    // 1. Create directory structure
    year = YEAR(data.date);
    dirPath = "storage/{module}/documents/tenants/{tenantId}/{docType}/{year}";
    CREATE_DIRECTORY(dirPath);

    // 2. Generate HTML content
    htmlContent = THIS.generateHTML(data);

    // 3. Write to file
    fileName = data.documentNumber + ".html";
    filePath = dirPath + "/" + fileName;
    WRITE_FILE(filePath, htmlContent);

    // 4. Record in database
    INSERT INTO generated_documents VALUES (
      tenantId: data.tenantId,
      documentType: docType,
      documentNumber: data.documentNumber,
      referenceType: referenceType,  // 'purchase_order', 'sales_order', etc.
      referenceId: data.id,
      files: {
        html: {
          path: relativePath,
          size: FILE_SIZE(filePath),
          generated_at: NOW()
        }
      },
      version: version,
      generatedBy: userId
    );

    RETURN { filePath: relativePath, documentId: documentId };
  }
}
```

### Storage Structure

```
storage/
├── purchase-order/
│   └── documents/
│       └── tenants/
│           └── {tenant-id}/
│               ├── po/
│               │   └── {year}/
│               │       └── PO-{number}.html
│               ├── grn/
│               │   └── {year}/
│               │       └── GRN-{number}.html
│               └── putaway/
│                   └── {year}/
│                       └── PUTAWAY-{number}.html
└── sales-order/
    ├── documents/
    │   └── tenants/
    │       └── {tenant-id}/
    │           └── so/
    │               └── {year}/
    │                   └── SO-{number}.html
    ├── allocations/
    │   └── tenants/
    │       └── {tenant-id}/
    │           └── {year}/
    │               └── ALLOC-{number}.html
    ├── picks/
    │   └── tenants/
    │       └── {tenant-id}/
    │           └── {year}/
    │               └── PICK-{number}.html
    └── packs/
        └── tenants/
            └── {tenant-id}/
                └── {year}/
                    └── PACK-{number}.html
```

### Document Types

| Document Type | Module | Trigger | Reference Type | Contents |
|--------------|--------|---------|----------------|----------|
| PO | purchase-order | PO creation | purchase_order | Order details, supplier, items, costs |
| GRN | purchase-order | Receipt submit | purchase_order_receipt | Receipt details, discrepancies, expiry |
| PUTAWAY | purchase-order | Putaway confirm | purchase_order_receipt | Bin locations, quantities |
| SO | sales-order | SO creation | sales_order | Order details, customer, items, prices |
| ALLOC | sales-order | Allocate confirm | sales_order | Allocated bins, batch/lot/expiry |
| PICK | sales-order | Pick confirm | sales_order | Pick locations, batch/lot/serial |
| PACK | sales-order | Pack confirm | sales_order | Package details, dimensions, contents |
| SHIP | sales-order | Ship confirm (NOT IMPL) | sales_order | Tracking, carrier, packages |

### HTML Document Features

All generated documents include:
- **Professional styling** with embedded CSS
- **Print-friendly** media queries
- **Responsive layout** (grid-based)
- **Branded header** with document type
- **Document metadata** (number, date, generated by)
- **Line item tables** with detailed breakdowns
- **Totals and summaries**
- **Notes sections**
- **Footer** with generation timestamp

---

## INVENTORY MANAGEMENT LOGIC

### Three-State Inventory Model

```javascript
STRUCTURE InventoryItem {
  id: UUID,
  tenantId: UUID,
  productId: UUID,
  binId: UUID,
  availableQuantity: INTEGER,  // Can be allocated to new orders
  reservedQuantity: INTEGER,   // Allocated but not yet shipped
  receivedDate: DATE,
  costPerUnit: DECIMAL,
  batchNumber: VARCHAR,
  lotNumber: VARCHAR,
  serialNumber: VARCHAR,
  expiryDate: DATE
}

INVARIANT: Physical quantity in bin = availableQuantity + reservedQuantity
```

### State Transitions

**Purchase Order Flow (Inbound):**
```
1. RECEIVE:
   - Inventory does NOT exist yet
   - GRN created, receipt recorded

2. PUTAWAY:
   availableQuantity = receivedQuantity
   reservedQuantity = 0
   → Inventory created and available for allocation
```

**Sales Order Flow (Outbound):**
```
1. ALLOCATE:
   availableQuantity = availableQuantity - allocatedQty
   reservedQuantity = reservedQuantity + allocatedQty
   → Inventory "soft locked" for this order

2. PICK:
   reservedQuantity = reservedQuantity - pickedQty
   → Reserved released, but NOT deducted!
   ⚠️ LIMBO STATE: Picked but not deducted

3. SHIP (NOT IMPLEMENTED):
   availableQuantity = availableQuantity - shippedQty
   → Finally deducted from system
```

### Current State Issues

**Problem: Inventory Deduction Gap**
```
Scenario:
- Start: available=100, reserved=0 (total=100)
- Allocate 30: available=70, reserved=30 (total=100) ✅
- Pick 30: available=70, reserved=0 (total=70) ⚠️
- Ship 30: (NOT IMPLEMENTED) ❌

Result: System shows 70 units, but 30 units were physically removed!
```

**Fix Required:**
```javascript
// In ship confirmation:
UPDATE inventory_items SET
  availableQuantity = availableQuantity - shippedQuantity
WHERE id IN (SELECT inventoryItemId FROM sales_order_picks WHERE ...)
```

---

## KNOWN ISSUES & GAPS

### Purchase Order Workflow

1. **No automatic PO completion**
   - **Issue:** After all receipts are put away, PO stays in `received/putaway` state
   - **Impact:** POs never reach `completed` state
   - **Fix:** Add endpoint `POST /orders/:id/complete` that:
     - Verifies all receipts have `putawayStatus='completed'`
     - Updates PO to `status='completed', workflowState='complete'`

2. **No validation of receipt vs ordered quantities**
   - **Issue:** Can receive more than ordered (over-receipt)
   - **Impact:** Inventory discrepancies
   - **Fix:** Already implemented (Line 3610 validation)

### Sales Order Workflow

1. **Inventory never deducted**
   - **Issue:** After pick, inventory is NOT removed from available quantity
   - **Impact:** System shows more inventory than physically exists
   - **Severity:** CRITICAL
   - **Fix:** Implement ship confirmation with:
     ```javascript
     UPDATE inventory_items SET
       availableQuantity = availableQuantity - pickedQuantity
     WHERE id IN (picked_inventory_items)
     ```

2. **Ship workflow not implemented**
   - **Issue:** No endpoint to create shipment and advance workflow
   - **Impact:** Cannot complete sales order workflow
   - **Status:** Basic shipment CRUD exists but not integrated with workflow
   - **Files:** `shipmentRoutes.ts`, `SalesOrderShip.tsx`

3. **Deliver workflow not implemented**
   - **Issue:** No delivery confirmation
   - **Impact:** Cannot track actual delivery dates
   - **Status:** UI placeholder exists
   - **File:** `SalesOrderDeliver.tsx`

4. **Complete workflow not implemented**
   - **Issue:** No final completion step
   - **Impact:** Orders stay in `delivered` state indefinitely

### Workflow Engine

1. **Hardcoded transitions**
   - **Issue:** Workflow state transitions are hardcoded in route handlers
   - **Impact:** Cannot easily change workflow sequence without code changes
   - **Enhancement:** Create centralized workflow service

2. **No conditional/branching workflows**
   - **Issue:** All workflows are linear sequences
   - **Impact:** Cannot implement approval workflows, conditional steps
   - **Enhancement:** Add workflow conditions to `workflow_steps`

3. **Required fields not validated**
   - **Issue:** `requiredFields` JSONB column exists but not used
   - **Impact:** Cannot enforce field requirements per step
   - **Enhancement:** Implement field validation in workflow service

### Document Generation

1. **No PDF support**
   - **Issue:** Only HTML documents generated
   - **Impact:** Cannot generate official PDF invoices/receipts
   - **Enhancement:** Add PDF generation library (puppeteer, html-pdf)

2. **No document regeneration UI**
   - **Issue:** `regenerateDocument()` function exists but no UI trigger
   - **Impact:** Cannot re-generate documents if data changes
   - **Enhancement:** Add "Regenerate Document" button in UI

### General

1. **No reversal/cancellation logic**
   - **Issue:** Cannot cancel allocations, picks, or shipments
   - **Impact:** If order is cancelled, inventory stays locked
   - **Enhancement:** Add reversal endpoints that:
     - Cancel allocations → restore `availableQuantity`, reduce `reservedQuantity`
     - Cancel picks → restore `reservedQuantity`

2. **No partial pick/pack support**
   - **Issue:** Must pick/pack full allocated quantity
   - **Impact:** Cannot handle situations where full quantity unavailable during pick
   - **Enhancement:** Allow partial pick quantities with workflow branching

---

## SUMMARY

### Purchase Order Workflow Summary

```
CREATE (pending/approve)
  ↓ [Generate PO document]
APPROVE (approved/receive)
  ↓ [No document]
RECEIVE (received/putaway OR incomplete/receive)
  ↓ [Generate GRN document]
PUTAWAY (received/putaway)
  ↓ [Generate Putaway document, CREATE INVENTORY]
COMPLETE (❌ NOT IMPLEMENTED)
```

**Documents:** PO → GRN → PUTAWAY
**Inventory Created:** At putaway

### Sales Order Workflow Summary

```
CREATE (created/allocate)
  ↓ [Generate SO document]
ALLOCATE (allocated/pick)
  ↓ [Generate ALLOC document, RESERVE INVENTORY]
PICK (picked/pack)
  ↓ [Generate PICK document, RELEASE RESERVE]
PACK (packed/ship)
  ↓ [Generate PACK document]
SHIP (❌ NOT IMPLEMENTED - should DEDUCT INVENTORY)
  ↓
DELIVER (❌ NOT IMPLEMENTED)
  ↓
COMPLETE (❌ NOT IMPLEMENTED)
```

**Documents:** SO → ALLOC → PICK → PACK → (SHIP)
**Inventory Deducted:** ❌ NEVER (critical gap!)

---

**End of Document**
