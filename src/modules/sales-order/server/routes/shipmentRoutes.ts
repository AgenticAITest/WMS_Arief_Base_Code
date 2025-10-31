import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { shipments, packages, packageItems } from '../lib/db/schemas/salesOrder';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('sales-order'));

router.get('/shipments', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const tenantId = req.user!.activeTenantId;

    let query = db
      .select()
      .from(shipments)
      .where(eq(shipments.tenantId, tenantId))
      .$dynamic();

    if (search) {
      query = query.where(
        or(
          ilike(shipments.shipmentNumber, `%${search}%`),
          ilike(shipments.trackingNumber, `%${search}%`)
        )
      );
    }

    if (status) {
      query = query.where(eq(shipments.status, status));
    }

    const results = await query
      .orderBy(desc(shipments.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(shipments)
      .where(eq(shipments.tenantId, tenantId));

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
    console.error('Error fetching shipments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/shipments/:id', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const [shipment] = await db
      .select()
      .from(shipments)
      .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
      .limit(1);

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const shipmentPackages = await db
      .select()
      .from(packages)
      .where(eq(packages.shipmentId, id));

    res.json({
      ...shipment,
      packages: shipmentPackages,
    });
  } catch (error) {
    console.error('Error fetching shipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/shipments', authorized('ADMIN', 'sales-order.create'), async (req, res) => {
  try {
    const {
      salesOrderId,
      shipmentNumber,
      transporterId,
      shippingMethodId,
      trackingNumber,
      shippingDate,
      deliveryDate,
      totalWeight,
      totalVolume,
      totalCost,
      notes,
      packages: shipmentPackages = [],
    } = req.body;
    const tenantId = req.user!.activeTenantId;

    if (!salesOrderId || !shipmentNumber) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const shipmentId = uuidv4();

    const newShipment = {
      id: shipmentId,
      tenantId,
      salesOrderId,
      shipmentNumber,
      transporterId,
      shippingMethodId,
      trackingNumber,
      shippingDate: shippingDate ? new Date(shippingDate) : null,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      totalWeight,
      totalVolume,
      totalCost,
      notes,
      status: 'ready',
    };

    const [created] = await db
      .insert(shipments)
      .values(newShipment)
      .returning();

    let createdPackages = [];
    if (shipmentPackages.length > 0) {
      const packagesToInsert = shipmentPackages.map((pkg: any) => ({
        id: uuidv4(),
        tenantId,
        shipmentId,
        packageNumber: pkg.packageNumber,
        barcode: pkg.barcode,
        dimensions: pkg.dimensions,
        weight: pkg.weight,
      }));

      createdPackages = await db
        .insert(packages)
        .values(packagesToInsert)
        .returning();
    }

    res.status(201).json({
      ...created,
      packages: createdPackages,
    });
  } catch (error: any) {
    console.error('Error creating shipment:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Shipment number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/shipments/:id', authorized('ADMIN', 'sales-order.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      shipmentNumber,
      transporterId,
      shippingMethodId,
      trackingNumber,
      shippingDate,
      deliveryDate,
      totalWeight,
      totalVolume,
      totalCost,
      notes,
      status,
    } = req.body;
    const tenantId = req.user!.activeTenantId;

    const updateData: any = { updatedAt: new Date() };
    if (shipmentNumber !== undefined) updateData.shipmentNumber = shipmentNumber;
    if (transporterId !== undefined) updateData.transporterId = transporterId;
    if (shippingMethodId !== undefined) updateData.shippingMethodId = shippingMethodId;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (shippingDate !== undefined) updateData.shippingDate = shippingDate ? new Date(shippingDate) : null;
    if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    if (totalWeight !== undefined) updateData.totalWeight = totalWeight;
    if (totalVolume !== undefined) updateData.totalVolume = totalVolume;
    if (totalCost !== undefined) updateData.totalCost = totalCost;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const [updated] = await db
      .update(shipments)
      .set(updateData)
      .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const shipmentPackages = await db
      .select()
      .from(packages)
      .where(eq(packages.shipmentId, id));

    res.json({
      ...updated,
      packages: shipmentPackages,
    });
  } catch (error: any) {
    console.error('Error updating shipment:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Shipment number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/shipments/:id', authorized('ADMIN', 'sales-order.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const result = await db
      .delete(shipments)
      .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting shipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/packages', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const shipmentId = req.query.shipmentId as string;
    const tenantId = req.user!.activeTenantId;

    if (!shipmentId) {
      return res.status(400).json({ error: 'Shipment ID is required' });
    }

    const results = await db
      .select()
      .from(packages)
      .where(and(eq(packages.shipmentId, shipmentId), eq(packages.tenantId, tenantId)));

    res.json(results);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/packages', authorized('ADMIN', 'sales-order.create'), async (req, res) => {
  try {
    const { shipmentId, packageNumber, barcode, dimensions, weight, items = [] } = req.body;
    const tenantId = req.user!.activeTenantId;

    if (!shipmentId || !packageNumber) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const packageId = uuidv4();

    const newPackage = {
      id: packageId,
      tenantId,
      shipmentId,
      packageNumber,
      barcode,
      dimensions,
      weight,
    };

    const [created] = await db
      .insert(packages)
      .values(newPackage)
      .returning();

    let createdItems = [];
    if (items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        id: uuidv4(),
        tenantId,
        packageId,
        productId: item.productId,
        quantity: item.quantity,
      }));

      createdItems = await db
        .insert(packageItems)
        .values(itemsToInsert)
        .returning();
    }

    res.status(201).json({
      ...created,
      items: createdItems,
    });
  } catch (error: any) {
    console.error('Error creating package:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Package barcode already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
