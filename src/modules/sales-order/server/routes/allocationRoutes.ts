import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq, sql } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { salesOrderAllocations, salesOrderItems } from '../lib/db/schemas/salesOrder';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('sales-order'));

// Tidak di pakai disini, karena sudah di pindah ke salesOrderRoutes.ts
router.get('/allocations', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  console.log('Fetching allocations from allocationRoutes');
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const salesOrderId = req.query.salesOrderId as string;
    const tenantId = req.user!.activeTenantId;

    let query = db
      .select()
      .from(salesOrderAllocations)
      .where(eq(salesOrderAllocations.tenantId, tenantId))
      .$dynamic();

    if (salesOrderId) {
      query = query.innerJoin(
        salesOrderItems,
        eq(salesOrderAllocations.soItemId, salesOrderItems.id)
      ).where(eq(salesOrderItems.salesOrderId, salesOrderId));
    }

    const results = await query
      .orderBy(desc(salesOrderAllocations.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(salesOrderAllocations)
      .where(eq(salesOrderAllocations.tenantId, tenantId));

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
    console.error('Error fetching allocations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/allocations/:id', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const result = await db
      .select()
      .from(salesOrderAllocations)
      .where(and(eq(salesOrderAllocations.id, id), eq(salesOrderAllocations.tenantId, tenantId)))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching allocation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/allocations', authorized('ADMIN', 'sales-order.create'), async (req, res) => {
  try {
    const { salesOrderItemId, inventoryItemId, allocatedQuantity, notes } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    if (!salesOrderItemId || !inventoryItemId || !allocatedQuantity) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const newAllocation = {
      id: uuidv4(),
      tenantId,
      salesOrderItemId,
      inventoryItemId,
      allocatedQuantity,
      allocatedBy: userId,
    };

    const [created] = await db
      .insert(salesOrderAllocations)
      .values(newAllocation)
      .returning();

    await db
      .update(salesOrderItems)
      .set({
        allocatedQuantity: sql`${salesOrderItems.allocatedQuantity} + ${allocatedQuantity}`,
        updatedAt: new Date(),
      })
      .where(eq(salesOrderItems.id, salesOrderItemId));

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating allocation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/allocations/:id', authorized('ADMIN', 'sales-order.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { allocatedQuantity, status, notes } = req.body;
    const tenantId = req.user!.activeTenantId;

    const updateData: any = { updatedAt: new Date() };
    if (allocatedQuantity !== undefined) updateData.allocatedQuantity = allocatedQuantity;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(salesOrderAllocations)
      .set(updateData)
      .where(and(eq(salesOrderAllocations.id, id), eq(salesOrderAllocations.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating allocation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/allocations/:id', authorized('ADMIN', 'sales-order.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const result = await db
      .delete(salesOrderAllocations)
      .where(and(eq(salesOrderAllocations.id, id), eq(salesOrderAllocations.tenantId, tenantId)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting allocation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
