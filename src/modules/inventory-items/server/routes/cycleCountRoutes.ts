import express from 'express';
import { db } from '@server/lib/db';
import { cycleCounts, cycleCountItems } from '../lib/db/schemas/cycleCount';
import { inventoryItems } from '../lib/db/schemas/inventoryItems';
import { products, productTypes } from '@modules/master-data/server/lib/db/schemas/masterData';
import { bins, shelves, aisles, zones, warehouses } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';
import { authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, sql, or } from 'drizzle-orm';
import { logAudit, getClientIp } from '@server/services/auditService';
import { v4 as uuidv4 } from 'uuid';

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

    const whereConditions = [eq(cycleCounts.tenantId, tenantId)];

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
 * POST /api/modules/inventory-items/cycle-counts/start
 * Start a new cycle count session
 */
router.post('/cycle-counts/start', authorized('ADMIN', 'inventory-items.manage'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { inventoryTypeId, zoneId, countType, binIds } = req.body;

    // Generate cycle count number: CC-ddmmyyyy-XXXX
    const now = new Date();
    const dd = now.getDate().toString().padStart(2, '0');
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = now.getFullYear();
    const baseNumber = `CC-${dd}${mm}${yyyy}`;

    // Find next sequence number for this date
    const existingCounts = await db
      .select({ countNumber: cycleCounts.countNumber })
      .from(cycleCounts)
      .where(
        and(
          eq(cycleCounts.tenantId, tenantId),
          ilike(cycleCounts.countNumber, `${baseNumber}%`)
        )
      );

    let sequence = 1;
    if (existingCounts.length > 0) {
      const sequences = existingCounts
        .map(c => {
          const match = c.countNumber.match(/-(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(n => n > 0);
      
      if (sequences.length > 0) {
        sequence = Math.max(...sequences) + 1;
      }
    }

    const uniqueCountNumber = existingCounts.length === 0 && sequence === 1
      ? baseNumber
      : `${baseNumber}-${sequence.toString().padStart(4, '0')}`;

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
        whereConditions.push(
          sql`${inventoryItems.binId} IN (${sql.raw(binIdArray.map(() => '?').join(','))})`
        );
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
      binLocation: `${zone.name}.${aisle.name}.${shelf.name}.${bin.name}`,
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
