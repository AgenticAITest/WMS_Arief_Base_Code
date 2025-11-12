import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq, sql } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  salesOrders, 
  salesOrderItems, 
  packages, 
  shipments,
  salesOrderAllocations
} from '../lib/db/schemas/salesOrder';
import { customers, customerLocations, products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { user } from '@server/lib/db/schema/system';
import { workflows, workflowSteps } from '@modules/workflow/server/lib/db/schemas/workflow';
import { inventoryItems } from '@modules/inventory-items/server/lib/db/schemas/inventoryItems';
import { logAudit, getClientIp } from '@server/services/auditService';
import axios from 'axios';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('sales-order'));

// GET /ships - Fetch sales orders ready for shipping
router.get('/ships', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;

    // Fetch SOs with status='packed' and workflow_state='ship'
    const shippableSOs = await db.execute(sql`
      SELECT 
        so.id,
        so.order_number as "orderNumber",
        so.order_date as "orderDate",
        so.requested_delivery_date as "requestedDeliveryDate",
        so.status,
        so.workflow_state as "workflowState",
        so.total_amount as "totalAmount",
        so.notes,
        so.delivery_instructions as "deliveryInstructions",
        so.created_at as "createdAt",
        so.customer_id as "customerId",
        so.shipping_location_id as "shippingLocationId",
        c.name as "customerName",
        c.email as "customerEmail",
        c.phone as "customerPhone",
        COALESCE(
          json_agg(
            CASE 
              WHEN soi.id IS NOT NULL THEN 
                json_build_object(
                  'id', soi.id,
                  'lineNumber', soi.line_number,
                  'productId', soi.product_id,
                  'productName', p.name,
                  'sku', p.sku,
                  'orderedQuantity', soi.ordered_quantity,
                  'allocatedQuantity', soi.allocated_quantity,
                  'pickedQuantity', soi.picked_quantity,
                  'unitPrice', soi.unit_price,
                  'totalPrice', soi.total_price
                )
            END
            ORDER BY soi.line_number
          ) FILTER (WHERE soi.id IS NOT NULL),
          '[]'::json
        ) as items
      FROM sales_orders so
      JOIN customers c ON c.id = so.customer_id
      LEFT JOIN sales_order_items soi ON soi.sales_order_id = so.id
      LEFT JOIN products p ON p.id = soi.product_id
      WHERE so.tenant_id = ${tenantId}
        AND so.status = 'packed'
        AND so.workflow_state = 'ship'
      GROUP BY so.id, so.order_number, so.order_date, so.requested_delivery_date,
               so.status, so.workflow_state, so.total_amount, so.notes, so.delivery_instructions,
               so.created_at, so.customer_id, so.shipping_location_id, c.name, c.email, c.phone
      ORDER BY so.created_at DESC
    `);

    res.json({
      success: true,
      data: shippableSOs,
    });
  } catch (error: any) {
    console.error('Error fetching shippable sales orders:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

// GET /ships/:id/packages - Fetch packages for a specific sales order
router.get('/ships/:id/packages', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    // Fetch packages with their items
    const packagesData = await db.execute(sql`
      SELECT 
        pkg.id,
        pkg.package_id as "packageId",
        pkg.package_number as "packageNumber",
        pkg.length,
        pkg.width,
        pkg.height,
        pkg.weight,
        pkg.barcode,
        COALESCE(
          json_agg(
            CASE 
              WHEN pi.id IS NOT NULL THEN 
                json_build_object(
                  'id', pi.id,
                  'productId', pi.product_id,
                  'salesOrderItemId', pi.sales_order_item_id,
                  'quantity', pi.quantity,
                  'productName', p.name,
                  'sku', p.sku
                )
            END
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) as items
      FROM packages pkg
      LEFT JOIN package_items pi ON pi.package_id = pkg.id
      LEFT JOIN products p ON p.id = pi.product_id
      WHERE pkg.sales_order_id = ${id}
        AND pkg.tenant_id = ${tenantId}
      GROUP BY pkg.id, pkg.package_id, pkg.package_number, pkg.length, pkg.width, pkg.height, pkg.weight, pkg.barcode
      ORDER BY pkg.package_id
    `);

    res.json({
      success: true,
      data: packagesData,
    });
  } catch (error: any) {
    console.error('Error fetching packages:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

// GET /ships/:id/customer-locations - Fetch customer delivery locations selected during SO creation
router.get('/ships/:id/customer-locations', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    // Fetch only locations that were selected during SO creation
    // by querying sales_order_item_locations table
    const locations = await db.execute(sql`
      SELECT DISTINCT
        cl.id,
        cl.customer_id as "customerId",
        cl.location_type as "locationType",
        cl.address,
        cl.city,
        cl.state,
        cl.postal_code as "postalCode",
        cl.country,
        cl.contact_person as "contactPerson",
        cl.phone,
        cl.email,
        cl.is_active as "isActive"
      FROM customer_locations cl
      JOIN sales_order_item_locations soil ON soil.customer_location_id = cl.id
      JOIN sales_order_items soi ON soi.id = soil.sales_order_item_id
      WHERE soi.sales_order_id = ${id}
        AND cl.tenant_id = ${tenantId}
        AND cl.is_active = true
      ORDER BY cl.location_type, cl.city
    `);

    res.json({
      success: true,
      data: locations,
    });
  } catch (error: any) {
    console.error('Error fetching customer locations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

// POST /ships/:id/confirm - Confirm shipment and generate SHIP document
router.post('/ships/:id/confirm', authorized('ADMIN', 'sales-order.ship'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      transporterId,
      shippingMethodId,
      trackingNumber,
      shippingDate,
      estimatedDeliveryDate,
      totalCost,
      notes,
      packageLocations, // Array of { packageId, locationId }
    } = req.body;

    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    // Validate required fields
    if (!transporterId) {
      return res.status(400).json({
        success: false,
        message: 'Transporter is required',
      });
    }

    if (!packageLocations || packageLocations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Package location assignments are required',
      });
    }

    // Verify SO exists and is shippable
    const [so] = await db
      .select()
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.id, id),
          eq(salesOrders.tenantId, tenantId),
          eq(salesOrders.status, 'packed'),
          eq(salesOrders.workflowState, 'ship')
        )
      )
      .limit(1);

    if (!so) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found or not ready for shipping',
      });
    }

    // Verify packages exist
    const packagesForSO = await db
      .select()
      .from(packages)
      .where(
        and(
          eq(packages.salesOrderId, id),
          eq(packages.tenantId, tenantId)
        )
      );

    if (packagesForSO.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No packages found for this sales order',
      });
    }

    // Validate all packages have location assignments
    const packageIds = packagesForSO.map(p => p.id);
    const assignedPackageIds = packageLocations.map((pl: any) => pl.packageId);
    const missingPackages = packageIds.filter(pid => !assignedPackageIds.includes(pid));

    if (missingPackages.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All packages must have delivery location assignments',
      });
    }

    // === DATABASE TRANSACTION BEGIN ===
    await db.transaction(async (tx) => {
      // 1. Get next workflow step
      const workflowResults = await tx
        .select({ stepKey: workflowSteps.stepKey, stepOrder: workflowSteps.stepOrder })
        .from(workflows)
        .leftJoin(workflowSteps, eq(workflowSteps.workflowId, workflows.id))
        .where(
          and(
            eq(workflows.tenantId, tenantId),
            eq(workflows.type, 'SALES_ORDER'),
            eq(workflows.isDefault, true),
            eq(workflows.isActive, true),
            eq(workflowSteps.isActive, true)
          )
        )
        .orderBy(workflowSteps.stepOrder);

      // Find next step after 'ship'
      const currentStepIndex = workflowResults.findIndex(s => s.stepKey === 'ship');
      const nextStep = workflowResults[currentStepIndex + 1]?.stepKey || 'deliver';

      // 2. Generate SHIP document number
      const shipDocNumber = await axios.post(
        `${req.protocol}://${req.get('host')}/api/modules/document-numbering/generate`,
        { documentType: 'SHIP', options: {} },
        { headers: { Authorization: req.headers.authorization } }
      );

      const shipNumber = shipDocNumber.data.documentNumber;

      // 3. Create shipment record
      const shipmentId = uuidv4();
      const [newShipment] = await tx
        .insert(shipments)
        .values({
          id: shipmentId,
          tenantId,
          salesOrderId: id,
          shipmentNumber: shipNumber,
          transporterId,
          shippingMethodId: shippingMethodId || null,
          trackingNumber: trackingNumber || null,
          status: 'ready',
          shippingDate: shippingDate ? new Date(shippingDate) : new Date(),
          deliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
          totalCost: totalCost || null,
          notes: notes || null,
        })
        .returning();

      // 4. Link packages to shipment
      for (const pkg of packagesForSO) {
        await tx
          .update(packages)
          .set({ shipmentId })
          .where(eq(packages.id, pkg.id));
      }

      // 5. Update SO status to 'shipped' and advance workflow state
      // Note: Inventory was already deducted during allocation workflow, no need to deduct again
      await tx
        .update(salesOrders)
        .set({
          status: 'shipped',
          workflowState: nextStep,
          trackingNumber: trackingNumber || null,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(salesOrders.id, id));

      // 7. Generate SHIP document
      const [customerData] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, so.customerId))
        .limit(1);

      const [userData] = await tx
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      // Fetch packages with items and assigned locations
      const packagesWithDetails = await tx.execute(sql`
        SELECT 
          pkg.id,
          pkg.package_id as "packageId",
          pkg.package_number as "packageNumber",
          pkg.length,
          pkg.width,
          pkg.height,
          pkg.weight,
          pkg.barcode,
          json_agg(
            json_build_object(
              'productId', pi.product_id,
              'salesOrderItemId', pi.sales_order_item_id,
              'quantity', pi.quantity,
              'productName', p.name,
              'sku', p.sku
            )
          ) as items
        FROM packages pkg
        LEFT JOIN package_items pi ON pi.package_id = pkg.id
        LEFT JOIN products p ON p.id = pi.product_id
        WHERE pkg.sales_order_id = ${id}
          AND pkg.tenant_id = ${tenantId}
        GROUP BY pkg.id, pkg.package_id, pkg.package_number, pkg.length, pkg.width, pkg.height, pkg.weight, pkg.barcode
        ORDER BY pkg.package_id
      `);

      // Enrich packages with location data
      const packagesWithLocations = await Promise.all(
        (packagesWithDetails as any[]).map(async (pkg) => {
          const assignment = packageLocations.find((pl: any) => pl.packageId === pkg.id);
          let locationData = null;

          if (assignment && assignment.locationId) {
            const [location] = await tx
              .select()
              .from(customerLocations)
              .where(eq(customerLocations.id, assignment.locationId))
              .limit(1);
            locationData = location;
          }

          return {
            ...pkg,
            deliveryLocation: locationData,
          };
        })
      );

      // Generate SHIP document using ShipDocumentGenerator
      const { ShipDocumentGenerator } = await import('../services/shipDocumentGenerator');
      const shipDocumentPath = await ShipDocumentGenerator.save({
        id: so.id,
        tenantId,
        shipNumber,
        orderNumber: so.orderNumber,
        orderDate: so.orderDate,
        customerName: customerData?.name || 'Unknown Customer',
        customerEmail: customerData?.email || '',
        customerPhone: customerData?.phone || '',
        totalAmount: so.totalAmount,
        shippedByName: userData?.fullname || null,
        trackingNumber: trackingNumber || 'N/A',
        shippingDate: shippingDate || new Date().toISOString(),
        estimatedDeliveryDate: estimatedDeliveryDate || null,
        notes: notes || '',
        packages: packagesWithLocations,
        transporterId,
        shippingMethodId: shippingMethodId || null,
      }, userId, newShipment.id);

      // Update shipment with document ID
      await tx
        .update(shipments)
        .set({ shipmentDocumentId: shipDocumentPath.documentId })
        .where(eq(shipments.id, shipmentId));

      // 8. Log audit trail
      await logAudit({
        tenantId,
        userId,
        module: 'sales-order',
        action: 'ship_sales_order',
        resourceType: 'sales_order',
        resourceId: so.id,
        ipAddress: getClientIp(req),
        documentPath: shipDocumentPath.filePath,
        description: `Shipped sales order ${so.orderNumber} with ${packagesForSO.length} package(s). Generated shipment ${shipNumber}.`,
      });

      // Return success response
      res.json({
        success: true,
        message: 'Sales order shipped successfully',
        data: {
          salesOrderId: so.id,
          orderNumber: so.orderNumber,
          shipNumber,
          shipmentId,
          documentPath: shipDocumentPath.filePath,
          nextWorkflowState: nextStep,
        },
      });
    });
  } catch (error: any) {
    console.error('Error confirming shipment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
