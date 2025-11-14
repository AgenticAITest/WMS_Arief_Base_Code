import express from 'express';
import { db } from '@server/lib/db';
import { inventoryItems } from '../lib/db/schemas/inventoryItems';
import { products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { bins } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, sql, or } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import cycleCountRoutes from './cycleCountRoutes';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('inventory-items'));

// Mount cycle count routes
router.use(cycleCountRoutes);

/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryItem:
 *       type: object
 *       required:
 *         - productId
 *         - binId
 *         - availableQuantity
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         tenantId:
 *           type: string
 *           format: uuid
 *         productId:
 *           type: string
 *           format: uuid
 *         binId:
 *           type: string
 *           format: uuid
 *         availableQuantity:
 *           type: integer
 *           minimum: 0
 *         reservedQuantity:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         expiryDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         batchNumber:
 *           type: string
 *           nullable: true
 *         lotNumber:
 *           type: string
 *           nullable: true
 *         receivedDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         costPerUnit:
 *           type: number
 *           format: decimal
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/modules/inventory-items/inventory-items:
 *   get:
 *     summary: Get all inventory items with product and bin details
 *     tags: [Inventory Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product SKU, product name, batch number, or lot number
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by product ID
 *       - in: query
 *         name: binId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by bin ID
 *     responses:
 *       200:
 *         description: List of inventory items with product and bin information
 *       401:
 *         description: Unauthorized
 */
router.get('/inventory-items', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const productId = req.query.productId as string;
    const binId = req.query.binId as string;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(inventoryItems.tenantId, tenantId)];
    
    if (productId) {
      whereConditions.push(eq(inventoryItems.productId, productId));
    }
    
    if (binId) {
      whereConditions.push(eq(inventoryItems.binId, binId));
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(products.sku, `%${search}%`),
          ilike(products.name, `%${search}%`),
          ilike(inventoryItems.batchNumber, `%${search}%`),
          ilike(inventoryItems.lotNumber, `%${search}%`)
        )!
      );
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(inventoryItems)
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .where(and(...whereConditions));

    // Get paginated data with joined product and bin info
    const data = await db
      .select({
        id: inventoryItems.id,
        tenantId: inventoryItems.tenantId,
        productId: inventoryItems.productId,
        binId: inventoryItems.binId,
        availableQuantity: inventoryItems.availableQuantity,
        reservedQuantity: inventoryItems.reservedQuantity,
        expiryDate: inventoryItems.expiryDate,
        batchNumber: inventoryItems.batchNumber,
        lotNumber: inventoryItems.lotNumber,
        receivedDate: inventoryItems.receivedDate,
        costPerUnit: inventoryItems.costPerUnit,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
        product: {
          id: products.id,
          sku: products.sku,
          name: products.name,
          hasExpiryDate: products.hasExpiryDate,
        },
        bin: {
          id: bins.id,
          name: bins.name,
        },
      })
      .from(inventoryItems)
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .leftJoin(bins, eq(inventoryItems.binId, bins.id))
      .where(and(...whereConditions))
      .orderBy(desc(inventoryItems.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(totalResult.count / limit);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/inventory-items/{id}:
 *   get:
 *     summary: Get an inventory item by ID with product and bin details
 *     tags: [Inventory Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Inventory item found
 *       404:
 *         description: Inventory item not found
 *       401:
 *         description: Unauthorized
 */
router.get('/inventory-items/:id', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select({
        id: inventoryItems.id,
        tenantId: inventoryItems.tenantId,
        productId: inventoryItems.productId,
        binId: inventoryItems.binId,
        availableQuantity: inventoryItems.availableQuantity,
        reservedQuantity: inventoryItems.reservedQuantity,
        expiryDate: inventoryItems.expiryDate,
        batchNumber: inventoryItems.batchNumber,
        lotNumber: inventoryItems.lotNumber,
        receivedDate: inventoryItems.receivedDate,
        costPerUnit: inventoryItems.costPerUnit,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
        product: {
          id: products.id,
          sku: products.sku,
          name: products.name,
          description: products.description,
          hasExpiryDate: products.hasExpiryDate,
        },
        bin: {
          id: bins.id,
          name: bins.name,
          barcode: bins.barcode,
        },
      })
      .from(inventoryItems)
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .leftJoin(bins, eq(inventoryItems.binId, bins.id))
      .where(and(
        eq(inventoryItems.id, id),
        eq(inventoryItems.tenantId, tenantId)
      ));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/inventory-items:
 *   post:
 *     summary: Create a new inventory item
 *     tags: [Inventory Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - binId
 *               - availableQuantity
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               binId:
 *                 type: string
 *                 format: uuid
 *               availableQuantity:
 *                 type: integer
 *                 minimum: 0
 *               reservedQuantity:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               batchNumber:
 *                 type: string
 *               lotNumber:
 *                 type: string
 *               receivedDate:
 *                 type: string
 *                 format: date
 *               costPerUnit:
 *                 type: number
 *                 format: decimal
 *     responses:
 *       201:
 *         description: Inventory item created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/inventory-items', authorized('ADMIN', 'inventory-items.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const {
      productId,
      binId,
      availableQuantity,
      reservedQuantity,
      expiryDate,
      batchNumber,
      lotNumber,
      receivedDate,
      costPerUnit,
    } = req.body;

    // Validation
    if (!productId || !binId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and Bin ID are required',
      });
    }

    if (availableQuantity === undefined || availableQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Available quantity is required and must be non-negative',
      });
    }

    if (reservedQuantity !== undefined && reservedQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Reserved quantity must be non-negative',
      });
    }

    // Verify product exists and belongs to tenant
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify bin exists and belongs to tenant
    const [bin] = await db
      .select()
      .from(bins)
      .where(and(eq(bins.id, binId), eq(bins.tenantId, tenantId)));

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    const [newRecord] = await db
      .insert(inventoryItems)
      .values({
        tenantId,
        productId,
        binId,
        availableQuantity,
        reservedQuantity: reservedQuantity || 0,
        expiryDate: expiryDate || null,
        batchNumber: batchNumber || null,
        lotNumber: lotNumber || null,
        receivedDate: receivedDate || null,
        costPerUnit: costPerUnit || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newRecord,
      message: 'Inventory item created successfully',
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/inventory-items/{id}:
 *   put:
 *     summary: Update an inventory item
 *     tags: [Inventory Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               availableQuantity:
 *                 type: integer
 *                 minimum: 0
 *               reservedQuantity:
 *                 type: integer
 *                 minimum: 0
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               batchNumber:
 *                 type: string
 *               lotNumber:
 *                 type: string
 *               receivedDate:
 *                 type: string
 *                 format: date
 *               costPerUnit:
 *                 type: number
 *                 format: decimal
 *     responses:
 *       200:
 *         description: Inventory item updated successfully
 *       404:
 *         description: Inventory item not found
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.put('/inventory-items/:id', authorized('ADMIN', 'inventory-items.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const {
      availableQuantity,
      reservedQuantity,
      expiryDate,
      batchNumber,
      lotNumber,
      receivedDate,
      costPerUnit,
    } = req.body;

    // Validation
    if (availableQuantity !== undefined && availableQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Available quantity must be non-negative',
      });
    }

    if (reservedQuantity !== undefined && reservedQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Reserved quantity must be non-negative',
      });
    }

    // Check if record exists
    const [existingRecord] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId)));

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (availableQuantity !== undefined) updateData.availableQuantity = availableQuantity;
    if (reservedQuantity !== undefined) updateData.reservedQuantity = reservedQuantity;
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate;
    if (batchNumber !== undefined) updateData.batchNumber = batchNumber;
    if (lotNumber !== undefined) updateData.lotNumber = lotNumber;
    if (receivedDate !== undefined) updateData.receivedDate = receivedDate;
    if (costPerUnit !== undefined) updateData.costPerUnit = costPerUnit;

    const [updatedRecord] = await db
      .update(inventoryItems)
      .set(updateData)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId)))
      .returning();

    res.json({
      success: true,
      data: updatedRecord,
      message: 'Inventory item updated successfully',
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/inventory-items/{id}:
 *   delete:
 *     summary: Delete an inventory item
 *     tags: [Inventory Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Inventory item deleted successfully
 *       404:
 *         description: Inventory item not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/inventory-items/:id', authorized('ADMIN', 'inventory-items.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    // Check if record exists
    const [existingRecord] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId)));

    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found',
      });
    }

    await db
      .delete(inventoryItems)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId)));

    res.json({
      success: true,
      message: 'Inventory item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/inventory-items/stats/summary:
 *   get:
 *     summary: Get inventory statistics summary
 *     tags: [Inventory Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory statistics
 *       401:
 *         description: Unauthorized
 */
router.get('/inventory-items/stats/summary', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;

    const stats = await db
      .select({
        totalItems: count(),
        totalAvailable: sql<number>`SUM(${inventoryItems.availableQuantity})`,
        totalReserved: sql<number>`SUM(${inventoryItems.reservedQuantity})`,
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.tenantId, tenantId));

    res.json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/stock-information:
 *   get:
 *     summary: Get stock information aggregated by product
 *     tags: [Inventory Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product SKU or name
 *     responses:
 *       200:
 *         description: Stock information aggregated by product
 *       401:
 *         description: Unauthorized
 */
router.get('/stock-information', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(inventoryItems.tenantId, tenantId)];
    if (search) {
      whereConditions.push(
        or(
          ilike(products.sku, `%${search}%`),
          ilike(products.name, `%${search}%`)
        )!
      );
    }

    // Build query for stock information
    const allResults = await db
      .select({
        productId: inventoryItems.productId,
        productSku: products.sku,
        productName: products.name,
        productDescription: products.description,
        hasExpiryDate: products.hasExpiryDate,
        totalAvailableQuantity: sql<number>`SUM(${inventoryItems.availableQuantity})`,
        totalReservedQuantity: sql<number>`SUM(${inventoryItems.reservedQuantity})`,
        locationCount: sql<number>`COUNT(DISTINCT ${inventoryItems.binId})`,
        firstBinId: sql<string>`(array_agg(${bins.id}))[1]`,
        firstBinName: sql<string>`(array_agg(${bins.name}))[1]`,
        earliestExpiryDate: sql<string>`MIN(${inventoryItems.expiryDate})`,
      })
      .from(inventoryItems)
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .leftJoin(bins, eq(inventoryItems.binId, bins.id))
      .where(and(...whereConditions))
      .groupBy(
        inventoryItems.productId,
        products.sku,
        products.name,
        products.description,
        products.hasExpiryDate
      );
    const total = allResults.length;

    // Apply pagination
    const data = allResults
      .sort((a, b) => (a.productSku || '').localeCompare(b.productSku || ''))
      .slice(offset, offset + limit);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching stock information:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/stock-information/{productId}/locations:
 *   get:
 *     summary: Get all locations and details for a specific product
 *     tags: [Inventory Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detailed location information for product
 *       401:
 *         description: Unauthorized
 */
router.get('/stock-information/:productId/locations', authorized('ADMIN', 'inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { productId } = req.params;

    // Get product details
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Get all inventory items for this product with bin details
    const locations = await db
      .select({
        id: inventoryItems.id,
        binId: bins.id,
        binName: bins.name,
        binBarcode: bins.barcode,
        availableQuantity: inventoryItems.availableQuantity,
        reservedQuantity: inventoryItems.reservedQuantity,
        expiryDate: inventoryItems.expiryDate,
        batchNumber: inventoryItems.batchNumber,
        lotNumber: inventoryItems.lotNumber,
        receivedDate: inventoryItems.receivedDate,
        costPerUnit: inventoryItems.costPerUnit,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      })
      .from(inventoryItems)
      .leftJoin(bins, eq(inventoryItems.binId, bins.id))
      .where(
        and(
          eq(inventoryItems.tenantId, tenantId),
          eq(inventoryItems.productId, productId)
        )
      )
      .orderBy(bins.name);

    res.json({
      success: true,
      data: {
        product,
        locations,
      },
    });
  } catch (error) {
    console.error('Error fetching product locations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
