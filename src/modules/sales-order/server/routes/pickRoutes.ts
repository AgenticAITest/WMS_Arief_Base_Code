import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq, sql } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { salesOrderPicks, salesOrderItems } from '../lib/db/schemas/salesOrder';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('sales-order'));

router.get('/picks', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const tenantId = req.user!.activeTenantId;

    const results = await db
      .select()
      .from(salesOrderPicks)
      .where(eq(salesOrderPicks.tenantId, tenantId))
      .orderBy(desc(salesOrderPicks.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(salesOrderPicks)
      .where(eq(salesOrderPicks.tenantId, tenantId));

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
    console.error('Error fetching picks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/picks/:id', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const result = await db
      .select()
      .from(salesOrderPicks)
      .where(and(eq(salesOrderPicks.id, id), eq(salesOrderPicks.tenantId, tenantId)))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Pick not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching pick:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/picks', authorized('ADMIN', 'sales-order.create'), async (req, res) => {
  try {
    const {
      salesOrderItemId,
      inventoryItemId,
      pickedQuantity,
      batchNumber,
      lotNumber,
      serialNumber,
      notes,
    } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    if (!salesOrderItemId || !inventoryItemId || !pickedQuantity) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const newPick = {
      id: uuidv4(),
      tenantId,
      salesOrderItemId,
      inventoryItemId,
      pickedQuantity,
      pickedBy: userId,
      batchNumber,
      lotNumber,
      serialNumber,
      notes,
    };

    const [created] = await db
      .insert(salesOrderPicks)
      .values(newPick)
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating pick:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/picks/:id', authorized('ADMIN', 'sales-order.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pickedQuantity,
      batchNumber,
      lotNumber,
      serialNumber,
      notes,
    } = req.body;
    const tenantId = req.user!.activeTenantId;

    const updateData: any = {};
    if (pickedQuantity !== undefined) updateData.pickedQuantity = pickedQuantity;
    if (batchNumber !== undefined) updateData.batchNumber = batchNumber;
    if (lotNumber !== undefined) updateData.lotNumber = lotNumber;
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(salesOrderPicks)
      .set(updateData)
      .where(and(eq(salesOrderPicks.id, id), eq(salesOrderPicks.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Pick not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating pick:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/picks/:id', authorized('ADMIN', 'sales-order.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const result = await db
      .delete(salesOrderPicks)
      .where(and(eq(salesOrderPicks.id, id), eq(salesOrderPicks.tenantId, tenantId)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Pick not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting pick:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
