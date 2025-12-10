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

/**
 * @swagger
 * /api/modules/master-data/transporters:
 *   get:
 *     tags:
 *       - Master Data - Transporters
 *     summary: Get all transporters
 *     description: Retrieve a paginated list of transporters with optional search
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
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: code
 *         description: Sort by field (e.g., name, code)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           default: asc
 *         description: Sort order (asc or desc)
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: Filter by name, code, or contact person 
 *     responses:
 *       200:
 *         description: List of transporters
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
 *                       contactPerson:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       email:
 *                         type: string
 *                       website:
 *                         type: string
 *                       serviceAreas:
 *                         type: array
 *                         items:
 *                           type: string
 *                       isActive:
 *                         type: boolean
 *                       notes:
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
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 10;
    const sort = (req.query.sort as string) || 'code';
    const order = (req.query.order as string) || 'asc';
    const filter = req.query.filter as string;
    const offset = (page - 1) * perPage;

    // Map allowed sort keys to columns
    const sortColumns = {
      id: transporters.id,
      code: transporters.code,
      name: transporters.name,
      contactPerson: transporters.contactPerson,
      phone: transporters.phone,
      email: transporters.email,
    } as const;

    const sortColumn = sortColumns[sort as keyof typeof sortColumns] || transporters.code;

    const whereConditions = [eq(transporters.tenantId, tenantId)];

    if (filter) {
      whereConditions.push(
        or(
          ilike(transporters.name, `%${filter}%`),
          ilike(transporters.code, `%${filter}%`),
          ilike(transporters.contactPerson, `%${filter}%`)
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
      .orderBy(order === 'asc' ? transporters[sort as keyof typeof transporters] : desc(transporters[sort as keyof typeof transporters]))
      .limit(perPage)
      .offset(offset);

    res.json({
      success: true,
      transporters: data,
      count: totalResult.count,
      page,
      perPage,
      sort,
      order,
      filter: filter || '',
    });
  } catch (error) {
    console.error('Error fetching transporters:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/transporters/{id}:
 *   get:
 *     tags:
 *       - Master Data - Transporters
 *     summary: Get transporter by ID
 *     description: Retrieve a specific transporter by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transporter ID
 *     responses:
 *       200:
 *         description: Transporter details
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
 *                     contactPerson:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     email:
 *                       type: string
 *                     website:
 *                       type: string
 *                     serviceAreas:
 *                       type: array
 *                       items:
 *                         type: string
 *                     isActive:
 *                       type: boolean
 *                     notes:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Transporter not found
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/modules/master-data/transporters:
 *   post:
 *     tags:
 *       - Master Data - Transporters
 *     summary: Create new transporter
 *     description: Create a new transporter
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: JNE Express
 *               code:
 *                 type: string
 *                 example: JNE
 *               contactPerson:
 *                 type: string
 *                 nullable: true
 *                 example: John Doe
 *               phone:
 *                 type: string
 *                 nullable: true
 *                 example: +62812345678
 *               email:
 *                 type: string
 *                 nullable: true
 *                 example: contact@jne.co.id
 *               website:
 *                 type: string
 *                 nullable: true
 *                 example: https://www.jne.co.id
 *               serviceAreas:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *                 example: ["Jakarta", "Surabaya", "Bandung"]
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Transporter created successfully
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

/**
 * @swagger
 * /api/modules/master-data/transporters/{id}:
 *   put:
 *     tags:
 *       - Master Data - Transporters
 *     summary: Update transporter
 *     description: Update an existing transporter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transporter ID
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
 *               contactPerson:
 *                 type: string
 *                 nullable: true
 *               phone:
 *                 type: string
 *                 nullable: true
 *               email:
 *                 type: string
 *                 nullable: true
 *               website:
 *                 type: string
 *                 nullable: true
 *               serviceAreas:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Transporter updated successfully
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
 *         description: Transporter not found
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

/**
 * @swagger
 * /api/modules/master-data/transporters/{id}:
 *   delete:
 *     tags:
 *       - Master Data - Transporters
 *     summary: Delete transporter
 *     description: Delete a transporter by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transporter ID
 *     responses:
 *       200:
 *         description: Transporter deleted successfully
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
 *         description: Transporter not found
 *       500:
 *         description: Internal server error
 */
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
