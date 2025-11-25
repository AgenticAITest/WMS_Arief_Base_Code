import express from 'express';
import { db } from '@server/lib/db';
import { movementHistory } from '../lib/db/schemas/movementHistory';
import { inventoryItems } from '../lib/db/schemas/inventoryItems';
import { products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { bins, shelves, aisles, zones, warehouses } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';
import { user } from '@server/lib/db/schema/system';
import { authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, sql, or, gte, lte } from 'drizzle-orm';
import { Parser } from 'json2csv';

const router = express.Router();

/**
 * GET /api/modules/inventory-items/movement-history
 * List all movement history with pagination, search, and filters
 */
router.get('/movement-history', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string; // SKU or product name
    const movementType = req.query.movementType as string; // putaway, pick, adjustment, relocation
    const dateFrom = req.query.dateFrom as string; // YYYY-MM-DD
    const dateTo = req.query.dateTo as string; // YYYY-MM-DD

    const whereConditions = [eq(movementHistory.tenantId, tenantId)];

    // Filter by movement type
    if (movementType) {
      const validTypes = ['putaway', 'pick', 'adjustment', 'relocation'];
      if (!validTypes.includes(movementType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid movement type. Allowed values: ${validTypes.join(', ')}`,
        });
      }
      whereConditions.push(eq(movementHistory.movementType, movementType));
    }

    // Filter by date range
    if (dateFrom) {
      whereConditions.push(gte(movementHistory.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999); // End of day
      whereConditions.push(lte(movementHistory.createdAt, endDate));
    }

    // Search by SKU or product name
    let searchCondition = null;
    if (search) {
      searchCondition = or(
        ilike(products.sku, `%${search}%`),
        ilike(products.name, `%${search}%`)
      );
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(movementHistory)
      .leftJoin(inventoryItems, eq(movementHistory.inventoryItemId, inventoryItems.id))
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .where(and(...whereConditions, searchCondition || undefined));

    // Get paginated data with full details
    const movements = await db
      .select({
        id: movementHistory.id,
        tenantId: movementHistory.tenantId,
        userId: movementHistory.userId,
        userName: user.fullname,
        inventoryItemId: movementHistory.inventoryItemId,
        binId: movementHistory.binId,
        binName: bins.name,
        locationPath: sql<string>`${warehouses.name} || ' > ' || ${zones.name} || ' > ' || ${aisles.name} || ' > ' || ${shelves.name} || ' > ' || ${bins.name}`,
        productId: inventoryItems.productId,
        productSku: products.sku,
        productName: products.name,
        quantityChanged: movementHistory.quantityChanged,
        movementType: movementHistory.movementType,
        referenceType: movementHistory.referenceType,
        referenceId: movementHistory.referenceId,
        referenceNumber: movementHistory.referenceNumber,
        notes: movementHistory.notes,
        createdAt: movementHistory.createdAt,
      })
      .from(movementHistory)
      .leftJoin(user, eq(movementHistory.userId, user.id))
      .leftJoin(inventoryItems, eq(movementHistory.inventoryItemId, inventoryItems.id))
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .leftJoin(bins, eq(movementHistory.binId, bins.id))
      .leftJoin(shelves, eq(bins.shelfId, shelves.id))
      .leftJoin(aisles, eq(shelves.aisleId, aisles.id))
      .leftJoin(zones, eq(aisles.zoneId, zones.id))
      .leftJoin(warehouses, eq(zones.warehouseId, warehouses.id))
      .where(and(...whereConditions, searchCondition || undefined))
      .orderBy(desc(movementHistory.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = totalResult?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: movements,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching movement history:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/modules/inventory-items/movement-history/:id
 * Get detailed information about a specific movement
 */
router.get('/movement-history/:id', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [movement] = await db
      .select({
        id: movementHistory.id,
        tenantId: movementHistory.tenantId,
        userId: movementHistory.userId,
        userName: user.fullname,
        inventoryItemId: movementHistory.inventoryItemId,
        binId: movementHistory.binId,
        binName: bins.name,
        locationPath: sql<string>`${warehouses.name} || ' > ' || ${zones.name} || ' > ' || ${aisles.name} || ' > ' || ${shelves.name} || ' > ' || ${bins.name}`,
        productId: inventoryItems.productId,
        productSku: products.sku,
        productName: products.name,
        quantityChanged: movementHistory.quantityChanged,
        movementType: movementHistory.movementType,
        referenceType: movementHistory.referenceType,
        referenceId: movementHistory.referenceId,
        referenceNumber: movementHistory.referenceNumber,
        notes: movementHistory.notes,
        createdAt: movementHistory.createdAt,
      })
      .from(movementHistory)
      .leftJoin(user, eq(movementHistory.userId, user.id))
      .leftJoin(inventoryItems, eq(movementHistory.inventoryItemId, inventoryItems.id))
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .leftJoin(bins, eq(movementHistory.binId, bins.id))
      .leftJoin(shelves, eq(bins.shelfId, shelves.id))
      .leftJoin(aisles, eq(shelves.aisleId, aisles.id))
      .leftJoin(zones, eq(aisles.zoneId, zones.id))
      .leftJoin(warehouses, eq(zones.warehouseId, warehouses.id))
      .where(and(eq(movementHistory.id, id), eq(movementHistory.tenantId, tenantId)))
      .limit(1);

    if (!movement) {
      return res.status(404).json({
        success: false,
        message: 'Movement history record not found',
      });
    }

    res.json({
      success: true,
      data: movement,
    });
  } catch (error) {
    console.error('Error fetching movement history details:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/modules/inventory-items/movement-history/export/csv
 * Export movement history to CSV
 */
router.get('/movement-history/export/csv', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const search = req.query.search as string;
    const movementType = req.query.movementType as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    const whereConditions = [eq(movementHistory.tenantId, tenantId)];

    // Apply same filters as list endpoint
    if (movementType) {
      const validTypes = ['putaway', 'pick', 'adjustment', 'relocation'];
      if (!validTypes.includes(movementType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid movement type. Allowed values: ${validTypes.join(', ')}`,
        });
      }
      whereConditions.push(eq(movementHistory.movementType, movementType));
    }

    if (dateFrom) {
      whereConditions.push(gte(movementHistory.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      whereConditions.push(lte(movementHistory.createdAt, endDate));
    }

    let searchCondition = null;
    if (search) {
      searchCondition = or(
        ilike(products.sku, `%${search}%`),
        ilike(products.name, `%${search}%`)
      );
    }

    // Get all matching records (no pagination for export)
    const movements = await db
      .select({
        referenceNumber: movementHistory.referenceNumber,
        movementType: movementHistory.movementType,
        productSku: products.sku,
        productName: products.name,
        locationPath: sql<string>`${warehouses.name} || ' > ' || ${zones.name} || ' > ' || ${aisles.name} || ' > ' || ${shelves.name} || ' > ' || ${bins.name}`,
        quantityChanged: movementHistory.quantityChanged,
        userName: user.fullname,
        notes: movementHistory.notes,
        createdAt: movementHistory.createdAt,
      })
      .from(movementHistory)
      .leftJoin(user, eq(movementHistory.userId, user.id))
      .leftJoin(inventoryItems, eq(movementHistory.inventoryItemId, inventoryItems.id))
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .leftJoin(bins, eq(movementHistory.binId, bins.id))
      .leftJoin(shelves, eq(bins.shelfId, shelves.id))
      .leftJoin(aisles, eq(shelves.aisleId, aisles.id))
      .leftJoin(zones, eq(aisles.zoneId, zones.id))
      .leftJoin(warehouses, eq(zones.warehouseId, warehouses.id))
      .where(and(...whereConditions, searchCondition || undefined))
      .orderBy(desc(movementHistory.createdAt));

    // Format data for CSV
    const csvData = movements.map(m => ({
      'Reference Number': m.referenceNumber || '',
      'Movement Type': m.movementType || '',
      'SKU': m.productSku || '',
      'Product Name': m.productName || '',
      'Location': m.locationPath || '',
      'Quantity Changed': m.quantityChanged || 0,
      'User': m.userName || '',
      'Notes': m.notes || '',
      'Date': m.createdAt ? new Date(m.createdAt).toLocaleString() : '',
    }));

    // Generate CSV
    const parser = new Parser();
    const csv = parser.parse(csvData);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=movement-history-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting movement history to CSV:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
