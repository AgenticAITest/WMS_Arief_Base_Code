import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq, sql, inArray } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  salesOrders, 
  salesOrderItems, 
  packages, 
  packageItems 
} from '../lib/db/schemas/salesOrder';
import { customers, products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { user } from '@server/lib/db/schema/system';
import { workflows, workflowSteps } from '@modules/workflow/server/lib/db/schemas/workflow';
import { logAudit, getClientIp } from '@server/services/auditService';
import axios from 'axios';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('sales-order'));

// GET /packs - Fetch sales orders ready for packing
router.get('/packs', authorized('ADMIN', 'sales-order.pack'), async (req, res) => {
  console.log('Fetching packs from packRoutes');
  try {
    const tenantId = req.user!.activeTenantId;

    // Fetch SOs with status='picked' and workflow_state='pack'
    const packableSOs = await db.execute(sql`
      SELECT 
        so.id,
        so.order_number as "orderNumber",
        so.order_date as "orderDate",
        so.requested_delivery_date as "requestedDeliveryDate",
        so.status,
        so.workflow_state as "workflowState",
        so.total_amount as "totalAmount",
        so.notes,
        so.created_at as "createdAt",
        so.customer_id as "customerId",
        c.name as "customerName",
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
        AND so.status = 'picked'
        AND so.workflow_state = 'pack'
      GROUP BY so.id, so.order_number, so.order_date, so.requested_delivery_date, so.status, 
               so.workflow_state, so.total_amount, so.notes, so.created_at, so.customer_id, c.name
      ORDER BY so.order_date DESC
    `);

    res.json({
      success: true,
      data: packableSOs,
    });
  } catch (error) {
    console.error('Error fetching packable sales orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// GET /packs/:id - Fetch sales order details with items for packing
router.get('/packs/:id', authorized('ADMIN', 'sales-order.pack'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    // Fetch SO details
    const [so] = await db
      .select()
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.id, id),
          eq(salesOrders.tenantId, tenantId),
          eq(salesOrders.status, 'picked'),
          eq(salesOrders.workflowState, 'pack')
        )
      )
      .limit(1);

    if (!so) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found or not ready for packing',
      });
    }

    // Fetch customer details
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, so.customerId))
      .limit(1);

    // Fetch SO items with product details
    const soItems = await db.execute(sql`
      SELECT 
        soi.id,
        soi.product_id as "productId",
        soi.ordered_quantity as "orderedQuantity",
        soi.picked_quantity as "pickedQuantity",
        soi.unit_price as "unitPrice",
        soi.total_price as "totalPrice",
        soi.line_number as "lineNumber",
        p.sku,
        p.name as "productName"
      FROM sales_order_items soi
      JOIN products p ON p.id = soi.product_id
      WHERE soi.sales_order_id = ${id}
      ORDER BY soi.line_number
    `);

    // Fetch existing packages for this SO (if any)
    const existingPackages = await db.execute(sql`
      SELECT 
        pkg.id,
        pkg.package_id as "packageId",
        pkg.package_number as "packageNumber",
        pkg.length,
        pkg.width,
        pkg.height,
        pkg.weight,
        json_agg(
          json_build_object(
            'id', pi.id,
            'salesOrderItemId', pi.sales_order_item_id,
            'productId', pi.product_id,
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
      GROUP BY pkg.id, pkg.package_id, pkg.package_number, pkg.length, pkg.width, pkg.height, pkg.weight
      ORDER BY pkg.package_id
    `);

    res.json({
      success: true,
      data: {
        salesOrder: {
          ...so,
          customerName: customer?.name || 'Unknown Customer',
        },
        items: soItems,
        packages: existingPackages || [],
      },
    });
  } catch (error) {
    console.error('Error fetching sales order for packing:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// GET /packs/:id/packages - Get packages for a specific sales order
router.get('/packs/:id/packages', authorized('ADMIN', 'sales-order.pack'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    // Fetch existing packages with items
    const existingPackages = await db.execute(sql`
      SELECT 
        pkg.id,
        pkg.package_id as "packageId",
        pkg.package_number as "packageNumber",
        pkg.length,
        pkg.width,
        pkg.height,
        pkg.weight,
        COALESCE(
          json_agg(
            CASE 
              WHEN pi.id IS NOT NULL THEN 
                json_build_object(
                  'id', pi.id,
                  'salesOrderItemId', pi.sales_order_item_id,
                  'productId', pi.product_id,
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
      GROUP BY pkg.id, pkg.package_id, pkg.package_number, pkg.length, pkg.width, pkg.height, pkg.weight
      ORDER BY pkg.package_id
    `);

    res.json({
      success: true,
      data: existingPackages || [],
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// POST /packs/:id/packages - Save packages for a sales order
router.post('/packs/:id/packages', authorized('ADMIN', 'sales-order.pack'), async (req, res) => {
  try {
    const { id } = req.params;
    const { packages: packagesData } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    if (!packagesData || !Array.isArray(packagesData)) {
      return res.status(400).json({
        success: false,
        message: 'Packages data is required and must be an array',
      });
    }

    // Verify SO exists and is packable
    const [so] = await db
      .select()
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.id, id),
          eq(salesOrders.tenantId, tenantId),
          eq(salesOrders.status, 'picked'),
          eq(salesOrders.workflowState, 'pack')
        )
      )
      .limit(1);

    if (!so) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found or not ready for packing',
      });
    }

    // Delete existing packages for this SO
    await db.delete(packages).where(
      and(
        eq(packages.salesOrderId, id),
        eq(packages.tenantId, tenantId)
      )
    );

    // Insert new packages with items
    const createdPackages = [];
    for (let i = 0; i < packagesData.length; i++) {
      const pkg = packagesData[i];
      const packageSequence = String(i + 1).padStart(3, '0');
      const packageId = `PKG-${so.orderNumber}-${packageSequence}`;

      const [newPackage] = await db
        .insert(packages)
        .values({
          id: uuidv4(),
          tenantId,
          salesOrderId: id,
          shipmentId: null,
          packageId,
          packageNumber: packageId, // For now, same as packageId
          barcode: null,
          length: pkg.length ? String(pkg.length) : null,
          width: pkg.width ? String(pkg.width) : null,
          height: pkg.height ? String(pkg.height) : null,
          weight: pkg.weight ? String(pkg.weight) : null,
        })
        .returning();

      // Insert package items
      if (pkg.items && Array.isArray(pkg.items)) {
        for (const item of pkg.items) {
          await db.insert(packageItems).values({
            id: uuidv4(),
            tenantId,
            packageId: newPackage.id,
            salesOrderItemId: item.salesOrderItemId,
            productId: item.productId,
            quantity: String(item.quantity),
          });
        }
      }

      createdPackages.push({
        ...newPackage,
        items: pkg.items,
      });
    }

    res.json({
      success: true,
      message: 'Packages saved successfully',
      data: {
        packages: createdPackages,
      },
    });
  } catch (error: any) {
    console.error('Error saving packages:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

// POST /packs/:id/confirm - Confirm packing and generate PACK document
router.post('/packs/:id/confirm', authorized('ADMIN', 'sales-order.pack'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    // Verify SO exists and is packable
    const [so] = await db
      .select()
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.id, id),
          eq(salesOrders.tenantId, tenantId),
          eq(salesOrders.status, 'picked'),
          eq(salesOrders.workflowState, 'pack')
        )
      )
      .limit(1);

    if (!so) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found or not ready for packing',
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
        message: 'No packages found for this sales order. Please create packages first.',
      });
    }

    // Get next workflow step
    const workflowResults = await db
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

    // Find next step after 'pack'
    const currentStepIndex = workflowResults.findIndex(s => s.stepKey === 'pack');
    const nextStep = workflowResults[currentStepIndex + 1]?.stepKey || 'ship';

    // Update SO status to 'packed' and advance workflow state
    await db
      .update(salesOrders)
      .set({
        status: 'packed',
        workflowState: nextStep,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(salesOrders.id, id));

    // Generate PACK document number
    const packDocNumber = await axios.post(
      `${req.protocol}://${req.get('host')}/api/modules/document-numbering/generate`,
      { documentType: 'PACK', options: {} },
      { headers: { Authorization: req.headers.authorization } }
    );

    const packNumber = packDocNumber.data.documentNumber;

    // Fetch additional data for document generation
    const [customerData] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, so.customerId))
      .limit(1);

    const [userData] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Fetch packages with items
    const packagesWithItems = await db.execute(sql`
      SELECT 
        pkg.id,
        pkg.package_id as "packageId",
        pkg.package_number as "packageNumber",
        pkg.length,
        pkg.width,
        pkg.height,
        pkg.weight,
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
      GROUP BY pkg.id, pkg.package_id, pkg.package_number, pkg.length, pkg.width, pkg.height, pkg.weight
      ORDER BY pkg.package_id
    `);

    // Generate PACK document using PackDocumentGenerator
    const { PackDocumentGenerator } = await import('../services/packDocumentGenerator');
    const packDocumentPath = await PackDocumentGenerator.save({
      id: so.id,
      tenantId,
      packNumber,
      orderNumber: so.orderNumber,
      orderDate: so.orderDate,
      customerName: customerData?.name || 'Unknown Customer',
      totalAmount: so.totalAmount,
      packedByName: userData?.fullname || null,
      packages: packagesWithItems as any[],
    }, userId);

    // Log audit trail
    await logAudit({
      tenantId,
      userId,
      module: 'sales-order',
      action: 'pack_sales_order',
      resourceType: 'sales_order',
      resourceId: so.id,
      ipAddress: getClientIp(req),
      documentPath: packDocumentPath,
      description: `Packed sales order ${so.orderNumber} into ${packagesWithItems.length} package(s). Generated pack document ${packNumber}.`,
    });

    res.json({
      success: true,
      message: 'Sales order packed successfully',
      data: {
        salesOrderId: so.id,
        orderNumber: so.orderNumber,
        packNumber,
        documentPath: packDocumentPath,
        nextWorkflowState: nextStep,
      },
    });
  } catch (error: any) {
    console.error('Error confirming pack:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

export default router;
