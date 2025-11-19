import express from 'express';
import { db } from '@server/lib/db';
import { adjustments, adjustmentItems } from '../lib/db/schemas/adjustment';
import { inventoryItems } from '../lib/db/schemas/inventoryItems';
import { products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { bins, shelves, aisles, zones, warehouses } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';
import { documentNumberConfig } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';
import { generateDocumentNumber } from '@modules/document-numbering/server/services/documentNumberService';
import { authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, sql, or, inArray } from 'drizzle-orm';
import { logAudit, getClientIp } from '@server/services/auditService';
import { v4 as uuidv4 } from 'uuid';

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

      // Apply each adjustment to inventory
      for (const item of items) {
        await tx
          .update(inventoryItems)
          .set({ availableQuantity: item.newQuantity })
          .where(eq(inventoryItems.id, item.inventoryItemId));
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

export default router;
