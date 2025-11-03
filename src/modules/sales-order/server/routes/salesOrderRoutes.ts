import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  salesOrders,
  salesOrderItems,
  salesOrderAllocations,
  salesOrderPicks,
} from '../lib/db/schemas/salesOrder';
import { workflows, workflowSteps } from '../../../workflow/server/lib/db/schemas/workflow';
import { documentNumberConfig } from '../../../document-numbering/server/lib/db/schemas/documentNumbering';
import { customers } from '../../../master-data/server/lib/db/schemas/masterData';
import { products } from '../../../master-data/server/lib/db/schemas/masterData';
import axios from 'axios';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('sales-order'));

router.get('/sales-orders', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const workflowState = req.query.workflowState as string;
    const tenantId = req.user!.activeTenantId;

    const whereConditions = [
      eq(salesOrders.tenantId, tenantId),
      eq(salesOrders.status, 'created'),
    ];

    if (workflowState) {
      whereConditions.push(eq(salesOrders.workflowState, workflowState));
    } else {
      whereConditions.push(ne(salesOrders.workflowState, 'complete'));
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(salesOrders.orderNumber, `%${search}%`),
          ilike(salesOrders.notes, `%${search}%`)
        )!
      );
    }

    const results = await db
      .select({
        id: salesOrders.id,
        orderNumber: salesOrders.orderNumber,
        orderDate: salesOrders.orderDate,
        requestedDeliveryDate: salesOrders.requestedDeliveryDate,
        totalAmount: salesOrders.totalAmount,
        notes: salesOrders.notes,
        workflowState: salesOrders.workflowState,
        status: salesOrders.status,
        createdAt: salesOrders.createdAt,
        customerName: customers.name,
        customerId: salesOrders.customerId,
      })
      .from(salesOrders)
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(and(...whereConditions))
      .orderBy(desc(salesOrders.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(salesOrders)
      .where(and(...whereConditions));

    const total = Number(totalResult.count) || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: results,
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
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/sales-orders/:id', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const [order] = await db
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .limit(1);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Sales order not found' });
    }

    const itemsResult = await db.execute(sql`
      SELECT 
        soi.id,
        soi.line_number as "lineNumber",
        soi.product_id as "productId",
        soi.ordered_quantity as "orderedQuantity",
        soi.allocated_quantity as "allocatedQuantity",
        soi.picked_quantity as "pickedQuantity",
        soi.unit_price as "unitPrice",
        soi.total_price as "totalPrice",
        soi.notes,
        p.name as "productName",
        p.sku,
        COALESCE(
          json_agg(
            json_build_object(
              'id', soil.id,
              'customerLocationId', soil.customer_location_id,
              'quantity', soil.quantity,
              'deliveryNotes', soil.delivery_notes
            )
            ORDER BY soil.created_at
          ) FILTER (WHERE soil.id IS NOT NULL),
          '[]'
        ) as locations
      FROM sales_order_items soi
      LEFT JOIN products p ON p.id = soi.product_id
      LEFT JOIN sales_order_item_locations soil ON soil.sales_order_item_id = soi.id
      WHERE soi.sales_order_id = ${id}
      GROUP BY soi.id, soi.line_number, soi.product_id, soi.ordered_quantity, soi.allocated_quantity,
               soi.picked_quantity, soi.unit_price, soi.total_price, soi.notes,
               p.name, p.sku
      ORDER BY soi.line_number
    `);

    res.json({
      success: true,
      data: {
        ...order,
        items: itemsResult,
      },
    });
  } catch (error) {
    console.error('Error fetching sales order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/sales-orders', authorized('ADMIN', 'sales-order.create'), async (req, res) => {
  try {
    const {
      customerId,
      shippingLocationId,
      shippingMethodId,
      orderDate,
      requestedDeliveryDate,
      trackingNumber,
      deliveryInstructions,
      notes,
      items = [],
    } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    if (!customerId || !orderDate) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    // Validate item locations
    for (const item of items) {
      if (!item.locations || item.locations.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Item ${item.productName} must have at least one delivery location` 
        });
      }
      
      const totalLocationQty = item.locations.reduce((sum: number, loc: any) => sum + Number(loc.quantity), 0);
      if (Math.abs(totalLocationQty - Number(item.orderedQuantity)) > 0.001) {
        return res.status(400).json({ 
          success: false, 
          message: `Location quantities for ${item.productName} must sum to ${item.orderedQuantity}` 
        });
      }
    }

    // Generate SO number using document numbering API
    const docNumberResponse = await axios.post(
      `${req.protocol}://${req.get('host')}/api/modules/document-numbering/generate`,
      { documentType: 'SO', options: {} },
      { headers: { Authorization: req.headers.authorization } }
    );
    const orderNumber = docNumberResponse.data.documentNumber;
    const documentHistoryId = docNumberResponse.data.historyId;

    // Get initial workflow state
    const workflowResults = await db
      .select({ stepKey: workflowSteps.stepKey })
      .from(workflows)
      .leftJoin(workflowSteps, eq(workflowSteps.workflowId, workflows.id))
      .where(
        and(
          eq(workflows.tenantId, tenantId),
          eq(workflows.type, 'SALES_ORDER'),
          eq(workflows.isDefault, true),
          eq(workflows.isActive, true),
          eq(workflowSteps.isActive, true)
        )
      )
      .orderBy(workflowSteps.stepOrder)
      .limit(1);

    const initialWorkflowState = workflowResults[0]?.stepKey || 'create';

    // Calculate total amount (simple: quantity * unitPrice)
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.orderedQuantity * item.unitPrice);
    }, 0);

    // Use transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Create sales order
      const [newOrder] = await tx
        .insert(salesOrders)
        .values({
          tenantId,
          orderNumber,
          customerId,
          shippingLocationId: shippingLocationId || null,
          shippingMethodId: shippingMethodId || null,
          orderDate,
          requestedDeliveryDate: requestedDeliveryDate || null,
          trackingNumber: trackingNumber || null,
          deliveryInstructions: deliveryInstructions || null,
          totalAmount: totalAmount.toFixed(2),
          notes: notes || null,
          status: 'created',
          workflowState: initialWorkflowState,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      // Update document history with actual document ID
      try {
        await axios.put(
          `${req.protocol}://${req.get('host')}/api/modules/document-numbering/history/${documentHistoryId}`,
          { documentId: newOrder.id },
          { headers: { Authorization: req.headers.authorization } }
        );
      } catch (error) {
        console.error('Error updating document history:', error);
        throw new Error('Failed to update document history');
      }

      // Create items and their locations
      const createdItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const totalPrice = item.orderedQuantity * item.unitPrice;

        const [createdItem] = await tx
          .insert(salesOrderItems)
          .values({
            tenantId,
            salesOrderId: newOrder.id,
            lineNumber: i + 1,
            productId: item.productId,
            orderedQuantity: item.orderedQuantity,
            unitPrice: item.unitPrice,
            totalPrice: totalPrice.toFixed(2),
            notes: item.notes || null,
          })
          .returning();

        // Create item locations using raw SQL (table created via native SQL)
        for (const location of item.locations) {
          await tx.execute(sql`
            INSERT INTO sales_order_item_locations (
              tenant_id, sales_order_item_id, customer_location_id, quantity, delivery_notes
            ) VALUES (
              ${tenantId}, ${createdItem.id}, ${location.customerLocationId}, 
              ${location.quantity}, ${location.deliveryNotes || null}
            )
          `);
        }

        createdItems.push({
          ...createdItem,
          productName: item.productName,
          locations: item.locations,
        });
      }

      return { order: newOrder, items: createdItems };
    });

    res.status(201).json({
      success: true,
      data: {
        ...result.order,
        items: result.items,
      },
    });
  } catch (error: any) {
    console.error('Error creating sales order:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Order number already exists' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.put('/sales-orders/:id', authorized('ADMIN', 'sales-order.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerId,
      shippingLocationId,
      shippingMethodId,
      orderDate,
      requestedDeliveryDate,
      trackingNumber,
      deliveryInstructions,
      notes,
      items,
    } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    // Check if SO exists and is editable
    const [existing] = await db
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sales order not found' });
    }

    if (existing.status !== 'created') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only orders with status "created" can be edited' 
      });
    }

    // Validate item locations if items provided
    if (items) {
      for (const item of items) {
        if (!item.locations || item.locations.length === 0) {
          return res.status(400).json({ 
            success: false, 
            message: `Item ${item.productName} must have at least one delivery location` 
          });
        }
        
        const totalLocationQty = item.locations.reduce((sum: number, loc: any) => sum + Number(loc.quantity), 0);
        if (Math.abs(totalLocationQty - Number(item.orderedQuantity)) > 0.001) {
          return res.status(400).json({ 
            success: false, 
            message: `Location quantities for ${item.productName} must sum to ${item.orderedQuantity}` 
          });
        }
      }
    }

    // Use transaction for updates
    await db.transaction(async (tx) => {
      if (items) {
        // Calculate new total
        const totalAmount = items.reduce((sum: number, item: any) => {
          return sum + (item.orderedQuantity * item.unitPrice);
        }, 0);

        // Delete existing locations and items
        await tx.execute(sql`
          DELETE FROM sales_order_item_locations
          WHERE sales_order_item_id IN (
            SELECT id FROM sales_order_items WHERE sales_order_id = ${id}
          )
        `);

        await tx
          .delete(salesOrderItems)
          .where(eq(salesOrderItems.salesOrderId, id));

        // Update SO
        await tx
          .update(salesOrders)
          .set({
            customerId,
            shippingLocationId: shippingLocationId || null,
            shippingMethodId: shippingMethodId || null,
            orderDate,
            requestedDeliveryDate: requestedDeliveryDate || null,
            trackingNumber: trackingNumber || null,
            deliveryInstructions: deliveryInstructions || null,
            totalAmount: totalAmount.toFixed(2),
            notes: notes || null,
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(eq(salesOrders.id, id));

        // Create new items and locations
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const totalPrice = item.orderedQuantity * item.unitPrice;

          const [createdItem] = await tx
            .insert(salesOrderItems)
            .values({
              tenantId,
              salesOrderId: id,
              lineNumber: i + 1,
              productId: item.productId,
              orderedQuantity: item.orderedQuantity,
              unitPrice: item.unitPrice,
              totalPrice: totalPrice.toFixed(2),
              notes: item.notes || null,
            })
            .returning();

          for (const location of item.locations) {
            await tx.execute(sql`
              INSERT INTO sales_order_item_locations (
                tenant_id, sales_order_item_id, customer_location_id, quantity, delivery_notes
              ) VALUES (
                ${tenantId}, ${createdItem.id}, ${location.customerLocationId}, 
                ${location.quantity}, ${location.deliveryNotes || null}
              )
            `);
          }
        }
      } else {
        // Simple update without items
        await tx
          .update(salesOrders)
          .set({
            customerId: customerId || existing.customerId,
            shippingLocationId: shippingLocationId !== undefined ? shippingLocationId : existing.shippingLocationId,
            shippingMethodId: shippingMethodId !== undefined ? shippingMethodId : existing.shippingMethodId,
            orderDate: orderDate || existing.orderDate,
            requestedDeliveryDate: requestedDeliveryDate !== undefined ? requestedDeliveryDate : existing.requestedDeliveryDate,
            trackingNumber: trackingNumber !== undefined ? trackingNumber : existing.trackingNumber,
            deliveryInstructions: deliveryInstructions !== undefined ? deliveryInstructions : existing.deliveryInstructions,
            notes: notes !== undefined ? notes : existing.notes,
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(eq(salesOrders.id, id));
      }
    });

    // Fetch updated SO
    const [updated] = await db
      .select()
      .from(salesOrders)
      .where(eq(salesOrders.id, id))
      .limit(1);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating sales order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.delete('/sales-orders/:id', authorized('ADMIN', 'sales-order.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    // Check if SO exists and can be deleted
    const [existing] = await db
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sales order not found' });
    }

    if (existing.status !== 'created') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only orders with status "created" can be deleted' 
      });
    }

    await db
      .delete(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)));

    res.json({ success: true, message: 'Sales order deleted successfully' });
  } catch (error) {
    console.error('Error deleting sales order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/products-with-stock', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const tenantId = req.user!.activeTenantId;

    const searchCondition = search
      ? or(
          ilike(products.sku, `%${search}%`),
          ilike(products.name, `%${search}%`)
        )
      : undefined;

    const whereConditions = [eq(products.tenantId, tenantId)];
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const result = await db.execute(sql`
      SELECT 
        p.id as "productId",
        p.sku,
        p.name,
        p.minimum_stock_level as "minimumStockLevel",
        COALESCE(SUM(ii.available_quantity), 0) as "availableStock"
      FROM products p
      LEFT JOIN inventory_items ii ON ii.product_id = p.id AND ii.tenant_id = p.tenant_id
      WHERE p.tenant_id = ${tenantId}
        ${search ? sql`AND (p.sku ILIKE ${'%' + search + '%'} OR p.name ILIKE ${'%' + search + '%'})` : sql``}
      GROUP BY p.id, p.sku, p.name, p.minimum_stock_level
      HAVING COALESCE(SUM(ii.available_quantity), 0) > 0
      ORDER BY p.name
      LIMIT ${limit} OFFSET ${offset}
    `);

    const [totalResult] = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM (
        SELECT p.id
        FROM products p
        LEFT JOIN inventory_items ii ON ii.product_id = p.id AND ii.tenant_id = p.tenant_id
        WHERE p.tenant_id = ${tenantId}
          ${search ? sql`AND (p.sku ILIKE ${'%' + search + '%'} OR p.name ILIKE ${'%' + search + '%'})` : sql``}
        GROUP BY p.id
        HAVING COALESCE(SUM(ii.available_quantity), 0) > 0
      ) as filtered_products
    `);

    const total = Number(totalResult.count) || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: result,
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
    console.error('Error fetching products with stock:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/workflow-steps', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;

    const workflowResults = await db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.tenantId, tenantId),
          eq(workflows.type, 'SALES_ORDER'),
          eq(workflows.isDefault, true),
          eq(workflows.isActive, true)
        )
      )
      .limit(1);

    if (workflowResults.length === 0) {
      return res.status(404).json({ error: 'No active Sales Order workflow found' });
    }

    const workflow = workflowResults[0];

    const steps = await db
      .select()
      .from(workflowSteps)
      .where(
        and(
          eq(workflowSteps.workflowId, workflow.id),
          eq(workflowSteps.isActive, true)
        )
      )
      .orderBy(workflowSteps.stepOrder);

    res.json({
      workflow,
      steps,
    });
  } catch (error) {
    console.error('Error fetching workflow steps:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
