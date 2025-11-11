import express from 'express';
import { db } from '@server/lib/db';
import { authorized } from '@server/middleware/authMiddleware';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

const router = express.Router();

// ================================================================================
// SHIPPING METHODS CRUD ROUTES
// ================================================================================

router.get('/', authorized('ADMIN', 'master-data.view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const tenantId = req.user!.activeTenantId;

    const result = await db.execute(sql`
      SELECT 
        id,
        name,
        code,
        type,
        transporter_id as "transporterId",
        cost_calculation_method as "costCalculationMethod",
        base_cost as "baseCost",
        estimated_days as "estimatedDays",
        is_active as "isActive",
        description,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM shipping_methods
      WHERE tenant_id = ${tenantId}
        ${search ? sql`AND name ILIKE ${'%' + search + '%'}` : sql``}
      ORDER BY name
      LIMIT ${limit} OFFSET ${offset}
    `);

    const [totalResult] = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM shipping_methods
      WHERE tenant_id = ${tenantId}
        ${search ? sql`AND name ILIKE ${'%' + search + '%'}` : sql``}
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
    console.error('Error fetching shipping methods:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/:id', authorized('ADMIN', 'master-data.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db.execute(sql`
      SELECT 
        id,
        name,
        code,
        type,
        transporter_id as "transporterId",
        cost_calculation_method as "costCalculationMethod",
        base_cost as "baseCost",
        estimated_days as "estimatedDays",
        is_active as "isActive",
        description,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM shipping_methods
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Shipping method not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching shipping method:', error);
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
      type,
      transporterId,
      costCalculationMethod,
      baseCost,
      estimatedDays,
      isActive,
      description,
    } = req.body;

    if (!name || !code || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, and type are required',
      });
    }

    const id = crypto.randomUUID();

    const [newRecord] = await db.execute(sql`
      INSERT INTO shipping_methods (
        id,
        tenant_id,
        name,
        code,
        type,
        transporter_id,
        cost_calculation_method,
        base_cost,
        estimated_days,
        is_active,
        description,
        created_by,
        updated_by,
        created_at,
        updated_at
      ) VALUES (
        ${id},
        ${tenantId},
        ${name},
        ${code},
        ${type},
        ${transporterId || null},
        ${costCalculationMethod || 'fixed'},
        ${baseCost || null},
        ${estimatedDays || null},
        ${isActive !== undefined ? isActive : true},
        ${description || null},
        ${userId},
        ${userId},
        NOW(),
        NOW()
      )
      RETURNING 
        id,
        name,
        code,
        type,
        transporter_id as "transporterId",
        cost_calculation_method as "costCalculationMethod",
        base_cost as "baseCost",
        estimated_days as "estimatedDays",
        is_active as "isActive",
        description,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `);

    res.status(201).json({
      success: true,
      data: newRecord,
      message: 'Shipping method created successfully',
    });
  } catch (error: any) {
    console.error('Error creating shipping method:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Shipping method code already exists',
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
      type,
      transporterId,
      costCalculationMethod,
      baseCost,
      estimatedDays,
      isActive,
      description,
    } = req.body;

    const updateParts: string[] = ['updated_at = NOW()', `updated_by = '${userId}'`];
    const params: any[] = [];

    if (name !== undefined) {
      updateParts.push(`name = $${params.length + 1}`);
      params.push(name);
    }
    if (code !== undefined) {
      updateParts.push(`code = $${params.length + 1}`);
      params.push(code);
    }
    if (type !== undefined) {
      updateParts.push(`type = $${params.length + 1}`);
      params.push(type);
    }
    if (transporterId !== undefined) {
      updateParts.push(`transporter_id = $${params.length + 1}`);
      params.push(transporterId);
    }
    if (costCalculationMethod !== undefined) {
      updateParts.push(`cost_calculation_method = $${params.length + 1}`);
      params.push(costCalculationMethod);
    }
    if (baseCost !== undefined) {
      updateParts.push(`base_cost = $${params.length + 1}`);
      params.push(baseCost);
    }
    if (estimatedDays !== undefined) {
      updateParts.push(`estimated_days = $${params.length + 1}`);
      params.push(estimatedDays);
    }
    if (isActive !== undefined) {
      updateParts.push(`is_active = $${params.length + 1}`);
      params.push(isActive);
    }
    if (description !== undefined) {
      updateParts.push(`description = $${params.length + 1}`);
      params.push(description);
    }

    const [updated] = await db.execute(sql.raw(`
      UPDATE shipping_methods
      SET ${updateParts.join(', ')}
      WHERE id = '${id}' AND tenant_id = '${tenantId}'
      RETURNING 
        id,
        name,
        code,
        type,
        transporter_id as "transporterId",
        cost_calculation_method as "costCalculationMethod",
        base_cost as "baseCost",
        estimated_days as "estimatedDays",
        is_active as "isActive",
        description,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `));

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Shipping method not found',
      });
    }

    res.json({
      success: true,
      data: updated,
      message: 'Shipping method updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating shipping method:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Shipping method code already exists',
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

    const [deleted] = await db.execute(sql`
      DELETE FROM shipping_methods
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING id
    `);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Shipping method not found',
      });
    }

    res.json({
      success: true,
      message: 'Shipping method deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting shipping method:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
