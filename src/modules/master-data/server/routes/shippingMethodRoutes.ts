import express from 'express';
import { db } from '@server/lib/db';
import { authorized } from '@server/middleware/authMiddleware';
import { sql, eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { shippingMethods } from '../lib/db/schemas/masterData';

const router = express.Router();

// ================================================================================
// SHIPPING METHODS CRUD ROUTES
// ================================================================================

/**
 * @swagger
 * /api/modules/master-data/shipping-methods:
 *   get:
 *     tags:
 *       - Master Data - Shipping Methods
 *     summary: Get all shipping methods
 *     description: Retrieve a paginated list of shipping methods with optional search
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name
 *     responses:
 *       200:
 *         description: List of shipping methods
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
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [air, sea, land]
 *                       transporterId:
 *                         type: string
 *                       costCalculationMethod:
 *                         type: string
 *                         enum: [fixed, per_kg, per_km, per_cbm]
 *                       baseCost:
 *                         type: number
 *                       estimatedDays:
 *                         type: integer
 *                       isActive:
 *                         type: boolean
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
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
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/modules/master-data/shipping-methods/{id}:
 *   get:
 *     tags:
 *       - Master Data - Shipping Methods
 *     summary: Get shipping method by ID
 *     description: Retrieve a specific shipping method by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipping method ID
 *     responses:
 *       200:
 *         description: Shipping method details
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
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     code:
 *                       type: string
 *                     type:
 *                       type: string
 *                     transporterId:
 *                       type: string
 *                     costCalculationMethod:
 *                       type: string
 *                     baseCost:
 *                       type: number
 *                     estimatedDays:
 *                       type: integer
 *                     isActive:
 *                       type: boolean
 *                     description:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Shipping method not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/modules/master-data/shipping-methods:
 *   post:
 *     tags:
 *       - Master Data - Shipping Methods
 *     summary: Create new shipping method
 *     description: Create a new shipping method
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
 *               - code
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: Express Air
 *               code:
 *                 type: string
 *                 example: EXP-AIR
 *               type:
 *                 type: string
 *                 enum: [air, sea, land]
 *                 example: air
 *               transporterId:
 *                 type: string
 *                 nullable: true
 *               costCalculationMethod:
 *                 type: string
 *                 enum: [fixed, per_kg, per_km, per_cbm]
 *                 default: fixed
 *               baseCost:
 *                 type: number
 *                 nullable: true
 *                 example: 100000
 *               estimatedDays:
 *                 type: integer
 *                 nullable: true
 *                 example: 3
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               description:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Shipping method created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Missing required fields or duplicate code
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/modules/master-data/shipping-methods/{id}:
 *   put:
 *     tags:
 *       - Master Data - Shipping Methods
 *     summary: Update shipping method
 *     description: Update an existing shipping method
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipping method ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [air, sea, land]
 *               transporterId:
 *                 type: string
 *                 nullable: true
 *               costCalculationMethod:
 *                 type: string
 *                 enum: [fixed, per_kg, per_km, per_cbm]
 *               baseCost:
 *                 type: number
 *                 nullable: true
 *               estimatedDays:
 *                 type: integer
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *               description:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Shipping method updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Duplicate code
 *       404:
 *         description: Shipping method not found
 *       500:
 *         description: Internal server error
 */
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

    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: userId,
    };

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

/**
 * @swagger
 * /api/modules/master-data/shipping-methods/{id}:
 *   delete:
 *     tags:
 *       - Master Data - Shipping Methods
 *     summary: Delete shipping method
 *     description: Delete a shipping method by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipping method ID
 *     responses:
 *       200:
 *         description: Shipping method deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Shipping method not found
 *       500:
 *         description: Internal server error
 */
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
