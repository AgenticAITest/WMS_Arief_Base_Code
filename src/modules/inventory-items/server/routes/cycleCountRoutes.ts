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
 * GET /api/modules/inventory-items/cycle-counts
 * List all cycle counts with pagination
 */
router.get('/cycle-counts', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const statusParam = req.query.status as string;

    const whereConditions = [eq(cycleCounts.tenantId, tenantId)];

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
      whereConditions.push(eq(cycleCounts.status, status));
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
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: counts,
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
    console.error('Error fetching cycle counts:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/modules/inventory-items/cycle-counts
 * Create a new cycle count with counted items
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

      // Create cycle count items
      const itemsToInsert = items.map((item: any) => {
        const variance = item.countedQuantity - item.systemQuantity;
        return {
          id: uuidv4(),
          cycleCountId: cycleCount.id,
          tenantId,
          productId: item.productId,
          binId: item.binId,
          systemQuantity: item.systemQuantity,
          countedQuantity: item.countedQuantity,
          varianceQuantity: variance,
          varianceAmount: null, // Can be calculated later if needed
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
 * POST /api/modules/inventory-items/cycle-counts/start
 * Start a new cycle count session
 */
router.post('/cycle-counts/start', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { inventoryTypeId, zoneId, countType, binIds } = req.body;

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
    let uniqueCountNumber: string;
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
      
      uniqueCountNumber = docNumberResult.documentNumber;
      documentHistoryId = docNumberResult.historyId;
    } catch (error: any) {
      console.error('Error generating cycle count number:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate cycle count number',
      });
    }

    // Build query to get inventory items based on filters
    let query = db
      .select({
        inventoryItem: inventoryItems,
        product: products,
        bin: bins,
        shelf: shelves,
        aisle: aisles,
        zone: zones,
        warehouse: warehouses,
      })
      .from(inventoryItems)
      .innerJoin(products, eq(inventoryItems.productId, products.id))
      .innerJoin(bins, eq(inventoryItems.binId, bins.id))
      .innerJoin(shelves, eq(bins.shelfId, shelves.id))
      .innerJoin(aisles, eq(shelves.aisleId, aisles.id))
      .innerJoin(zones, eq(aisles.zoneId, zones.id))
      .innerJoin(warehouses, eq(zones.warehouseId, warehouses.id))
      .$dynamic();

    const conditions = [eq(inventoryItems.tenantId, tenantId)];

    if (inventoryTypeId) {
      conditions.push(eq(products.inventoryTypeId, inventoryTypeId));
    }

    if (zoneId) {
      conditions.push(eq(zones.id, zoneId));
    }

    if (binIds && binIds.length > 0) {
      conditions.push(sql`${bins.id} = ANY(${binIds})`);
    }

    const inventoryData = await query.where(and(...conditions));

    if (inventoryData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No inventory items found for the selected filters',
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
          countNumber: uniqueCountNumber,
          status: 'created',
          countType: countType || 'partial',
          scheduledDate: sql`CURRENT_DATE`,
          createdBy: userId,
        })
        .returning();

      // Create cycle count items
      const itemsToInsert = inventoryData.map(({ inventoryItem, product, bin }) => ({
        id: uuidv4(),
        cycleCountId: cycleCount.id,
        tenantId,
        productId: product.id,
        binId: bin.id,
        systemQuantity: inventoryItem.availableQuantity,
        countedQuantity: null,
        varianceQuantity: null,
        varianceAmount: null,
      }));

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
      description: `Started cycle count ${uniqueCountNumber} with ${result.itemsCount} items`,
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
    console.error('Error starting cycle count:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/modules/inventory-items/cycle-counts/filter-options
 * Get filter options for cycle count creation
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
 * GET /api/modules/inventory-items/cycle-counts/search-sku
 * Search for product by SKU and return bins with stock
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
 * GET /api/modules/inventory-items/cycle-counts/items
 * Get inventory items for cycle count based on filters
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
 * GET /api/modules/inventory-items/cycle-counts/:id
 * Get cycle count details
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
 * GET /api/modules/inventory-items/cycle-counts/:id/document
 * Get generated document path for a cycle count
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
 * GET /api/modules/inventory-items/cycle-counts/:id/items
 * Get cycle count items with pagination and search
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
 * PUT /api/modules/inventory-items/cycle-counts/:id
 * Update a cycle count and its items
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
          } else if (item.countedQuantity === null) {
            // If clearing a counted quantity, reset all variance and audit fields to null
            itemUpdateData.countedQuantity = null;
            itemUpdateData.varianceQuantity = null;
            itemUpdateData.varianceAmount = null;
            itemUpdateData.countedBy = null;
            itemUpdateData.countedAt = null;
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
 * PUT /api/modules/inventory-items/cycle-counts/:id/approve
 * Approve a cycle count, generate document, and auto-create adjustment for items with variances
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
      // Get cycle count items with full details (inside transaction)
      const cycleCountItemsData = await tx
        .select({
          item: cycleCountItems,
          product: products,
          bin: bins,
          shelf: shelves,
          aisle: aisles,
          zone: zones,
          warehouse: warehouses,
          inventoryItem: inventoryItems,
        })
        .from(cycleCountItems)
        .innerJoin(products, eq(cycleCountItems.productId, products.id))
        .innerJoin(bins, eq(cycleCountItems.binId, bins.id))
        .innerJoin(shelves, eq(bins.shelfId, shelves.id))
        .innerJoin(aisles, eq(shelves.aisleId, aisles.id))
        .innerJoin(zones, eq(aisles.zoneId, zones.id))
        .innerJoin(warehouses, eq(zones.warehouseId, warehouses.id))
        .leftJoin(inventoryItems, and(
          eq(inventoryItems.productId, cycleCountItems.productId),
          eq(inventoryItems.binId, cycleCountItems.binId),
          eq(inventoryItems.tenantId, tenantId)
        ))
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

        // Validate all inventory items exist before creating adjustment items
        const missingInventoryItems = itemsWithVariances.filter(({ inventoryItem }) => !inventoryItem);
        if (missingInventoryItems.length > 0) {
          const missingDetails = missingInventoryItems
            .map(({ item, product }) => `${product?.sku || 'Unknown SKU'} in bin ${item.binId}`)
            .join(', ');
          throw new Error(`Cannot create adjustment: inventory records missing for: ${missingDetails}`);
        }

        // Create adjustment items (only for items with variances)
        const adjustmentItemsToInsert = itemsWithVariances.map(({ item, inventoryItem }) => {
          const quantityDifference = item.varianceQuantity!;

          return {
            id: uuidv4(),
            adjustmentId: adjustment.id,
            tenantId,
            inventoryItemId: inventoryItem!.id,
            oldQuantity: item.systemQuantity,
            newQuantity: item.countedQuantity!,
            quantityDifference,
            reasonCode: item.reasonCode || 'UNKNOWN',
            notes: item.reasonDescription || `Variance detected during cycle count ${cycleCount.countNumber}`,
          };
        });

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
 * PUT /api/modules/inventory-items/cycle-counts/:id/reject
 * Reject a cycle count
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
 * PUT /api/modules/inventory-items/cycle-counts/:id/items/:itemId
 * Update a cycle count item
 */
router.put('/cycle-counts/:id/items/:itemId', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { countedQuantity, reasonCode, reasonDescription } = req.body;

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
        message: 'Cannot update items for a cycle count that is not in created status',
      });
    }

    // Get item to calculate variance
    const [item] = await db
      .select()
      .from(cycleCountItems)
      .where(
        and(
          eq(cycleCountItems.id, itemId),
          eq(cycleCountItems.cycleCountId, id)
        )
      )
      .limit(1);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cycle count item not found',
      });
    }

    // Calculate variance (server-side)
    const varianceQuantity = countedQuantity !== null && countedQuantity !== undefined
      ? countedQuantity - item.systemQuantity
      : null;

    // Get product to calculate variance amount
    const [product] = await db
      .select({
        costPerUnit: sql<string>`COALESCE(${inventoryItems.costPerUnit}, 0)`,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.productId, item.productId),
          eq(inventoryItems.binId, item.binId),
          eq(inventoryItems.tenantId, tenantId)
        )
      )
      .limit(1);

    const varianceAmount = varianceQuantity !== null && product
      ? varianceQuantity * parseFloat(product.costPerUnit || '0')
      : null;

    // Update item with calculated variance
    const [updatedItem] = await db
      .update(cycleCountItems)
      .set({
        countedQuantity,
        varianceQuantity,
        varianceAmount: varianceAmount !== null ? varianceAmount.toString() : null,
        reasonCode,
        reasonDescription,
        countedBy: userId,
        countedAt: new Date(),
      })
      .where(eq(cycleCountItems.id, itemId))
      .returning();

    res.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    console.error('Error updating cycle count item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/modules/inventory-items/cycle-counts/:id/submit
 * Submit a cycle count
 */
router.post('/cycle-counts/:id/submit', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
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
          eq(cycleCounts.tenantId, tenantId),
          eq(cycleCounts.status, 'created')
        )
      )
      .limit(1);

    if (!cycleCount) {
      return res.status(404).json({
        success: false,
        message: 'Cycle count not found or already submitted',
      });
    }

    // Calculate total variance amount
    const varianceResult = await db
      .select({
        totalVariance: sql<number>`COALESCE(SUM(${cycleCountItems.varianceAmount}), 0)`,
      })
      .from(cycleCountItems)
      .where(eq(cycleCountItems.cycleCountId, id));

    const totalVarianceAmount = varianceResult[0]?.totalVariance || 0;

    // Update cycle count status to completed
    const [updatedCount] = await db
      .update(cycleCounts)
      .set({
        status: 'completed',
        completedDate: sql`CURRENT_DATE`,
        totalVarianceAmount: totalVarianceAmount.toString(),
        updatedAt: new Date(),
      })
      .where(eq(cycleCounts.id, id))
      .returning();

    // Audit log
    await logAudit({
      tenantId,
      userId,
      module: 'inventory-items',
      action: 'update',
      resourceType: 'cycle_count',
      resourceId: id,
      description: `Submitted cycle count ${cycleCount.countNumber}`,
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      data: updatedCount,
    });
  } catch (error) {
    console.error('Error submitting cycle count:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
