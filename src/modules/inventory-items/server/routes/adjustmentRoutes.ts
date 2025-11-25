import express from 'express';
import { db } from '@server/lib/db';
import { adjustments, adjustmentItems } from '../lib/db/schemas/adjustment';
import { inventoryItems } from '../lib/db/schemas/inventoryItems';
import { cycleCounts } from '../lib/db/schemas/cycleCount';
import { products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { bins, shelves, aisles, zones, warehouses } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';
import { documentNumberConfig, generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';
import { generateDocumentNumber } from '@modules/document-numbering/server/services/documentNumberService';
import { authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, sql, or, inArray } from 'drizzle-orm';
import { logAudit, getClientIp } from '@server/services/auditService';
import { v4 as uuidv4 } from 'uuid';
import { AdjustmentDocumentGenerator } from '../services/adjustmentDocumentGenerator';
import { user } from '@server/lib/db/schema/system';

const router = express.Router();


/**
 * GET /api/modules/inventory-items/adjustments
 * List all adjustments with pagination
 */
router.get('/adjustments', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const statusParam = req.query.status as string;

    const whereConditions = [eq(adjustments.tenantId, tenantId)];

    // Add status filter if provided and valid
    if (statusParam) {
      const status = statusParam.trim().toLowerCase();
      const validStatuses = ['created', 'submitted', 'approved', 'rejected', 'applied'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
        });
      }
      whereConditions.push(eq(adjustments.status, status));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(adjustments)
      .where(and(...whereConditions));

    // Get paginated data
    const adjustmentsList = await db
      .select()
      .from(adjustments)
      .where(and(...whereConditions))
      .orderBy(desc(adjustments.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: adjustmentsList,
      pagination: {
        page,
        limit,
        total: totalResult?.count || 0,
        totalPages: Math.ceil((totalResult?.count || 0) / limit),
        hasNext: page < Math.ceil((totalResult?.count || 0) / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching adjustments:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/modules/inventory-items/adjustments/:id
 * Get adjustment details
 */
router.get('/adjustments/:id', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [adjustment] = await db
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.id, id), eq(adjustments.tenantId, tenantId)))
      .limit(1);

    if (!adjustment) {
      return res.status(404).json({
        success: false,
        message: 'Adjustment not found',
      });
    }

    res.json({
      success: true,
      data: adjustment,
    });
  } catch (error) {
    console.error('Error fetching adjustment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/modules/inventory-items/adjustments/:id/document
 * Get generated document path for an adjustment
 */
router.get('/adjustments/:id/document', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    // Verify adjustment belongs to tenant
    const [adjustment] = await db
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.id, id), eq(adjustments.tenantId, tenantId)))
      .limit(1);

    if (!adjustment) {
      return res.status(404).json({
        success: false,
        message: 'Adjustment not found',
      });
    }

    // Fetch document from generated_documents table
    const [document] = await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.tenantId, tenantId),
          eq(generatedDocuments.referenceType, 'adjustment'),
          eq(generatedDocuments.referenceId, id),
          eq(generatedDocuments.documentType, 'ADJUSTMENT')
        )
      )
      .limit(1);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found for this adjustment',
      });
    }

    // Extract HTML file path from files JSONB column
    const files = document.files as any;
    const documentPath = files?.html?.path || null;

    if (!documentPath) {
      return res.status(404).json({
        success: false,
        message: 'Document path not found',
      });
    }

    res.json({
      success: true,
      data: {
        documentPath,
        documentNumber: document.documentNumber,
        generatedAt: files?.html?.generated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching adjustment document:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/modules/inventory-items/adjustments/:id/items
 * Get adjustment items with pagination
 */
router.get('/adjustments/:id/items', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Verify adjustment belongs to tenant
    const [adjustment] = await db
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.id, id), eq(adjustments.tenantId, tenantId)))
      .limit(1);

    if (!adjustment) {
      return res.status(404).json({
        success: false,
        message: 'Adjustment not found',
      });
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(adjustmentItems)
      .where(eq(adjustmentItems.adjustmentId, id));

    // Get paginated items with full details
    const itemsData = await db
      .select({
        id: adjustmentItems.id,
        adjustmentId: adjustmentItems.adjustmentId,
        inventoryItemId: adjustmentItems.inventoryItemId,
        oldQuantity: adjustmentItems.oldQuantity,
        newQuantity: adjustmentItems.newQuantity,
        quantityDifference: adjustmentItems.quantityDifference,
        reasonCode: adjustmentItems.reasonCode,
        notes: adjustmentItems.notes,
        createdAt: adjustmentItems.createdAt,
        // Product details
        productId: products.id,
        productSku: products.sku,
        productName: products.name,
        // Bin details
        binId: bins.id,
        binName: bins.name,
        // Location hierarchy
        shelfName: shelves.name,
        aisleName: aisles.name,
        zoneName: zones.name,
        warehouseName: warehouses.name,
      })
      .from(adjustmentItems)
      .leftJoin(inventoryItems, eq(adjustmentItems.inventoryItemId, inventoryItems.id))
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .leftJoin(bins, eq(inventoryItems.binId, bins.id))
      .leftJoin(shelves, eq(bins.shelfId, shelves.id))
      .leftJoin(aisles, eq(shelves.aisleId, aisles.id))
      .leftJoin(zones, eq(aisles.zoneId, zones.id))
      .leftJoin(warehouses, eq(zones.warehouseId, warehouses.id))
      .where(eq(adjustmentItems.adjustmentId, id))
      .orderBy(adjustmentItems.createdAt)
      .limit(limit)
      .offset(offset);

    // Map to frontend-friendly format
    const items = itemsData.map((item) => {
      const locationParts = [item.warehouseName, item.zoneName, item.aisleName, item.shelfName].filter(Boolean);
      return {
        ...item,
        systemQuantity: item.oldQuantity,
        adjustedQuantity: item.newQuantity,
        location: locationParts.join(' → ') || '-',
        reasonCode: item.reasonCode || '',
        notes: item.notes || '',
      };
    });

    res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total: totalResult?.count || 0,
        totalPages: Math.ceil((totalResult?.count || 0) / limit),
        hasNext: page < Math.ceil((totalResult?.count || 0) / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching adjustment items:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/modules/inventory-items/adjustments
 * Create a new inventory adjustment and apply it immediately
 */
router.post('/adjustments', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { notes, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one adjustment item is required',
      });
    }

    // Validate items structure
    for (const item of items) {
      if (!item.inventoryItemId || item.newQuantity === undefined || !item.reasonCode) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have inventoryItemId, newQuantity, and reasonCode',
        });
      }
      if (item.newQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'New quantity cannot be negative',
        });
      }
    }

    // Fetch document numbering configuration
    const [docConfig] = await db
      .select()
      .from(documentNumberConfig)
      .where(
        and(
          eq(documentNumberConfig.tenantId, tenantId),
          eq(documentNumberConfig.documentType, 'STOCKADJ'),
          eq(documentNumberConfig.isActive, true)
        )
      )
      .limit(1);

    if (!docConfig) {
      return res.status(500).json({
        success: false,
        message: 'Document numbering configuration not found for STOCKADJ',
      });
    }

    // Generate adjustment number via document numbering service
    let adjustmentNumber: string;
    let documentHistoryId: string;
    
    try {
      const docNumberResult = await generateDocumentNumber({
        tenantId,
        documentType: 'STOCKADJ',
        prefix1: docConfig.prefix1DefaultValue || null,
        prefix2: docConfig.prefix2DefaultValue || null,
        documentTableName: 'adjustments',
        userId,
      });
      
      adjustmentNumber = docNumberResult.documentNumber;
      documentHistoryId = docNumberResult.historyId;
    } catch (error: any) {
      console.error('Error generating adjustment number:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate adjustment number',
      });
    }

    // Create adjustment in transaction (without applying to inventory yet)
    const result = await db.transaction(async (tx) => {
      // Create adjustment record with status "created"
      const [adjustment] = await tx
        .insert(adjustments)
        .values({
          id: uuidv4(),
          tenantId,
          adjustmentNumber,
          status: 'created',
          type: 'regular',
          notes,
          createdBy: userId,
        })
        .returning();

      // Process each adjustment item
      const itemsToInsert = [];

      for (const item of items) {
        // Get current inventory item to capture old quantity
        const [inventoryItem] = await tx
          .select()
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.id, item.inventoryItemId),
              eq(inventoryItems.tenantId, tenantId)
            )
          )
          .limit(1);

        if (!inventoryItem) {
          throw new Error(`Inventory item ${item.inventoryItemId} not found`);
        }

        const oldQuantity = inventoryItem.availableQuantity;
        const newQuantity = item.newQuantity;
        const quantityDifference = newQuantity - oldQuantity;

        // Prepare adjustment item
        itemsToInsert.push({
          id: uuidv4(),
          adjustmentId: adjustment.id,
          tenantId,
          inventoryItemId: item.inventoryItemId,
          oldQuantity,
          newQuantity,
          quantityDifference,
          reasonCode: item.reasonCode,
          notes: item.notes || null,
        });
      }

      // Insert all adjustment items
      await tx.insert(adjustmentItems).values(itemsToInsert);

      // Log audit trail
      await logAudit({
        tenantId,
        userId,
        module: 'inventory-items',
        action: 'create',
        resourceType: 'adjustment',
        resourceId: adjustment.id,
        description: `Created adjustment ${adjustment.adjustmentNumber}`,
        ipAddress: getClientIp(req),
      });

      return { adjustment, itemCount: itemsToInsert.length };
    });

    res.status(201).json({
      success: true,
      message: `Adjustment created successfully with ${result.itemCount} items`,
      data: result.adjustment,
    });
  } catch (error: any) {
    console.error('Error creating adjustment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

/**
 * PUT /api/modules/inventory-items/adjustments/:id
 * Update an adjustment (only if status is 'created')
 */
router.put('/adjustments/:id', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;
    const { notes, items } = req.body;

    // Check if adjustment exists and belongs to tenant
    const [adjustment] = await db
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.id, id), eq(adjustments.tenantId, tenantId)))
      .limit(1);

    if (!adjustment) {
      return res.status(404).json({
        success: false,
        message: 'Adjustment not found',
      });
    }

    // Prevent editing of system-generated cycle count adjustments
    if (adjustment.type === 'cycle_count') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit cycle count adjustments. These are system-generated and linked to cycle count audits.',
      });
    }

    // Only allow editing if status is 'created'
    if (adjustment.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit adjustment with status '${adjustment.status}'. Only 'created' adjustments can be edited.`,
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one adjustment item is required',
      });
    }

    // Validate items structure
    for (const item of items) {
      if (!item.inventoryItemId || item.newQuantity === undefined || !item.reasonCode) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have inventoryItemId, newQuantity, and reasonCode',
        });
      }
      if (item.newQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'New quantity cannot be negative',
        });
      }
    }

    // Update adjustment in transaction
    await db.transaction(async (tx) => {
      // Update adjustment notes
      await tx
        .update(adjustments)
        .set({ notes })
        .where(eq(adjustments.id, id));

      // Delete existing items
      await tx
        .delete(adjustmentItems)
        .where(eq(adjustmentItems.adjustmentId, id));

      // Process and insert new items
      const itemsToInsert = [];

      for (const item of items) {
        // Get current inventory item to capture old quantity
        const [inventoryItem] = await tx
          .select()
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.id, item.inventoryItemId),
              eq(inventoryItems.tenantId, tenantId)
            )
          )
          .limit(1);

        if (!inventoryItem) {
          throw new Error(`Inventory item ${item.inventoryItemId} not found`);
        }

        const oldQuantity = inventoryItem.availableQuantity;
        const newQuantity = item.newQuantity;
        const quantityDifference = newQuantity - oldQuantity;

        // Prepare adjustment item
        itemsToInsert.push({
          id: uuidv4(),
          adjustmentId: id,
          tenantId,
          inventoryItemId: item.inventoryItemId,
          oldQuantity,
          newQuantity,
          quantityDifference,
          reasonCode: item.reasonCode,
          notes: item.notes || null,
        });
      }

      // Insert all adjustment items
      await tx.insert(adjustmentItems).values(itemsToInsert);

      // Log audit trail
      await logAudit({
        tenantId,
        userId,
        module: 'inventory-items',
        action: 'update',
        resourceType: 'adjustment',
        resourceId: id,
        description: `Updated adjustment ${adjustment.adjustmentNumber}`,
        ipAddress: getClientIp(req),
      });
    });

    res.json({
      success: true,
      message: 'Adjustment updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating adjustment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

/**
 * POST /api/modules/inventory-items/adjustments/:id/apply
 * Apply an adjustment to inventory (only if status is 'created')
 */
router.post('/adjustments/:id/apply', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if adjustment exists and belongs to tenant
    const [adjustment] = await db
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.id, id), eq(adjustments.tenantId, tenantId)))
      .limit(1);

    if (!adjustment) {
      return res.status(404).json({
        success: false,
        message: 'Adjustment not found',
      });
    }

    // Only allow applying if status is 'created'
    if (adjustment.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: `Cannot apply adjustment with status '${adjustment.status}'. Only 'created' adjustments can be applied.`,
      });
    }

    // Apply adjustment in transaction
    await db.transaction(async (tx) => {
      // Get all adjustment items
      const items = await tx
        .select()
        .from(adjustmentItems)
        .where(eq(adjustmentItems.adjustmentId, id));

      console.log('[ADJUSTMENT-APPLY-DEBUG] Total items to process:', items.length);

      // Apply each adjustment to inventory and log movements
      for (const item of items) {
        console.log('[ADJUSTMENT-APPLY-DEBUG] Processing item:', {
          inventoryItemId: item.inventoryItemId,
          oldQuantity: item.oldQuantity,
          newQuantity: item.newQuantity,
          quantityDifference: item.quantityDifference,
        });

        // Get inventory item details (for bin_id)
        const [invItem] = await tx
          .select({
            binId: inventoryItems.binId,
          })
          .from(inventoryItems)
          .where(eq(inventoryItems.id, item.inventoryItemId))
          .limit(1);

        if (!invItem) {
          throw new Error(`Inventory item not found: ${item.inventoryItemId}`);
        }

        console.log('[ADJUSTMENT-APPLY-DEBUG] Found bin:', invItem.binId);

        // Update inventory
        await tx
          .update(inventoryItems)
          .set({ availableQuantity: item.newQuantity })
          .where(eq(inventoryItems.id, item.inventoryItemId));

        console.log('[ADJUSTMENT-APPLY-DEBUG] Updated inventory, now inserting movement history...');

        // Log movement history
        try {
          await tx.execute(sql`
            INSERT INTO movement_history (
              tenant_id, user_id, inventory_item_id, bin_id, 
              quantity_changed, movement_type, reference_type, 
              reference_id, reference_number, notes
            ) VALUES (
              ${tenantId}, ${userId}, ${item.inventoryItemId}, ${invItem.binId},
              ${item.quantityDifference}, 'adjustment', 'adjustment',
              ${id}, ${adjustment.adjustmentNumber}, ${'Adjustment from ' + adjustment.adjustmentNumber}
            )
          `);
          console.log('[ADJUSTMENT-APPLY-DEBUG] ✅ Movement history inserted successfully');
        } catch (error) {
          console.error('[ADJUSTMENT-APPLY-DEBUG] ❌ Error inserting movement history:', error);
          throw error;
        }
      }

      // Update adjustment status to 'applied'
      await tx
        .update(adjustments)
        .set({
          status: 'applied',
          appliedAt: new Date(),
        })
        .where(eq(adjustments.id, id));

      // Log audit trail
      await logAudit({
        tenantId,
        userId,
        module: 'inventory-items',
        action: 'apply',
        resourceType: 'adjustment',
        resourceId: id,
        description: `Applied adjustment ${adjustment.adjustmentNumber} to inventory`,
        ipAddress: getClientIp(req),
      });
    });

    res.json({
      success: true,
      message: 'Adjustment applied to inventory successfully',
    });
  } catch (error: any) {
    console.error('Error applying adjustment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

/**
 * DELETE /api/modules/inventory-items/adjustments/:id
 * Delete an adjustment (only if status is 'created')
 */
router.delete('/adjustments/:id', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if adjustment exists and belongs to tenant
    const [adjustment] = await db
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.id, id), eq(adjustments.tenantId, tenantId)))
      .limit(1);

    if (!adjustment) {
      return res.status(404).json({
        success: false,
        message: 'Adjustment not found',
      });
    }

    // Prevent deletion of system-generated cycle count adjustments
    if (adjustment.type === 'cycle_count') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete cycle count adjustments. These are system-generated and linked to cycle count audits.',
      });
    }

    // Only allow deletion if status is 'created'
    if (adjustment.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete adjustment with status '${adjustment.status}'. Only 'created' adjustments can be deleted.`,
      });
    }

    // Delete adjustment (cascade will delete adjustment items)
    await db
      .delete(adjustments)
      .where(eq(adjustments.id, id));

    // Log audit trail
    await logAudit({
      tenantId,
      userId,
      module: 'inventory-items',
      action: 'delete',
      resourceType: 'adjustment',
      resourceId: adjustment.id,
      description: `Deleted adjustment ${adjustment.adjustmentNumber}`,
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      message: 'Adjustment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting adjustment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/modules/inventory-items/adjustments/:id/reject
 * Reject an adjustment (only if status is 'created')
 */
router.post('/adjustments/:id/reject', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if adjustment exists and belongs to tenant
    const [adjustment] = await db
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.id, id), eq(adjustments.tenantId, tenantId)))
      .limit(1);

    if (!adjustment) {
      return res.status(404).json({
        success: false,
        message: 'Adjustment not found',
      });
    }

    // Only allow rejecting if status is 'created'
    if (adjustment.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject adjustment with status '${adjustment.status}'. Only 'created' adjustments can be rejected.`,
      });
    }

    // Reject adjustment in transaction (ensures atomic operation)
    const result = await db.transaction(async (tx) => {
      // Update adjustment status to 'rejected'
      await tx
        .update(adjustments)
        .set({
          status: 'rejected',
          appliedAt: new Date(),
          approvedBy: userId,
        })
        .where(eq(adjustments.id, id));

      // If this is a cycle count adjustment, update the cycle count status
      if (adjustment.cycleCountId && adjustment.type === 'cycle_count') {
        await tx
          .update(cycleCounts)
          .set({
            status: 'rejected',
            completedDate: new Date().toISOString().split('T')[0],
            approvedBy: userId,
          })
          .where(eq(cycleCounts.id, adjustment.cycleCountId));
      }

      return { success: true };
    });

    // Log audit trail (outside transaction for safety)
    await logAudit({
      tenantId,
      userId,
      module: 'inventory-items',
      action: 'reject',
      resourceType: 'adjustment',
      resourceId: id,
      description: `Rejected adjustment ${adjustment.adjustmentNumber}`,
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      message: 'Adjustment rejected successfully',
    });
  } catch (error: any) {
    console.error('Error rejecting adjustment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

/**
 * POST /api/modules/inventory-items/adjustments/:id/approve
 * Approve an adjustment (only if status is 'created')
 * This will update inventory, generate document, and update cycle count if applicable
 */
router.post('/adjustments/:id/approve', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if adjustment exists and belongs to tenant
    const [adjustment] = await db
      .select()
      .from(adjustments)
      .where(and(eq(adjustments.id, id), eq(adjustments.tenantId, tenantId)))
      .limit(1);

    if (!adjustment) {
      return res.status(404).json({
        success: false,
        message: 'Adjustment not found',
      });
    }

    // Only allow approving if status is 'created'
    if (adjustment.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve adjustment with status '${adjustment.status}'. Only 'created' adjustments can be approved.`,
      });
    }

    // Fetch detailed data for document generation
    const adjustmentItemsData = await db
      .select({
        adjustmentItem: adjustmentItems,
        product: products,
        bin: bins,
        shelf: shelves,
        aisle: aisles,
        zone: zones,
        warehouse: warehouses,
        inventoryItem: inventoryItems,
      })
      .from(adjustmentItems)
      .leftJoin(inventoryItems, eq(adjustmentItems.inventoryItemId, inventoryItems.id))
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .leftJoin(bins, eq(inventoryItems.binId, bins.id))
      .leftJoin(shelves, eq(bins.shelfId, shelves.id))
      .leftJoin(aisles, eq(shelves.aisleId, aisles.id))
      .leftJoin(zones, eq(aisles.zoneId, zones.id))
      .leftJoin(warehouses, eq(zones.warehouseId, warehouses.id))
      .where(eq(adjustmentItems.adjustmentId, id));

    // Fetch user names
    const [createdByUser] = adjustment.createdBy
      ? await db
          .select({ fullname: user.fullname })
          .from(user)
          .where(eq(user.id, adjustment.createdBy))
          .limit(1)
      : [null];

    const [approvedByUser] = await db
      .select({ fullname: user.fullname })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Approve adjustment in transaction (ensures atomic operation)
    const documentPath = await db.transaction(async (tx) => {
      // Get all adjustment items
      const items = await tx
        .select()
        .from(adjustmentItems)
        .where(eq(adjustmentItems.adjustmentId, id));

      console.log('[ADJUSTMENT-APPROVE-DEBUG] Total items to process:', items.length);

      // Apply each adjustment to inventory and log movements
      for (const item of items) {
        console.log('[ADJUSTMENT-APPROVE-DEBUG] Processing item:', {
          inventoryItemId: item.inventoryItemId,
          oldQuantity: item.oldQuantity,
          newQuantity: item.newQuantity,
          quantityDifference: item.quantityDifference,
        });

        // Get inventory item details (for bin_id)
        const [invItem] = await tx
          .select({
            binId: inventoryItems.binId,
          })
          .from(inventoryItems)
          .where(eq(inventoryItems.id, item.inventoryItemId))
          .limit(1);

        if (!invItem) {
          throw new Error(`Inventory item not found: ${item.inventoryItemId}`);
        }

        console.log('[ADJUSTMENT-APPROVE-DEBUG] Found bin:', invItem.binId);

        // Update inventory
        await tx
          .update(inventoryItems)
          .set({ availableQuantity: item.newQuantity })
          .where(eq(inventoryItems.id, item.inventoryItemId));

        console.log('[ADJUSTMENT-APPROVE-DEBUG] Updated inventory, now inserting movement history...');

        // Log movement history
        try {
          await tx.execute(sql`
            INSERT INTO movement_history (
              tenant_id, user_id, inventory_item_id, bin_id, 
              quantity_changed, movement_type, reference_type, 
              reference_id, reference_number, notes
            ) VALUES (
              ${tenantId}, ${userId}, ${item.inventoryItemId}, ${invItem.binId},
              ${item.quantityDifference}, 'adjustment', 'adjustment',
              ${id}, ${adjustment.adjustmentNumber}, ${'Adjustment from ' + adjustment.adjustmentNumber}
            )
          `);
          console.log('[ADJUSTMENT-APPROVE-DEBUG] ✅ Movement history inserted successfully');
        } catch (error) {
          console.error('[ADJUSTMENT-APPROVE-DEBUG] ❌ Error inserting movement history:', error);
          throw error;
        }
      }

      // Update adjustment status to 'approved'
      await tx
        .update(adjustments)
        .set({
          status: 'approved',
          appliedAt: new Date(),
          approvedBy: userId,
        })
        .where(eq(adjustments.id, id));

      // If this is a cycle count adjustment, update the cycle count status
      if (adjustment.cycleCountId && adjustment.type === 'cycle_count') {
        await tx
          .update(cycleCounts)
          .set({
            status: 'approved',
            completedDate: new Date().toISOString().split('T')[0],
            approvedBy: userId,
          })
          .where(eq(cycleCounts.id, adjustment.cycleCountId));
      }

      // Prepare document data
      const documentData = {
        adjustmentNumber: adjustment.adjustmentNumber,
        tenantId,
        adjustmentId: id,
        status: 'approved',
        type: adjustment.type,
        createdDate: adjustment.createdAt.toISOString(),
        approvedDate: new Date().toISOString(),
        createdBy: createdByUser?.fullname || 'Unknown',
        approvedBy: approvedByUser?.fullname || 'Unknown',
        notes: adjustment.notes,
        items: adjustmentItemsData.map((item) => {
          const locationPath = [
            item.warehouse?.name,
            item.zone?.name,
            item.aisle?.name,
            item.shelf?.name,
            item.bin?.name,
          ]
            .filter(Boolean)
            .join(' > ');

          return {
            productSku: item.product?.sku || 'N/A',
            productName: item.product?.name || 'N/A',
            binName: item.bin?.name || 'N/A',
            location: locationPath || 'N/A',
            systemQuantity: item.adjustmentItem.oldQuantity,
            adjustedQuantity: item.adjustmentItem.newQuantity,
            quantityDifference:
              item.adjustmentItem.newQuantity - item.adjustmentItem.oldQuantity,
            reasonCode: item.adjustmentItem.reasonCode,
          };
        }),
      };

      // Generate and save document (inside transaction for atomicity)
      const path = await AdjustmentDocumentGenerator.generateAndSaveDocument(documentData, userId, tx);
      return path;
    });

    // Log audit trail (outside transaction for safety)
    await logAudit({
      tenantId,
      userId,
      module: 'inventory-items',
      action: 'approve',
      resourceType: 'adjustment',
      resourceId: id,
      description: `Approved adjustment ${adjustment.adjustmentNumber}`,
      ipAddress: getClientIp(req),
      documentPath,
    });

    res.json({
      success: true,
      message: 'Adjustment approved successfully',
    });
  } catch (error: any) {
    console.error('Error approving adjustment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

export default router;
