import express from 'express';
import { db } from '@server/lib/db';
import { purchaseOrders, purchaseOrderItems, purchaseOrdersReceipt, receiptItems } from '../lib/db/schemas/purchaseOrder';
import { suppliers, supplierLocations, products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { inventoryItems } from '@modules/inventory-items/server/lib/db/schemas/inventoryItems';
import { warehouses, bins, zones, aisles, shelves } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';
import { user } from '@server/lib/db/schema/system';
import { documentNumberConfig, generatedDocuments, documentNumberHistory } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, or, sql, sum, inArray, isNotNull } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { PODocumentGenerator } from '../services/poDocumentGenerator';
import { GRNDocumentGenerator } from '../services/grnDocumentGenerator';
import { PutawayDocumentGenerator } from '../services/putawayDocumentGenerator';
import { logAudit, getClientIp } from '@server/services/auditService';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('purchase-order'));

/**
 * @swagger
 * components:
 *   schemas:
 *     PurchaseOrder:
 *       type: object
 *       required:
 *         - orderNumber
 *         - supplierId
 *         - orderDate
 *         - deliveryMethod
 *         - warehouseId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         tenantId:
 *           type: string
 *           format: uuid
 *         orderNumber:
 *           type: string
 *         supplierId:
 *           type: string
 *           format: uuid
 *         supplierLocationId:
 *           type: string
 *           format: uuid
 *           description: Optional for delivery mode, required for pickup mode
 *         deliveryMethod:
 *           type: string
 *           enum: [delivery, pickup]
 *           default: delivery
 *           description: Delivery method - 'delivery' (supplier delivers) or 'pickup' (tenant picks up)
 *         warehouseId:
 *           type: string
 *           format: uuid
 *           description: Destination warehouse (required for both delivery and pickup)
 *         status:
 *           type: string
 *           enum: [pending, approved, received, completed]
 *         workflowState:
 *           type: string
 *           enum: [create, approve, receive, putaway, complete]
 *         orderDate:
 *           type: string
 *           format: date
 *         expectedDeliveryDate:
 *           type: string
 *           format: date
 *         totalAmount:
 *           type: number
 *         notes:
 *           type: string
 *         createdBy:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PurchaseOrderItem:
 *       type: object
 *       required:
 *         - purchaseOrderId
 *         - productId
 *         - orderedQuantity
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         purchaseOrderId:
 *           type: string
 *           format: uuid
 *         productId:
 *           type: string
 *           format: uuid
 *         tenantId:
 *           type: string
 *           format: uuid
 *         orderedQuantity:
 *           type: integer
 *         receivedQuantity:
 *           type: integer
 *         unitCost:
 *           type: number
 *         totalCost:
 *           type: number
 *         expectedExpiryDate:
 *           type: string
 *           format: date
 *         notes:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// ==================== HELPER ENDPOINTS ====================

/**
 * @swagger
 * /api/modules/purchase-order/preview-html:
 *   post:
 *     summary: Generate HTML preview for purchase order (without saving)
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplierId
 *               - orderDate
 *               - deliveryMethod
 *               - warehouseId
 *               - items
 *             properties:
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               supplierLocationId:
 *                 type: string
 *                 format: uuid
 *               orderDate:
 *                 type: string
 *                 format: date
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date
 *               deliveryMethod:
 *                 type: string
 *                 enum: [delivery, pickup]
 *               warehouseId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     orderedQuantity:
 *                       type: number
 *                     unitCost:
 *                       type: number
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: HTML preview generated successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/preview-html', authorized('ADMIN', 'purchase-order.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const {
      supplierId,
      supplierLocationId,
      orderDate,
      expectedDeliveryDate,
      deliveryMethod,
      warehouseId,
      notes,
      items
    } = req.body;

    console.log('[Preview HTML] Request:', { supplierId, warehouseId, itemsCount: items?.length });
    console.log('[Preview HTML] Schema checks:', {
      suppliers: typeof suppliers,
      suppliersName: typeof suppliers?.name,
      warehouses: typeof warehouses,
      user: typeof user
    });

    // Fetch document numbering configuration to get default prefix
    const [docConfigPreview] = await db
      .select()
      .from(documentNumberConfig)
      .where(
        and(
          eq(documentNumberConfig.tenantId, tenantId),
          eq(documentNumberConfig.documentType, 'PO'),
          eq(documentNumberConfig.isActive, true)
        )
      )
      .limit(1);

    // Fetch preview number with proper prefix
    let previewNumber = 'PREVIEW-GENERATING';
    try {
      const previewPayload: any = { documentType: 'PO' };
      
      // Add prefix1 if configured
      if (docConfigPreview?.prefix1DefaultValue) {
        previewPayload.prefix1 = docConfigPreview.prefix1DefaultValue;
      }
      
      // Add prefix2 if configured
      if (docConfigPreview?.prefix2DefaultValue) {
        previewPayload.prefix2 = docConfigPreview.prefix2DefaultValue;
      }

      const previewResponse = await axios.post(
        'http://localhost:5000/api/modules/document-numbering/preview',
        previewPayload,
        { headers: { Authorization: req.headers.authorization } }
      );
      previewNumber = previewResponse.data.previewNumber || 'PREVIEW-0001';
    } catch (error) {
      console.error('Error fetching preview number:', error);
    }

    // Fetch supplier info
    console.log('[Preview HTML] Fetching supplier...');
    let supplierData;
    try {
      const results = await db
        .select()
        .from(suppliers)
        .where(and(
          eq(suppliers.id, supplierId),
          eq(suppliers.tenantId, tenantId)
        ))
        .limit(1);
      supplierData = results[0];
    } catch (err) {
      console.error('[Preview HTML] ERROR fetching supplier:', err);
      throw err;
    }

    if (!supplierData) {
      console.error('[Preview HTML] Supplier not found');
      return res.status(404).json({ error: 'Supplier not found' });
    }
    console.log('[Preview HTML] Supplier fetched');

    // Fetch supplier location if provided
    let locationData = null;
    if (supplierLocationId) {
      console.log('[Preview HTML] Fetching supplier location...');
      try {
        const results = await db
          .select()
          .from(supplierLocations)
          .where(and(
            eq(supplierLocations.id, supplierLocationId),
            eq(supplierLocations.supplierId, supplierId),
            eq(supplierLocations.tenantId, tenantId)
          ))
          .limit(1);
        locationData = results[0];
      } catch (err) {
        console.error('[Preview HTML] ERROR fetching supplier location:', err);
        throw err;
      }
      console.log('[Preview HTML] Supplier location fetched');
    }

    // Fetch warehouse info
    console.log('[Preview HTML] Fetching warehouse...');
    let warehouseData;
    try {
      const results = await db
        .select()
        .from(warehouses)
        .where(and(
          eq(warehouses.id, warehouseId),
          eq(warehouses.tenantId, tenantId)
        ))
        .limit(1);
      warehouseData = results[0];
    } catch (err) {
      console.error('[Preview HTML] ERROR fetching warehouse:', err);
      throw err;
    }
    console.log('[Preview HTML] Warehouse fetched');

    // Fetch user info
    console.log('[Preview HTML] Fetching user...');
    let userData;
    try {
      const results = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      userData = results[0];
    } catch (err) {
      console.error('[Preview HTML] ERROR fetching user:', err);
      throw err;
    }
    console.log('[Preview HTML] User fetched');

    // Fetch product details for all items
    console.log('[Preview HTML] Fetching products...');
    const productIds = items.map((item: any) => item.productId).filter(Boolean);
    
    let productDetails: any[] = [];
    if (productIds.length > 0) {
      try {
        productDetails = await db
          .select()
          .from(products)
          .where(and(
            eq(products.tenantId, tenantId),
            inArray(products.id, productIds)
          ));
      } catch (err) {
        console.error('[Preview HTML] ERROR fetching products:', err);
        throw err;
      }
    }
    console.log('[Preview HTML] Products fetched:', productDetails.length);

    const productMap = new Map(productDetails.map(p => [p.id, p]));

    // Build item data with product details
    const itemsWithDetails = items.map((item: any) => {
      const product = productMap.get(item.productId);
      const totalCost = item.orderedQuantity * item.unitCost;
      return {
        productSku: product?.sku || 'N/A',
        productName: product?.name || 'Unknown Product',
        orderedQuantity: item.orderedQuantity,
        unitCost: item.unitCost.toString(),
        totalCost: totalCost.toString(),
        notes: item.notes || null
      };
    });

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.orderedQuantity * item.unitCost);
    }, 0);

    // Build PO data for HTML generation
    const poData = {
      id: 'preview',
      tenantId,
      orderNumber: previewNumber,
      orderDate,
      expectedDeliveryDate: expectedDeliveryDate || null,
      deliveryMethod: deliveryMethod || 'delivery',
      totalAmount: totalAmount.toString(),
      notes: notes || null,
      supplierName: supplierData.name,
      supplierEmail: supplierData.email,
      supplierPhone: supplierData.phone,
      locationAddress: locationData?.address || null,
      locationCity: locationData?.city || null,
      locationState: locationData?.state || null,
      locationPostalCode: locationData?.postalCode || null,
      locationCountry: locationData?.country || null,
      warehouseName: warehouseData?.name || null,
      warehouseAddress: warehouseData?.address || null,
      warehouseCity: null, // Warehouse table doesn't have city field
      createdByName: userData?.fullname || null,
      items: itemsWithDetails
    };

    // Generate HTML using the same generator
    const htmlContent = PODocumentGenerator.generateHTML(poData);

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (error) {
    console.error('Error generating HTML preview:', error);
    res.status(500).json({ error: 'Failed to generate HTML preview' });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/products-with-stock:
 *   get:
 *     summary: Get inventory items with stock information for PO creation
 *     tags: [Purchase Orders]
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
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of inventory items with stock information
 *       401:
 *         description: Unauthorized
 */
router.get('/products-with-stock', authorized('ADMIN', 'purchase-order.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    // Build search condition with proper parameterization to prevent SQL injection
    const searchPattern = search ? `%${search}%` : null;

    // Use CTE (Common Table Expression) in a single SQL statement
    // This solves the connection pooling issue with temp views
    const query = searchPattern
      ? sql`
        WITH tenant_products AS (
          SELECT id, sku, name, minimum_stock_level
          FROM products
          WHERE tenant_id = ${tenantId}
            AND (sku ILIKE ${searchPattern} OR name ILIKE ${searchPattern})
        ),
        tenant_inventory AS (
          SELECT product_id, SUM(available_quantity) AS available_quantity
          FROM inventory_items
          WHERE tenant_id = ${tenantId}
          GROUP BY product_id
        )
        SELECT 
          p.id as product_id,
          p.sku,
          p.name,
          p.minimum_stock_level,
          COALESCE(i.available_quantity, 0) as total_available_stock
        FROM tenant_products p
        LEFT JOIN tenant_inventory i ON i.product_id = p.id
        ORDER BY p.sku
        LIMIT ${limit}
        OFFSET ${offset}
      `
      : sql`
        WITH tenant_products AS (
          SELECT id, sku, name, minimum_stock_level
          FROM products
          WHERE tenant_id = ${tenantId}
        ),
        tenant_inventory AS (
          SELECT product_id, SUM(available_quantity) AS available_quantity
          FROM inventory_items
          WHERE tenant_id = ${tenantId}
          GROUP BY product_id
        )
        SELECT 
          p.id as product_id,
          p.sku,
          p.name,
          p.minimum_stock_level,
          COALESCE(i.available_quantity, 0) as total_available_stock
        FROM tenant_products p
        LEFT JOIN tenant_inventory i ON i.product_id = p.id
        ORDER BY p.sku
        LIMIT ${limit}
        OFFSET ${offset}
      `;

    // Get total count with the same CTE pattern
    const countQuery = searchPattern
      ? sql`
        SELECT COUNT(*) as count
        FROM products
        WHERE tenant_id = ${tenantId}
          AND (sku ILIKE ${searchPattern} OR name ILIKE ${searchPattern})
      `
      : sql`
        SELECT COUNT(*) as count
        FROM products
        WHERE tenant_id = ${tenantId}
      `;

    const countResult = await db.execute<{ count: string }>(countQuery);
    const totalCount = parseInt(countResult[0].count);

    const data = await db.execute<{
      product_id: string;
      sku: string;
      name: string;
      minimum_stock_level: number;
      total_available_stock: number;
    }>(query);

    // Transform raw result to match expected format
    const formattedData = data.map(row => ({
      productId: row.product_id,
      sku: row.sku,
      name: row.name,
      minimumStockLevel: row.minimum_stock_level,
      totalAvailableStock: row.total_available_stock,
    }));

    console.log(`✅ Products query returned ${formattedData.length} products for tenant ${tenantId}`);

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching products with stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/preview:
 *   post:
 *     summary: Generate PO HTML preview without saving
 *     description: Generates HTML preview of purchase order for confirmation modal
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplierId
 *               - warehouseId
 *               - items
 *             properties:
 *               supplierId:
 *                 type: string
 *               supplierLocationId:
 *                 type: string
 *               deliveryMethod:
 *                 type: string
 *                 enum: [delivery, pickup]
 *               warehouseId:
 *                 type: string
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: HTML preview generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 html:
 *                   type: string
 */
router.post('/preview', authorized('ADMIN', 'purchase-order.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const username = req.user!.username;
    const {
      supplierId,
      supplierLocationId,
      deliveryMethod = 'delivery',
      warehouseId,
      expectedDeliveryDate,
      notes,
      items = []
    } = req.body;

    // Validation
    if (!supplierId || !warehouseId || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for preview'
      });
    }

    // Calculate total
    const totalAmount = items.reduce((sum: number, item: any) => {
      const itemTotal = item.unitCost && item.orderedQuantity
        ? parseFloat(item.unitCost) * parseInt(item.orderedQuantity)
        : 0;
      return sum + itemTotal;
    }, 0);

    const orderDate = new Date().toISOString().split('T')[0];

    // Fetch supplier info
    const [supplier] = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        email: suppliers.email,
        phone: suppliers.phone
      })
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, tenantId)))
      .limit(1);

    // Fetch supplier location if provided
    let supplierLocation = null;
    if (supplierLocationId) {
      const [location] = await db
        .select({
          id: supplierLocations.id,
          address: supplierLocations.address,
          city: supplierLocations.city,
          state: supplierLocations.state,
          postalCode: supplierLocations.postalCode,
          country: supplierLocations.country
        })
        .from(supplierLocations)
        .where(and(
          eq(supplierLocations.id, supplierLocationId),
          eq(supplierLocations.supplierId, supplierId)
        ))
        .limit(1);
      supplierLocation = location;
    }

    // Fetch warehouse info
    const [warehouse] = await db
      .select({
        id: warehouses.id,
        name: warehouses.name,
        address: warehouses.address
      })
      .from(warehouses)
      .where(and(eq(warehouses.id, warehouseId), eq(warehouses.tenantId, tenantId)))
      .limit(1);

    // Get document number config to use default prefix
    const [docConfig] = await db
      .select({
        prefix1DefaultValue: documentNumberConfig.prefix1DefaultValue
      })
      .from(documentNumberConfig)
      .where(and(
        eq(documentNumberConfig.tenantId, tenantId),
        eq(documentNumberConfig.documentType, 'PO')
      ))
      .limit(1);

    // Get preview number with warehouse prefix (use config default if no warehouse code)
    let orderNumber = 'PREVIEW-GENERATING';
    try {
      const docNumberResponse = await axios.post(
        'http://localhost:5000/api/modules/document-numbering/preview',
        {
          documentType: 'PO',
          prefix1: docConfig?.prefix1DefaultValue || 'WH'
        },
        {
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );
      orderNumber = docNumberResponse.data.previewNumber;
    } catch (error) {
      console.error('Error fetching preview number:', error);
      orderNumber = `PREVIEW-${Date.now()}`;
    }

    // Fetch user info
    const [currentUser] = await db
      .select({
        id: user.id,
        fullname: user.fullname
      })
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    // Fetch product details for items
    const itemsWithDetails = await Promise.all(
      items.map(async (item: any) => {
        const [product] = await db
          .select({
            id: products.id,
            sku: products.sku,
            name: products.name
          })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        return {
          productSku: product?.sku ?? 'N/A',
          productName: product?.name ?? 'N/A',
          orderedQuantity: item.orderedQuantity ?? 0,
          unitCost: item.unitCost?.toString() ?? '0.00',
          totalCost: item.unitCost && item.orderedQuantity
            ? (parseFloat(item.unitCost) * parseInt(item.orderedQuantity)).toFixed(2)
            : '0.00',
          notes: item.notes?.toString() ?? null
        };
      })
    );

    // Generate preview HTML
    const previewHTML = PODocumentGenerator.generatePreview({
      id: 'preview-' + Date.now(), // Temporary ID for preview
      tenantId,
      orderNumber,
      orderDate,
      expectedDeliveryDate: expectedDeliveryDate ?? null,
      deliveryMethod,
      totalAmount: totalAmount.toFixed(2),
      notes: notes ?? null,
      supplierName: supplier?.name || 'N/A',
      supplierEmail: supplier?.email ?? null,
      supplierPhone: supplier?.phone ?? null,
      locationAddress: supplierLocation?.address ?? null,
      locationCity: supplierLocation?.city ?? null,
      locationState: supplierLocation?.state ?? null,
      locationPostalCode: supplierLocation?.postalCode ?? null,
      locationCountry: supplierLocation?.country ?? null,
      warehouseName: warehouse?.name || 'N/A',
      warehouseAddress: warehouse?.address ?? null,
      warehouseCity: null,
      createdByName: currentUser?.fullname ?? null,
      items: itemsWithDetails
    });

    res.json({
      success: true,
      html: previewHTML
    });
  } catch (error: any) {
    console.error('Error generating PO preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PO preview',
      error: error.message
    });
  }
});

// ==================== PURCHASE ORDERS CRUD ====================

/**
 * @swagger
 * /api/modules/purchase-order/orders:
 *   get:
 *     summary: Get all purchase orders
 *     tags: [Purchase Orders]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, received, completed]
 *     responses:
 *       200:
 *         description: List of purchase orders
 *       401:
 *         description: Unauthorized
 */
router.get('/orders', authorized('ADMIN', 'purchase-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const statusFilter = req.query.status as string;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(purchaseOrders.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(
        or(
          ilike(purchaseOrders.orderNumber, `%${search}%`),
          ilike(purchaseOrders.notes, `%${search}%`)
        )!
      );
    }

    if (statusFilter) {
      whereConditions.push(eq(purchaseOrders.status, statusFilter as any));
      // For pending status, also filter by workflowState='approve' to show only unapproved POs
      if (statusFilter === 'pending') {
        whereConditions.push(eq(purchaseOrders.workflowState, 'approve'));
      }
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(and(...whereConditions));

    // Get paginated data with relations
    const data = await db
      .select({
        id: purchaseOrders.id,
        tenantId: purchaseOrders.tenantId,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        supplierLocationId: purchaseOrders.supplierLocationId,
        deliveryMethod: purchaseOrders.deliveryMethod,
        warehouseId: purchaseOrders.warehouseId,
        warehouseName: warehouses.name,
        warehouseAddress: warehouses.address,
        status: purchaseOrders.status,
        workflowState: purchaseOrders.workflowState,
        orderDate: purchaseOrders.orderDate,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes,
        createdBy: purchaseOrders.createdBy,
        createdByName: user.fullname,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
      .leftJoin(user, eq(purchaseOrders.createdBy, user.id))
      .where(and(...whereConditions))
      .orderBy(desc(purchaseOrders.createdAt))
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
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/orders/{id}:
 *   get:
 *     summary: Get a purchase order by ID
 *     tags: [Purchase Orders]
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
 *         description: Purchase order found
 *       404:
 *         description: Purchase order not found
 *       401:
 *         description: Unauthorized
 */
router.get('/orders/:id', authorized('ADMIN', 'purchase-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select({
        id: purchaseOrders.id,
        tenantId: purchaseOrders.tenantId,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
        supplierLocationId: purchaseOrders.supplierLocationId,
        locationAddress: supplierLocations.address,
        locationCity: supplierLocations.city,
        deliveryMethod: purchaseOrders.deliveryMethod,
        warehouseId: purchaseOrders.warehouseId,
        warehouseName: warehouses.name,
        warehouseAddress: warehouses.address,
        status: purchaseOrders.status,
        workflowState: purchaseOrders.workflowState,
        orderDate: purchaseOrders.orderDate,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes,
        createdBy: purchaseOrders.createdBy,
        createdByName: user.fullname,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(supplierLocations, eq(purchaseOrders.supplierLocationId, supplierLocations.id))
      .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
      .leftJoin(user, eq(purchaseOrders.createdBy, user.id))
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId)
      ));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Get items for this purchase order
    const items = await db
      .select({
        id: purchaseOrderItems.id,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        productId: purchaseOrderItems.productId,
        productName: products.name,
        productSku: products.sku,
        orderedQuantity: purchaseOrderItems.orderedQuantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        unitCost: purchaseOrderItems.unitCost,
        totalCost: purchaseOrderItems.totalCost,
        expectedExpiryDate: purchaseOrderItems.expectedExpiryDate,
        notes: purchaseOrderItems.notes,
        createdAt: purchaseOrderItems.createdAt,
        updatedAt: purchaseOrderItems.updatedAt,
      })
      .from(purchaseOrderItems)
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    res.json({
      success: true,
      data: {
        ...record,
        items,
      },
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/orders/{id}/html:
 *   get:
 *     summary: Get HTML preview of a purchase order
 *     tags: [Purchase Orders]
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
 *         description: HTML preview retrieved successfully
 *       404:
 *         description: Purchase order or HTML document not found
 *       401:
 *         description: Unauthorized
 */
router.get('/orders/:id/html', authorized('ADMIN', 'purchase-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    // Fetch purchase order to verify access and get order number
    const [po] = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        tenantId: purchaseOrders.tenantId,
      })
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId)
      ));

    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Fetch the generated document metadata
    const [document] = await db
      .select()
      .from(generatedDocuments)
      .where(and(
        eq(generatedDocuments.referenceType, 'purchase_order'),
        eq(generatedDocuments.referenceId, id),
        eq(generatedDocuments.tenantId, tenantId)
      ))
      .orderBy(desc(generatedDocuments.createdAt))
      .limit(1);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'HTML document not found for this purchase order',
      });
    }

    // Read HTML file from storage
    const htmlFilePath = path.join(process.cwd(), (document.files as any).html.path);
    
    try {
      const htmlContent = await fs.readFile(htmlFilePath, 'utf-8');
      
      res.json({
        success: true,
        html: htmlContent,
        documentInfo: {
          version: document.version,
          generatedAt: document.createdAt,
        },
      });
    } catch (fileError) {
      console.error('Error reading HTML file:', fileError);
      return res.status(404).json({
        success: false,
        message: 'HTML file not found on disk',
      });
    }
  } catch (error) {
    console.error('Error fetching HTML preview:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/orders:
 *   post:
 *     summary: Create a new purchase order
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplierId
 *             properties:
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               supplierLocationId:
 *                 type: string
 *                 format: uuid
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     orderedQuantity:
 *                       type: integer
 *                     unitCost:
 *                       type: number
 *                     expectedExpiryDate:
 *                       type: string
 *                       format: date
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Purchase order created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/orders', authorized('ADMIN', 'purchase-order.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const username = req.user!.username;
    const { 
      supplierId, 
      supplierLocationId,
      deliveryMethod = 'delivery',
      warehouseId,
      expectedDeliveryDate,
      notes,
      items = []
    } = req.body;

    // Validation
    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: 'Supplier is required',
      });
    }

    if (!deliveryMethod || !['delivery', 'pickup'].includes(deliveryMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Delivery method must be either "delivery" or "pickup"',
      });
    }

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: 'Destination warehouse is required',
      });
    }

    if (deliveryMethod === 'pickup' && !supplierLocationId) {
      return res.status(400).json({
        success: false,
        message: 'Supplier location is required for pickup mode',
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item is required',
      });
    }

    // Fetch document numbering configuration to get default prefix
    const [docConfig] = await db
      .select()
      .from(documentNumberConfig)
      .where(
        and(
          eq(documentNumberConfig.tenantId, tenantId),
          eq(documentNumberConfig.documentType, 'PO'),
          eq(documentNumberConfig.isActive, true)
        )
      )
      .limit(1);

    if (!docConfig) {
      return res.status(500).json({
        success: false,
        message: 'Document numbering configuration not found for PO',
      });
    }

    // Generate PO number via document numbering service with dynamic prefix
    let orderNumber: string;
    let documentHistoryId: string;
    
    try {
      const generatePayload: any = {
        documentType: 'PO',
        documentTableName: 'purchase_orders',
      };

      // Add prefix1 if configured
      if (docConfig.prefix1DefaultValue) {
        generatePayload.prefix1 = docConfig.prefix1DefaultValue;
      }

      // Add prefix2 if configured
      if (docConfig.prefix2DefaultValue) {
        generatePayload.prefix2 = docConfig.prefix2DefaultValue;
      }

      const docNumberResponse = await axios.post(
        'http://localhost:5000/api/modules/document-numbering/generate',
        generatePayload,
        {
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );
      
      orderNumber = docNumberResponse.data.documentNumber;
      documentHistoryId = docNumberResponse.data.historyId;
    } catch (error: any) {
      console.error('Error generating PO number:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate PO number',
      });
    }

    // Get user ID
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.username, username));

    // Calculate total amount from items
    const totalAmount = items.reduce((sum: number, item: any) => {
      const itemTotal = item.unitCost && item.orderedQuantity 
        ? parseFloat(item.unitCost) * parseInt(item.orderedQuantity)
        : 0;
      return sum + itemTotal;
    }, 0);

    const orderId = uuidv4();
    const orderDate = new Date().toISOString().split('T')[0];

    // Use transaction to ensure atomicity - if any step fails, rollback everything
    const result = await db.transaction(async (tx) => {
      // Create purchase order with status pending and workflowState approve
      const [newOrder] = await tx
        .insert(purchaseOrders)
        .values({
          id: orderId,
          tenantId,
          orderNumber,
          supplierId,
          supplierLocationId: supplierLocationId || null,
          deliveryMethod,
          warehouseId,
          status: 'pending',
          workflowState: 'approve',
          orderDate,
          expectedDeliveryDate: expectedDeliveryDate || null,
          totalAmount: totalAmount.toFixed(2),
          notes: notes || null,
          createdBy: currentUser?.id || null,
        })
        .returning();

      // Update document history with the actual document ID
      try {
        await axios.put(
          `http://localhost:5000/api/modules/document-numbering/history/${documentHistoryId}`,
          {
            documentId: orderId,
          },
          {
            headers: {
              Authorization: req.headers.authorization,
            },
          }
        );
      } catch (error) {
        console.error('Error updating document history:', error);
        throw new Error('Failed to update document history');
      }

      // Create items
      const itemsToInsert = items.map((item: any) => ({
        id: uuidv4(),
        purchaseOrderId: newOrder.id,
        productId: item.productId,
        tenantId,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: 0,
        unitCost: item.unitCost || null,
        totalCost: item.unitCost && item.orderedQuantity
          ? (parseFloat(item.unitCost) * parseInt(item.orderedQuantity)).toFixed(2)
          : null,
        expectedExpiryDate: item.expectedExpiryDate || null,
        notes: item.notes || null,
      }));

      await tx.insert(purchaseOrderItems).values(itemsToInsert);

      // Fetch the complete PO with supplier, warehouse and items for response
      const [completeOrder] = await tx
        .select({
          id: purchaseOrders.id,
          tenantId: purchaseOrders.tenantId,
          orderNumber: purchaseOrders.orderNumber,
          supplierId: purchaseOrders.supplierId,
          supplierName: suppliers.name,
          supplierEmail: suppliers.email,
          supplierPhone: suppliers.phone,
          supplierLocationId: purchaseOrders.supplierLocationId,
          locationAddress: supplierLocations.address,
          locationCity: supplierLocations.city,
          locationState: supplierLocations.state,
          locationPostalCode: supplierLocations.postalCode,
          locationCountry: supplierLocations.country,
          deliveryMethod: purchaseOrders.deliveryMethod,
          warehouseId: purchaseOrders.warehouseId,
          warehouseName: warehouses.name,
          warehouseAddress: warehouses.address,
          status: purchaseOrders.status,
          workflowState: purchaseOrders.workflowState,
          orderDate: purchaseOrders.orderDate,
          expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
          totalAmount: purchaseOrders.totalAmount,
          notes: purchaseOrders.notes,
          createdBy: purchaseOrders.createdBy,
          createdByName: user.fullname,
          createdAt: purchaseOrders.createdAt,
          updatedAt: purchaseOrders.updatedAt,
        })
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .leftJoin(supplierLocations, eq(purchaseOrders.supplierLocationId, supplierLocations.id))
        .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
        .leftJoin(user, eq(purchaseOrders.createdBy, user.id))
        .where(eq(purchaseOrders.id, orderId));

      const orderItems = await tx
        .select({
          id: purchaseOrderItems.id,
          purchaseOrderId: purchaseOrderItems.purchaseOrderId,
          productId: purchaseOrderItems.productId,
          productName: products.name,
          productSku: products.sku,
          orderedQuantity: purchaseOrderItems.orderedQuantity,
          receivedQuantity: purchaseOrderItems.receivedQuantity,
          unitCost: purchaseOrderItems.unitCost,
          totalCost: purchaseOrderItems.totalCost,
          expectedExpiryDate: purchaseOrderItems.expectedExpiryDate,
          notes: purchaseOrderItems.notes,
        })
        .from(purchaseOrderItems)
        .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
        .where(eq(purchaseOrderItems.purchaseOrderId, orderId));

      // Generate document - if this fails, transaction will rollback
      const documentInfo = await PODocumentGenerator.generateAndSave(
        {
          id: completeOrder.id || orderId,
          tenantId: completeOrder.tenantId || tenantId,
          orderNumber: completeOrder.orderNumber || orderNumber,
          orderDate: completeOrder.orderDate || new Date().toISOString().split('T')[0],
          expectedDeliveryDate: completeOrder.expectedDeliveryDate,
          deliveryMethod: completeOrder.deliveryMethod || 'delivery',
          totalAmount: completeOrder.totalAmount || '0.00',
          notes: completeOrder.notes,
          supplierName: completeOrder.supplierName || 'N/A',
          supplierEmail: completeOrder.supplierEmail,
          supplierPhone: completeOrder.supplierPhone,
          locationAddress: completeOrder.locationAddress,
          locationCity: completeOrder.locationCity,
          locationState: completeOrder.locationState,
          locationPostalCode: completeOrder.locationPostalCode,
          locationCountry: completeOrder.locationCountry,
          warehouseName: completeOrder.warehouseName || 'N/A',
          warehouseAddress: completeOrder.warehouseAddress || 'N/A',
          warehouseCity: null, // Warehouse table doesn't have city field
          createdByName: completeOrder.createdByName,
          items: orderItems.map(item => ({
            productSku: item.productSku || 'N/A',
            productName: item.productName || 'N/A',
            orderedQuantity: item.orderedQuantity,
            unitCost: item.unitCost || '0.00',
            totalCost: item.totalCost || '0.00',
            notes: item.notes
          }))
        },
        currentUser?.id || ''
      );

      console.log('[PO Document Generated]', documentInfo);

      return {
        completeOrder,
        orderItems,
        documentInfo
      };
    });

    // Log audit trail
    await logAudit({
      tenantId,
      userId: currentUser?.id,
      module: 'purchase-order',
      action: 'create',
      resourceType: 'purchase_order',
      resourceId: orderId,
      description: `Created purchase order ${orderNumber} for supplier ${result.completeOrder.supplierName} with ${items.length} item(s)`,
      changedFields: {
        orderNumber,
        supplierId,
        supplierName: result.completeOrder.supplierName,
        warehouseId,
        warehouseName: result.completeOrder.warehouseName,
        deliveryMethod,
        totalAmount: totalAmount.toFixed(2),
        itemCount: items.length,
        status: 'pending',
        workflowState: 'approve'
      },
      ipAddress: getClientIp(req),
    });

    res.status(201).json({
      success: true,
      data: {
        ...result.completeOrder,
        items: result.orderItems,
        document: result.documentInfo
      },
      message: 'Purchase order created successfully',
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/orders/{id}:
 *   put:
 *     summary: Update a purchase order
 *     tags: [Purchase Orders]
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
 *     responses:
 *       200:
 *         description: Purchase order updated successfully
 *       404:
 *         description: Purchase order not found
 *       401:
 *         description: Unauthorized
 */
router.put('/orders/:id', authorized('ADMIN', 'purchase-order.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;
    const updateData = req.body;

    const [existingOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId)
      ));

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Only allow editing if PO is still unapproved
    if (existingOrder.status !== 'pending' || existingOrder.workflowState !== 'approve') {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit purchase order: only unapproved purchase orders can be edited',
      });
    }

    // Validate deliveryMethod if it's being updated
    if (updateData.deliveryMethod && !['delivery', 'pickup'].includes(updateData.deliveryMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Delivery method must be either "delivery" or "pickup"',
      });
    }

    // Validate pickup mode requirements
    const finalDeliveryMethod = updateData.deliveryMethod || existingOrder.deliveryMethod;
    const finalSupplierLocationId = updateData.supplierLocationId !== undefined 
      ? updateData.supplierLocationId 
      : existingOrder.supplierLocationId;

    if (finalDeliveryMethod === 'pickup' && !finalSupplierLocationId) {
      return res.status(400).json({
        success: false,
        message: 'Supplier location is required for pickup mode',
      });
    }

    // Validate warehouseId requirement
    if (updateData.warehouseId === null || updateData.warehouseId === '') {
      return res.status(400).json({
        success: false,
        message: 'Warehouse is required',
      });
    }

    // Extract items if provided
    const items = updateData.items;
    delete updateData.items;

    delete updateData.id;
    delete updateData.tenantId;
    delete updateData.createdAt;
    delete updateData.createdBy;
    delete updateData.orderNumber; // Don't allow changing PO number
    delete updateData.status; // Don't allow changing status directly (unless approving)
    delete updateData.workflowState; // Don't allow changing workflow state directly

    // Calculate total amount if items are provided
    if (items && items.length > 0) {
      const totalAmount = items.reduce((sum: number, item: any) => {
        const itemTotal = item.unitCost && item.orderedQuantity
          ? parseFloat(item.unitCost) * parseInt(item.orderedQuantity)
          : 0;
        return sum + itemTotal;
      }, 0);
      updateData.totalAmount = totalAmount.toFixed(2);
    }

    // Track changed fields for audit log
    const changedFields: any = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== existingOrder[key as keyof typeof existingOrder]) {
        changedFields[key] = {
          from: existingOrder[key as keyof typeof existingOrder],
          to: updateData[key]
        };
      }
    });

    // Use transaction to update both order and items atomically
    const result = await db.transaction(async (tx) => {
      // Update purchase order
      const [updatedOrder] = await tx
        .update(purchaseOrders)
        .set({ ...updateData, updatedAt: new Date() })
        .where(and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.tenantId, tenantId)
        ))
        .returning();

      // If items are provided, replace all items
      if (items && items.length > 0) {
        // Delete existing items
        await tx
          .delete(purchaseOrderItems)
          .where(and(
            eq(purchaseOrderItems.purchaseOrderId, id),
            eq(purchaseOrderItems.tenantId, tenantId)
          ));

        // Insert new items
        const itemsToInsert = items.map((item: any) => ({
          id: uuidv4(),
          purchaseOrderId: id,
          productId: item.productId,
          tenantId,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: 0,
          unitCost: item.unitCost || null,
          totalCost: item.unitCost && item.orderedQuantity
            ? (parseFloat(item.unitCost) * parseInt(item.orderedQuantity)).toFixed(2)
            : null,
          expectedExpiryDate: item.expectedExpiryDate || null,
          notes: item.notes || null,
        }));

        await tx.insert(purchaseOrderItems).values(itemsToInsert);

        changedFields.items = {
          from: 'previous items',
          to: `${items.length} item(s) updated`
        };
      }

      return updatedOrder;
    });

    const updatedOrder = result;

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Regenerate document if items were updated or PO was approved
    const shouldRegenerateDocument = items && items.length > 0;
    const isApproved = updateData.status === 'approved' && existingOrder.status !== 'approved';

    if (shouldRegenerateDocument || isApproved) {
      try {
        const [completeOrder] = await db
          .select({
            id: purchaseOrders.id,
            tenantId: purchaseOrders.tenantId,
            orderNumber: purchaseOrders.orderNumber,
            supplierId: purchaseOrders.supplierId,
            supplierName: suppliers.name,
            supplierEmail: suppliers.email,
            supplierPhone: suppliers.phone,
            supplierLocationId: purchaseOrders.supplierLocationId,
            locationAddress: supplierLocations.address,
            locationCity: supplierLocations.city,
            locationState: supplierLocations.state,
            locationPostalCode: supplierLocations.postalCode,
            locationCountry: supplierLocations.country,
            deliveryMethod: purchaseOrders.deliveryMethod,
            warehouseId: purchaseOrders.warehouseId,
            warehouseName: warehouses.name,
            warehouseAddress: warehouses.address,
            status: purchaseOrders.status,
            workflowState: purchaseOrders.workflowState,
            orderDate: purchaseOrders.orderDate,
            expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
            totalAmount: purchaseOrders.totalAmount,
            notes: purchaseOrders.notes,
            createdBy: purchaseOrders.createdBy,
            createdByName: user.fullname,
            createdAt: purchaseOrders.createdAt,
            updatedAt: purchaseOrders.updatedAt,
          })
          .from(purchaseOrders)
          .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
          .leftJoin(supplierLocations, eq(purchaseOrders.supplierLocationId, supplierLocations.id))
          .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
          .leftJoin(user, eq(purchaseOrders.createdBy, user.id))
          .where(eq(purchaseOrders.id, id));

        const orderItems = await db
          .select({
            id: purchaseOrderItems.id,
            purchaseOrderId: purchaseOrderItems.purchaseOrderId,
            productId: purchaseOrderItems.productId,
            productName: products.name,
            productSku: products.sku,
            orderedQuantity: purchaseOrderItems.orderedQuantity,
            receivedQuantity: purchaseOrderItems.receivedQuantity,
            unitCost: purchaseOrderItems.unitCost,
            totalCost: purchaseOrderItems.totalCost,
            expectedExpiryDate: purchaseOrderItems.expectedExpiryDate,
            notes: purchaseOrderItems.notes,
          })
          .from(purchaseOrderItems)
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .where(eq(purchaseOrderItems.purchaseOrderId, id));

        await PODocumentGenerator.regenerateDocument(
          {
            id: completeOrder.id || id,
            tenantId: completeOrder.tenantId || tenantId,
            orderNumber: completeOrder.orderNumber || '',
            orderDate: completeOrder.orderDate || new Date().toISOString().split('T')[0],
            expectedDeliveryDate: completeOrder.expectedDeliveryDate,
            deliveryMethod: completeOrder.deliveryMethod || 'delivery',
            totalAmount: completeOrder.totalAmount || '0.00',
            notes: completeOrder.notes,
            supplierName: completeOrder.supplierName || 'N/A',
            supplierEmail: completeOrder.supplierEmail,
            supplierPhone: completeOrder.supplierPhone,
            locationAddress: completeOrder.locationAddress,
            locationCity: completeOrder.locationCity,
            locationState: completeOrder.locationState,
            locationPostalCode: completeOrder.locationPostalCode,
            locationCountry: completeOrder.locationCountry,
            warehouseName: completeOrder.warehouseName || 'N/A',
            warehouseAddress: completeOrder.warehouseAddress || 'N/A',
            warehouseCity: null, // Warehouse table doesn't have city field
            createdByName: completeOrder.createdByName,
            items: orderItems.map(item => ({
              productSku: item.productSku || 'N/A',
              productName: item.productName || 'N/A',
              orderedQuantity: item.orderedQuantity,
              unitCost: item.unitCost || '0.00',
              totalCost: item.totalCost || '0.00',
              notes: item.notes
            }))
          },
          userId
        );
        console.log('[PO Document Regenerated]', id, isApproved ? 'on approval' : 'on edit');
      } catch (docError) {
        console.error('Error regenerating PO document:', docError);
      }
    }

    // Log audit trail
    if (Object.keys(changedFields).length > 0) {
      await logAudit({
        tenantId,
        userId,
        module: 'purchase-order',
        action: 'update',
        resourceType: 'purchase_order',
        resourceId: id,
        description: `Updated unapproved purchase order ${existingOrder.orderNumber}`,
        changedFields,
        ipAddress: getClientIp(req),
      });
    }

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Purchase order updated successfully',
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/orders/{id}:
 *   delete:
 *     summary: Delete a purchase order
 *     tags: [Purchase Orders]
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
 *       204:
 *         description: Purchase order deleted successfully
 *       404:
 *         description: Purchase order not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/orders/:id', authorized('ADMIN', 'purchase-order.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;

    // Fetch existing order first to check if it's unapproved
    const [existingOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId)
      ));

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Only allow deleting if PO is still unapproved
    if (existingOrder.status !== 'pending' || existingOrder.workflowState !== 'approve') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete purchase order: only unapproved purchase orders can be deleted',
      });
    }

    // Use transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // 1. Find and delete generated document files from filesystem
      const [generatedDoc] = await tx
        .select()
        .from(generatedDocuments)
        .where(and(
          eq(generatedDocuments.tenantId, tenantId),
          eq(generatedDocuments.referenceType, 'purchase_order'),
          eq(generatedDocuments.referenceId, id)
        ));

      if (generatedDoc) {
        // Delete physical file from filesystem
        try {
          const files = generatedDoc.files as any;
          if (files?.html?.path) {
            const filePath = path.join(process.cwd(), 'storage', 'purchase-order', files.html.path.replace('storage/purchase-order/', ''));
            await fs.unlink(filePath);
            console.log(`Deleted file: ${filePath}`);
          }
        } catch (fileError) {
          console.error('Error deleting physical file:', fileError);
          // Continue with database deletion even if file deletion fails
        }

        // Delete generated document record
        await tx
          .delete(generatedDocuments)
          .where(eq(generatedDocuments.id, generatedDoc.id));
      }

      // 2. Delete document number history
      await tx
        .delete(documentNumberHistory)
        .where(and(
          eq(documentNumberHistory.tenantId, tenantId),
          eq(documentNumberHistory.documentId, id)
        ));

      // 3. Delete purchase order items (should cascade, but explicit is better)
      await tx
        .delete(purchaseOrderItems)
        .where(and(
          eq(purchaseOrderItems.purchaseOrderId, id),
          eq(purchaseOrderItems.tenantId, tenantId)
        ));

      // 4. Delete purchase order
      await tx
        .delete(purchaseOrders)
        .where(and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.tenantId, tenantId)
        ));
    });

    // Log audit trail
    await logAudit({
      tenantId,
      userId,
      module: 'purchase-order',
      action: 'delete',
      resourceType: 'purchase_order',
      resourceId: id,
      description: `Deleted unapproved purchase order ${existingOrder.orderNumber}`,
      ipAddress: getClientIp(req),
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// ==================== PURCHASE ORDER ITEMS CRUD ====================

/**
 * @swagger
 * /api/modules/purchase-order/items:
 *   get:
 *     summary: Get all purchase order items
 *     tags: [Purchase Order Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: purchaseOrderId
 *         schema:
 *           type: string
 *           format: uuid
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
 *     responses:
 *       200:
 *         description: List of purchase order items
 *       401:
 *         description: Unauthorized
 */
router.get('/items', authorized('ADMIN', 'purchase-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const purchaseOrderId = req.query.purchaseOrderId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const whereConditions = [eq(purchaseOrderItems.tenantId, tenantId)];
    
    if (purchaseOrderId) {
      whereConditions.push(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(purchaseOrderItems)
      .where(and(...whereConditions));

    // Get paginated data
    const data = await db
      .select({
        id: purchaseOrderItems.id,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        orderNumber: purchaseOrders.orderNumber,
        productId: purchaseOrderItems.productId,
        productName: products.name,
        productSku: products.sku,
        orderedQuantity: purchaseOrderItems.orderedQuantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        unitCost: purchaseOrderItems.unitCost,
        totalCost: purchaseOrderItems.totalCost,
        expectedExpiryDate: purchaseOrderItems.expectedExpiryDate,
        notes: purchaseOrderItems.notes,
        createdAt: purchaseOrderItems.createdAt,
        updatedAt: purchaseOrderItems.updatedAt,
      })
      .from(purchaseOrderItems)
      .leftJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .where(and(...whereConditions))
      .orderBy(desc(purchaseOrderItems.createdAt))
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
    console.error('Error fetching purchase order items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/items/{id}:
 *   get:
 *     summary: Get a purchase order item by ID
 *     tags: [Purchase Order Items]
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
 *         description: Purchase order item found
 *       404:
 *         description: Purchase order item not found
 *       401:
 *         description: Unauthorized
 */
router.get('/items/:id', authorized('ADMIN', 'purchase-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select({
        id: purchaseOrderItems.id,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        orderNumber: purchaseOrders.orderNumber,
        productId: purchaseOrderItems.productId,
        productName: products.name,
        productSku: products.sku,
        orderedQuantity: purchaseOrderItems.orderedQuantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        unitCost: purchaseOrderItems.unitCost,
        totalCost: purchaseOrderItems.totalCost,
        expectedExpiryDate: purchaseOrderItems.expectedExpiryDate,
        notes: purchaseOrderItems.notes,
        createdAt: purchaseOrderItems.createdAt,
        updatedAt: purchaseOrderItems.updatedAt,
      })
      .from(purchaseOrderItems)
      .leftJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .where(and(
        eq(purchaseOrderItems.id, id),
        eq(purchaseOrderItems.tenantId, tenantId)
      ));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order item not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching purchase order item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/items:
 *   post:
 *     summary: Create a new purchase order item
 *     tags: [Purchase Order Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purchaseOrderId
 *               - productId
 *               - orderedQuantity
 *             properties:
 *               purchaseOrderId:
 *                 type: string
 *                 format: uuid
 *               productId:
 *                 type: string
 *                 format: uuid
 *               orderedQuantity:
 *                 type: integer
 *               unitCost:
 *                 type: number
 *               expectedExpiryDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Purchase order item created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/items', authorized('ADMIN', 'purchase-order.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { 
      purchaseOrderId, 
      productId, 
      orderedQuantity,
      unitCost,
      expectedExpiryDate,
      notes
    } = req.body;

    // Validation
    if (!purchaseOrderId || !productId || !orderedQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Purchase order, product, and ordered quantity are required',
      });
    }

    // Verify purchase order belongs to tenant
    const [order] = await db
      .select()
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, purchaseOrderId),
        eq(purchaseOrders.tenantId, tenantId)
      ));

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    const totalCost = unitCost && orderedQuantity 
      ? (parseFloat(unitCost) * parseInt(orderedQuantity)).toFixed(2)
      : null;

    const [newItem] = await db
      .insert(purchaseOrderItems)
      .values({
        id: uuidv4(),
        purchaseOrderId,
        productId,
        tenantId,
        orderedQuantity,
        receivedQuantity: 0,
        unitCost: unitCost || null,
        totalCost,
        expectedExpiryDate: expectedExpiryDate || null,
        notes: notes || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newItem,
      message: 'Purchase order item created successfully',
    });
  } catch (error) {
    console.error('Error creating purchase order item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/items/{id}:
 *   put:
 *     summary: Update a purchase order item
 *     tags: [Purchase Order Items]
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
 *     responses:
 *       200:
 *         description: Purchase order item updated successfully
 *       404:
 *         description: Purchase order item not found
 *       401:
 *         description: Unauthorized
 */
router.put('/items/:id', authorized('ADMIN', 'purchase-order.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.tenantId;
    delete updateData.createdAt;
    delete updateData.purchaseOrderId;

    // Recalculate total cost if unit cost or quantity changed
    if (updateData.unitCost !== undefined || updateData.orderedQuantity !== undefined) {
      const [currentItem] = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.id, id));

      if (currentItem) {
        const unitCost = updateData.unitCost !== undefined ? updateData.unitCost : currentItem.unitCost;
        const quantity = updateData.orderedQuantity !== undefined ? updateData.orderedQuantity : currentItem.orderedQuantity;
        
        if (unitCost && quantity) {
          updateData.totalCost = (parseFloat(unitCost) * parseInt(quantity)).toFixed(2);
        }
      }
    }

    const [updatedItem] = await db
      .update(purchaseOrderItems)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(purchaseOrderItems.id, id),
        eq(purchaseOrderItems.tenantId, tenantId)
      ))
      .returning();

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order item not found',
      });
    }

    res.json({
      success: true,
      data: updatedItem,
      message: 'Purchase order item updated successfully',
    });
  } catch (error) {
    console.error('Error updating purchase order item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/items/{id}:
 *   delete:
 *     summary: Delete a purchase order item
 *     tags: [Purchase Order Items]
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
 *       204:
 *         description: Purchase order item deleted successfully
 *       404:
 *         description: Purchase order item not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/items/:id', authorized('ADMIN', 'purchase-order.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const result = await db
      .delete(purchaseOrderItems)
      .where(and(
        eq(purchaseOrderItems.id, id),
        eq(purchaseOrderItems.tenantId, tenantId)
      ))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order item not found',
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting purchase order item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/orders/{id}/approve:
 *   post:
 *     summary: Approve a purchase order
 *     tags: [Purchase Orders]
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
 *         description: Purchase order approved successfully
 *       400:
 *         description: Invalid request or PO not in approvable state
 *       404:
 *         description: Purchase order not found
 *       401:
 *         description: Unauthorized
 */
router.post('/orders/:id/approve', authorized('ADMIN', 'purchase-order.approve'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;

    // Fetch existing order
    const [existingOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId)
      ));

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Verify PO is in approvable state
    if (existingOrder.status !== 'pending' || existingOrder.workflowState !== 'approve') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve purchase order: current status is ${existingOrder.status}/${existingOrder.workflowState}`,
      });
    }

    // Perform approval in a transaction
    await db.transaction(async (tx) => {
      // Update purchase order status
      await tx
        .update(purchaseOrders)
        .set({
          status: 'approved',
          workflowState: 'receive',
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, id));

      // Log audit trail
      await logAudit({
        tenantId,
        userId,
        module: 'purchase-order',
        action: 'approve',
        resourceType: 'purchase_order',
        resourceId: id,
        description: `Approved purchase order ${existingOrder.orderNumber}`,
        previousState: 'pending/approve',
        newState: 'approved/receive',
        changedFields: {
          status: { from: 'pending', to: 'approved' },
          workflowState: { from: 'approve', to: 'receive' },
        },
        status: 'success',
        ipAddress: getClientIp(req),
      });
    });

    // Note: HTML regeneration will be handled by frontend when viewing the approved PO
    // The existing HTML document already has all the PO details

    // Fetch updated order
    const [updatedOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Purchase order approved successfully',
    });
  } catch (error) {
    console.error('Error approving purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/orders/{id}/reject:
 *   post:
 *     summary: Reject a purchase order
 *     tags: [Purchase Orders]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Optional reason for rejection
 *     responses:
 *       200:
 *         description: Purchase order rejected successfully
 *       400:
 *         description: Invalid request or PO not in rejectable state
 *       404:
 *         description: Purchase order not found
 *       401:
 *         description: Unauthorized
 */
router.post('/orders/:id/reject', authorized('ADMIN', 'purchase-order.reject'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const { id } = req.params;
    const { reason } = req.body;

    // Fetch existing order
    const [existingOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId)
      ));

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Verify PO is in rejectable state
    if (existingOrder.status !== 'pending' || existingOrder.workflowState !== 'approve') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject purchase order: current status is ${existingOrder.status}/${existingOrder.workflowState}`,
      });
    }

    // Perform rejection in a transaction
    await db.transaction(async (tx) => {
      // Update purchase order status - send back to create state for rework
      await tx
        .update(purchaseOrders)
        .set({
          status: 'rejected',
          workflowState: 'create',
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, id));

      // Log audit trail
      await logAudit({
        tenantId,
        userId,
        module: 'purchase-order',
        action: 'reject',
        resourceType: 'purchase_order',
        resourceId: id,
        description: reason 
          ? `Rejected purchase order ${existingOrder.orderNumber}: ${reason}`
          : `Rejected purchase order ${existingOrder.orderNumber}`,
        previousState: 'pending/approve',
        newState: 'rejected/create',
        changedFields: {
          status: { from: 'pending', to: 'rejected' },
          workflowState: { from: 'approve', to: 'create' },
          ...(reason && { rejectionReason: { to: reason } }),
        },
        status: 'success',
        ipAddress: getClientIp(req),
      });
    });

    // Fetch updated order
    const [updatedOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Purchase order rejected successfully',
    });
  } catch (error) {
    console.error('Error rejecting purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// ==================== RECEIVE ITEMS ENDPOINTS ====================

/**
 * @swagger
 * /api/modules/purchase-order/receive/approved:
 *   get:
 *     summary: Get approved purchase orders ready for receiving
 *     tags: [Purchase Orders - Receive]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of approved POs with items
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/receive/approved', async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;

    // Get all approved POs in receive workflow state with their items
    const approvedPOs = await db
      .select({
        po: purchaseOrders,
        supplier: suppliers,
        warehouse: warehouses,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          eq(purchaseOrders.status, 'approved'),
          eq(purchaseOrders.workflowState, 'receive')
        )
      )
      .orderBy(desc(purchaseOrders.orderDate));

    // Get items for each PO
    const posWithItems = await Promise.all(
      approvedPOs.map(async ({ po, supplier, warehouse }) => {
        const items = await db
          .select({
            item: purchaseOrderItems,
            product: products,
          })
          .from(purchaseOrderItems)
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .where(eq(purchaseOrderItems.purchaseOrderId, po.id));

        return {
          ...po,
          supplierName: supplier?.name || 'Unknown Supplier',
          warehouseName: warehouse?.name || 'Unknown Warehouse',
          items: items.map(({ item, product }) => ({
            ...item,
            product,
          })),
        };
      })
    );

    res.json({
      success: true,
      data: posWithItems,
    });
  } catch (error) {
    console.error('Error fetching approved POs for receiving:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/receive/incomplete:
 *   get:
 *     summary: Get incomplete purchase orders (partially received)
 *     tags: [Purchase Orders - Receive]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of incomplete POs with items
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/receive/incomplete', async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;

    // Get all incomplete POs in receive workflow state with their items
    const incompletePOs = await db
      .select({
        po: purchaseOrders,
        supplier: suppliers,
        warehouse: warehouses,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          eq(purchaseOrders.status, 'incomplete'),
          eq(purchaseOrders.workflowState, 'receive')
        )
      )
      .orderBy(desc(purchaseOrders.orderDate));

    // Get items for each PO
    const posWithItems = await Promise.all(
      incompletePOs.map(async ({ po, supplier, warehouse }) => {
        const items = await db
          .select({
            item: purchaseOrderItems,
            product: products,
          })
          .from(purchaseOrderItems)
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .where(eq(purchaseOrderItems.purchaseOrderId, po.id));

        return {
          ...po,
          supplierName: supplier?.name || 'Unknown Supplier',
          warehouseName: warehouse?.name || 'Unknown Warehouse',
          items: items.map(({ item, product }) => ({
            ...item,
            product,
          })),
        };
      })
    );

    res.json({
      success: true,
      data: posWithItems,
    });
  } catch (error) {
    console.error('Error fetching incomplete POs for receiving:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/receive/received:
 *   get:
 *     summary: Get received purchase orders awaiting putaway
 *     tags: [Purchase Orders - Receive]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of received POs with GRN information
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/receive/received', async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;

    // Get all receipts with GRN documents (one row per GRN)
    const receiptsWithGRNs = await db
      .select({
        po: purchaseOrders,
        supplier: suppliers,
        warehouse: warehouses,
        receipt: purchaseOrdersReceipt,
        grnDocument: generatedDocuments,
      })
      .from(purchaseOrdersReceipt)
      .innerJoin(
        generatedDocuments,
        eq(purchaseOrdersReceipt.grnDocumentId, generatedDocuments.id)
      )
      .innerJoin(
        purchaseOrders,
        eq(purchaseOrdersReceipt.purchaseOrderId, purchaseOrders.id)
      )
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
      .where(eq(purchaseOrders.tenantId, tenantId))
      .orderBy(desc(purchaseOrdersReceipt.createdAt));

    // Get items for each unique PO
    const posWithDetails = await Promise.all(
      receiptsWithGRNs.map(async ({ po, supplier, warehouse, receipt, grnDocument }) => {
        const items = await db
          .select({
            item: purchaseOrderItems,
            product: products,
          })
          .from(purchaseOrderItems)
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .where(eq(purchaseOrderItems.purchaseOrderId, po.id));

        return {
          ...po,
          supplierName: supplier?.name || 'Unknown Supplier',
          warehouseName: warehouse?.name || 'Unknown Warehouse',
          items: items.map(({ item, product }) => ({
            ...item,
            product,
          })),
          grnNumber: grnDocument?.documentNumber || null,
          grnDocumentId: grnDocument?.id || null,
          receiptDate: receipt?.createdAt || null,
        };
      })
    );

    res.json({
      success: true,
      data: posWithDetails,
    });
  } catch (error) {
    console.error('Error fetching received POs awaiting putaway:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/putaway:
 *   get:
 *     summary: Get purchase orders ready for putaway
 *     tags: [Purchase Orders - Putaway]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of POs ready for putaway with items
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/putaway', async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;

    // Get all POs in putaway workflow state
    const putawayPOs = await db
      .select({
        po: purchaseOrders,
        supplier: suppliers,
        warehouse: warehouses,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          eq(purchaseOrders.workflowState, 'putaway')
        )
      )
      .orderBy(desc(purchaseOrders.updatedAt));

    // Get items for each PO
    const posWithItems = await Promise.all(
      putawayPOs.map(async ({ po, supplier, warehouse }) => {
        const items = await db
          .select({
            item: purchaseOrderItems,
            product: products,
          })
          .from(purchaseOrderItems)
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .where(eq(purchaseOrderItems.purchaseOrderId, po.id));

        return {
          ...po,
          supplierName: supplier?.name || 'Unknown Supplier',
          warehouseName: warehouse?.name || 'Unknown Warehouse',
          warehouseId: po.warehouseId,
          items: items.map(({ item, product }) => ({
            ...item,
            product,
          })),
        };
      })
    );

    res.json({
      success: true,
      data: posWithItems,
    });
  } catch (error) {
    console.error('Error fetching POs for putaway:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * SMART ALLOCATION ALGORITHM
 * 
 * This endpoint implements an automated bin suggestion system for putaway operations.
 * It uses a weighted scoring algorithm to recommend the optimal bin for storing received items.
 * 
 * ALGORITHM OVERVIEW:
 * The algorithm evaluates all active bins in the target warehouse using three weighted factors:
 * 
 * 1. AVAILABLE CAPACITY (45% weight):
 *    - Measures: (maxVolume - currentVolume) / maxVolume
 *    - Purpose: Prioritizes bins with more free space
 *    - Rationale: Ensures items fit and allows for future growth
 *    - Example: A bin 20% full scores higher than one 80% full
 * 
 * 2. ITEM MATCH (35% weight):
 *    - Measures: Presence of same SKU in the bin (binary: 1.0 or 0.0)
 *    - Purpose: Encourages SKU consolidation for easier picking
 *    - Rationale: Storing like items together improves warehouse efficiency
 *    - Example: Bin already containing "WIDGET-001" scores 1.0 for more "WIDGET-001"
 * 
 * 3. TEMPERATURE MATCH (20% weight):
 *    - Measures: Product temp requirements fall within bin's temperature range
 *    - Purpose: Ensures cold/frozen items go to appropriate bins
 *    - Rationale: Compliance with storage requirements and product quality
 *    - Example: Frozen food (-18°C) only scores 1.0 in freezer bins (-20°C to -15°C)
 * 
 * FINAL SCORE CALCULATION:
 * score = (availableCapacity × 0.45) + (itemMatch × 0.35) + (tempMatch × 0.20)
 * 
 * The bin with the highest score is returned as the recommendation.
 * 
 * DESIGN PHILOSOPHY:
 * - Optimized for SME/SMB operations (simplicity over complexity)
 * - No distance calculations (assumes compact warehouse layouts)
 * - Manual override always available (suggestions, not mandates)
 * - Real-time calculation (no pre-computation needed)
 * 
 * @swagger
 * /api/modules/purchase-order/putaway/smart-allocate:
 *   post:
 *     summary: Get smart bin allocation suggestion
 *     description: Uses weighted scoring to suggest the best bin for putaway based on capacity, SKU matching, and temperature requirements
 *     tags: [Purchase Orders - Putaway]
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
 *               - warehouseId
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *                 description: The product being stored
 *               warehouseId:
 *                 type: string
 *                 format: uuid
 *                 description: Target warehouse for putaway
 *               quantity:
 *                 type: number
 *                 description: Quantity being stored (for future capacity planning)
 *     responses:
 *       200:
 *         description: Bin suggestion returned successfully
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
 *                     binId:
 *                       type: string
 *                     zoneId:
 *                       type: string
 *                     aisleId:
 *                       type: string
 *                     shelfId:
 *                       type: string
 *                     score:
 *                       type: number
 *                       description: Final weighted score (0-1)
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         capacityScore:
 *                           type: number
 *                         itemMatchScore:
 *                           type: number
 *                         tempMatchScore:
 *                           type: number
 *       400:
 *         description: Invalid request
 *       404:
 *         description: No suitable bin found
 *       500:
 *         description: Server error
 */
router.post('/putaway/smart-allocate', async (req, res) => {
  try {
    const { productId, warehouseId, quantity = 0 } = req.body;
    const tenantId = req.user!.activeTenantId;

    // Validate input
    if (!productId || !warehouseId) {
      return res.status(400).json({
        success: false,
        message: 'productId and warehouseId are required',
      });
    }

    // Get product details (for temperature requirements)
    const [product] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.tenantId, tenantId)
      ));

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Get all active bins in the warehouse with their location hierarchy
    const activeBins = await db
      .select({
        bin: bins,
        shelf: shelves,
        aisle: aisles,
        zone: zones,
      })
      .from(bins)
      .innerJoin(shelves, eq(bins.shelfId, shelves.id))
      .innerJoin(aisles, eq(shelves.aisleId, aisles.id))
      .innerJoin(zones, eq(aisles.zoneId, zones.id))
      .innerJoin(warehouses, eq(zones.warehouseId, warehouses.id))
      .where(and(
        eq(warehouses.id, warehouseId),
        eq(bins.tenantId, tenantId)
      ));

    if (activeBins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No bins found in warehouse',
      });
    }

    // Get inventory items to check which bins already have this SKU
    const binsWithProduct = await db
      .select({
        binId: inventoryItems.binId,
      })
      .from(inventoryItems)
      .where(and(
        eq(inventoryItems.productId, productId),
        eq(inventoryItems.tenantId, tenantId),
        inArray(inventoryItems.binId, activeBins.map(b => b.bin.id))
      ));

    const binIdsWithSameSKU = new Set(binsWithProduct.map(b => b.binId));

    // Calculate scores for each bin
    interface ScoredBin {
      binId: string;
      zoneId: string;
      aisleId: string;
      shelfId: string;
      score: number;
      breakdown: {
        capacityScore: number;
        itemMatchScore: number;
        tempMatchScore: number;
      };
    }

    const scoredBins: ScoredBin[] = activeBins.map(({ bin, shelf, aisle, zone }) => {
      // FACTOR 1: Available Capacity Score (45%)
      // Higher score for bins with more free space
      let capacityScore = 0;
      if (bin.maxVolume && parseFloat(bin.maxVolume) > 0) {
        const currentVol = parseFloat(bin.currentVolume || '0');
        const maxVol = parseFloat(bin.maxVolume);
        capacityScore = (maxVol - currentVol) / maxVol;
      }

      // FACTOR 2: Item Match Score (35%)
      // 1.0 if bin already contains same SKU, 0.0 otherwise
      const itemMatchScore = binIdsWithSameSKU.has(bin.id) ? 1.0 : 0.0;

      // FACTOR 3: Temperature Match Score (20%)
      // 1.0 if product temp requirements are compatible with bin's temp classification, 0.0 otherwise
      let tempMatchScore = 0;
      
      const productMinTemp = product.requiredTemperatureMin ? parseFloat(product.requiredTemperatureMin) : null;
      const productMaxTemp = product.requiredTemperatureMax ? parseFloat(product.requiredTemperatureMax) : null;
      
      if (!productMinTemp && !productMaxTemp) {
        // Product has no temperature requirement - any bin works
        tempMatchScore = 1.0;
      } else if (bin.requiredTemperature) {
        // Bin has a temperature classification
        // Common classifications: "frozen" (<-15°C), "cold" (0-10°C), "ambient" (15-25°C)
        const binTemp = bin.requiredTemperature.toLowerCase();
        
        if (binTemp.includes('frozen') || binTemp.includes('freezer')) {
          // Frozen bins typically range from -25°C to -15°C
          tempMatchScore = (productMinTemp && productMinTemp < -10) ? 1.0 : 0.0;
        } else if (binTemp.includes('cold') || binTemp.includes('chilled') || binTemp.includes('refrigerat')) {
          // Cold/chilled bins typically range from 0°C to 10°C
          tempMatchScore = (productMinTemp && productMinTemp >= 0 && productMaxTemp && productMaxTemp <= 15) ? 1.0 : 0.0;
        } else if (binTemp.includes('ambient') || binTemp.includes('room')) {
          // Ambient/room temperature bins typically range from 15°C to 25°C
          tempMatchScore = (productMinTemp && productMinTemp >= 10 && productMaxTemp && productMaxTemp <= 30) ? 1.0 : 0.0;
        } else {
          // Unknown classification - give partial credit
          tempMatchScore = 0.5;
        }
      } else {
        // Bin has no temperature requirement - only suitable for ambient products
        tempMatchScore = (!productMinTemp || (productMinTemp >= 10 && productMaxTemp && productMaxTemp <= 30)) ? 1.0 : 0.0;
      }

      // Calculate weighted final score
      const finalScore = (capacityScore * 0.45) + (itemMatchScore * 0.35) + (tempMatchScore * 0.20);

      return {
        binId: bin.id,
        zoneId: zone.id,
        aisleId: aisle.id,
        shelfId: shelf.id,
        score: finalScore,
        breakdown: {
          capacityScore,
          itemMatchScore,
          tempMatchScore,
        },
      };
    });

    // Sort by score (highest first) and return the best bin
    scoredBins.sort((a, b) => b.score - a.score);
    const bestBin = scoredBins[0];

    if (!bestBin || bestBin.score === 0) {
      return res.status(404).json({
        success: false,
        message: 'No suitable bin found for this item',
      });
    }

    res.json({
      success: true,
      data: bestBin,
    });
  } catch (error) {
    console.error('Error calculating smart allocation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/putaway/{id}/confirm:
 *   post:
 *     summary: Confirm putaway for purchase order
 *     tags: [Purchase Orders - Putaway]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - poItemId
 *                     - binId
 *                   properties:
 *                     poItemId:
 *                       type: string
 *                     binId:
 *                       type: string
 *     responses:
 *       200:
 *         description: Putaway confirmed successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Purchase order not found
 *       500:
 *         description: Server error
 */
router.post('/putaway/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Items array is required' 
      });
    }

    // Validate all items have bin assignments
    for (const item of items) {
      if (!item.poItemId || !item.binId) {
        return res.status(400).json({
          success: false,
          message: 'All items must have bin locations assigned'
        });
      }
    }

    await db.transaction(async (tx) => {
      // 1. Get PO details
      const [po] = await tx
        .select({
          po: purchaseOrders,
          supplier: suppliers,
          warehouse: warehouses,
        })
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
        .where(and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.tenantId, tenantId)
        ));

      if (!po) {
        throw new Error('Purchase order not found');
      }

      // 2. Get PO items with product details
      const poItems = await tx
        .select({
          item: purchaseOrderItems,
          product: products,
        })
        .from(purchaseOrderItems)
        .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
        .where(eq(purchaseOrderItems.purchaseOrderId, id));

      // 3. Get bin details for all assigned locations
      const binIds = items.map((i: any) => i.binId);
      const binDetails = await tx
        .select({
          bin: bins,
          shelf: shelves,
          aisle: aisles,
          zone: zones,
        })
        .from(bins)
        .leftJoin(shelves, eq(bins.shelfId, shelves.id))
        .leftJoin(aisles, eq(shelves.aisleId, aisles.id))
        .leftJoin(zones, eq(aisles.zoneId, zones.id))
        .where(and(
          inArray(bins.id, binIds),
          eq(bins.tenantId, tenantId)
        ));

      const binMap = new Map(binDetails.map(b => [b.bin.id, b]));

      // 4. Create inventory items for each putaway
      for (const putawayItem of items) {
        const poItem = poItems.find(pi => pi.item.id === putawayItem.poItemId);
        if (!poItem) continue;

        // Create inventory item
        await tx.insert(inventoryItems).values({
          tenantId,
          productId: poItem.item.productId,
          binId: putawayItem.binId,
          availableQuantity: poItem.item.receivedQuantity,
          reservedQuantity: 0,
          receivedDate: new Date().toISOString().split('T')[0],
          costPerUnit: poItem.item.unitCost,
        });

        // Update bin capacity (add to currentVolume/currentWeight)
        // For now, we'll skip this since we need product dimensions
        // This would be: UPDATE bins SET currentVolume = currentVolume + (qty * product.volume)
      }

      // 5. Generate putaway document number
      const authHeader = req.headers.authorization;
      const docNumberResponse = await axios.post(
        `${req.protocol}://${req.get('host')}/api/modules/document-numbering/generate`,
        {
          documentType: 'PUTAWAY',
          options: {}
        },
        {
          headers: {
            Authorization: authHeader,
          }
        }
      );

      const putawayNumber = docNumberResponse.data.documentNumber;

      // 6. Prepare putaway document data
      const putawayDocData = {
        putawayNumber,
        tenantId,
        poNumber: po.po.orderNumber,
        poId: po.po.id,
        putawayDate: new Date().toISOString(),
        putawayByName: req.user?.fullname || null,
        supplierName: po.supplier?.name || 'N/A',
        warehouseName: po.warehouse?.name || null,
        warehouseAddress: po.warehouse?.address || null,
        notes: null,
        items: items.map((putawayItem: any) => {
          const poItem = poItems.find(pi => pi.item.id === putawayItem.poItemId);
          const binDetail = binMap.get(putawayItem.binId);
          
          const locationPath = [
            binDetail?.zone?.name,
            binDetail?.aisle?.name,
            binDetail?.shelf?.name,
            binDetail?.bin?.name
          ].filter(Boolean).join(' > ');

          return {
            productSku: poItem?.product?.sku || 'N/A',
            productName: poItem?.product?.name || 'Unknown',
            receivedQuantity: poItem?.item.receivedQuantity || 0,
            zoneName: binDetail?.zone?.name || null,
            aisleName: binDetail?.aisle?.name || null,
            shelfName: binDetail?.shelf?.name || null,
            binName: binDetail?.bin?.name || null,
            locationPath,
          };
        }),
      };

      // 7. Generate and save putaway document
      const { documentId, filePath } = await PutawayDocumentGenerator.generateAndSave(
        putawayDocData,
        userId
      );

      // 8. Update PO workflow status to 'complete'
      await tx
        .update(purchaseOrders)
        .set({
          workflowState: 'complete',
          status: 'complete',
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, id));

      // 9. Log audit trail
      await logAudit({
        tenantId,
        userId,
        module: 'purchase-order',
        action: 'putaway_confirm',
        resourceType: 'purchase_order',
        resourceId: id,
        status: 'success',
        ipAddress: getClientIp(req),
        changes: {
          putawayNumber,
          documentId,
          itemsCount: items.length,
          workflowState: 'complete',
        },
      });

      res.json({
        success: true,
        data: {
          putawayNumber,
          documentId,
          documentPath: filePath,
        },
      });
    });
  } catch (error: any) {
    console.error('Error confirming putaway:', error);
    
    if (req.user) {
      await logAudit({
        tenantId: req.user.activeTenantId,
        userId: req.user.id,
        module: 'purchase-order',
        action: 'putaway_confirm',
        resourceType: 'purchase_order',
        resourceId: id,
        status: 'failure',
        ipAddress: getClientIp(req),
        errorMessage: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/receive/{id}/submit:
 *   post:
 *     summary: Submit receipt for purchase order
 *     tags: [Purchase Orders - Receive]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - itemId
 *                     - receivedQuantity
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       format: uuid
 *                     receivedQuantity:
 *                       type: integer
 *                     expiryDate:
 *                       type: string
 *                       format: date
 *                     discrepancyNote:
 *                       type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Receipt submitted successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Purchase order not found
 *       500:
 *         description: Server error
 */
router.post('/receive/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { items: receivedItems, notes } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    // Validate input
    if (!receivedItems || !Array.isArray(receivedItems) || receivedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required',
      });
    }

    // Verify PO exists and is in receivable state
    const [existingOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)));

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    if (existingOrder.workflowState !== 'receive') {
      return res.status(400).json({
        success: false,
        message: `Cannot receive items: current workflow state is ${existingOrder.workflowState}`,
      });
    }

    // Perform receipt in a transaction
    const result = await db.transaction(async (tx) => {
      // Update received quantities for each item (denormalized total)
      for (const receivedItem of receivedItems) {
        const { itemId, receivedQuantity } = receivedItem;

        // Get current item
        const [currentItem] = await tx
          .select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.id, itemId));

        if (!currentItem) {
          throw new Error(`Item ${itemId} not found`);
        }

        // Validate received quantity
        const newTotalReceived = (currentItem.receivedQuantity || 0) + receivedQuantity;
        if (newTotalReceived > currentItem.orderedQuantity) {
          throw new Error(
            `Received quantity (${newTotalReceived}) exceeds ordered quantity (${currentItem.orderedQuantity}) for item ${itemId}`
          );
        }

        // Update item's cumulative received quantity (denormalized)
        await tx
          .update(purchaseOrderItems)
          .set({
            receivedQuantity: newTotalReceived,
            updatedAt: new Date(),
          })
          .where(eq(purchaseOrderItems.id, itemId));
      }

      // Status update moved to AFTER receipt/GRN creation (will be done later in transaction)

      // Generate GRN document number with proper error handling
      let grnNumber: string;
      try {
        const grnNumberResponse = await axios.post(
          `http://localhost:5000/api/modules/document-numbering/generate`,
          {
            tenantId,
            documentType: 'GRN',
            // Don't send prefix1 - let it use the default value from configuration
          },
          {
            headers: {
              Authorization: req.headers.authorization,
            },
          }
        );

        if (!grnNumberResponse?.data?.documentNumber) {
          console.error('GRN generation failed - missing documentNumber in response:', grnNumberResponse?.data);
          return res.status(500).json({
            error: 'Failed to generate GRN document number',
            details: 'Document numbering service returned invalid response'
          });
        }

        grnNumber = grnNumberResponse.data.documentNumber;
      } catch (error: any) {
        console.error('Error calling document numbering service:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          error: error.response?.data,
          message: error.message
        });

        // Return helpful error message based on the actual error
        if (error.response?.status === 404) {
          return res.status(400).json({
            error: 'GRN document numbering not configured',
            details: error.response?.data?.error || 'Please configure GRN document numbering in Settings > Document Numbering before receiving items.'
          });
        } else if (error.response?.status === 400) {
          return res.status(400).json({
            error: 'Invalid document numbering configuration',
            details: error.response?.data?.error || 'Check your GRN document numbering configuration.'
          });
        } else {
          return res.status(502).json({
            error: 'Document numbering service error',
            details: error.response?.data?.error || error.message
          });
        }
      }

      // Fetch all required data for GRN document
      const [supplierData] = await tx
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, existingOrder.supplierId));

      const [warehouseData] = await tx
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, existingOrder.warehouseId));

      const [receiverData] = await tx
        .select({
          username: user.username,
        })
        .from(user)
        .where(eq(user.id, userId));

      // Get receipt items with product details for THIS GRN (not all items)
      const grnItems = [];
      for (const receivedItem of receivedItems) {
        const { itemId, receivedQuantity, expiryDate, discrepancyNote } = receivedItem;
        
        // Get PO item with product details
        const [poItemWithProduct] = await tx
          .select({
            poItem: purchaseOrderItems,
            product: products,
          })
          .from(purchaseOrderItems)
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .where(eq(purchaseOrderItems.id, itemId));
        
        if (poItemWithProduct) {
          grnItems.push({
            productSku: poItemWithProduct.product?.sku || 'N/A',
            productName: poItemWithProduct.product?.name || 'Unknown Product',
            orderedQuantity: poItemWithProduct.poItem.orderedQuantity,
            receivedQuantity: receivedQuantity,
            discrepancy: receivedQuantity - poItemWithProduct.poItem.orderedQuantity,
            expiryDate: expiryDate || null,
            discrepancyNote: discrepancyNote || null,
          });
        }
      }

      // Prepare GRN document data
      const grnData = {
        grnNumber,
        tenantId,
        poNumber: existingOrder.orderNumber,
        poId: existingOrder.id,
        receiptDate: new Date().toISOString(),
        receivedByName: receiverData?.username || null,
        supplierName: supplierData?.name || 'Unknown Supplier',
        warehouseName: warehouseData?.name || null,
        warehouseAddress: warehouseData?.address || null,
        warehouseCity: null,
        notes,
        items: grnItems,
      };

      // Generate professional GRN HTML document
      const grnHtmlContent = GRNDocumentGenerator.generateHTML(grnData);

      // Save GRN HTML file
      const year = new Date().getFullYear();
      const grnDir = path.join(
        process.cwd(),
        'storage',
        'purchase-order',
        'documents',
        'tenants',
        tenantId,
        'grn',
        year.toString()
      );
      await fs.mkdir(grnDir, { recursive: true });

      const grnFilePath = path.join(grnDir, `${grnNumber}.html`);
      await fs.writeFile(grnFilePath, grnHtmlContent, 'utf-8');

      const relativePath = `storage/purchase-order/documents/tenants/${tenantId}/grn/${year}/${grnNumber}.html`;

      // Create purchase_orders_receipt record FIRST (so we can reference it in the GRN document)
      const [receiptRecord] = await tx.insert(purchaseOrdersReceipt).values({
        purchaseOrderId: id,
        grnDocumentId: null as any,
        tenantId,
        receivedBy: userId,
        notes,
      }).returning();

      // Create generated_documents record referencing the RECEIPT (not the PO)
      // This allows multiple GRNs per PO (partial receipts)
      const [grnDoc] = await tx
        .insert(generatedDocuments)
        .values({
          tenantId,
          documentType: 'goods_receipt_note',
          documentNumber: grnNumber,
          referenceType: 'purchase_order_receipt',
          referenceId: receiptRecord.id,
          files: {
            html: {
              path: relativePath,
              size: Buffer.byteLength(grnHtmlContent, 'utf-8'),
              generated_at: new Date().toISOString(),
            },
          },
          version: 1,
          generatedBy: userId,
        })
        .returning();

      // Update receipt with GRN document ID
      await tx
        .update(purchaseOrdersReceipt)
        .set({ grnDocumentId: grnDoc.id })
        .where(eq(purchaseOrdersReceipt.id, receiptRecord.id));

      // Create receipt_items records for each received item
      for (const receivedItem of receivedItems) {
        const { itemId, receivedQuantity, expiryDate, discrepancyNote } = receivedItem;
        
        await tx.insert(receiptItems).values({
          receiptId: receiptRecord.id,
          poItemId: itemId,
          tenantId,
          receivedQuantity,
          expiryDate: expiryDate || null,
          discrepancyNote: discrepancyNote || null,
        });
      }

      // Check if all items are fully received and update PO status
      const allItems = await tx
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, id));

      const allFullyReceived = allItems.every(
        (item) => item.receivedQuantity >= item.orderedQuantity
      );

      // Update PO status based on completion
      const newStatus = allFullyReceived ? 'received' : 'incomplete';
      const newWorkflowState = allFullyReceived ? 'putaway' : 'receive';

      await tx
        .update(purchaseOrders)
        .set({
          status: newStatus,
          workflowState: newWorkflowState,
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, id));

      // Log audit trail
      await logAudit({
        tenantId,
        userId,
        module: 'purchase-order',
        action: 'receive',
        resourceType: 'purchase_order',
        resourceId: id,
        description: `Received items for purchase order ${existingOrder.orderNumber}. Generated GRN ${grnNumber}`,
        previousState: `${existingOrder.status}/${existingOrder.workflowState}`,
        newState: `${newStatus}/${newWorkflowState}`,
        changedFields: {
          status: { from: existingOrder.status, to: newStatus },
          workflowState: { from: existingOrder.workflowState, to: newWorkflowState },
          grnNumber: { to: grnNumber },
        },
        status: 'success',
        ipAddress: getClientIp(req),
      });

      return { grnNumber, grnDocId: grnDoc.id };
    });

    // Fetch updated order with items
    const [updatedOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));

    const updatedItems = await db
      .select({
        item: purchaseOrderItems,
        product: products,
      })
      .from(purchaseOrderItems)
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    res.json({
      success: true,
      data: {
        order: updatedOrder,
        items: updatedItems,
        grnNumber: result.grnNumber,
        grnDocumentId: result.grnDocId,
      },
      message: `Receipt submitted successfully. GRN ${result.grnNumber} generated.`,
    });
  } catch (error: any) {
    console.error('Error submitting receipt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/grn/{documentId}/html:
 *   get:
 *     summary: Get HTML content of a GRN document
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: GRN HTML retrieved successfully
 *       404:
 *         description: GRN document not found
 *       401:
 *         description: Unauthorized
 */
router.get('/grn/:documentId/html', async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { documentId } = req.params;

    // Fetch the generated document metadata
    const [document] = await db
      .select()
      .from(generatedDocuments)
      .where(and(
        eq(generatedDocuments.id, documentId),
        eq(generatedDocuments.documentType, 'goods_receipt_note'),
        eq(generatedDocuments.tenantId, tenantId)
      ))
      .limit(1);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'GRN document not found',
      });
    }

    // Read HTML file from storage
    const htmlFilePath = path.join(process.cwd(), (document.files as any).html.path);
    
    try {
      const htmlContent = await fs.readFile(htmlFilePath, 'utf-8');
      
      res.json({
        success: true,
        html: htmlContent,
        documentInfo: {
          version: document.version,
          generatedAt: document.createdAt,
        },
      });
    } catch (fileError) {
      console.error('Error reading GRN HTML file:', fileError);
      return res.status(404).json({
        success: false,
        message: 'GRN HTML file not found on disk',
      });
    }
  } catch (error: any) {
    console.error('Error fetching GRN HTML:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
