import express from 'express';
import { db } from '@server/lib/db';
import { zones, aisles, shelves, bins } from '../lib/db/schemas/warehouseSetup';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('warehouse-setup'));

// ==================== ZONES ====================

/**
 * @swagger
 * components:
 *   schemas:
 *     Zone:
 *       type: object
 *       required:
 *         - warehouseId
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         warehouseId:
 *           type: string
 *           format: uuid
 *         tenantId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 */

/**
 * @swagger
 * /api/modules/warehouse-setup/zones:
 *   get:
 *     summary: Get all zones
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: List of zones
 */
router.get('/zones', authorized('ADMIN', 'warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { warehouseId, search } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const whereConditions = [eq(zones.tenantId, tenantId)];
    if (warehouseId) {
      whereConditions.push(eq(zones.warehouseId, warehouseId as string));
    }
    if (search) {
      whereConditions.push(ilike(zones.name, `%${search}%`));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(zones)
      .where(and(...whereConditions));

    const data = await db
      .select()
      .from(zones)
      .where(and(...whereConditions))
      .orderBy(desc(zones.createdAt))
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
    console.error('Error fetching zones:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/zones/{id}:
 *   get:
 *     summary: Get zone by ID
 *     tags: [Zones]
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
 *         description: Zone details
 */
router.get('/zones/:id', authorized('ADMIN', 'warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(zones)
      .where(and(eq(zones.id, id), eq(zones.tenantId, tenantId)));

    if (!record) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error fetching zone:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/zones:
 *   post:
 *     summary: Create a new zone
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - warehouseId
 *               - name
 *             properties:
 *               warehouseId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Zone created successfully
 */
router.post('/zones', authorized('ADMIN', 'warehouse-setup.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { warehouseId, name, description } = req.body;

    if (!warehouseId || !name) {
      return res.status(400).json({ success: false, message: 'Warehouse ID and name are required' });
    }

    const [newRecord] = await db
      .insert(zones)
      .values({
        id: uuidv4(),
        warehouseId,
        tenantId,
        name,
        description,
      })
      .returning();

    res.status(201).json({ success: true, data: newRecord, message: 'Zone created successfully' });
  } catch (error) {
    console.error('Error creating zone:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/zones/{id}:
 *   put:
 *     summary: Update zone
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Zone updated successfully
 */
router.put('/zones/:id', authorized('ADMIN', 'warehouse-setup.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const { name, description } = req.body;

    const [updated] = await db
      .update(zones)
      .set({ name, description })
      .where(and(eq(zones.id, id), eq(zones.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    res.json({ success: true, data: updated, message: 'Zone updated successfully' });
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/zones/{id}:
 *   delete:
 *     summary: Delete zone
 *     tags: [Zones]
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
 *         description: Zone deleted successfully
 */
router.delete('/zones/:id', authorized('ADMIN', 'warehouse-setup.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    await db.transaction(async (tx) => {
      // Get all aisles in this zone
      const zoneAisles = await tx
        .select({ id: aisles.id })
        .from(aisles)
        .where(and(eq(aisles.zoneId, id), eq(aisles.tenantId, tenantId)));

      const aisleIds = zoneAisles.map(a => a.id);

      if (aisleIds.length > 0) {
        // Get all shelves in these aisles
        const aisleShelves = await tx
          .select({ id: shelves.id, aisleId: shelves.aisleId })
          .from(shelves)
          .where(eq(shelves.tenantId, tenantId));

        // Filter shelves that belong to our aisles
        const shelfIds = aisleShelves.filter(s => aisleIds.includes(s.aisleId)).map(s => s.id);

        if (shelfIds.length > 0) {
          // Delete all bins in these shelves
          for (const shelfId of shelfIds) {
            await tx
              .delete(bins)
              .where(and(eq(bins.shelfId, shelfId), eq(bins.tenantId, tenantId)));
          }

          // Delete all shelves in these aisles
          for (const aisleId of aisleIds) {
            await tx
              .delete(shelves)
              .where(and(eq(shelves.aisleId, aisleId), eq(shelves.tenantId, tenantId)));
          }
        }

        // Delete all aisles in this zone
        await tx
          .delete(aisles)
          .where(and(eq(aisles.zoneId, id), eq(aisles.tenantId, tenantId)));
      }

      // Delete the zone
      const [deleted] = await tx
        .delete(zones)
        .where(and(eq(zones.id, id), eq(zones.tenantId, tenantId)))
        .returning();

      if (!deleted) {
        throw new Error('Zone not found');
      }
    });

    res.json({ success: true, message: 'Zone deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting zone:', error);
    if (error.message === 'Zone not found') {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== AISLES ====================

/**
 * @swagger
 * components:
 *   schemas:
 *     Aisle:
 *       type: object
 *       required:
 *         - zoneId
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         zoneId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 */

/**
 * @swagger
 * /api/modules/warehouse-setup/aisles:
 *   get:
 *     summary: Get all aisles
 *     tags: [Aisles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: zoneId
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: List of aisles
 */
router.get('/aisles', authorized('ADMIN', 'warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { zoneId, search } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const whereConditions = [eq(aisles.tenantId, tenantId)];
    if (zoneId) {
      whereConditions.push(eq(aisles.zoneId, zoneId as string));
    }
    if (search) {
      whereConditions.push(ilike(aisles.name, `%${search}%`));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(aisles)
      .where(and(...whereConditions));

    const data = await db
      .select()
      .from(aisles)
      .where(and(...whereConditions))
      .orderBy(desc(aisles.createdAt))
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
    console.error('Error fetching aisles:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/aisles/{id}:
 *   get:
 *     summary: Get aisle by ID
 *     tags: [Aisles]
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
 *         description: Aisle details
 */
router.get('/aisles/:id', authorized('ADMIN', 'warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(aisles)
      .where(and(eq(aisles.id, id), eq(aisles.tenantId, tenantId)));

    if (!record) {
      return res.status(404).json({ success: false, message: 'Aisle not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error fetching aisle:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/aisles:
 *   post:
 *     summary: Create a new aisle
 *     tags: [Aisles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - zoneId
 *               - name
 *             properties:
 *               zoneId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Aisle created successfully
 */
router.post('/aisles', authorized('ADMIN', 'warehouse-setup.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { zoneId, name, description } = req.body;

    if (!zoneId || !name) {
      return res.status(400).json({ success: false, message: 'Zone ID and name are required' });
    }

    const [newRecord] = await db
      .insert(aisles)
      .values({
        id: uuidv4(),
        zoneId,
        tenantId,
        name,
        description,
      })
      .returning();

    res.status(201).json({ success: true, data: newRecord, message: 'Aisle created successfully' });
  } catch (error) {
    console.error('Error creating aisle:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/aisles/{id}:
 *   put:
 *     summary: Update aisle
 *     tags: [Aisles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Aisle updated successfully
 */
router.put('/aisles/:id', authorized('ADMIN', 'warehouse-setup.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const { name, description } = req.body;

    const [updated] = await db
      .update(aisles)
      .set({ name, description })
      .where(and(eq(aisles.id, id), eq(aisles.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Aisle not found' });
    }

    res.json({ success: true, data: updated, message: 'Aisle updated successfully' });
  } catch (error) {
    console.error('Error updating aisle:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/aisles/{id}:
 *   delete:
 *     summary: Delete aisle
 *     tags: [Aisles]
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
 *         description: Aisle deleted successfully
 */
router.delete('/aisles/:id', authorized('ADMIN', 'warehouse-setup.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    await db.transaction(async (tx) => {
      // Get all shelves in this aisle
      const aisleShelves = await tx
        .select({ id: shelves.id })
        .from(shelves)
        .where(and(eq(shelves.aisleId, id), eq(shelves.tenantId, tenantId)));

      const shelfIds = aisleShelves.map(s => s.id);

      if (shelfIds.length > 0) {
        // Delete all bins in these shelves
        for (const shelfId of shelfIds) {
          await tx
            .delete(bins)
            .where(and(eq(bins.shelfId, shelfId), eq(bins.tenantId, tenantId)));
        }

        // Delete all shelves in this aisle
        await tx
          .delete(shelves)
          .where(and(eq(shelves.aisleId, id), eq(shelves.tenantId, tenantId)));
      }

      // Delete the aisle
      const [deleted] = await tx
        .delete(aisles)
        .where(and(eq(aisles.id, id), eq(aisles.tenantId, tenantId)))
        .returning();

      if (!deleted) {
        throw new Error('Aisle not found');
      }
    });

    res.json({ success: true, message: 'Aisle deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting aisle:', error);
    if (error.message === 'Aisle not found') {
      return res.status(404).json({ success: false, message: 'Aisle not found' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== SHELVES ====================

/**
 * @swagger
 * components:
 *   schemas:
 *     Shelf:
 *       type: object
 *       required:
 *         - aisleId
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         aisleId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 */

/**
 * @swagger
 * /api/modules/warehouse-setup/shelves:
 *   get:
 *     summary: Get all shelves
 *     tags: [Shelves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: aisleId
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: List of shelves
 */
router.get('/shelves', authorized('ADMIN', 'warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { aisleId, search } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const whereConditions = [eq(shelves.tenantId, tenantId)];
    if (aisleId) {
      whereConditions.push(eq(shelves.aisleId, aisleId as string));
    }
    if (search) {
      whereConditions.push(ilike(shelves.name, `%${search}%`));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(shelves)
      .where(and(...whereConditions));

    const data = await db
      .select()
      .from(shelves)
      .where(and(...whereConditions))
      .orderBy(desc(shelves.createdAt))
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
    console.error('Error fetching shelves:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/shelves/{id}:
 *   get:
 *     summary: Get shelf by ID
 *     tags: [Shelves]
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
 *         description: Shelf details
 */
router.get('/shelves/:id', authorized('ADMIN', 'warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(shelves)
      .where(and(eq(shelves.id, id), eq(shelves.tenantId, tenantId)));

    if (!record) {
      return res.status(404).json({ success: false, message: 'Shelf not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error fetching shelf:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/shelves:
 *   post:
 *     summary: Create a new shelf
 *     tags: [Shelves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - aisleId
 *               - name
 *             properties:
 *               aisleId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Shelf created successfully
 */
router.post('/shelves', authorized('ADMIN', 'warehouse-setup.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { aisleId, name, description } = req.body;

    if (!aisleId || !name) {
      return res.status(400).json({ success: false, message: 'Aisle ID and name are required' });
    }

    const [newRecord] = await db
      .insert(shelves)
      .values({
        id: uuidv4(),
        aisleId,
        tenantId,
        name,
        description,
      })
      .returning();

    res.status(201).json({ success: true, data: newRecord, message: 'Shelf created successfully' });
  } catch (error) {
    console.error('Error creating shelf:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/shelves/{id}:
 *   put:
 *     summary: Update shelf
 *     tags: [Shelves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shelf updated successfully
 */
router.put('/shelves/:id', authorized('ADMIN', 'warehouse-setup.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const { name, description } = req.body;

    const [updated] = await db
      .update(shelves)
      .set({ name, description })
      .where(and(eq(shelves.id, id), eq(shelves.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Shelf not found' });
    }

    res.json({ success: true, data: updated, message: 'Shelf updated successfully' });
  } catch (error) {
    console.error('Error updating shelf:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/shelves/{id}:
 *   delete:
 *     summary: Delete shelf
 *     tags: [Shelves]
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
 *         description: Shelf deleted successfully
 */
router.delete('/shelves/:id', authorized('ADMIN', 'warehouse-setup.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    await db.transaction(async (tx) => {
      // Delete all bins in this shelf first
      await tx
        .delete(bins)
        .where(and(eq(bins.shelfId, id), eq(bins.tenantId, tenantId)));

      // Then delete the shelf
      const [deleted] = await tx
        .delete(shelves)
        .where(and(eq(shelves.id, id), eq(shelves.tenantId, tenantId)))
        .returning();

      if (!deleted) {
        throw new Error('Shelf not found');
      }
    });

    res.json({ success: true, message: 'Shelf deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting shelf:', error);
    if (error.message === 'Shelf not found') {
      return res.status(404).json({ success: false, message: 'Shelf not found' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== BINS ====================

/**
 * @swagger
 * components:
 *   schemas:
 *     Bin:
 *       type: object
 *       required:
 *         - shelfId
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         shelfId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         barcode:
 *           type: string
 *         maxWeight:
 *           type: number
 *         maxVolume:
 *           type: number
 *         fixedSku:
 *           type: string
 *         category:
 *           type: string
 *         requiredTemperature:
 *           type: string
 *         accessibilityScore:
 *           type: integer
 */

/**
 * @swagger
 * /api/modules/warehouse-setup/bins:
 *   get:
 *     summary: Get all bins
 *     tags: [Bins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: shelfId
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: List of bins
 */
router.get('/bins', authorized('ADMIN', 'warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { shelfId, search } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const whereConditions = [eq(bins.tenantId, tenantId)];
    if (shelfId) {
      whereConditions.push(eq(bins.shelfId, shelfId as string));
    }
    if (search) {
      whereConditions.push(ilike(bins.name, `%${search}%`));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(bins)
      .where(and(...whereConditions));

    const data = await db
      .select()
      .from(bins)
      .where(and(...whereConditions))
      .orderBy(desc(bins.createdAt))
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
    console.error('Error fetching bins:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/bins/{id}:
 *   get:
 *     summary: Get bin by ID
 *     tags: [Bins]
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
 *         description: Bin details
 */
router.get('/bins/:id', authorized('ADMIN', 'warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(bins)
      .where(and(eq(bins.id, id), eq(bins.tenantId, tenantId)));

    if (!record) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error fetching bin:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/bins:
 *   post:
 *     summary: Create a new bin
 *     tags: [Bins]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shelfId
 *               - name
 *             properties:
 *               shelfId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               barcode:
 *                 type: string
 *               maxWeight:
 *                 type: number
 *               maxVolume:
 *                 type: number
 *               fixedSku:
 *                 type: string
 *               category:
 *                 type: string
 *               requiredTemperature:
 *                 type: string
 *               accessibilityScore:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Bin created successfully
 */
router.post('/bins', authorized('ADMIN', 'warehouse-setup.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { shelfId, name, barcode, maxWeight, maxVolume, fixedSku, category, requiredTemperature, accessibilityScore } = req.body;

    if (!shelfId || !name) {
      return res.status(400).json({ success: false, message: 'Shelf ID and name are required' });
    }

    const [newRecord] = await db
      .insert(bins)
      .values({
        id: uuidv4(),
        shelfId,
        tenantId,
        name,
        barcode,
        maxWeight,
        maxVolume,
        fixedSku,
        category,
        requiredTemperature,
        accessibilityScore: accessibilityScore !== undefined ? accessibilityScore : 50,
      })
      .returning();

    res.status(201).json({ success: true, data: newRecord, message: 'Bin created successfully' });
  } catch (error) {
    console.error('Error creating bin:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/bins/{id}:
 *   put:
 *     summary: Update bin
 *     tags: [Bins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               barcode:
 *                 type: string
 *               maxWeight:
 *                 type: number
 *               maxVolume:
 *                 type: number
 *               fixedSku:
 *                 type: string
 *               category:
 *                 type: string
 *               requiredTemperature:
 *                 type: string
 *               accessibilityScore:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Bin updated successfully
 */
router.put('/bins/:id', authorized('ADMIN', 'warehouse-setup.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const { name, barcode, maxWeight, maxVolume, fixedSku, category, requiredTemperature, accessibilityScore } = req.body;

    const [updated] = await db
      .update(bins)
      .set({ name, barcode, maxWeight, maxVolume, fixedSku, category, requiredTemperature, accessibilityScore })
      .where(and(eq(bins.id, id), eq(bins.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    res.json({ success: true, data: updated, message: 'Bin updated successfully' });
  } catch (error) {
    console.error('Error updating bin:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/bins/{id}:
 *   delete:
 *     summary: Delete bin
 *     tags: [Bins]
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
 *         description: Bin deleted successfully
 */
router.delete('/bins/:id', authorized('ADMIN', 'warehouse-setup.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(bins)
      .where(and(eq(bins.id, id), eq(bins.tenantId, tenantId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    res.json({ success: true, message: 'Bin deleted successfully' });
  } catch (error) {
    console.error('Error deleting bin:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
