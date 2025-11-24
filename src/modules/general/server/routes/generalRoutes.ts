import express from 'express';
import { db } from '@server/lib/db'; // Adjust import path as needed
import { general } from '../lib/db/schemas/general';
import { authenticated, authorized } from '@server/middleware/authMiddleware'; // Adjust import path as needed
import { eq, and, desc, count, ilike } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('general'));

/**
 * @swagger
 * components:
 *   schemas:
 *     General:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/modules/general/general:
 *   get:
 *     summary: Get all General records
 *     tags: [General]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of General records
 *       401:
 *         description: Unauthorized
 */
router.get('/general', authorized('ADMIN','general.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(general.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(ilike(general.name, `%${search}%`));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(general)
      .where(and(...whereConditions));

    // Get paginated data
    const data = await db
      .select()
      .from(general)
      .where(and(...whereConditions))
      .orderBy(desc(general.createdAt))
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
    console.error('Error fetching general:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/general/general:
 *   post:
 *     summary: Create a new General
 *     tags: [General]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: General created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/general', authorized('ADMIN','general.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    const [newRecord] = await db
      .insert(general)
      .values({
        tenantId,
        name,
        description,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newRecord,
      message: 'General created successfully',
    });
  } catch (error) {
    console.error('Error creating general:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/general/general/{id}:
 *   get:
 *     summary: Get a General by ID
 *     tags: [General]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: General found
 *       404:
 *         description: General not found
 *       401:
 *         description: Unauthorized
 */
router.get('/general/:id', authorized('ADMIN','general.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(general)
      .where(and(
        eq(general.id, id),
        eq(general.tenantId, tenantId)
      ));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'General not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching general:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
