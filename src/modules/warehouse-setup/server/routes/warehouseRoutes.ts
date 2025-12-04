import express from 'express';
import { db } from '@server/lib/db';
import { warehouses, warehouseConfigs, zones, aisles, shelves, bins } from '../lib/db/schemas/warehouseSetup';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, inArray } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('warehouse-setup'));

// ==================== WAREHOUSES ====================

/**
 * @swagger
 * components:
 *   schemas:
 *     Warehouse:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         tenantId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         address:
 *           type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouses:
 *   get:
 *     summary: Get all warehouses
 *     tags: [Warehouses]
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
 *       - in: query
 *         name: includeHierarchy
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include full hierarchy (zones, aisles, shelves, bins) in single request
 *     responses:
 *       200:
 *         description: List of warehouses
 */
router.get('/warehouses', authorized('ADMIN', 'warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const includeHierarchy = req.query.includeHierarchy === 'true';
    const offset = (page - 1) * limit;

    const whereConditions = [eq(warehouses.tenantId, tenantId)];
    if (search) {
      whereConditions.push(ilike(warehouses.name, `%${search}%`));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(warehouses)
      .where(and(...whereConditions));

    const warehouseData = await db
      .select()
      .from(warehouses)
      .where(and(...whereConditions))
      .orderBy(desc(warehouses.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch warehouse configs for all warehouses
    const warehouseIds = warehouseData.map(w => w.id);
    const configsData = warehouseIds.length > 0 ? await db
      .select()
      .from(warehouseConfigs)
      .where(and(
        eq(warehouseConfigs.tenantId, tenantId),
        inArray(warehouseConfigs.warehouseId, warehouseIds)
      )) : [];

    console.log('Warehouse IDs:', warehouseIds);
    console.log('Fetched configs:', configsData);

    // Merge warehouse data with configs
    let data = warehouseData.map(warehouse => {
      const config = configsData.find(c => c.warehouseId === warehouse.id);
      console.log(`Warehouse ${warehouse.id} config:`, config);
      return {
        ...warehouse,
        pickingStrategy: config?.pickingStrategy || 'FEFO',
        autoAssignBins: config?.autoAssignBins ?? true,
        requireBatchTracking: config?.requireBatchTracking ?? false,
        requireExpiryTracking: config?.requireExpiryTracking ?? true,
      };
    });

    // If includeHierarchy is true, load the complete hierarchy
    if (includeHierarchy && data.length > 0) {
      const warehouseIdsForHierarchy = data.map(w => w.id);

      // Fetch all zones for these warehouses
      const zonesData = await db
        .select()
        .from(zones)
        .where(and(
          eq(zones.tenantId, tenantId),
          eq(zones.warehouseId, warehouseIdsForHierarchy.length === 1 ? warehouseIdsForHierarchy[0] : zones.warehouseId)
        ));

      // Fetch all aisles for these zones
      const zoneIds = zonesData.map(z => z.id);
      const aislesData = zoneIds.length > 0 ? await db
        .select()
        .from(aisles)
        .where(eq(aisles.tenantId, tenantId)) : [];

      // Fetch all shelves for these aisles
      const aisleIds = aislesData.map(a => a.id);
      const shelvesData = aisleIds.length > 0 ? await db
        .select()
        .from(shelves)
        .where(eq(shelves.tenantId, tenantId)) : [];

      // Fetch all bins for these shelves
      const shelfIds = shelvesData.map(s => s.id);
      const binsData = shelfIds.length > 0 ? await db
        .select()
        .from(bins)
        .where(eq(bins.tenantId, tenantId)) : [];

      // Build the hierarchy
      data = data.map(warehouse => {
        const warehouseZones = zonesData
          .filter(z => z.warehouseId === warehouse.id)
          .map(zone => {
            const zoneAisles = aislesData
              .filter(a => a.zoneId === zone.id)
              .map(aisle => {
                const aisleShelves = shelvesData
                  .filter(s => s.aisleId === aisle.id)
                  .map(shelf => {
                    const shelfBins = binsData.filter(b => b.shelfId === shelf.id);
                    return { ...shelf, bins: shelfBins };
                  });
                return { ...aisle, shelves: aisleShelves };
              });
            return { ...zone, aisles: zoneAisles };
          });
        return { ...warehouse, zones: warehouseZones };
      });
    }

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
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouses/{id}:
 *   get:
 *     summary: Get warehouse by ID
 *     tags: [Warehouses]
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
 *         description: Warehouse details
 */
router.get('/warehouses/:id', authorized('ADMIN', 'warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.id, id), eq(warehouses.tenantId, tenantId)));

    if (!record) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouses:
 *   post:
 *     summary: Create a new warehouse with configuration
 *     tags: [Warehouses]
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
 *               address:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               pickingStrategy:
 *                 type: string
 *                 enum: [FIFO, FEFO, LIFO]
 *                 default: FEFO
 *               autoAssignBins:
 *                 type: boolean
 *                 default: true
 *               requireBatchTracking:
 *                 type: boolean
 *                 default: false
 *               requireExpiryTracking:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Warehouse and configuration created successfully
 */
router.post('/warehouses', authorized('ADMIN', 'warehouse-setup.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { 
      name, 
      address, 
      isActive,
      pickingStrategy,
      autoAssignBins,
      requireBatchTracking,
      requireExpiryTracking
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const warehouseId = uuidv4();

    // Create warehouse and warehouse_config in a transaction
    await db.transaction(async (tx) => {
      await tx
        .insert(warehouses)
        .values({
          id: warehouseId,
          tenantId,
          name,
          address,
          isActive: isActive !== undefined ? isActive : true,
        });

      // Create warehouse configuration
      await tx
        .insert(warehouseConfigs)
        .values({
          warehouseId,
          tenantId,
          pickingStrategy: pickingStrategy || 'FEFO',
          autoAssignBins: autoAssignBins !== undefined ? autoAssignBins : true,
          requireBatchTracking: requireBatchTracking !== undefined ? requireBatchTracking : false,
          requireExpiryTracking: requireExpiryTracking !== undefined ? requireExpiryTracking : true,
        });
    });

    // Fetch the created warehouse to return
    const [newWarehouse] = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, warehouseId));

    res.status(201).json({ success: true, data: newWarehouse, message: 'Warehouse created successfully' });
  } catch (error) {
    console.error('Error creating warehouse:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouses/{id}:
 *   put:
 *     summary: Update warehouse
 *     tags: [Warehouses]
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
 *               address:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Warehouse updated successfully
 */
router.put('/warehouses/:id', authorized('ADMIN', 'warehouse-setup.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const {
      name,
      address,
      isActive,
      pickingStrategy,
      autoAssignBins,
      requireBatchTracking,
      requireExpiryTracking
    } = req.body;

    // Use transaction to update both warehouse and config
    await db.transaction(async (tx) => {
      // Update warehouse basic info
      const [updated] = await tx
        .update(warehouses)
        .set({ name, address, isActive, updatedAt: new Date() })
        .where(and(eq(warehouses.id, id), eq(warehouses.tenantId, tenantId)))
        .returning();

      if (!updated) {
        throw new Error('Warehouse not found');
      }

      // Update warehouse configuration if config fields are provided
      if (pickingStrategy !== undefined || autoAssignBins !== undefined ||
          requireBatchTracking !== undefined || requireExpiryTracking !== undefined) {

        const configUpdate: any = { updatedAt: new Date() };
        if (pickingStrategy !== undefined) configUpdate.pickingStrategy = pickingStrategy;
        if (autoAssignBins !== undefined) configUpdate.autoAssignBins = autoAssignBins;
        if (requireBatchTracking !== undefined) configUpdate.requireBatchTracking = requireBatchTracking;
        if (requireExpiryTracking !== undefined) configUpdate.requireExpiryTracking = requireExpiryTracking;

        await tx
          .update(warehouseConfigs)
          .set(configUpdate)
          .where(and(
            eq(warehouseConfigs.warehouseId, id),
            eq(warehouseConfigs.tenantId, tenantId)
          ));
      }
    });

    // Fetch updated warehouse with config for response
    const [updatedWarehouse] = await db
      .select({
        id: warehouses.id,
        name: warehouses.name,
        address: warehouses.address,
        isActive: warehouses.isActive,
        createdAt: warehouses.createdAt,
        updatedAt: warehouses.updatedAt,
        pickingStrategy: warehouseConfigs.pickingStrategy,
        autoAssignBins: warehouseConfigs.autoAssignBins,
        requireBatchTracking: warehouseConfigs.requireBatchTracking,
        requireExpiryTracking: warehouseConfigs.requireExpiryTracking,
      })
      .from(warehouses)
      .leftJoin(warehouseConfigs, eq(warehouseConfigs.warehouseId, warehouses.id))
      .where(and(eq(warehouses.id, id), eq(warehouses.tenantId, tenantId)))
      .limit(1);

    res.json({ success: true, data: updatedWarehouse, message: 'Warehouse updated successfully' });
  } catch (error: any) {
    console.error('Error updating warehouse:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouses/{id}:
 *   delete:
 *     summary: Delete warehouse
 *     tags: [Warehouses]
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
 *         description: Warehouse deleted successfully
 */
router.delete('/warehouses/:id', authorized('ADMIN', 'warehouse-setup.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    // Use transaction to delete all related records in correct order
    await db.transaction(async (tx) => {
      // Get all zones in this warehouse
      const warehouseZones = await tx
        .select({ id: zones.id })
        .from(zones)
        .where(and(eq(zones.warehouseId, id), eq(zones.tenantId, tenantId)));

      const zoneIds = warehouseZones.map(z => z.id);

      if (zoneIds.length > 0) {
        // Get all aisles in these zones
        const zoneAisles = await tx
          .select({ id: aisles.id, zoneId: aisles.zoneId })
          .from(aisles)
          .where(eq(aisles.tenantId, tenantId));

        // Filter aisles that belong to our zones
        const aisleIds = zoneAisles.filter(a => zoneIds.includes(a.zoneId)).map(a => a.id);

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

          // Delete all aisles in these zones
          for (const zoneId of zoneIds) {
            await tx
              .delete(aisles)
              .where(and(eq(aisles.zoneId, zoneId), eq(aisles.tenantId, tenantId)));
          }
        }

        // Delete all zones in this warehouse
        await tx
          .delete(zones)
          .where(and(eq(zones.warehouseId, id), eq(zones.tenantId, tenantId)));
      }

      // Delete warehouse config
      await tx
        .delete(warehouseConfigs)
        .where(and(
          eq(warehouseConfigs.warehouseId, id),
          eq(warehouseConfigs.tenantId, tenantId)
        ));

      // Finally delete the warehouse
      const [deleted] = await tx
        .delete(warehouses)
        .where(and(eq(warehouses.id, id), eq(warehouses.tenantId, tenantId)))
        .returning();

      if (!deleted) {
        throw new Error('Warehouse not found');
      }
    });

    res.json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting warehouse:', error);
    if (error.message === 'Warehouse not found') {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== WAREHOUSE CONFIGS ====================

/**
 * @swagger
 * components:
 *   schemas:
 *     WarehouseConfig:
 *       type: object
 *       required:
 *         - warehouseId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         warehouseId:
 *           type: string
 *           format: uuid
 *         pickingStrategy:
 *           type: string
 *           enum: [FIFO, FEFO, LIFO]
 *         autoAssignBins:
 *           type: boolean
 *         requireBatchTracking:
 *           type: boolean
 *         requireExpiryTracking:
 *           type: boolean
 */

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouse-configs:
 *   get:
 *     summary: Get all warehouse configs
 *     tags: [Warehouse Configs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of warehouse configs
 */
router.get('/warehouse-configs', authorized('ADMIN', 'warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { warehouseId } = req.query;

    const whereConditions = [eq(warehouseConfigs.tenantId, tenantId)];
    if (warehouseId) {
      whereConditions.push(eq(warehouseConfigs.warehouseId, warehouseId as string));
    }

    const data = await db
      .select()
      .from(warehouseConfigs)
      .where(and(...whereConditions));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching warehouse configs:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouse-configs/{id}:
 *   get:
 *     summary: Get warehouse config by ID
 *     tags: [Warehouse Configs]
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
 *         description: Warehouse config details
 */
router.get('/warehouse-configs/:id', authorized('ADMIN', 'warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(warehouseConfigs)
      .where(and(eq(warehouseConfigs.id, id), eq(warehouseConfigs.tenantId, tenantId)));

    if (!record) {
      return res.status(404).json({ success: false, message: 'Warehouse config not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error fetching warehouse config:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouse-configs:
 *   post:
 *     summary: Create warehouse config
 *     tags: [Warehouse Configs]
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
 *             properties:
 *               warehouseId:
 *                 type: string
 *                 format: uuid
 *               pickingStrategy:
 *                 type: string
 *                 enum: [FIFO, FEFO, LIFO]
 *               autoAssignBins:
 *                 type: boolean
 *               requireBatchTracking:
 *                 type: boolean
 *               requireExpiryTracking:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Warehouse config created successfully
 */
router.post('/warehouse-configs', authorized('ADMIN', 'warehouse-setup.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { warehouseId, pickingStrategy, autoAssignBins, requireBatchTracking, requireExpiryTracking } = req.body;

    if (!warehouseId) {
      return res.status(400).json({ success: false, message: 'Warehouse ID is required' });
    }

    const [newRecord] = await db
      .insert(warehouseConfigs)
      .values({
        id: uuidv4(),
        warehouseId,
        tenantId,
        pickingStrategy: pickingStrategy || 'FEFO',
        autoAssignBins: autoAssignBins !== undefined ? autoAssignBins : true,
        requireBatchTracking: requireBatchTracking !== undefined ? requireBatchTracking : false,
        requireExpiryTracking: requireExpiryTracking !== undefined ? requireExpiryTracking : true,
      })
      .returning();

    res.status(201).json({ success: true, data: newRecord, message: 'Warehouse config created successfully' });
  } catch (error) {
    console.error('Error creating warehouse config:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouse-configs/{id}:
 *   put:
 *     summary: Update warehouse config
 *     tags: [Warehouse Configs]
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
 *               pickingStrategy:
 *                 type: string
 *               autoAssignBins:
 *                 type: boolean
 *               requireBatchTracking:
 *                 type: boolean
 *               requireExpiryTracking:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Warehouse config updated successfully
 */
router.put('/warehouse-configs/:id', authorized('ADMIN', 'warehouse-setup.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const { pickingStrategy, autoAssignBins, requireBatchTracking, requireExpiryTracking } = req.body;

    const [updated] = await db
      .update(warehouseConfigs)
      .set({ pickingStrategy, autoAssignBins, requireBatchTracking, requireExpiryTracking, updatedAt: new Date() })
      .where(and(eq(warehouseConfigs.id, id), eq(warehouseConfigs.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Warehouse config not found' });
    }

    res.json({ success: true, data: updated, message: 'Warehouse config updated successfully' });
  } catch (error) {
    console.error('Error updating warehouse config:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouse-configs/{id}:
 *   delete:
 *     summary: Delete warehouse config
 *     tags: [Warehouse Configs]
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
 *         description: Warehouse config deleted successfully
 */
router.delete('/warehouse-configs/:id', authorized('ADMIN', 'warehouse-setup.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(warehouseConfigs)
      .where(and(eq(warehouseConfigs.id, id), eq(warehouseConfigs.tenantId, tenantId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Warehouse config not found' });
    }

    res.json({ success: true, message: 'Warehouse config deleted successfully' });
  } catch (error) {
    console.error('Error deleting warehouse config:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
