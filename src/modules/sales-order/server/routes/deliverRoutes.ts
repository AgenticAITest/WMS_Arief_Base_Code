import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq, sql } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  salesOrders, 
  salesOrderItems,
  shipments,
  packages,
  packageItems,
  deliveries,
  deliveryItems
} from '../lib/db/schemas/salesOrder';
import { purchaseOrders, purchaseOrderItems } from '@modules/purchase-order/server/lib/db/schemas/purchaseOrder';
import { customers, products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { user } from '@server/lib/db/schema/system';
import { workflows, workflowSteps } from '@modules/workflow/server/lib/db/schemas/workflow';
import { logAudit, getClientIp } from '@server/services/auditService';
import { DeliverDocumentGenerator } from '../services/deliverDocumentGenerator';
import axios from 'axios';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('sales-order'));

// GET /delivers - Fetch sales orders ready for delivery confirmation
router.get('/delivers', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;

    // Fetch SOs with status='shipped' and workflow_state='deliver'
    const deliverableSOs = await db.execute(sql`
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
        c.name as "customerName",
        c.email as "customerEmail",
        c.phone as "customerPhone",
        s.id as "shipmentId",
        s.shipment_number as "shipmentNumber",
        s.tracking_number as "trackingNumber",
        s.shipping_date as "shippingDate",
        (
          SELECT COUNT(*)::integer
          FROM packages pkg
          WHERE pkg.shipment_id = s.id
        ) as "packageCount",
        (
          SELECT SUM(pi.quantity)::decimal
          FROM packages pkg
          JOIN package_items pi ON pi.package_id = pkg.id
          WHERE pkg.shipment_id = s.id
        ) as "totalItems"
      FROM sales_orders so
      JOIN customers c ON c.id = so.customer_id
      JOIN shipments s ON s.sales_order_id = so.id
      WHERE so.tenant_id = ${tenantId}
        AND so.status = 'shipped'
        AND so.workflow_state = 'deliver'
      ORDER BY s.shipping_date DESC, so.created_at DESC
    `);

    res.json({
      success: true,
      data: deliverableSOs,
    });
  } catch (error: any) {
    console.error('Error fetching deliverable sales orders:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

// GET /delivers/:id/details - Fetch delivery details with packages and items
router.get('/delivers/:id/details', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    // Fetch shipment for this SO
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.salesOrderId, id),
          eq(shipments.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found for this sales order',
      });
    }

    // Fetch packages with items
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
      WHERE pkg.shipment_id = ${shipment.id}
        AND pkg.tenant_id = ${tenantId}
      GROUP BY pkg.id, pkg.package_id, pkg.package_number, pkg.length, pkg.width, pkg.height, pkg.weight, pkg.barcode
      ORDER BY pkg.package_id
    `);

    res.json({
      success: true,
      data: {
        shipment,
        packages: packagesData,
      },
    });
  } catch (error: any) {
    console.error('Error fetching delivery details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

// POST /delivers/:id/complete - Confirm complete delivery
router.post('/delivers/:id/complete', authorized('ADMIN', 'sales-order.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientName, notes } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    // Validate SO exists and is in correct state
    const [so] = await db
      .select()
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.id, id),
          eq(salesOrders.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!so) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found',
      });
    }

    if (so.status !== 'shipped' || so.workflowState !== 'deliver') {
      return res.status(400).json({
        success: false,
        message: `Cannot deliver: current status is ${so.status}/${so.workflowState}`,
      });
    }

    // Get shipment
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.salesOrderId, id),
          eq(shipments.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found for this sales order',
      });
    }

    // Get all package items to create delivery_items records
    const pkgItems = await db.execute(sql`
      SELECT 
        pi.sales_order_item_id,
        pi.product_id,
        pi.quantity,
        p.name as product_name,
        p.sku
      FROM package_items pi
      JOIN packages pkg ON pkg.id = pi.package_id
      JOIN products p ON p.id = pi.product_id
      WHERE pkg.shipment_id = ${shipment.id}
        AND pi.tenant_id = ${tenantId}
    `);

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Get next workflow step
      const nextStepResult = await tx.execute(sql`
        SELECT ws.step_name
        FROM workflow_steps ws
        JOIN workflows w ON w.id = ws.workflow_id
        WHERE w.tenant_id = ${tenantId}
          AND w.type = 'outbound'
          AND w.is_active = true
          AND ws.step_order = (
            SELECT step_order + 1
            FROM workflow_steps
            WHERE workflow_id = w.id
              AND step_name = 'deliver'
          )
        LIMIT 1
      `);

      const nextStep = (nextStepResult[0]?.step_name as string) || 'complete';

      // Create delivery record
      const deliveryId = uuidv4();
      await tx.insert(deliveries).values({
        id: deliveryId,
        tenantId,
        shipmentId: shipment.id,
        salesOrderId: id,
        status: 'complete',
        deliveryDate: new Date(),
        recipientName,
        notes,
        returnPurchaseOrderId: null,
        deliveredBy: userId,
      });

      // Create delivery_items records (all accepted)
      const deliveryItemsData = pkgItems.map((item: any) => ({
        id: uuidv4(),
        deliveryId,
        tenantId,
        salesOrderItemId: item.sales_order_item_id,
        productId: item.product_id,
        shippedQuantity: item.quantity,
        acceptedQuantity: item.quantity,
        rejectedQuantity: '0',
        rejectionNotes: null,
      }));

      await tx.insert(deliveryItems).values(deliveryItemsData);

      // Update shipment status
      await tx
        .update(shipments)
        .set({ status: 'delivered' })
        .where(eq(shipments.id, shipment.id));

      // Update sales order
      await tx
        .update(salesOrders)
        .set({
          status: 'delivered',
          workflowState: nextStep as string,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(salesOrders.id, id));

      return { deliveryId };
    });

    // Generate DELIVERY document number
    const deliveryNumberResponse = await axios.post(
      'http://localhost:5000/api/modules/document-numbering/generate',
      { documentType: 'DELIVERY', options: {} },
      { headers: { Authorization: req.headers.authorization } }
    );
    const deliveryNumber = deliveryNumberResponse.data.documentNumber;

    // Get customer details
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, so.customerId))
      .limit(1);

    // Get user details
    const [deliveredByUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Prepare document data
    const documentData = {
      id: so.id,
      tenantId,
      deliveryNumber,
      orderNumber: so.orderNumber,
      orderDate: so.orderDate,
      shipmentNumber: shipment.shipmentNumber,
      trackingNumber: shipment.trackingNumber || '',
      deliveryDate: new Date().toISOString(),
      customerName: customer?.name || '',
      customerEmail: customer?.email || '',
      customerPhone: customer?.phone || '',
      recipientName,
      status: 'complete',
      notes,
      returnPurchaseOrderNumber: null,
      deliveredByName: deliveredByUser?.fullname || null,
      items: pkgItems.map((item: any) => ({
        productName: item.product_name,
        sku: item.sku,
        shippedQuantity: item.quantity,
        acceptedQuantity: item.quantity,
        rejectedQuantity: '0',
        rejectionNotes: null,
      })),
    };

    // Generate and save delivery document
    const docResult = await DeliverDocumentGenerator.save(documentData, userId);

    // Audit log
    await logAudit({
      userId,
      tenantId,
      module: 'sales-order',
      action: 'deliver_complete',
      description: `Confirmed complete delivery ${deliveryNumber} for SO ${so.orderNumber}`,
      resourceType: 'sales_order',
      resourceId: id,
      changedFields: {
        deliveryNumber,
        status: { from: 'shipped', to: 'delivered' },
        workflowState: { from: 'deliver', to: 'complete' },
        recipientName,
      },
      ipAddress: getClientIp(req),
      documentPath: docResult.filePath,
    });

    res.json({
      success: true,
      message: 'Delivery confirmed successfully',
      data: {
        deliveryId: result.deliveryId,
        deliveryNumber,
        documentPath: docResult.filePath,
      },
    });
  } catch (error: any) {
    console.error('Error confirming complete delivery:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

// POST /delivers/:id/partial - Confirm partial delivery with returns
router.post('/delivers/:id/partial', authorized('ADMIN', 'sales-order.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientName, notes, items } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    // Validate input
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items data is required for partial delivery',
      });
    }

    // Validate SO exists and is in correct state
    const [so] = await db
      .select()
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.id, id),
          eq(salesOrders.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!so) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found',
      });
    }

    if (so.status !== 'shipped' || so.workflowState !== 'deliver') {
      return res.status(400).json({
        success: false,
        message: `Cannot deliver: current status is ${so.status}/${so.workflowState}`,
      });
    }

    // Get shipment
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.salesOrderId, id),
          eq(shipments.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found for this sales order',
      });
    }

    // Calculate total rejected quantity
    let totalRejected = 0;
    items.forEach((item: any) => {
      const rejected = parseFloat(item.rejectedQuantity || '0');
      totalRejected += rejected;
    });

    // Start transaction
    const result = await db.transaction(async (tx) => {
      let returnPOId: string | null = null;
      let returnPONumber: string | null = null;

      // If there are rejected items, create return PO
      if (totalRejected > 0) {
        // Get warehouse (default to first warehouse for now)
        const [defaultWarehouse] = await tx.execute(sql`
          SELECT id FROM warehouses WHERE tenant_id = ${tenantId} LIMIT 1
        `);

        if (!defaultWarehouse) {
          throw new Error('No warehouse found for return PO');
        }

        // Generate return PO number format: PO-return-{SO-number}-DDMMYYYY
        const dateStr = new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).replace(/\//g, '');
        
        returnPONumber = `PO-return-${so.orderNumber}-${dateStr}`;

        // Create return purchase order
        const [returnPO] = await tx.insert(purchaseOrders).values({
          tenantId,
          orderNumber: returnPONumber,
          supplierId: null, // Customer returning goods
          isReturn: true,
          deliveryMethod: 'delivery',
          warehouseId: defaultWarehouse.id as string,
          status: 'approved',
          workflowState: 'receive',
          orderDate: new Date().toISOString().split('T')[0],
          notes: `Return from Sales Order ${so.orderNumber} - Partial Delivery ${new Date().toLocaleDateString()}`,
          createdBy: userId,
        }).returning();
        
        returnPOId = returnPO.id;

        // Create return PO items for rejected items
        const rejectedItems = items.filter((item: any) => parseFloat(item.rejectedQuantity) > 0);
        
        for (const item of rejectedItems) {
          // Get original SO item to get unit price
          const [soItem] = await tx
            .select()
            .from(salesOrderItems)
            .where(eq(salesOrderItems.id, item.salesOrderItemId))
            .limit(1);

          await tx.insert(purchaseOrderItems).values({
            id: uuidv4(),
            purchaseOrderId: returnPOId,
            productId: item.productId,
            tenantId,
            orderedQuantity: parseInt(item.rejectedQuantity),
            receivedQuantity: 0,
            unitCost: soItem?.unitPrice || '0',
            totalCost: (parseFloat(soItem?.unitPrice || '0') * parseFloat(item.rejectedQuantity)).toFixed(2),
            notes: item.rejectionNotes || 'Returned from delivery',
          });
        }
      }

      // Get next workflow step
      const nextStepResult = await tx.execute(sql`
        SELECT ws.step_name
        FROM workflow_steps ws
        JOIN workflows w ON w.id = ws.workflow_id
        WHERE w.tenant_id = ${tenantId}
          AND w.type = 'outbound'
          AND w.is_active = true
          AND ws.step_order = (
            SELECT step_order + 1
            FROM workflow_steps
            WHERE workflow_id = w.id
              AND step_name = 'deliver'
          )
        LIMIT 1
      `);

      const nextStep = (nextStepResult[0]?.step_name as string) || 'complete';

      // Create delivery record
      const deliveryId = uuidv4();
      await tx.insert(deliveries).values({
        id: deliveryId,
        tenantId,
        shipmentId: shipment.id,
        salesOrderId: id,
        status: 'partial',
        deliveryDate: new Date(),
        recipientName,
        notes,
        returnPurchaseOrderId: returnPOId,
        deliveredBy: userId,
      });

      // Create delivery_items records
      const deliveryItemsData = items.map((item: any) => ({
        id: uuidv4(),
        deliveryId,
        tenantId,
        salesOrderItemId: item.salesOrderItemId,
        productId: item.productId,
        shippedQuantity: item.shippedQuantity,
        acceptedQuantity: item.acceptedQuantity,
        rejectedQuantity: item.rejectedQuantity,
        rejectionNotes: item.rejectionNotes,
      }));

      await tx.insert(deliveryItems).values(deliveryItemsData);

      // Update shipment status
      await tx
        .update(shipments)
        .set({ status: 'delivered' })
        .where(eq(shipments.id, shipment.id));

      // Update sales order
      await tx
        .update(salesOrders)
        .set({
          status: 'delivered',
          workflowState: nextStep as string,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(salesOrders.id, id));

      return { deliveryId, returnPOId, returnPONumber };
    });

    // Generate DELIVERY document number
    const deliveryNumberResponse = await axios.post(
      'http://localhost:5000/api/modules/document-numbering/generate',
      { documentType: 'DELIVERY', options: {} },
      { headers: { Authorization: req.headers.authorization } }
    );
    const deliveryNumber = deliveryNumberResponse.data.documentNumber;

    // Get customer details
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, so.customerId))
      .limit(1);

    // Get user details
    const [deliveredByUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Prepare document data
    const documentData = {
      id: so.id,
      tenantId,
      deliveryNumber,
      orderNumber: so.orderNumber,
      orderDate: so.orderDate,
      shipmentNumber: shipment.shipmentNumber,
      trackingNumber: shipment.trackingNumber || '',
      deliveryDate: new Date().toISOString(),
      customerName: customer?.name || '',
      customerEmail: customer?.email || '',
      customerPhone: customer?.phone || '',
      recipientName,
      status: 'partial',
      notes,
      returnPurchaseOrderNumber: result.returnPONumber,
      deliveredByName: deliveredByUser?.fullname || null,
      items: items.map((item: any) => ({
        productName: item.productName,
        sku: item.sku,
        shippedQuantity: item.shippedQuantity,
        acceptedQuantity: item.acceptedQuantity,
        rejectedQuantity: item.rejectedQuantity,
        rejectionNotes: item.rejectionNotes,
      })),
    };

    // Generate and save delivery document
    const docResult = await DeliverDocumentGenerator.save(documentData, userId);

    // Audit log
    await logAudit({
      userId,
      tenantId,
      module: 'sales-order',
      action: 'deliver_partial',
      description: `Confirmed partial delivery ${deliveryNumber} for SO ${so.orderNumber}${result.returnPONumber ? ` with return PO ${result.returnPONumber}` : ''}`,
      resourceType: 'sales_order',
      resourceId: id,
      changedFields: {
        deliveryNumber,
        status: { from: 'shipped', to: 'delivered' },
        workflowState: { from: 'deliver', to: 'complete' },
        recipientName,
        returnPONumber: result.returnPONumber,
        totalRejected,
      },
      ipAddress: getClientIp(req),
      documentPath: docResult.filePath,
    });

    res.json({
      success: true,
      message: 'Partial delivery confirmed successfully',
      data: {
        deliveryId: result.deliveryId,
        deliveryNumber,
        returnPONumber: result.returnPONumber,
        documentPath: docResult.filePath,
      },
    });
  } catch (error: any) {
    console.error('Error confirming partial delivery:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
