import express from 'express';
import { db } from '@server/lib/db';
import { relocations, relocationItems } from '../lib/db/schemas/relocation';
import { inventoryItems } from '../lib/db/schemas/inventoryItems';
import { products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { bins, shelves, aisles, zones, warehouses } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';
import { documentNumberConfig, generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';
import { generateDocumentNumber } from '@modules/document-numbering/server/services/documentNumberService';
import { authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { logAudit, getClientIp } from '@server/services/auditService';
import { v4 as uuidv4 } from 'uuid';
import { RelocationDocumentGenerator } from '../services/relocationDocumentGenerator';
import { user } from '@server/lib/db/schema/system';

const router = express.Router();

/**
 * @swagger
 * /api/modules/inventory-items/relocations:
 *   post:
 *     tags:
 *       - Inventory Relocation
 *     summary: Create a new relocation
 *     description: Create a new inventory relocation
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - fromBinId
 *                     - toBinId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                     fromBinId:
 *                       type: string
 *                     toBinId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Relocation created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/relocations', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { notes, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one relocation item is required',
      });
    }

    // Validate items structure
    for (const item of items) {
      if (!item.productId || !item.fromBinId || !item.toBinId || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have productId, fromBinId, toBinId, and quantity',
        });
      }
      if (item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be greater than zero',
        });
      }
      if (item.fromBinId === item.toBinId) {
        return res.status(400).json({
          success: false,
          message: 'From bin and to bin cannot be the same',
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
          eq(documentNumberConfig.documentType, 'RELOC'),
          eq(documentNumberConfig.isActive, true)
        )
      )
      .limit(1);

    if (!docConfig) {
      return res.status(500).json({
        success: false,
        message: 'Document numbering configuration not found for RELOC',
      });
    }

    // Generate relocation number
    let relocationNumber: string;
    let documentHistoryId: string;
    
    try {
      const docNumberResult = await generateDocumentNumber({
        tenantId,
        documentType: 'RELOC',
        prefix1: docConfig.prefix1DefaultValue || null,
        prefix2: docConfig.prefix2DefaultValue || null,
        documentTableName: 'relocations',
        userId,
      });
      
      relocationNumber = docNumberResult.documentNumber;
      documentHistoryId = docNumberResult.historyId;
    } catch (error: any) {
      console.error('Error generating relocation number:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate relocation number',
      });
    }

    // Create relocation in transaction
    const result = await db.transaction(async (tx) => {
      // Create relocation record
      const [relocation] = await tx
        .insert(relocations)
        .values({
          id: uuidv4(),
          tenantId,
          relocationNumber,
          status: 'created',
          notes,
          createdBy: userId,
        })
        .returning();

      // Process each relocation item
      const itemsToInsert = [];

      for (const item of items) {
        // Get current inventory item to validate available quantity
        const [inventoryItem] = await tx
          .select()
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.productId, item.productId),
              eq(inventoryItems.binId, item.fromBinId),
              eq(inventoryItems.tenantId, tenantId)
            )
          )
          .limit(1);

        if (!inventoryItem) {
          throw new Error(`No inventory found for product ${item.productId} in bin ${item.fromBinId}`);
        }

        if (inventoryItem.availableQuantity < item.quantity) {
          throw new Error(`Insufficient quantity in from bin. Available: ${inventoryItem.availableQuantity}, Requested: ${item.quantity}`);
        }

        // Prepare relocation item
        itemsToInsert.push({
          id: uuidv4(),
          relocationId: relocation.id,
          tenantId,
          inventoryItemId: inventoryItem.id,
          productId: item.productId,
          quantity: item.quantity,
          fromBinId: item.fromBinId,
          toBinId: item.toBinId,
        });
      }

      // Insert all relocation items
      await tx.insert(relocationItems).values(itemsToInsert);

      // Log audit trail
      await logAudit({
        tenantId,
        userId,
        module: 'inventory-items',
        action: 'create',
        resourceType: 'relocation',
        resourceId: relocation.id,
        description: `Created relocation ${relocation.relocationNumber}`,
        ipAddress: getClientIp(req),
      });

      return { relocation, itemCount: itemsToInsert.length };
    });

    res.status(201).json({
      success: true,
      message: `Relocation created successfully with ${result.itemCount} items`,
      data: result.relocation,
    });
  } catch (error: any) {
    console.error('Error creating relocation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/relocations:
 *   get:
 *     tags:
 *       - Inventory Relocation
 *     summary: List all relocations
 *     description: Get a paginated list of inventory relocations
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [created, approved, rejected]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of relocations
 *       400:
 *         description: Invalid status filter
 *       401:
 *         description: Unauthorized
 */
router.get('/relocations', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const statusParam = req.query.status as string;

    const whereConditions = [eq(relocations.tenantId, tenantId)];

    // Add status filter if provided and valid
    if (statusParam) {
      const status = statusParam.trim().toLowerCase();
      const validStatuses = ['created', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
        });
      }
      whereConditions.push(eq(relocations.status, status));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(relocations)
      .where(and(...whereConditions));

    // Get paginated data
    const relocationsList = await db
      .select()
      .from(relocations)
      .where(and(...whereConditions))
      .orderBy(desc(relocations.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: relocationsList,
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
    console.error('Error fetching relocations:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/relocations/{id}:
 *   get:
 *     tags:
 *       - Inventory Relocation
 *     summary: Get relocation details
 *     description: Get detailed information about a specific relocation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Relocation ID
 *     responses:
 *       200:
 *         description: Relocation details
 *       404:
 *         description: Relocation not found
 *       401:
 *         description: Unauthorized
 */
router.get('/relocations/:id', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [relocation] = await db
      .select()
      .from(relocations)
      .where(and(eq(relocations.id, id), eq(relocations.tenantId, tenantId)))
      .limit(1);

    if (!relocation) {
      return res.status(404).json({
        success: false,
        message: 'Relocation not found',
      });
    }

    res.json({
      success: true,
      data: relocation,
    });
  } catch (error) {
    console.error('Error fetching relocation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/relocations/{id}/items:
 *   get:
 *     tags:
 *       - Inventory Relocation
 *     summary: Get relocation items
 *     description: Get items in a relocation with location hierarchy
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Relocation ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of relocation items
 *       404:
 *         description: Relocation not found
 *       401:
 *         description: Unauthorized
 */
router.get('/relocations/:id/items', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Verify relocation belongs to tenant
    const [relocation] = await db
      .select()
      .from(relocations)
      .where(and(eq(relocations.id, id), eq(relocations.tenantId, tenantId)))
      .limit(1);

    if (!relocation) {
      return res.status(404).json({
        success: false,
        message: 'Relocation not found',
      });
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(relocationItems)
      .where(eq(relocationItems.relocationId, id));

    // Get paginated items with full location details
    const itemsData = await db
      .select({
        id: relocationItems.id,
        relocationId: relocationItems.relocationId,
        inventoryItemId: relocationItems.inventoryItemId,
        productId: relocationItems.productId,
        productSku: products.sku,
        productName: products.name,
        quantity: relocationItems.quantity,
        currentAvailableQuantity: inventoryItems.availableQuantity,
        // From location
        fromBinId: relocationItems.fromBinId,
        fromBinName: sql<string>`from_bin.name`,
        fromShelfName: sql<string>`from_shelf.name`,
        fromAisleName: sql<string>`from_aisle.name`,
        fromZoneName: sql<string>`from_zone.name`,
        fromWarehouseName: sql<string>`from_warehouse.name`,
        // To location
        toBinId: relocationItems.toBinId,
        toBinName: sql<string>`to_bin.name`,
        toShelfName: sql<string>`to_shelf.name`,
        toAisleName: sql<string>`to_aisle.name`,
        toZoneName: sql<string>`to_zone.name`,
        toWarehouseName: sql<string>`to_warehouse.name`,
        createdAt: relocationItems.createdAt,
      })
      .from(relocationItems)
      .leftJoin(products, eq(relocationItems.productId, products.id))
      .leftJoin(inventoryItems, eq(relocationItems.inventoryItemId, inventoryItems.id))
      .leftJoin(sql`${bins} as from_bin`, sql`${relocationItems.fromBinId} = from_bin.id`)
      .leftJoin(sql`${shelves} as from_shelf`, sql`from_bin.shelf_id = from_shelf.id`)
      .leftJoin(sql`${aisles} as from_aisle`, sql`from_shelf.aisle_id = from_aisle.id`)
      .leftJoin(sql`${zones} as from_zone`, sql`from_aisle.zone_id = from_zone.id`)
      .leftJoin(sql`${warehouses} as from_warehouse`, sql`from_zone.warehouse_id = from_warehouse.id`)
      .leftJoin(sql`${bins} as to_bin`, sql`${relocationItems.toBinId} = to_bin.id`)
      .leftJoin(sql`${shelves} as to_shelf`, sql`to_bin.shelf_id = to_shelf.id`)
      .leftJoin(sql`${aisles} as to_aisle`, sql`to_shelf.aisle_id = to_aisle.id`)
      .leftJoin(sql`${zones} as to_zone`, sql`to_aisle.zone_id = to_zone.id`)
      .leftJoin(sql`${warehouses} as to_warehouse`, sql`to_zone.warehouse_id = to_warehouse.id`)
      .where(eq(relocationItems.relocationId, id))
      .orderBy(relocationItems.createdAt)
      .limit(limit)
      .offset(offset);

    // Map to frontend-friendly format with full location paths
    const items = itemsData.map((item) => {
      const fromLocationParts = [
        item.fromZoneName,
        item.fromAisleName,
        item.fromShelfName,
        item.fromBinName
      ].filter(Boolean);
      
      const toLocationParts = [
        item.toZoneName,
        item.toAisleName,
        item.toShelfName,
        item.toBinName
      ].filter(Boolean);

      return {
        ...item,
        fromLocation: fromLocationParts.join('.') || '-',
        toLocation: toLocationParts.join('.') || '-',
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
    console.error('Error fetching relocation items:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/relocations/{id}:
 *   put:
 *     tags:
 *       - Inventory Relocation
 *     summary: Update a relocation
 *     description: Update a relocation (only for status 'created')
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Relocation ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     fromBinId:
 *                       type: string
 *                     toBinId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Relocation updated successfully
 *       400:
 *         description: Cannot update - wrong status or invalid input
 *       404:
 *         description: Relocation not found
 *       401:
 *         description: Unauthorized
 */
router.put('/relocations/:id', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;
    const { notes, items } = req.body;

    // Check if relocation exists and belongs to tenant
    const [relocation] = await db
      .select()
      .from(relocations)
      .where(and(eq(relocations.id, id), eq(relocations.tenantId, tenantId)))
      .limit(1);

    if (!relocation) {
      return res.status(404).json({
        success: false,
        message: 'Relocation not found',
      });
    }

    // Only allow editing if status is 'created'
    if (relocation.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit relocation with status '${relocation.status}'. Only 'created' relocations can be edited.`,
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one relocation item is required',
      });
    }

    // Validate items structure
    for (const item of items) {
      if (!item.productId || !item.fromBinId || !item.toBinId || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have productId, fromBinId, toBinId, and quantity',
        });
      }
      if (item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be greater than zero',
        });
      }
      if (item.fromBinId === item.toBinId) {
        return res.status(400).json({
          success: false,
          message: 'From bin and to bin cannot be the same',
        });
      }
    }

    // Update relocation in transaction
    const result = await db.transaction(async (tx) => {
      // Update relocation record
      const [updatedRelocation] = await tx
        .update(relocations)
        .set({ notes, updatedAt: new Date() })
        .where(eq(relocations.id, id))
        .returning();

      // Delete old items
      await tx.delete(relocationItems).where(eq(relocationItems.relocationId, id));

      // Process new items
      const itemsToInsert = [];

      for (const item of items) {
        // Get current inventory item to validate available quantity
        const [inventoryItem] = await tx
          .select()
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.productId, item.productId),
              eq(inventoryItems.binId, item.fromBinId),
              eq(inventoryItems.tenantId, tenantId)
            )
          )
          .limit(1);

        if (!inventoryItem) {
          throw new Error(`No inventory found for product ${item.productId} in bin ${item.fromBinId}`);
        }

        if (inventoryItem.availableQuantity < item.quantity) {
          throw new Error(`Insufficient quantity in from bin. Available: ${inventoryItem.availableQuantity}, Requested: ${item.quantity}`);
        }

        itemsToInsert.push({
          id: uuidv4(),
          relocationId: updatedRelocation.id,
          tenantId,
          inventoryItemId: inventoryItem.id,
          productId: item.productId,
          quantity: item.quantity,
          fromBinId: item.fromBinId,
          toBinId: item.toBinId,
        });
      }

      // Insert new items
      await tx.insert(relocationItems).values(itemsToInsert);

      // Log audit trail
      await logAudit({
        tenantId,
        userId,
        module: 'inventory-items',
        action: 'update',
        resourceType: 'relocation',
        resourceId: updatedRelocation.id,
        description: `Updated relocation ${updatedRelocation.relocationNumber}`,
        ipAddress: getClientIp(req),
      });

      return { relocation: updatedRelocation, itemCount: itemsToInsert.length };
    });

    res.json({
      success: true,
      message: `Relocation updated successfully with ${result.itemCount} items`,
      data: result.relocation,
    });
  } catch (error: any) {
    console.error('Error updating relocation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/relocations/{id}:
 *   delete:
 *     tags:
 *       - Inventory Relocation
 *     summary: Delete a relocation
 *     description: Delete a relocation (only for status 'created')
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Relocation ID
 *     responses:
 *       200:
 *         description: Relocation deleted successfully
 *       400:
 *         description: Cannot delete - wrong status
 *       404:
 *         description: Relocation not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/relocations/:id', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if relocation exists and belongs to tenant
    const [relocation] = await db
      .select()
      .from(relocations)
      .where(and(eq(relocations.id, id), eq(relocations.tenantId, tenantId)))
      .limit(1);

    if (!relocation) {
      return res.status(404).json({
        success: false,
        message: 'Relocation not found',
      });
    }

    // Only allow deletion if status is 'created'
    if (relocation.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete relocation with status '${relocation.status}'. Only 'created' relocations can be deleted.`,
      });
    }

    // Delete relocation (cascade will handle items)
    await db.delete(relocations).where(eq(relocations.id, id));

    // Log audit trail
    await logAudit({
      tenantId,
      userId,
      module: 'inventory-items',
      action: 'delete',
      resourceType: 'relocation',
      resourceId: id,
      description: `Deleted relocation ${relocation.relocationNumber}`,
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      message: 'Relocation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting relocation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/relocations/{id}/approve:
 *   post:
 *     tags:
 *       - Inventory Relocation
 *     summary: Approve a relocation
 *     description: Approve a relocation and execute the inventory movement (only for status 'created')
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Relocation ID
 *     responses:
 *       200:
 *         description: Relocation approved successfully
 *       400:
 *         description: Cannot approve - wrong status or insufficient inventory
 *       404:
 *         description: Relocation not found
 *       401:
 *         description: Unauthorized
 */
router.post('/relocations/:id/approve', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if relocation exists and belongs to tenant
    const [relocation] = await db
      .select()
      .from(relocations)
      .where(and(eq(relocations.id, id), eq(relocations.tenantId, tenantId)))
      .limit(1);

    if (!relocation) {
      return res.status(404).json({
        success: false,
        message: 'Relocation not found',
      });
    }

    // Only allow approval if status is 'created'
    if (relocation.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve relocation with status '${relocation.status}'. Only 'created' relocations can be approved.`,
      });
    }

    // Approve relocation in transaction
    const result = await db.transaction(async (tx) => {
      // Get relocation items
      const items = await tx
        .select()
        .from(relocationItems)
        .where(eq(relocationItems.relocationId, id));

      // Update inventory for each item with validation and locking
      for (const item of items) {
        // Step 1: Lock the inventory row (without joins to avoid FOR UPDATE error)
        const [lockedInventory] = await tx
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.id, item.inventoryItemId))
          .for('update')
          .limit(1);

        if (!lockedInventory) {
          throw new Error(`Inventory item not found in source bin`);
        }

        // Step 2: Get metadata for error messages (separate query without FOR UPDATE)
        const [metadata] = await tx
          .select({
            productSku: products.sku,
            productName: products.name,
            binName: bins.name,
          })
          .from(inventoryItems)
          .leftJoin(products, eq(inventoryItems.productId, products.id))
          .leftJoin(bins, eq(inventoryItems.binId, bins.id))
          .where(eq(inventoryItems.id, item.inventoryItemId))
          .limit(1);

        // Validate current available quantity is sufficient
        if (lockedInventory.availableQuantity < item.quantity) {
          throw new Error(
            `Insufficient inventory for SKU "${metadata?.productSku || 'Unknown'}" (${metadata?.productName || 'Unknown'}) in bin "${metadata?.binName || 'Unknown'}". ` +
            `Current available: ${lockedInventory.availableQuantity}, Required: ${item.quantity}. ` +
            `Please edit the relocation to adjust quantities or cancel this relocation.`
          );
        }

        // Calculate new quantity and validate it won't be negative
        const newQuantity = lockedInventory.availableQuantity - item.quantity;
        if (newQuantity < 0) {
          throw new Error(
            `Relocation would result in negative inventory for SKU "${metadata?.productSku || 'Unknown'}" (${metadata?.productName || 'Unknown'}) in bin "${metadata?.binName || 'Unknown'}". ` +
            `Current: ${lockedInventory.availableQuantity}, Attempting to move: ${item.quantity}`
          );
        }

        // Store inventory data for later use
        const fromInventory = lockedInventory;

        // Update source inventory (subtract quantity) using validated newQuantity
        await tx
          .update(inventoryItems)
          .set({
            availableQuantity: newQuantity,
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, fromInventory.id));

        // Check if destination inventory exists
        let [toInventory] = await tx
          .select()
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.productId, item.productId),
              eq(inventoryItems.binId, item.toBinId),
              eq(inventoryItems.tenantId, tenantId)
            )
          )
          .limit(1);

        if (toInventory) {
          // Update existing destination inventory (add quantity)
          await tx
            .update(inventoryItems)
            .set({
              availableQuantity: toInventory.availableQuantity + item.quantity,
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.id, toInventory.id));
        } else {
          // Create new destination inventory
          const newToInventoryId = uuidv4();
          await tx.insert(inventoryItems).values({
            id: newToInventoryId,
            tenantId,
            productId: item.productId,
            binId: item.toBinId,
            availableQuantity: item.quantity,
            reservedQuantity: 0,
            expiryDate: fromInventory.expiryDate,
            batchNumber: fromInventory.batchNumber,
            lotNumber: fromInventory.lotNumber,
            receivedDate: fromInventory.receivedDate,
            costPerUnit: fromInventory.costPerUnit,
          });

          // Store TO inventory ID for movement logging
          toInventory = { id: newToInventoryId } as any;
        }

        // Log movement history - FROM bin (negative quantity)
        await tx.execute(sql`
          INSERT INTO movement_history (
            tenant_id, user_id, inventory_item_id, bin_id, 
            quantity_changed, movement_type, reference_type, 
            reference_id, reference_number, notes
          ) VALUES (
            ${tenantId}, ${userId}, ${fromInventory.id}, ${item.fromBinId},
            ${-item.quantity}, 'relocation', 'relocation',
            ${id}, ${relocation.relocationNumber}, ${'Relocation FROM bin'}
          )
        `);

        // Log movement history - TO bin (positive quantity)
        await tx.execute(sql`
          INSERT INTO movement_history (
            tenant_id, user_id, inventory_item_id, bin_id, 
            quantity_changed, movement_type, reference_type, 
            reference_id, reference_number, notes
          ) VALUES (
            ${tenantId}, ${userId}, ${toInventory.id}, ${item.toBinId},
            ${item.quantity}, 'relocation', 'relocation',
            ${id}, ${relocation.relocationNumber}, ${'Relocation TO bin'}
          )
        `);
      }

      // Update relocation status
      const [updatedRelocation] = await tx
        .update(relocations)
        .set({
          status: 'approved',
          approvedBy: userId,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(relocations.id, id))
        .returning();

      // Get user name for document
      const [approver] = await tx
        .select({ name: user.fullname })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      const [creator] = await tx
        .select({ name: user.fullname })
        .from(user)
        .where(eq(user.id, updatedRelocation.createdBy!))
        .limit(1);

      // Get items with location details for document
      const itemsData = await tx
        .select({
          productSku: products.sku,
          productName: products.name,
          quantity: relocationItems.quantity,
          fromBinName: sql<string>`from_bin.name`,
          fromShelfName: sql<string>`from_shelf.name`,
          fromAisleName: sql<string>`from_aisle.name`,
          fromZoneName: sql<string>`from_zone.name`,
          fromWarehouseName: sql<string>`from_warehouse.name`,
          toBinName: sql<string>`to_bin.name`,
          toShelfName: sql<string>`to_shelf.name`,
          toAisleName: sql<string>`to_aisle.name`,
          toZoneName: sql<string>`to_zone.name`,
          toWarehouseName: sql<string>`to_warehouse.name`,
        })
        .from(relocationItems)
        .leftJoin(products, eq(relocationItems.productId, products.id))
        .leftJoin(sql`${bins} as from_bin`, sql`${relocationItems.fromBinId} = from_bin.id`)
        .leftJoin(sql`${shelves} as from_shelf`, sql`from_bin.shelf_id = from_shelf.id`)
        .leftJoin(sql`${aisles} as from_aisle`, sql`from_shelf.aisle_id = from_aisle.id`)
        .leftJoin(sql`${zones} as from_zone`, sql`from_aisle.zone_id = from_zone.id`)
        .leftJoin(sql`${warehouses} as from_warehouse`, sql`from_zone.warehouse_id = from_warehouse.id`)
        .leftJoin(sql`${bins} as to_bin`, sql`${relocationItems.toBinId} = to_bin.id`)
        .leftJoin(sql`${shelves} as to_shelf`, sql`to_bin.shelf_id = to_shelf.id`)
        .leftJoin(sql`${aisles} as to_aisle`, sql`to_shelf.aisle_id = to_aisle.id`)
        .leftJoin(sql`${zones} as to_zone`, sql`to_aisle.zone_id = to_zone.id`)
        .leftJoin(sql`${warehouses} as to_warehouse`, sql`to_zone.warehouse_id = to_warehouse.id`)
        .where(eq(relocationItems.relocationId, id));

      // Format items for document
      const documentItems = itemsData.map(item => {
        const fromLocationParts = [
          item.fromZoneName,
          item.fromAisleName,
          item.fromShelfName,
        ].filter(Boolean);
        
        const toLocationParts = [
          item.toZoneName,
          item.toAisleName,
          item.toShelfName,
        ].filter(Boolean);

        return {
          productSku: item.productSku || '',
          productName: item.productName || '',
          quantity: item.quantity,
          fromBinName: item.fromBinName || '',
          fromLocation: fromLocationParts.join('.') || '-',
          toBinName: item.toBinName || '',
          toLocation: toLocationParts.join('.') || '-',
        };
      });

      // Generate document
      const documentPath = await RelocationDocumentGenerator.generateAndSaveDocument(
        {
          relocationNumber: updatedRelocation.relocationNumber,
          tenantId: updatedRelocation.tenantId,
          relocationId: updatedRelocation.id,
          status: updatedRelocation.status,
          createdDate: updatedRelocation.createdAt.toISOString(),
          approvedDate: updatedRelocation.completedAt?.toISOString() || null,
          completedDate: updatedRelocation.completedAt?.toISOString() || null,
          createdBy: creator?.name || 'Unknown',
          approvedBy: approver?.name || 'Unknown',
          notes: updatedRelocation.notes,
          items: documentItems,
        },
        userId,
        tx
      );

      // Log audit trail
      await logAudit({
        tenantId,
        userId,
        module: 'inventory-items',
        action: 'approve',
        resourceType: 'relocation',
        resourceId: updatedRelocation.id,
        description: `Approved relocation ${updatedRelocation.relocationNumber}`,
        ipAddress: getClientIp(req),
        documentPath,
      });

      return { relocation: updatedRelocation, documentPath };
    });

    res.json({
      success: true,
      message: 'Relocation approved successfully',
      data: {
        relocation: result.relocation,
        documentPath: result.documentPath,
      },
    });
  } catch (error: any) {
    console.error('Error approving relocation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/relocations/{id}/reject:
 *   post:
 *     tags:
 *       - Inventory Relocation
 *     summary: Reject a relocation
 *     description: Reject a relocation (only for status 'created')
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Relocation ID
 *     responses:
 *       200:
 *         description: Relocation rejected successfully
 *       400:
 *         description: Cannot reject - wrong status
 *       404:
 *         description: Relocation not found
 *       401:
 *         description: Unauthorized
 */
router.post('/relocations/:id/reject', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if relocation exists and belongs to tenant
    const [relocation] = await db
      .select()
      .from(relocations)
      .where(and(eq(relocations.id, id), eq(relocations.tenantId, tenantId)))
      .limit(1);

    if (!relocation) {
      return res.status(404).json({
        success: false,
        message: 'Relocation not found',
      });
    }

    // Only allow rejection if status is 'created'
    if (relocation.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject relocation with status '${relocation.status}'. Only 'created' relocations can be rejected.`,
      });
    }

    // Update relocation status to rejected
    const [updatedRelocation] = await db
      .update(relocations)
      .set({
        status: 'rejected',
        approvedBy: userId,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(relocations.id, id))
      .returning();

    // Log audit trail
    await logAudit({
      tenantId,
      userId,
      module: 'inventory-items',
      action: 'reject',
      resourceType: 'relocation',
      resourceId: updatedRelocation.id,
      description: `Rejected relocation ${updatedRelocation.relocationNumber}`,
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      message: 'Relocation rejected successfully',
      data: updatedRelocation,
    });
  } catch (error) {
    console.error('Error rejecting relocation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/relocations/{id}/document:
 *   get:
 *     tags:
 *       - Inventory Relocation
 *     summary: Get relocation document
 *     description: Get the generated document path for a relocation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Relocation ID
 *     responses:
 *       200:
 *         description: Document details with path
 *       404:
 *         description: Relocation or document not found
 *       401:
 *         description: Unauthorized
 */
router.get('/relocations/:id/document', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    // Verify relocation belongs to tenant
    const [relocation] = await db
      .select()
      .from(relocations)
      .where(and(eq(relocations.id, id), eq(relocations.tenantId, tenantId)))
      .limit(1);

    if (!relocation) {
      return res.status(404).json({
        success: false,
        message: 'Relocation not found',
      });
    }

    // Fetch document from generated_documents table
    const [document] = await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.tenantId, tenantId),
          eq(generatedDocuments.referenceType, 'relocation'),
          eq(generatedDocuments.referenceId, id),
          eq(generatedDocuments.documentType, 'RELOCATION')
        )
      )
      .limit(1);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found for this relocation',
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
    console.error('Error fetching relocation document:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
