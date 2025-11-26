import express from 'express';
import { db } from '@server/lib/db';
import { reports } from '../lib/db/schemas/reports';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, sql, gte, lte, inArray } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { salesOrders, salesOrderItems } from '@modules/sales-order/server/lib/db/schemas/salesOrder';
import { purchaseOrders, purchaseOrderItems } from '@modules/purchase-order/server/lib/db/schemas/purchaseOrder';
import { inventoryItems } from '@modules/inventory-items/server/lib/db/schemas/inventoryItems';
import { products, customers } from '@modules/master-data/server/lib/db/schemas/masterData';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('reports'));

/**
 * @swagger
 * components:
 *   schemas:
 *     Reports:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/modules/reports/reports:
 *   get:
 *     summary: Get all Reports records
 *     tags: [Reports]
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
 *     responses:
 *       200:
 *         description: List of Reports records
 *       401:
 *         description: Unauthorized
 */
router.get('/reports', authorized('ADMIN','reports.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(reports.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(ilike(reports.name, `%${search}%`));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(reports)
      .where(and(...whereConditions));

    // Get paginated data
    const data = await db
      .select()
      .from(reports)
      .where(and(...whereConditions))
      .orderBy(desc(reports.createdAt))
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
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/reports/reports:
 *   post:
 *     summary: Create a new Reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reports created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/reports', authorized('ADMIN','reports.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    const [newRecord] = await db
      .insert(reports)
      .values({
        tenantId,
        name,
        description,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newRecord,
      message: 'Reports created successfully',
    });
  } catch (error) {
    console.error('Error creating reports:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/reports/reports/{id}:
 *   get:
 *     summary: Get a Reports by ID
 *     tags: [Reports]
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
 *         description: Reports found
 *       404:
 *         description: Reports not found
 *       401:
 *         description: Unauthorized
 */
router.get('/reports/:id', authorized('ADMIN','reports.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(reports)
      .where(and(
        eq(reports.id, id),
        eq(reports.tenantId, tenantId)
      ));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Reports not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/reports/financial/summary:
 *   get:
 *     summary: Get financial summary report with period filter
 *     tags: [Reports - Financial]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year (e.g., 2025). If not provided, returns all time.
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Filter by month (1-12). Only used if year is also provided.
 *     responses:
 *       200:
 *         description: Financial summary data
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
 *                     totalRevenue:
 *                       type: number
 *                       description: Sum of shipped/delivered sales orders in period
 *                     orderCount:
 *                       type: integer
 *                       description: Number of shipped/delivered orders
 *                     grossProfit:
 *                       type: number
 *                       description: Revenue minus cost (using last purchase price)
 *                     profitMargin:
 *                       type: number
 *                       description: Profit margin as percentage
 *                     inventoryValue:
 *                       type: number
 *                       description: Current inventory value (qty * last purchase price)
 *                     avgOrderValue:
 *                       type: number
 *                       description: Average order value (totalRevenue / orderCount)
 *                     period:
 *                       type: object
 *                       properties:
 *                         year:
 *                           type: integer
 *                         month:
 *                           type: integer
 *                         label:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/financial/summary', authorized('ADMIN', 'reports.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const year = req.query.year ? parseInt(req.query.year as string) : null;
    const month = req.query.month ? parseInt(req.query.month as string) : null;

    // Build period label
    let periodLabel = 'All Time';
    if (year && month) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      periodLabel = `${monthNames[month - 1]} ${year}`;
    } else if (year) {
      periodLabel = `${year}`;
    }

    // Build date range for filtering
    let startDate: string | null = null;
    let endDate: string | null = null;
    
    if (year && month) {
      startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
    } else if (year) {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    // 1. Get Total Revenue and Order Count from shipped/delivered sales orders
    let revenueQuery = db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(${salesOrders.totalAmount}), 0)`,
        orderCount: sql<number>`COUNT(*)`,
      })
      .from(salesOrders)
      .where(and(
        eq(salesOrders.tenantId, tenantId),
        inArray(salesOrders.status, ['shipped', 'delivered'])
      ));

    if (startDate && endDate) {
      revenueQuery = db
        .select({
          totalRevenue: sql<string>`COALESCE(SUM(${salesOrders.totalAmount}), 0)`,
          orderCount: sql<number>`COUNT(*)`,
        })
        .from(salesOrders)
        .where(and(
          eq(salesOrders.tenantId, tenantId),
          inArray(salesOrders.status, ['shipped', 'delivered']),
          gte(salesOrders.orderDate, startDate),
          lte(salesOrders.orderDate, endDate)
        ));
    }

    const [revenueResult] = await revenueQuery;
    const totalRevenue = parseFloat(revenueResult?.totalRevenue || '0');
    const orderCount = Number(revenueResult?.orderCount || 0);

    // 2. Get last purchase price for each product (from approved POs)
    // Subquery: latest PO item per product based on PO created_at
    // Both po.tenant_id and poi.tenant_id are filtered to ensure tenant isolation
    const lastPurchasePrices = await db.execute(sql`
      WITH latest_po_items AS (
        SELECT DISTINCT ON (poi.product_id)
          poi.product_id,
          poi.unit_cost
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        WHERE po.tenant_id = ${tenantId}
          AND poi.tenant_id = ${tenantId}
          AND po.status IN ('approved', 'received', 'completed')
          AND poi.unit_cost IS NOT NULL
        ORDER BY poi.product_id, po.created_at DESC
      )
      SELECT product_id, unit_cost FROM latest_po_items
    `);

    const lastPriceMap = new Map<string, number>();
    for (const row of lastPurchasePrices as unknown as Array<{ product_id: string; unit_cost: string }>) {
      lastPriceMap.set(row.product_id, parseFloat(row.unit_cost));
    }

    // 3. Calculate Cost of Goods Sold (COGS) for shipped/delivered orders
    // Get sales order items for shipped/delivered orders in period
    // Both so.tenant_id and soi.tenant_id are filtered to ensure tenant isolation
    let cogsQuery;
    if (startDate && endDate) {
      cogsQuery = sql`
        SELECT 
          soi.product_id,
          SUM(CAST(soi.ordered_quantity AS DECIMAL)) as total_qty
        FROM sales_order_items soi
        JOIN sales_orders so ON soi.sales_order_id = so.id
        WHERE so.tenant_id = ${tenantId}
          AND soi.tenant_id = ${tenantId}
          AND so.status IN ('shipped', 'delivered')
          AND so.order_date >= ${startDate}
          AND so.order_date <= ${endDate}
        GROUP BY soi.product_id
      `;
    } else {
      cogsQuery = sql`
        SELECT 
          soi.product_id,
          SUM(CAST(soi.ordered_quantity AS DECIMAL)) as total_qty
        FROM sales_order_items soi
        JOIN sales_orders so ON soi.sales_order_id = so.id
        WHERE so.tenant_id = ${tenantId}
          AND soi.tenant_id = ${tenantId}
          AND so.status IN ('shipped', 'delivered')
        GROUP BY soi.product_id
      `;
    }

    const soldProductsResult = await db.execute(cogsQuery);
    
    let totalCogs = 0;
    for (const row of soldProductsResult as unknown as Array<{ product_id: string; total_qty: string }>) {
      const productId = row.product_id;
      const qty = parseFloat(row.total_qty);
      const lastPrice = lastPriceMap.get(productId) || 0;
      totalCogs += qty * lastPrice;
    }

    const grossProfit = totalRevenue - totalCogs;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // 4. Calculate Current Inventory Value (current stock × last purchase price)
    const inventoryData = await db
      .select({
        productId: inventoryItems.productId,
        totalQuantity: sql<string>`SUM(${inventoryItems.availableQuantity})`,
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.tenantId, tenantId))
      .groupBy(inventoryItems.productId);

    let inventoryValue = 0;
    for (const item of inventoryData) {
      const qty = parseFloat(item.totalQuantity || '0');
      const lastPrice = lastPriceMap.get(item.productId) || 0;
      inventoryValue += qty * lastPrice;
    }

    // 5. Calculate Average Order Value
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    res.json({
      success: true,
      data: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        orderCount,
        grossProfit: parseFloat(grossProfit.toFixed(2)),
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        inventoryValue: parseFloat(inventoryValue.toFixed(2)),
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        period: {
          year,
          month,
          label: periodLabel,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/reports/financial/order-profitability:
 *   get:
 *     summary: Get order-level profitability analysis
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Filter by month (1-12)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 20
 *         description: Records per page (max 20)
 *     responses:
 *       200:
 *         description: Order profitability data
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
 *                       orderId:
 *                         type: string
 *                       orderNumber:
 *                         type: string
 *                       customerName:
 *                         type: string
 *                       revenue:
 *                         type: number
 *                       cogs:
 *                         type: number
 *                       grossProfit:
 *                         type: number
 *                       marginPercent:
 *                         type: number
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                 period:
 *                   type: object
 *                   properties:
 *                     year:
 *                       type: integer
 *                     month:
 *                       type: integer
 *                     label:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/financial/order-profitability', authorized('ADMIN', 'reports.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const year = req.query.year ? parseInt(req.query.year as string) : null;
    const month = req.query.month ? parseInt(req.query.month as string) : null;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 20);
    const offset = (page - 1) * limit;

    // Build period label
    let periodLabel = 'All Time';
    if (year && month) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      periodLabel = `${monthNames[month - 1]} ${year}`;
    } else if (year) {
      periodLabel = `${year}`;
    }

    // Build date range for filtering
    let startDate: string | null = null;
    let endDate: string | null = null;
    
    if (year && month) {
      startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
    } else if (year) {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    // Build where conditions for sales orders
    const whereConditions = [
      eq(salesOrders.tenantId, tenantId),
      inArray(salesOrders.status, ['shipped', 'delivered'])
    ];

    if (startDate && endDate) {
      whereConditions.push(gte(salesOrders.orderDate, startDate));
      whereConditions.push(lte(salesOrders.orderDate, endDate));
    }

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(salesOrders)
      .where(and(...whereConditions));

    const total = totalResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Get paginated sales orders with customer info
    const orders = await db
      .select({
        id: salesOrders.id,
        orderNumber: salesOrders.orderNumber,
        customerId: salesOrders.customerId,
        customerName: customers.name,
        totalAmount: salesOrders.totalAmount,
        orderDate: salesOrders.orderDate,
      })
      .from(salesOrders)
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(and(...whereConditions))
      .orderBy(desc(salesOrders.orderDate))
      .limit(limit)
      .offset(offset);

    // Get last purchase price for each product (same as summary endpoint)
    const lastPurchasePrices = await db.execute(sql`
      WITH latest_po_items AS (
        SELECT DISTINCT ON (poi.product_id)
          poi.product_id,
          poi.unit_cost
        FROM purchase_order_items poi
        JOIN purchase_orders po ON poi.purchase_order_id = po.id
        WHERE po.tenant_id = ${tenantId}
          AND poi.tenant_id = ${tenantId}
          AND po.status IN ('approved', 'received', 'completed')
          AND poi.unit_cost IS NOT NULL
        ORDER BY poi.product_id, po.created_at DESC
      )
      SELECT product_id, unit_cost FROM latest_po_items
    `);

    const lastPriceMap = new Map<string, number>();
    for (const row of lastPurchasePrices as unknown as Array<{ product_id: string; unit_cost: string }>) {
      lastPriceMap.set(row.product_id, parseFloat(row.unit_cost));
    }

    // Get all order IDs for COGS calculation
    const orderIds = orders.map(o => o.id);

    // Get sales order items for these orders to calculate COGS
    let orderItemsData: Array<{ sales_order_id: string; product_id: string; ordered_quantity: string }> = [];
    if (orderIds.length > 0) {
      const orderItemsResult = await db.execute(sql`
        SELECT 
          soi.sales_order_id,
          soi.product_id,
          soi.ordered_quantity
        FROM sales_order_items soi
        WHERE soi.tenant_id = ${tenantId}
          AND soi.sales_order_id = ANY(${orderIds})
      `);
      orderItemsData = orderItemsResult as unknown as Array<{ sales_order_id: string; product_id: string; ordered_quantity: string }>;
    }

    // Calculate COGS per order
    const orderCogsMap = new Map<string, number>();
    for (const item of orderItemsData) {
      const orderId = item.sales_order_id;
      const qty = parseFloat(item.ordered_quantity);
      const lastPrice = lastPriceMap.get(item.product_id) || 0;
      const itemCogs = qty * lastPrice;
      
      const currentCogs = orderCogsMap.get(orderId) || 0;
      orderCogsMap.set(orderId, currentCogs + itemCogs);
    }

    // Build response data with profitability metrics
    const data = orders.map(order => {
      const revenue = parseFloat(order.totalAmount || '0');
      const cogs = orderCogsMap.get(order.id) || 0;
      const grossProfit = revenue - cogs;
      const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName || 'Unknown',
        orderDate: order.orderDate,
        revenue: parseFloat(revenue.toFixed(2)),
        cogs: parseFloat(cogs.toFixed(2)),
        grossProfit: parseFloat(grossProfit.toFixed(2)),
        marginPercent: parseFloat(marginPercent.toFixed(2)),
      };
    });

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
      period: {
        year,
        month,
        label: periodLabel,
      },
    });
  } catch (error) {
    console.error('Error fetching order profitability:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
