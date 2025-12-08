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
 * @swagger
 * /api/modules/inventory-items/movement-history:
 *   get:
 *     summary: Get movement history with pagination, search, and filters
 *     tags: [Inventory Items - Movement History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (starting from 1)
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Records per page (max 500)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by SKU or product name
 *       - in: query
 *         name: movementType
 *         schema:
 *           type: string
 *           enum: [all, putaway, pick, adjustment, relocation]
 *         description: Filter by movement type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter movements from this date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter movements until this date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of movement history records with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       productSku:
 *                         type: string
 *                       productName:
 *                         type: string
 *                       locationPath:
 *                         type: string
 *                       quantityChanged:
 *                         type: number
 *                       movementType:
 *                         type: string
 *                       referenceNumber:
 *                         type: string
 *                       userName:
 *                         type: string
 *                       notes:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     perPage:
 *                       type: integer
 *       400:
 *         description: Invalid movement type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/movement-history', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const perPage = Math.min(Math.max(1, parseInt(req.query.perPage as string) || 20), 500);
    const offset = (page - 1) * perPage;
    const search = req.query.search as string;
    const movementType = req.query.movementType as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    const whereConditions = [eq(movementHistory.tenantId, tenantId)];

    // Filter by movement type
    if (movementType && movementType !== 'all') {
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
      .limit(perPage)
      .offset(offset);

    const totalCount = totalResult?.count || 0;
    const totalPages = Math.ceil(totalCount / perPage);

    res.json({
      success: true,
      data: movements,
      pagination: {
        total: totalCount,
        totalPages,
        page,
        perPage,
      },
    });
  } catch (error) {
    console.error('Error fetching movement history:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/movement-history/{id}:
 *   get:
 *     summary: Get detailed information about a specific movement
 *     tags: [Inventory Items - Movement History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Movement history record ID
 *     responses:
 *       200:
 *         description: Detailed movement record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     productSku:
 *                       type: string
 *                     productName:
 *                       type: string
 *                     locationPath:
 *                       type: string
 *                     quantityChanged:
 *                       type: number
 *                     movementType:
 *                       type: string
 *                     referenceNumber:
 *                       type: string
 *                     referenceType:
 *                       type: string
 *                     referenceId:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     notes:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Movement history record not found
 *       500:
 *         description: Internal server error
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
 * @swagger
 * /api/modules/inventory-items/movement-history/export/csv:
 *   get:
 *     summary: Export movement history to CSV file
 *     tags: [Inventory Items - Movement History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by SKU or product name
 *       - in: query
 *         name: movementType
 *         schema:
 *           type: string
 *           enum: [all, putaway, pick, adjustment, relocation]
 *         description: Filter by movement type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter movements from this date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter movements until this date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid movement type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
    if (movementType && movementType !== 'all') {
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
