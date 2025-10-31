import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { transporters } from '../lib/db/schemas/salesOrder';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('sales-order'));

router.get('/transporters', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const tenantId = req.user!.activeTenantId;

    let query = db
      .select()
      .from(transporters)
      .where(eq(transporters.tenantId, tenantId))
      .$dynamic();

    if (search) {
      query = query.where(
        or(
          ilike(transporters.name, `%${search}%`),
          ilike(transporters.code, `%${search}%`)
        )
      );
    }

    const results = await query
      .orderBy(desc(transporters.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: transporters.id })
      .from(transporters)
      .where(eq(transporters.tenantId, tenantId));

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
    console.error('Error fetching transporters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/transporters/:id', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const result = await db
      .select()
      .from(transporters)
      .where(and(eq(transporters.id, id), eq(transporters.tenantId, tenantId)))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Transporter not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching transporter:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/transporters', authorized('ADMIN', 'sales-order.create'), async (req, res) => {
  try {
    const {
      name,
      code,
      contactPerson,
      phone,
      email,
      website,
      serviceAreas,
      isActive = true,
      notes,
    } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    const newTransporter = {
      id: uuidv4(),
      tenantId,
      name,
      code,
      contactPerson,
      phone,
      email,
      website,
      serviceAreas,
      isActive,
      notes,
      createdBy: userId,
      updatedBy: userId,
    };

    const [created] = await db
      .insert(transporters)
      .values(newTransporter)
      .returning();

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error creating transporter:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Transporter code already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/transporters/:id', authorized('ADMIN', 'sales-order.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      contactPerson,
      phone,
      email,
      website,
      serviceAreas,
      isActive,
      notes,
    } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    const updateData: any = { updatedAt: new Date(), updatedBy: userId };
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (serviceAreas !== undefined) updateData.serviceAreas = serviceAreas;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(transporters)
      .set(updateData)
      .where(and(eq(transporters.id, id), eq(transporters.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Transporter not found' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating transporter:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Transporter code already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/transporters/:id', authorized('ADMIN', 'sales-order.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const result = await db
      .delete(transporters)
      .where(and(eq(transporters.id, id), eq(transporters.tenantId, tenantId)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Transporter not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting transporter:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
