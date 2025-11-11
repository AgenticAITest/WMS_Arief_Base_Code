import express from 'express';
import { db } from '@server/lib/db';
import { transporters } from '../lib/db/schemas/masterData';
import { authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, or } from 'drizzle-orm';
import crypto from 'crypto';

const router = express.Router();

// ================================================================================
// TRANSPORTERS CRUD ROUTES
// ================================================================================

router.get('/', authorized('ADMIN', 'master-data.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    const whereConditions = [eq(transporters.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(
        or(
          ilike(transporters.name, `%${search}%`),
          ilike(transporters.code, `%${search}%`)
        )!
      );
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(transporters)
      .where(and(...whereConditions));

    const data = await db
      .select()
      .from(transporters)
      .where(and(...whereConditions))
      .orderBy(desc(transporters.createdAt))
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
    console.error('Error fetching transporters:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.get('/:id', authorized('ADMIN', 'master-data.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(transporters)
      .where(and(eq(transporters.id, id), eq(transporters.tenantId, tenantId)));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Transporter not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching transporter:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.post('/', authorized('ADMIN', 'master-data.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
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

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required',
      });
    }

    const [newRecord] = await db
      .insert(transporters)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        name,
        code,
        contactPerson,
        phone,
        email,
        website,
        serviceAreas,
        isActive: isActive ?? true,
        notes,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newRecord,
      message: 'Transporter created successfully',
    });
  } catch (error: any) {
    console.error('Error creating transporter:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Transporter code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.put('/:id', authorized('ADMIN', 'master-data.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
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
      return res.status(404).json({
        success: false,
        message: 'Transporter not found',
      });
    }

    res.json({
      success: true,
      data: updated,
      message: 'Transporter updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating transporter:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Transporter code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.delete('/:id', authorized('ADMIN', 'master-data.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(transporters)
      .where(and(eq(transporters.id, id), eq(transporters.tenantId, tenantId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Transporter not found',
      });
    }

    res.json({
      success: true,
      message: 'Transporter deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting transporter:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
