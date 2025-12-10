import express from 'express';
import { db } from '@server/lib/db';
import { cycleCounts, cycleCountItems } from '../lib/db/schemas/cycleCount';
import { inventoryItems } from '../lib/db/schemas/inventoryItems';
import { adjustments, adjustmentItems } from '../lib/db/schemas/adjustment';
import { products, productTypes } from '@modules/master-data/server/lib/db/schemas/masterData';
import { bins, shelves, aisles, zones, warehouses } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';
import { documentNumberConfig, generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';
import { generateDocumentNumber } from '@modules/document-numbering/server/services/documentNumberService';
import { authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, sql, or, inArray } from 'drizzle-orm';
import { logAudit, getClientIp } from '@server/services/auditService';
import { v4 as uuidv4 } from 'uuid';
import { user } from '@server/lib/db/schema/system';
import { CycleCountDocumentGenerator } from '../services/cycleCountDocumentGenerator';

const router = express.Router();
// Note: authenticated() and checkModuleAuthorization() are already applied by parent router

/**
 * @swagger
 * /api/modules/inventory-items/cycle-counts:
 *   get:
 *     tags:
 *       - Cycle Count
 *     security:
 *       - bearerAuth: []
 *     summary: List all cycle counts
 *     description: Get a paginated list of cycle counts for the current tenant
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *         description: Items per page (default 20)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [created, approved, rejected]
 *         description: Filter by status
 *       - in: query
 *         name: excludeStatus
 *         schema:
 *           type: string
 *         description: Exclude specific status from results
 *     responses:
 *       200:
 *         description: List of cycle counts
 *       401:
 *         description: Unauthorized
 */
router.get('/cycle-counts', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const perPage = Math.min(Math.max(1, parseInt(req.query.perPage as string) || 20), 500);
    const offset = (page - 1) * perPage;
    const statusParam = req.query.status as string;
    const excludeStatusParam = req.query.excludeStatus as string;

    const whereConditions = [eq(cycleCounts.tenantId, tenantId)];

    // Add status filter if provided and valid
    if (statusParam && statusParam !== 'all') {
      const status = statusParam.trim().toLowerCase();
      const validStatuses = ['created', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
        });
      }
      whereConditions.push(eq(cycleCounts.status, status));
    }

    // Add excludeStatus filter if provided
    if (excludeStatusParam) {
      const excludeStatus = excludeStatusParam.trim().toLowerCase();
      whereConditions.push(sql`${cycleCounts.status} != ${excludeStatus}`);
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(cycleCounts)
      .where(and(...whereConditions));

    // Get paginated data
    const counts = await db
      .select()
      .from(cycleCounts)
      .where(and(...whereConditions))
      .orderBy(desc(cycleCounts.createdAt))
      .limit(perPage)
      .offset(offset);

    const totalCount = totalResult?.count || 0;
    const totalPages = Math.ceil(totalCount / perPage);

    res.json({
      success: true,
      data: counts,
      pagination: {
        total: totalCount,
        totalPages,
        page,
        perPage,
      },
    });
  } catch (error) {
    console.error('Error fetching cycle counts:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/cycle-counts:
 *   post:
 *     tags:
 *       - Cycle Count
 *     security:
 *       - bearerAuth: []
 *     summary: Create a new cycle count
 *     description: Create a new cycle count with items already counted
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               countType:
 *                 type: string
 *                 description: Type of count
 *               inventoryTypeId:
 *                 type: string
 *                 description: Filter by inventory type
 *               zoneId:
 *                 type: string
 *                 description: Filter by zone
 *               binIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Selected bin IDs
 *               scheduledDate:
 *                 type: string
 *                 format: date
 *                 description: Scheduled date for the count
 *               notes:
 *                 type: string
 *                 description: Notes for the cycle count
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - inventoryItemId
 *                     - systemQuantity
 *                     - countedQuantity
 *                   properties:
 *                     inventoryItemId:
 *                       type: string
 *                       format: uuid
 *                       description: ID of the inventory item being counted
 *                     systemQuantity:
 *                       type: integer
 *                     countedQuantity:
 *                       type: integer
 *                     reason:
 *                       type: string
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Cycle count created successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
router.post('/cycle-counts', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { countType, inventoryTypeId, zoneId, binIds, scheduledDate, notes, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one counted item is required',
      });
    }

    // Fetch document numbering configuration
    const [docConfig] = await db
      .select()
      .from(documentNumberConfig)
      .where(
        and(
          eq(documentNumberConfig.tenantId, tenantId),
          eq(documentNumberConfig.documentType, 'CYCCOUNT'),
          eq(documentNumberConfig.isActive, true)
        )
      )
      .limit(1);

    if (!docConfig) {
      return res.status(500).json({
        success: false,
        message: 'Document numbering configuration not found for CYCCOUNT',
      });
    }

    // Generate cycle count number via document numbering service
    let countNumber: string;
    let documentHistoryId: string;
    
    try {
      const docNumberResult = await generateDocumentNumber({
        tenantId,
        documentType: 'CYCCOUNT',
        prefix1: docConfig.prefix1DefaultValue || null,
        prefix2: docConfig.prefix2DefaultValue || null,
        documentTableName: 'cycle_counts',
        userId,
      });
      
      countNumber = docNumberResult.documentNumber;
      documentHistoryId = docNumberResult.historyId;
    } catch (error: any) {
      console.error('Error generating cycle count number:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate cycle count number',
      });
    }

    // Create cycle count in transaction
    const result = await db.transaction(async (tx) => {
      // Create cycle count record
      const [cycleCount] = await tx
        .insert(cycleCounts)
        .values({
          id: uuidv4(),
          tenantId,
          countNumber,
          status: 'created',
          countType: countType || 'partial',
          scheduledDate: scheduledDate || sql`CURRENT_DATE`,
          notes,
          createdBy: userId,
        })
        .returning();

      // Validate and fetch inventory items
      const inventoryItemIds = items.map((item: any) => item.inventoryItemId);
      const inventoryItemsData = await tx
        .select()
        .from(inventoryItems)
        .where(
          and(
            inArray(inventoryItems.id, inventoryItemIds),
            eq(inventoryItems.tenantId, tenantId)
          )
        );

      // Create a map for quick lookup
      const inventoryItemMap = new Map(
        inventoryItemsData.map(ii => [ii.id, ii])
      );

      // Validate all inventory items exist
      const missingItems = inventoryItemIds.filter((id: string) => !inventoryItemMap.has(id));
      if (missingItems.length > 0) {
        throw new Error(`Inventory items not found: ${missingItems.join(', ')}`);
      }

      // Create cycle count items with direct inventory item reference
      const itemsToInsert = items.map((item: any) => {
        const invItem = inventoryItemMap.get(item.inventoryItemId)!;
        const variance = item.countedQuantity - item.systemQuantity;
        return {
          id: uuidv4(),
          cycleCountId: cycleCount.id,
          tenantId,
          inventoryItemId: item.inventoryItemId,
          productId: invItem.productId,
          binId: invItem.binId,
          systemQuantity: item.systemQuantity,
          countedQuantity: item.countedQuantity,
          varianceQuantity: variance,
          varianceAmount: null,
          reasonCode: item.reason || null,
          reasonDescription: item.notes || null,
          countedBy: userId,
          countedAt: new Date(),
        };
      });

      await tx.insert(cycleCountItems).values(itemsToInsert);

      return { cycleCount, itemsCount: itemsToInsert.length };
    });

    // Audit log
    await logAudit({
      tenantId,
      userId,
      module: 'inventory-items',
      action: 'create',
      resourceType: 'cycle_count',
      resourceId: result.cycleCount.id,
      description: `Created cycle count ${countNumber} with ${result.itemsCount} items`,
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      data: {
        id: result.cycleCount.id,
        countNumber: result.cycleCount.countNumber,
        itemsCount: result.itemsCount,
      },
    });
  } catch (error) {
    console.error('Error creating cycle count:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/cycle-counts/filter-options:
 *   get:
 *     tags:
 *       - Cycle Count
 *     security:
 *       - bearerAuth: []
 *     summary: Get filter options
 *     description: Get available filter options (inventory types, zones, bins) for creating a cycle count
 *     responses:
 *       200:
 *         description: Filter options retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/cycle-counts/filter-options', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;

    // Get inventory types (product types)
    const inventoryTypes = await db
      .select({
        id: productTypes.id,
        name: productTypes.name,
      })
      .from(productTypes)
      .where(
        and(
          eq(productTypes.tenantId, tenantId),
          eq(productTypes.isActive, true)
        )
      )
      .orderBy(productTypes.name);

    // Get zones with warehouse info
    const zonesData = await db
      .select({
        id: zones.id,
        name: zones.name,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
      })
      .from(zones)
      .innerJoin(warehouses, eq(zones.warehouseId, warehouses.id))
      .where(eq(zones.tenantId, tenantId))
      .orderBy(warehouses.name, zones.name);

    // Get bins with full hierarchy
    const binsData = await db
      .select({
        id: bins.id,
        name: bins.name,
        shelfId: shelves.id,
        shelfName: shelves.name,
        aisleId: aisles.id,
        aisleName: aisles.name,
        zoneId: zones.id,
        zoneName: zones.name,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
      })
      .from(bins)
      .innerJoin(shelves, eq(bins.shelfId, shelves.id))
      .innerJoin(aisles, eq(shelves.aisleId, aisles.id))
      .innerJoin(zones, eq(aisles.zoneId, zones.id))
      .innerJoin(warehouses, eq(zones.warehouseId, warehouses.id))
      .where(eq(bins.tenantId, tenantId))
      .orderBy(warehouses.name, zones.name, aisles.name, shelves.name, bins.name);

    // Count types are hardcoded
    const countTypes = [
      { value: 'full', label: 'Full' },
      { value: 'partial', label: 'Partial' },
      { value: 'spot', label: 'Spot' },
    ];

    res.json({
      success: true,
      data: {
        inventoryTypes,
        zones: zonesData,
        bins: binsData,
        countTypes,
      },
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/cycle-counts/search-sku:
 *   get:
 *     tags:
 *       - Cycle Count
 *     security:
 *       - bearerAuth: []
 *     summary: Search product by SKU
 *     description: Search for a product by SKU and return bins with stock for that product
 *     parameters:
 *       - in: query
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *         description: Product SKU to search for
 *     responses:
 *       200:
 *         description: Product and bins with stock found
 *       404:
 *         description: SKU not found
 *       401:
 *         description: Unauthorized
 */
router.get('/cycle-counts/search-sku', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { sku } = req.query;

    if (!sku || typeof sku !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'SKU parameter is required',
      });
    }

    // Find product by SKU
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          ilike(products.sku, `${sku.trim()}`)
        )
      )
      .limit(1);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'SKU not found',
      });
    }

    // Find all bins with stock for this product
    const inventoryWithBins = await db
      .select({
        inventoryItemId: inventoryItems.id,
        binId: bins.id,
        binName: bins.name,
        shelfId: shelves.id,
        shelfName: shelves.name,
        aisleId: aisles.id,
        aisleName: aisles.name,
        zoneId: zones.id,
        zoneName: zones.name,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
        availableQuantity: inventoryItems.availableQuantity,
      })
      .from(inventoryItems)
      .innerJoin(bins, eq(inventoryItems.binId, bins.id))
      .innerJoin(shelves, eq(bins.shelfId, shelves.id))
      .innerJoin(aisles, eq(shelves.aisleId, aisles.id))
      .innerJoin(zones, eq(aisles.zoneId, zones.id))
      .innerJoin(warehouses, eq(zones.warehouseId, warehouses.id))
      .where(
        and(
          eq(inventoryItems.tenantId, tenantId),
          eq(inventoryItems.productId, product.id)
        )
      )
      .orderBy(warehouses.name, zones.name, aisles.name, shelves.name, bins.name);

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          sku: product.sku,
          name: product.name,
        },
        bins: inventoryWithBins,
      },
    });
  } catch (error) {
    console.error('Error searching SKU:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/cycle-counts/items:
 *   get:
 *     tags:
 *       - Cycle Count
 *     security:
 *       - bearerAuth: []
 *     summary: Get inventory items for counting
 *     description: Get inventory items based on filters for creating a cycle count
 *     parameters:
 *       - in: query
 *         name: inventoryTypeId
 *         schema:
 *           type: string
 *         description: Filter by inventory type ID
 *       - in: query
 *         name: zoneId
 *         schema:
 *           type: string
 *         description: Filter by zone ID
 *       - in: query
 *         name: countType
 *         schema:
 *           type: string
 *         description: Type of count
 *       - in: query
 *         name: binIds
 *         schema:
 *           type: string
 *         description: Comma-separated bin IDs
 *     responses:
 *       200:
 *         description: List of inventory items for counting
 *       401:
 *         description: Unauthorized
 */
router.get('/cycle-counts/items', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { inventoryTypeId, zoneId, countType, binIds } = req.query;

    // Build query conditions
    const whereConditions = [eq(inventoryItems.tenantId, tenantId)];

    // Filter by inventory type (product type)
    if (inventoryTypeId) {
      whereConditions.push(eq(products.inventoryTypeId, inventoryTypeId as string));
    }

    // Filter by zone
    if (zoneId) {
      whereConditions.push(eq(zones.id, zoneId as string));
    }

    // Filter by specific bins if provided
    if (binIds && typeof binIds === 'string' && binIds.length > 0) {
      const binIdArray = binIds.split(',').filter(id => id.trim());
      if (binIdArray.length > 0) {
        whereConditions.push(inArray(inventoryItems.binId, binIdArray));
      }
    }

    // Fetch inventory items with full details
    const items = await db
      .select({
        id: inventoryItems.id,
        productId: products.id,
        productName: products.name,
        productSku: products.sku,
        binId: bins.id,
        binName: bins.name,
        shelfName: shelves.name,
        aisleName: aisles.name,
        zoneName: zones.name,
        warehouseName: warehouses.name,
        batchNumber: inventoryItems.batchNumber,
        lotNumber: inventoryItems.lotNumber,
        expiryDate: inventoryItems.expiryDate,
        systemQuantity: inventoryItems.availableQuantity,
      })
      .from(inventoryItems)
      .innerJoin(products, eq(inventoryItems.productId, products.id))
      .innerJoin(bins, eq(inventoryItems.binId, bins.id))
      .innerJoin(shelves, eq(bins.shelfId, shelves.id))
      .innerJoin(aisles, eq(shelves.aisleId, aisles.id))
      .innerJoin(zones, eq(aisles.zoneId, zones.id))
      .innerJoin(warehouses, eq(zones.warehouseId, warehouses.id))
      .where(and(...whereConditions))
      .orderBy(
        warehouses.name,
        zones.name,
        aisles.name,
        shelves.name,
        bins.name,
        products.name
      );

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error('Error fetching cycle count items:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/cycle-counts/{id}:
 *   get:
 *     tags:
 *       - Cycle Count
 *     security:
 *       - bearerAuth: []
 *     summary: Get cycle count by ID
 *     description: Get details of a specific cycle count
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle count ID
 *     responses:
 *       200:
 *         description: Cycle count details
 *       404:
 *         description: Cycle count not found
 *       401:
 *         description: Unauthorized
 */
router.get('/cycle-counts/:id', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const [cycleCount] = await db
      .select()
      .from(cycleCounts)
      .where(
        and(
          eq(cycleCounts.id, id),
          eq(cycleCounts.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!cycleCount) {
      return res.status(404).json({
        success: false,
        message: 'Cycle count not found',
      });
    }

    // Get total items count
    const [itemsCount] = await db
      .select({ count: count() })
      .from(cycleCountItems)
      .where(eq(cycleCountItems.cycleCountId, id));

    res.json({
      success: true,
      data: {
        ...cycleCount,
        itemsCount: itemsCount?.count || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching cycle count:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/cycle-counts/{id}/document:
 *   get:
 *     tags:
 *       - Cycle Count
 *     security:
 *       - bearerAuth: []
 *     summary: Get cycle count document
 *     description: Get the generated document path for a cycle count
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle count ID
 *     responses:
 *       200:
 *         description: Document path and details
 *       404:
 *         description: Cycle count or document not found
 *       401:
 *         description: Unauthorized
 */
router.get('/cycle-counts/:id/document', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    // Verify cycle count belongs to tenant
    const [cycleCount] = await db
      .select()
      .from(cycleCounts)
      .where(and(eq(cycleCounts.id, id), eq(cycleCounts.tenantId, tenantId)))
      .limit(1);

    if (!cycleCount) {
      return res.status(404).json({
        success: false,
        message: 'Cycle count not found',
      });
    }

    // Fetch document from generated_documents table
    const [document] = await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.tenantId, tenantId),
          eq(generatedDocuments.referenceType, 'cycle_count'),
          eq(generatedDocuments.referenceId, id),
          eq(generatedDocuments.documentType, 'CYCCOUNT')
        )
      )
      .limit(1);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found for this cycle count',
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
    console.error('Error fetching cycle count document:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/cycle-counts/{id}/items:
 *   get:
 *     tags:
 *       - Cycle Count
 *     security:
 *       - bearerAuth: []
 *     summary: Get cycle count items
 *     description: Get items of a cycle count with pagination and search
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle count ID
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product name or SKU
 *     responses:
 *       200:
 *         description: List of cycle count items
 *       404:
 *         description: Cycle count not found
 *       401:
 *         description: Unauthorized
 */
router.get('/cycle-counts/:id/items', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    // Verify cycle count exists and belongs to tenant
    const [cycleCount] = await db
      .select()
      .from(cycleCounts)
      .where(
        and(
          eq(cycleCounts.id, id),
          eq(cycleCounts.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!cycleCount) {
      return res.status(404).json({
        success: false,
        message: 'Cycle count not found',
      });
    }

    // Build where conditions
    const whereConditions = [eq(cycleCountItems.cycleCountId, id)];

    if (search) {
      whereConditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`)
        )!
      );
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(cycleCountItems)
      .leftJoin(products, eq(cycleCountItems.productId, products.id))
      .where(and(...whereConditions));

    // Get paginated items with full location hierarchy
    const items = await db
      .select({
        item: cycleCountItems,
        product: products,
        bin: bins,
        shelf: shelves,
        aisle: aisles,
        zone: zones,
        warehouse: warehouses,
      })
      .from(cycleCountItems)
      .innerJoin(products, eq(cycleCountItems.productId, products.id))
      .innerJoin(bins, eq(cycleCountItems.binId, bins.id))
      .innerJoin(shelves, eq(bins.shelfId, shelves.id))
      .innerJoin(aisles, eq(shelves.aisleId, aisles.id))
      .innerJoin(zones, eq(aisles.zoneId, zones.id))
      .innerJoin(warehouses, eq(zones.warehouseId, warehouses.id))
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset);

    // Format response
    const formattedItems = items.map(({ item, product, bin, shelf, aisle, zone, warehouse }) => ({
      id: item.id,
      binLocation: `${warehouse.name} → ${zone.name} → ${aisle.name} → ${shelf.name}`,
      binName: bin.name,
      binId: bin.id,
      productSku: product.sku,
      productName: product.name,
      systemQuantity: item.systemQuantity,
      countedQuantity: item.countedQuantity,
      varianceQuantity: item.varianceQuantity,
      reasonCode: item.reasonCode,
      reasonDescription: item.reasonDescription,
      countedAt: item.countedAt,
      warehouseName: warehouse.name,
    }));

    res.json({
      success: true,
      data: formattedItems,
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
    console.error('Error fetching cycle count items:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/cycle-counts/{id}:
 *   put:
 *     tags:
 *       - Cycle Count
 *     security:
 *       - bearerAuth: []
 *     summary: Update a cycle count
 *     description: Update a cycle count and its items (only for status 'created')
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle count ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduledDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     countedQuantity:
 *                       type: integer
 *                     reasonCode:
 *                       type: string
 *                     reasonDescription:
 *                       type: string
 *     responses:
 *       200:
 *         description: Cycle count updated successfully
 *       400:
 *         description: Cannot update - wrong status
 *       404:
 *         description: Cycle count not found
 *       401:
 *         description: Unauthorized
 */
router.put('/cycle-counts/:id', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { scheduledDate, notes, items } = req.body;

    // Verify cycle count exists and belongs to tenant
    const [cycleCount] = await db
      .select()
      .from(cycleCounts)
      .where(
        and(
          eq(cycleCounts.id, id),
          eq(cycleCounts.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!cycleCount) {
      return res.status(404).json({
        success: false,
        message: 'Cycle count not found',
      });
    }

    if (cycleCount.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: 'Only cycle counts with status "created" can be edited',
      });
    }

    // Update cycle count in transaction
    await db.transaction(async (tx) => {
      // Update cycle count metadata
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      if (scheduledDate !== undefined) {
        updateData.scheduledDate = scheduledDate || null;
      }
      
      if (notes !== undefined) {
        updateData.notes = notes || null;
      }

      await tx
        .update(cycleCounts)
        .set(updateData)
        .where(eq(cycleCounts.id, id));

      // Update items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (!item.itemId) continue;

          // Get existing item
          const [existingItem] = await tx
            .select()
            .from(cycleCountItems)
            .where(
              and(
                eq(cycleCountItems.id, item.itemId),
                eq(cycleCountItems.cycleCountId, id)
              )
            )
            .limit(1);

          if (!existingItem) continue;

          // Build update data for item
          const itemUpdateData: any = {};

          // Handle reasonCode and reasonDescription updates
          if (item.reasonCode !== undefined) {
            itemUpdateData.reasonCode = item.reasonCode || null;
          }
          if (item.reasonDescription !== undefined) {
            itemUpdateData.reasonDescription = item.reasonDescription || null;
          }

          // Only update if countedQuantity is a valid number (not null/undefined)
          if (item.countedQuantity !== null && item.countedQuantity !== undefined) {
            const variance = item.countedQuantity - existingItem.systemQuantity;
            
            itemUpdateData.countedQuantity = item.countedQuantity;
            itemUpdateData.varianceQuantity = variance;
            itemUpdateData.countedBy = userId;
            itemUpdateData.countedAt = new Date();
            
            // If variance is 0, clear reason code and notes (no variance to explain)
            if (variance === 0) {
              itemUpdateData.reasonCode = null;
              itemUpdateData.reasonDescription = null;
            }
          } else if (item.countedQuantity === null) {
            // If clearing a counted quantity, reset all variance and audit fields to null
            itemUpdateData.countedQuantity = null;
            itemUpdateData.varianceQuantity = null;
            itemUpdateData.varianceAmount = null;
            itemUpdateData.countedBy = null;
            itemUpdateData.countedAt = null;
            itemUpdateData.reasonCode = null;
            itemUpdateData.reasonDescription = null;
          }

          // Only update if there's something to update
          if (Object.keys(itemUpdateData).length > 0) {
            await tx
              .update(cycleCountItems)
              .set(itemUpdateData)
              .where(eq(cycleCountItems.id, item.itemId));
          }
        }
      }
    });

    // Audit log
    await logAudit({
      tenantId,
      userId,
      module: 'inventory-items',
      action: 'update',
      resourceType: 'cycle_count',
      resourceId: id,
      description: `Updated cycle count ${cycleCount.countNumber}`,
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      message: 'Cycle count updated successfully',
    });
  } catch (error) {
    console.error('Error updating cycle count:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/cycle-counts/{id}/approve:
 *   put:
 *     tags:
 *       - Cycle Count
 *     security:
 *       - bearerAuth: []
 *     summary: Approve a cycle count
 *     description: Approve a cycle count, generate document, and auto-create adjustment for items with variances
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle count ID
 *     responses:
 *       200:
 *         description: Cycle count approved successfully
 *       400:
 *         description: Cannot approve - wrong status
 *       404:
 *         description: Cycle count not found
 *       401:
 *         description: Unauthorized
 */
router.put('/cycle-counts/:id/approve', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    // Verify cycle count exists and belongs to tenant
    const [cycleCount] = await db
      .select()
      .from(cycleCounts)
      .where(
        and(
          eq(cycleCounts.id, id),
          eq(cycleCounts.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!cycleCount) {
      return res.status(404).json({
        success: false,
        message: 'Cycle count not found',
      });
    }

    if (cycleCount.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: 'Only cycle counts with status "created" can be approved',
      });
    }

    // Execute transaction for approval, document generation, and adjustment creation
    const result = await db.transaction(async (tx) => {
      // Get cycle count items with full details for document generation (NO inventory join to avoid duplicates)
      const cycleCountItemsData = await tx
        .select({
          item: cycleCountItems,
          product: products,
          bin: bins,
          shelf: shelves,
          aisle: aisles,
          zone: zones,
          warehouse: warehouses,
        })
        .from(cycleCountItems)
        .innerJoin(products, eq(cycleCountItems.productId, products.id))
        .innerJoin(bins, eq(cycleCountItems.binId, bins.id))
        .innerJoin(shelves, eq(bins.shelfId, shelves.id))
        .innerJoin(aisles, eq(shelves.aisleId, aisles.id))
        .innerJoin(zones, eq(aisles.zoneId, zones.id))
        .innerJoin(warehouses, eq(zones.warehouseId, warehouses.id))
        .where(eq(cycleCountItems.cycleCountId, id));

      if (cycleCountItemsData.length === 0) {
        throw new Error('Cycle count has no items');
      }

      // Get user information for document (inside transaction)
      const [creator, approver] = await Promise.all([
        tx.select({ email: user.email }).from(user).where(eq(user.id, cycleCount.createdBy!)).limit(1),
        tx.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1)
      ]);

      const creatorEmail = creator?.[0]?.email || 'Unknown';
      const approverEmail = approver?.[0]?.email || 'Unknown';
      // Update cycle count status to approved
      await tx
        .update(cycleCounts)
        .set({
          status: 'approved',
          completedDate: sql`CURRENT_DATE`,
          approvedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(cycleCounts.id, id));

      // Generate cycle count document
      const cycleCountDocData = {
        cycleCountId: cycleCount.id,
        countNumber: cycleCount.countNumber,
        tenantId,
        countType: cycleCount.countType || 'partial',
        scheduledDate: cycleCount.scheduledDate || new Date(),
        createdDate: cycleCount.createdAt,
        approvedDate: new Date(),
        createdBy: creatorEmail,
        approvedBy: approverEmail,
        notes: cycleCount.notes,
        items: cycleCountItemsData.map(({ item, product, bin, shelf, aisle, zone, warehouse }) => ({
          productSku: product.sku,
          productName: product.name,
          binName: bin.name,
          shelfName: shelf.name,
          aisleName: aisle.name,
          zoneName: zone.name,
          warehouseName: warehouse.name,
          systemQuantity: item.systemQuantity,
          countedQuantity: item.countedQuantity,
          varianceQuantity: item.varianceQuantity,
          reasonCode: item.reasonCode,
          reasonDescription: item.reasonDescription,
        })),
      };

      const cycleCountDocPath = await CycleCountDocumentGenerator.generateAndSave(cycleCountDocData, userId, tx);

      // Filter items with variances (only create adjustment if there are differences)
      const itemsWithVariances = cycleCountItemsData.filter(({ item }) => item.varianceQuantity !== null && item.varianceQuantity !== 0);

      let adjustmentId: string | null = null;
      let adjustmentNumber: string | null = null;

      if (itemsWithVariances.length > 0) {
        // Generate adjustment number
        const [adjDocConfig] = await tx
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

        if (!adjDocConfig) {
          throw new Error('Document numbering configuration not found for STOCKADJ');
        }

        const docNumberResult = await generateDocumentNumber({
          tenantId,
          documentType: 'STOCKADJ',
          prefix1: adjDocConfig.prefix1DefaultValue || null,
          prefix2: adjDocConfig.prefix2DefaultValue || null,
          documentTableName: 'adjustments',
          userId,
        });

        adjustmentNumber = docNumberResult.documentNumber;

        // Create adjustment record
        const [adjustment] = await tx
          .insert(adjustments)
          .values({
            id: uuidv4(),
            tenantId,
            adjustmentNumber,
            status: 'created',
            type: 'cycle_count',
            cycleCountId: id,
            notes: `Auto-created from cycle count ${cycleCount.countNumber}`,
            createdBy: userId,
          })
          .returning();

        adjustmentId = adjustment.id;

        // Create adjustment items using direct inventoryItemId reference (no lookups needed!)
        const adjustmentItemsToInsert = itemsWithVariances.map(({ item }) => ({
          id: uuidv4(),
          adjustmentId: adjustment.id,
          tenantId,
          inventoryItemId: item.inventoryItemId,
          oldQuantity: item.systemQuantity,
          newQuantity: item.countedQuantity!,
          quantityDifference: item.varianceQuantity!,
          reasonCode: item.reasonCode || 'UNKNOWN',
          notes: item.reasonDescription || `Variance detected during cycle count ${cycleCount.countNumber}`,
        }));

        await tx.insert(adjustmentItems).values(adjustmentItemsToInsert);

        // Note: Adjustment document will be generated when the adjustment is approved
      }

      return {
        cycleCountDocPath,
        adjustmentId,
        adjustmentNumber,
        varianceCount: itemsWithVariances.length,
      };
    });

    // Audit log for cycle count approval
    await logAudit({
      tenantId,
      userId,
      module: 'inventory-items',
      action: 'approve',
      resourceType: 'cycle_count',
      resourceId: id,
      description: `Approved cycle count ${cycleCount.countNumber}`,
      documentPath: result.cycleCountDocPath,
      changedFields: {
        itemsWithVariance: result.varianceCount,
        adjustmentCreated: result.adjustmentId ? true : false,
        adjustmentNumber: result.adjustmentNumber,
      },
      ipAddress: getClientIp(req),
    });

    // Audit log for auto-created adjustment (if created)
    if (result.adjustmentId && result.adjustmentNumber) {
      await logAudit({
        tenantId,
        userId,
        module: 'inventory-items',
        action: 'create',
        resourceType: 'adjustment',
        resourceId: result.adjustmentId,
        description: `Auto-created adjustment ${result.adjustmentNumber} from cycle count ${cycleCount.countNumber} (document will be generated upon approval)`,
        changedFields: {
          sourceType: 'cycle_count',
          sourceCycleCount: cycleCount.countNumber,
          itemsCount: result.varianceCount,
        },
        ipAddress: getClientIp(req),
      });
    }

    res.json({
      success: true,
      message: 'Cycle count approved successfully',
      data: {
        cycleCountDocument: result.cycleCountDocPath,
        adjustmentCreated: result.adjustmentId ? true : false,
        adjustmentNumber: result.adjustmentNumber,
        itemsWithVariance: result.varianceCount,
      },
    });
  } catch (error) {
    console.error('Error approving cycle count:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/cycle-counts/{id}/reject:
 *   put:
 *     tags:
 *       - Cycle Count
 *     security:
 *       - bearerAuth: []
 *     summary: Reject a cycle count
 *     description: Reject a cycle count (only for status 'created')
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle count ID
 *     responses:
 *       200:
 *         description: Cycle count rejected successfully
 *       400:
 *         description: Cannot reject - wrong status
 *       404:
 *         description: Cycle count not found
 *       401:
 *         description: Unauthorized
 */
router.put('/cycle-counts/:id/reject', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    // Verify cycle count exists and belongs to tenant
    const [cycleCount] = await db
      .select()
      .from(cycleCounts)
      .where(
        and(
          eq(cycleCounts.id, id),
          eq(cycleCounts.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!cycleCount) {
      return res.status(404).json({
        success: false,
        message: 'Cycle count not found',
      });
    }

    if (cycleCount.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: 'Only cycle counts with status "created" can be rejected',
      });
    }

    // Update status to rejected
    await db
      .update(cycleCounts)
      .set({
        status: 'rejected',
        completedDate: sql`CURRENT_DATE`,
        approvedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(cycleCounts.id, id));

    // Audit log
    await logAudit({
      tenantId,
      userId,
      module: 'inventory-items',
      action: 'reject',
      resourceType: 'cycle_count',
      resourceId: id,
      description: `Rejected cycle count ${cycleCount.countNumber}`,
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      message: 'Cycle count rejected successfully',
    });
  } catch (error) {
    console.error('Error rejecting cycle count:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/cycle-counts/{id}:
 *   delete:
 *     tags:
 *       - Cycle Count
 *     security:
 *       - bearerAuth: []
 *     summary: Delete a cycle count
 *     description: Delete a cycle count (only for status 'created')
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle count ID
 *     responses:
 *       200:
 *         description: Cycle count deleted successfully
 *       400:
 *         description: Cannot delete - wrong status
 *       404:
 *         description: Cycle count not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/cycle-counts/:id', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    // Verify cycle count exists and belongs to tenant
    const [cycleCount] = await db
      .select()
      .from(cycleCounts)
      .where(
        and(
          eq(cycleCounts.id, id),
          eq(cycleCounts.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!cycleCount) {
      return res.status(404).json({
        success: false,
        message: 'Cycle count not found',
      });
    }

    // Only allow deletion of counts with 'created' status
    if (cycleCount.status !== 'created') {
      return res.status(400).json({
        success: false,
        message: 'Only cycle counts with status "created" can be deleted',
      });
    }

    // Delete items first (due to foreign key constraint)
    await db
      .delete(cycleCountItems)
      .where(eq(cycleCountItems.cycleCountId, id));

    // Delete the cycle count
    await db
      .delete(cycleCounts)
      .where(eq(cycleCounts.id, id));

    // Audit log
    await logAudit({
      tenantId,
      userId,
      module: 'inventory-items',
      action: 'delete',
      resourceType: 'cycle_count',
      resourceId: id,
      description: `Deleted cycle count ${cycleCount.countNumber}`,
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      message: 'Cycle count deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting cycle count:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
