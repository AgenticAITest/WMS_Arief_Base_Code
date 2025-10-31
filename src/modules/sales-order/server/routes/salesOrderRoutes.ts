import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  salesOrders,
  salesOrderItems,
  salesOrderAllocations,
  salesOrderPicks,
} from '../lib/db/schemas/salesOrder';
import { workflows, workflowSteps } from '../../../workflow/server/lib/db/schemas/workflow';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('sales-order'));

router.get('/sales-orders', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const tenantId = req.user!.activeTenantId;

    let query = db
      .select()
      .from(salesOrders)
      .where(eq(salesOrders.tenantId, tenantId))
      .$dynamic();

    if (search) {
      query = query.where(
        or(
          ilike(salesOrders.orderNumber, `%${search}%`),
          ilike(salesOrders.notes, `%${search}%`)
        )
      );
    }

    if (status) {
      query = query.where(eq(salesOrders.status, status as any));
    }

    const results = await query
      .orderBy(desc(salesOrders.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(salesOrders)
      .where(eq(salesOrders.tenantId, tenantId));

    const total = totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      return res.status(404).json({ error: 'Sales order not found' });
    }

    const items = await db
      .select()
      .from(salesOrderItems)
      .where(eq(salesOrderItems.salesOrderId, id));

    res.json({
      ...order,
      items,
    });
  } catch (error) {
    console.error('Error fetching sales order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sales-orders', authorized('ADMIN', 'sales-order.create'), async (req, res) => {
  try {
    const {
      orderNumber,
      customerId,
      customerLocationId,
      warehouseId,
      orderDate,
      expectedDeliveryDate,
      priority,
      currency,
      paymentTerms,
      totalAmount,
      notes,
      internalNotes,
      items = [],
    } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    if (!orderNumber || !customerId || !warehouseId || !orderDate) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const [createdOrder] = await db
      .insert(salesOrders)
      .values({
        tenantId,
        orderNumber,
        customerId,
        customerLocationId,
        warehouseId,
        orderDate: new Date(orderDate),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        priority: priority || 'normal',
        totalAmount: totalAmount || 0,
        currency: currency || 'USD',
        paymentTerms,
        notes,
        internalNotes,
        status: 'draft' as any,
        createdBy: userId,
        updatedBy: userId,
      } as any)
      .returning();

    const orderItems = items.map((item: any, index: number) => ({
      tenantId,
      salesOrderId: createdOrder.id,
      lineNumber: index + 1,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercentage: item.discountPercentage || 0,
      taxPercentage: item.taxPercentage || 0,
      lineTotal: item.quantity * item.unitPrice,
      notes: item.notes,
    }));

    const createdItems = await db
      .insert(salesOrderItems)
      .values(orderItems)
      .returning();

    res.status(201).json({
      ...createdOrder,
      items: createdItems,
    });
  } catch (error: any) {
    console.error('Error creating sales order:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Order number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/sales-orders/:id', authorized('ADMIN', 'sales-order.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      orderNumber,
      customerId,
      customerLocationId,
      warehouseId,
      orderDate,
      expectedDeliveryDate,
      priority,
      totalAmount,
      currency,
      paymentTerms,
      notes,
      internalNotes,
      status,
      workflowState,
    } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    const updateData: any = { updatedAt: new Date(), updatedBy: userId };
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber;
    if (customerId !== undefined) updateData.customerId = customerId;
    if (customerLocationId !== undefined) updateData.customerLocationId = customerLocationId;
    if (warehouseId !== undefined) updateData.warehouseId = warehouseId;
    if (orderDate !== undefined) updateData.orderDate = new Date(orderDate);
    if (expectedDeliveryDate !== undefined) updateData.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;
    if (priority !== undefined) updateData.priority = priority;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (currency !== undefined) updateData.currency = currency;
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
    if (notes !== undefined) updateData.notes = notes;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
    if (status !== undefined) updateData.status = status;
    if (workflowState !== undefined) updateData.workflowState = workflowState;

    const [updated] = await db
      .update(salesOrders)
      .set(updateData)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    const items = await db
      .select()
      .from(salesOrderItems)
      .where(eq(salesOrderItems.salesOrderId, id));

    res.json({
      ...updated,
      items,
    });
  } catch (error: any) {
    console.error('Error updating sales order:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Order number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/sales-orders/:id', authorized('ADMIN', 'sales-order.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const result = await db
      .delete(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting sales order:', error);
    res.status(500).json({ error: 'Internal server error' });
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
