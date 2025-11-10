import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { shippingMethods } from '../lib/db/schemas/salesOrder';
import { transporters } from '../../../master-data/server/lib/db/schemas/masterData';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('sales-order'));

router.get('/shipping-methods', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const type = req.query.type as string;
    const tenantId = req.user!.activeTenantId;

    let query = db
      .select({
        shippingMethod: shippingMethods,
        transporter: transporters,
      })
      .from(shippingMethods)
      .leftJoin(transporters, eq(shippingMethods.transporterId, transporters.id))
      .where(eq(shippingMethods.tenantId, tenantId))
      .$dynamic();

    if (search) {
      query = query.where(
        or(
          ilike(shippingMethods.name, `%${search}%`),
          ilike(shippingMethods.code, `%${search}%`)
        )
      );
    }

    if (type) {
      query = query.where(eq(shippingMethods.type, type));
    }

    const results = await query
      .orderBy(desc(shippingMethods.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: shippingMethods.id })
      .from(shippingMethods)
      .where(eq(shippingMethods.tenantId, tenantId));

    const total = totalCount.length;
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
    console.error('Error fetching shipping methods:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/shipping-methods/:id', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const result = await db
      .select({
        shippingMethod: shippingMethods,
        transporter: transporters,
      })
      .from(shippingMethods)
      .leftJoin(transporters, eq(shippingMethods.transporterId, transporters.id))
      .where(and(eq(shippingMethods.id, id), eq(shippingMethods.tenantId, tenantId)))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Shipping method not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching shipping method:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/shipping-methods', authorized('ADMIN', 'sales-order.create'), async (req, res) => {
  try {
    const {
      name,
      code,
      type,
      transporterId,
      costCalculationMethod = 'fixed',
      baseCost,
      estimatedDays,
      isActive = true,
      description,
    } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    if (!name || !code || !type) {
      return res.status(400).json({ error: 'Name, code, and type are required' });
    }

    if (type === 'third_party' && !transporterId) {
      return res.status(400).json({ error: 'Transporter is required for third-party shipping methods' });
    }

    if (type === 'internal' && transporterId) {
      return res.status(400).json({ error: 'Internal shipping methods cannot have a transporter' });
    }

    const newMethod = {
      id: uuidv4(),
      tenantId,
      name,
      code,
      type,
      transporterId,
      costCalculationMethod,
      baseCost,
      estimatedDays,
      isActive,
      description,
      createdBy: userId,
      updatedBy: userId,
    };

    const [created] = await db
      .insert(shippingMethods)
      .values(newMethod)
      .returning();

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error creating shipping method:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Shipping method code already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/shipping-methods/:id', authorized('ADMIN', 'sales-order.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      type,
      transporterId,
      costCalculationMethod,
      baseCost,
      estimatedDays,
      isActive,
      description,
    } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    if (type === 'third_party' && !transporterId) {
      return res.status(400).json({ error: 'Transporter is required for third-party shipping methods' });
    }

    if (type === 'internal' && transporterId) {
      return res.status(400).json({ error: 'Internal shipping methods cannot have a transporter' });
    }

    const updateData: any = { updatedAt: new Date(), updatedBy: userId };
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (type !== undefined) updateData.type = type;
    if (transporterId !== undefined) updateData.transporterId = transporterId;
    if (costCalculationMethod !== undefined) updateData.costCalculationMethod = costCalculationMethod;
    if (baseCost !== undefined) updateData.baseCost = baseCost;
    if (estimatedDays !== undefined) updateData.estimatedDays = estimatedDays;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (description !== undefined) updateData.description = description;

    const [updated] = await db
      .update(shippingMethods)
      .set(updateData)
      .where(and(eq(shippingMethods.id, id), eq(shippingMethods.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Shipping method not found' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating shipping method:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Shipping method code already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/shipping-methods/:id', authorized('ADMIN', 'sales-order.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const result = await db
      .delete(shippingMethods)
      .where(and(eq(shippingMethods.id, id), eq(shippingMethods.tenantId, tenantId)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Shipping method not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting shipping method:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
