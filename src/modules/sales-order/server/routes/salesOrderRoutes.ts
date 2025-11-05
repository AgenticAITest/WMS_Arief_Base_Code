import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  salesOrders,
  salesOrderItems,
  salesOrderAllocations,
  salesOrderPicks,
} from '../lib/db/schemas/salesOrder';
import { inventoryItems } from '../../../inventory-items/server/lib/db/schemas/inventoryItems';
import { workflows, workflowSteps } from '../../../workflow/server/lib/db/schemas/workflow';
import { documentNumberConfig } from '../../../document-numbering/server/lib/db/schemas/documentNumbering';
import { customers, customerLocations } from '../../../master-data/server/lib/db/schemas/masterData';
import { products } from '../../../master-data/server/lib/db/schemas/masterData';
import { user } from '@server/lib/db/schema/system';
import axios from 'axios';
import { SODocumentGenerator } from '../services/soDocumentGenerator';
import { AllocationDocumentGenerator } from '../services/allocationDocumentGenerator';
import { logAudit, getClientIp } from '@server/services/auditService';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('sales-order'));

router.get('/sales-orders', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const workflowState = req.query.workflowState as string;
    const tenantId = req.user!.activeTenantId;

    const whereConditions = [
      eq(salesOrders.tenantId, tenantId),
      eq(salesOrders.status, 'created'),
    ];

    if (workflowState) {
      whereConditions.push(eq(salesOrders.workflowState, workflowState));
    } else {
      whereConditions.push(ne(salesOrders.workflowState, 'complete'));
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(salesOrders.orderNumber, `%${search}%`),
          ilike(salesOrders.notes, `%${search}%`)
        )!
      );
    }

    const results = await db
      .select({
        id: salesOrders.id,
        orderNumber: salesOrders.orderNumber,
        orderDate: salesOrders.orderDate,
        requestedDeliveryDate: salesOrders.requestedDeliveryDate,
        totalAmount: salesOrders.totalAmount,
        notes: salesOrders.notes,
        workflowState: salesOrders.workflowState,
        status: salesOrders.status,
        createdAt: salesOrders.createdAt,
        customerName: customers.name,
        customerId: salesOrders.customerId,
      })
      .from(salesOrders)
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(and(...whereConditions))
      .orderBy(desc(salesOrders.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(salesOrders)
      .where(and(...whereConditions));

    const total = Number(totalResult.count) || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: results,
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
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/sales-orders/:id', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const [order] = await db
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .limit(1);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Sales order not found' });
    }

    const itemsResult = await db.execute(sql`
      SELECT 
        soi.id,
        soi.line_number as "lineNumber",
        soi.product_id as "productId",
        soi.ordered_quantity as "orderedQuantity",
        soi.allocated_quantity as "allocatedQuantity",
        soi.picked_quantity as "pickedQuantity",
        soi.unit_price as "unitPrice",
        soi.total_price as "totalPrice",
        soi.notes,
        p.name as "productName",
        p.sku,
        COALESCE(
          json_agg(
            json_build_object(
              'id', soil.id,
              'customerLocationId', soil.customer_location_id,
              'quantity', soil.quantity,
              'deliveryNotes', soil.delivery_notes
            )
            ORDER BY soil.created_at
          ) FILTER (WHERE soil.id IS NOT NULL),
          '[]'
        ) as locations
      FROM sales_order_items soi
      LEFT JOIN products p ON p.id = soi.product_id
      LEFT JOIN sales_order_item_locations soil ON soil.sales_order_item_id = soi.id
      WHERE soi.sales_order_id = ${id}
      GROUP BY soi.id, soi.line_number, soi.product_id, soi.ordered_quantity, soi.allocated_quantity,
               soi.picked_quantity, soi.unit_price, soi.total_price, soi.notes,
               p.name, p.sku
      ORDER BY soi.line_number
    `);

    res.json({
      success: true,
      data: {
        ...order,
        items: itemsResult,
      },
    });
  } catch (error) {
    console.error('Error fetching sales order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/sales-orders/:id/html', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    // Fetch sales order to verify access and get order number
    const [so] = await db
      .select({
        id: salesOrders.id,
        orderNumber: salesOrders.orderNumber,
        tenantId: salesOrders.tenantId,
      })
      .from(salesOrders)
      .where(and(
        eq(salesOrders.id, id),
        eq(salesOrders.tenantId, tenantId)
      ));

    if (!so) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found',
      });
    }

    // Fetch the generated document metadata
    const { generatedDocuments } = await import('../../../document-numbering/server/lib/db/schemas/documentNumbering');
    const [document] = await db
      .select()
      .from(generatedDocuments)
      .where(and(
        eq(generatedDocuments.referenceType, 'sales_order'),
        eq(generatedDocuments.referenceId, id),
        eq(generatedDocuments.tenantId, tenantId)
      ))
      .orderBy(desc(generatedDocuments.createdAt))
      .limit(1);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'HTML document not found for this sales order',
      });
    }

    // Read HTML file from storage
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const htmlFilePath = path.join(process.cwd(), (document.files as any).html.path);
    
    try {
      const htmlContent = await fs.readFile(htmlFilePath, 'utf-8');
      
      res.json({
        success: true,
        html: htmlContent,
        documentInfo: {
          version: document.version,
          generatedAt: document.createdAt,
        },
      });
    } catch (fileError) {
      console.error('Error reading HTML file:', fileError);
      return res.status(404).json({
        success: false,
        message: 'HTML file not found on disk',
      });
    }
  } catch (error) {
    console.error('Error fetching HTML preview:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

router.post('/sales-orders', authorized('ADMIN', 'sales-order.create'), async (req, res) => {
  try {
    const {
      customerId,
      shippingLocationId,
      shippingMethodId,
      orderDate,
      requestedDeliveryDate,
      trackingNumber,
      deliveryInstructions,
      notes,
      items = [],
    } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    if (!customerId || !orderDate) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    // Validate item locations
    for (const item of items) {
      if (!item.locations || item.locations.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Item ${item.productName} must have at least one delivery location` 
        });
      }
      
      const totalLocationQty = item.locations.reduce((sum: number, loc: any) => sum + Number(loc.quantity), 0);
      if (Math.abs(totalLocationQty - Number(item.orderedQuantity)) > 0.001) {
        return res.status(400).json({ 
          success: false, 
          message: `Location quantities for ${item.productName} must sum to ${item.orderedQuantity}` 
        });
      }
    }

    // Generate SO number using document numbering API
    const docNumberResponse = await axios.post(
      `${req.protocol}://${req.get('host')}/api/modules/document-numbering/generate`,
      { documentType: 'SO', options: {} },
      { headers: { Authorization: req.headers.authorization } }
    );
    const orderNumber = docNumberResponse.data.documentNumber;
    const documentHistoryId = docNumberResponse.data.historyId;

    // Get initial workflow state - should be the step AFTER 'create'
    // Since SO is created with status='created', workflow_state should be the next step (allocate)
    const workflowResults = await db
      .select({ stepKey: workflowSteps.stepKey })
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
      .orderBy(workflowSteps.stepOrder)
      .limit(2); // Get first 2 steps

    // Use the second step (after 'create') as initial workflow state
    const initialWorkflowState = workflowResults[1]?.stepKey || workflowResults[0]?.stepKey || 'allocate';

    // Calculate total amount (simple: quantity * unitPrice)
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.orderedQuantity * item.unitPrice);
    }, 0);

    // Use transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Create sales order
      const [newOrder] = await tx
        .insert(salesOrders)
        .values({
          tenantId,
          orderNumber,
          customerId,
          shippingLocationId: shippingLocationId || null,
          shippingMethodId: shippingMethodId || null,
          orderDate,
          requestedDeliveryDate: requestedDeliveryDate || null,
          trackingNumber: trackingNumber || null,
          deliveryInstructions: deliveryInstructions || null,
          totalAmount: totalAmount.toFixed(2),
          notes: notes || null,
          status: 'created',
          workflowState: initialWorkflowState,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      // Update document history with actual document ID
      try {
        await axios.put(
          `${req.protocol}://${req.get('host')}/api/modules/document-numbering/history/${documentHistoryId}`,
          { documentId: newOrder.id },
          { headers: { Authorization: req.headers.authorization } }
        );
      } catch (error) {
        console.error('Error updating document history:', error);
        throw new Error('Failed to update document history');
      }

      // Create items and their locations
      const createdItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const totalPrice = item.orderedQuantity * item.unitPrice;

        const [createdItem] = await tx
          .insert(salesOrderItems)
          .values({
            tenantId,
            salesOrderId: newOrder.id,
            lineNumber: i + 1,
            productId: item.productId,
            orderedQuantity: item.orderedQuantity,
            unitPrice: item.unitPrice,
            totalPrice: totalPrice.toFixed(2),
            notes: item.notes || null,
          })
          .returning();

        // Create item locations using raw SQL (table created via native SQL)
        for (const location of item.locations) {
          await tx.execute(sql`
            INSERT INTO sales_order_item_locations (
              tenant_id, sales_order_item_id, customer_location_id, quantity, delivery_notes
            ) VALUES (
              ${tenantId}, ${createdItem.id}, ${location.customerLocationId}, 
              ${location.quantity}, ${location.deliveryNotes || null}
            )
          `);
        }

        createdItems.push({
          ...createdItem,
          productName: item.productName,
          locations: item.locations,
        });
      }

      return { order: newOrder, items: createdItems };
    });

    // Fetch additional data for document generation
    const [customerData] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    const [userData] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Fetch product details for items
    const productIds = items.map((item: any) => item.productId);
    const productDetails = await db
      .select()
      .from(products)
      .where(and(
        eq(products.tenantId, tenantId),
        inArray(products.id, productIds)
      ));

    const productMap = new Map(productDetails.map(p => [p.id, p]));

    // Fetch customer locations for items
    const locationIds = items.flatMap((item: any) => 
      item.locations.map((loc: any) => loc.customerLocationId)
    );
    const locationDetails = await db
      .select()
      .from(customerLocations)
      .where(and(
        eq(customerLocations.tenantId, tenantId),
        inArray(customerLocations.id, locationIds)
      ));

    const locationMap = new Map(locationDetails.map(l => [l.id, l]));

    // Build item data with locations for document
    const itemsWithLocations = result.items.map((item: any) => {
      const product = productMap.get(item.productId);
      const itemLocations = item.locations.map((loc: any) => {
        const locationData = locationMap.get(loc.customerLocationId);
        const locationAddress = [
          locationData?.address,
          locationData?.city,
          locationData?.state,
          locationData?.postalCode,
          locationData?.country
        ].filter(Boolean).join(', ') || 'N/A';

        return {
          locationAddress,
          quantity: loc.quantity
        };
      });

      return {
        productSku: product?.sku || 'N/A',
        productName: product?.name || 'Unknown Product',
        orderedQuantity: item.orderedQuantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        locations: itemLocations
      };
    });

    // Generate and save HTML document
    let documentPath = null;
    try {
      // Validate that we have all required data for document generation
      if (!customerData) {
        throw new Error('Customer data not found for document generation');
      }
      
      if (itemsWithLocations.some(item => item.locations.length === 0)) {
        throw new Error('All items must have at least one delivery location');
      }

      const soDocumentData = {
        id: result.order.id,
        tenantId,
        orderNumber: result.order.orderNumber,
        orderDate: result.order.orderDate,
        requestedDeliveryDate: result.order.requestedDeliveryDate,
        totalAmount: result.order.totalAmount,
        notes: result.order.notes,
        deliveryInstructions: result.order.deliveryInstructions,
        customerName: customerData.name || 'N/A',
        customerEmail: customerData.email || null,
        customerPhone: customerData.phone || null,
        createdByName: userData?.fullname || null,
        status: result.order.status,
        items: itemsWithLocations
      };

      const docResult = await SODocumentGenerator.generateAndSave(soDocumentData, userId);
      documentPath = docResult.filePath;
    } catch (docError) {
      console.error('Error generating SO document:', docError);
      // Log detailed error for debugging
      console.error('Document generation failed with data:', {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        itemCount: result.items.length,
        hasCustomerData: !!customerData,
        error: docError instanceof Error ? docError.message : 'Unknown error'
      });
      // Don't fail the entire request if document generation fails, but warn
      documentPath = null;
    }

    // Log audit trail
    try {
      await logAudit({
        tenantId,
        userId,
        module: 'sales-order',
        action: 'create',
        resourceType: 'sales_order',
        resourceId: result.order.id,
        description: `Created sales order ${result.order.orderNumber} for customer ${customerData?.name || 'N/A'} with ${result.items.length} item(s). Document generated.`,
        changedFields: {
          orderNumber: result.order.orderNumber,
          customerId: result.order.customerId,
          customerName: customerData?.name || 'N/A',
          totalAmount: result.order.totalAmount,
          status: result.order.status,
          workflowState: result.order.workflowState,
          itemCount: result.items.length,
        },
        documentPath: documentPath || undefined,
        ipAddress: getClientIp(req),
      });
    } catch (auditError) {
      console.error('Error logging audit:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.status(201).json({
      success: true,
      data: {
        ...result.order,
        items: result.items,
        documentPath,
      },
    });
  } catch (error: any) {
    console.error('Error creating sales order:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Order number already exists' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/allocations', authorized('ADMIN', 'sales-order.allocate'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;

    const results = await db
      .select({
        id: salesOrders.id,
        orderNumber: salesOrders.orderNumber,
        orderDate: salesOrders.orderDate,
        requestedDeliveryDate: salesOrders.requestedDeliveryDate,
        totalAmount: salesOrders.totalAmount,
        notes: salesOrders.notes,
        status: salesOrders.status,
        workflowState: salesOrders.workflowState,
        createdAt: salesOrders.createdAt,
        customerId: salesOrders.customerId,
        customerName: customers.name,
      })
      .from(salesOrders)
      .leftJoin(customers, eq(salesOrders.customerId, customers.id))
      .where(
        and(
          eq(salesOrders.tenantId, tenantId),
          eq(salesOrders.status, 'created'),
          eq(salesOrders.workflowState, 'allocate')
        )
      )
      .orderBy(desc(salesOrders.createdAt));

    // For each SO, fetch items
    const ordersWithItems = await Promise.all(
      results.map(async (order) => {
        const itemsResult = await db.execute(sql`
          SELECT 
            soi.id,
            soi.line_number as "lineNumber",
            soi.product_id as "productId",
            soi.ordered_quantity as "orderedQuantity",
            soi.allocated_quantity as "allocatedQuantity",
            soi.unit_price as "unitPrice",
            soi.total_price as "totalPrice",
            p.name as "productName",
            p.sku
          FROM sales_order_items soi
          LEFT JOIN products p ON p.id = soi.product_id
          WHERE soi.sales_order_id = ${order.id}
          ORDER BY soi.line_number
        `);

        return {
          ...order,
          items: itemsResult || [],
        };
      })
    );

    res.json({
      success: true,
      data: ordersWithItems,
    });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/allocations/:id/confirm', authorized('ADMIN', 'sales-order.allocate'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    // Verify SO exists and is allocatable
    const [so] = await db
      .select()
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.id, id),
          eq(salesOrders.tenantId, tenantId),
          eq(salesOrders.status, 'created'),
          eq(salesOrders.workflowState, 'allocate')
        )
      )
      .limit(1);

    if (!so) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found or not ready for allocation',
      });
    }

    // Fetch SO items
    const soItems = await db
      .select()
      .from(salesOrderItems)
      .where(eq(salesOrderItems.salesOrderId, id))
      .orderBy(salesOrderItems.lineNumber);

    if (soItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items found for this sales order',
      });
    }

    // Allocate in transaction
    const result = await db.transaction(async (tx) => {
      const allocationRecords = [];

      for (const item of soItems) {
        const orderedQty = Number(item.orderedQuantity);
        let remainingQty = orderedQty;

        // Check if product has expiry date capability
        const productQuery = await tx
          .select({ id: products.id })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (productQuery.length === 0) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        // Find available inventory using FIFO/FEFO logic
        // FEFO: Items with expiry dates sorted by earliest expiry first
        // FIFO: Items without expiry sorted by received date (oldest first)
        const availableInventory = await tx.execute(sql`
          SELECT 
            id,
            available_quantity as "availableQuantity",
            reserved_quantity as "reservedQuantity",
            expiry_date as "expiryDate",
            batch_number as "batchNumber",
            lot_number as "lotNumber",
            received_date as "receivedDate",
            cost_per_unit as "costPerUnit"
          FROM inventory_items
          WHERE tenant_id = ${tenantId}
            AND product_id = ${item.productId}
            AND available_quantity > 0
          ORDER BY 
            expiry_date ASC NULLS LAST,
            received_date ASC NULLS LAST,
            created_at ASC
        `);

        if (availableInventory.length === 0) {
          throw new Error(`No available inventory for product: ${item.productId}`);
        }

        // Allocate from inventory items
        for (const invItem of availableInventory as any[]) {
          if (remainingQty <= 0) break;

          const availableQty = Number(invItem.availableQuantity);
          const allocateQty = Math.min(remainingQty, availableQty);

          // Create allocation record
          const [allocation] = await tx
            .insert(salesOrderAllocations)
            .values({
              tenantId,
              salesOrderItemId: item.id,
              inventoryItemId: invItem.id,
              allocatedQuantity: allocateQty.toString(),
              allocatedBy: userId,
            })
            .returning();

          allocationRecords.push({
            ...allocation,
            batchNumber: invItem.batchNumber,
            lotNumber: invItem.lotNumber,
            expiryDate: invItem.expiryDate,
          });

          // Update inventory quantities
          await tx
            .update(inventoryItems)
            .set({
              availableQuantity: sql`${inventoryItems.availableQuantity} - ${allocateQty}`,
              reservedQuantity: sql`${inventoryItems.reservedQuantity} + ${allocateQty}`,
            })
            .where(eq(inventoryItems.id, invItem.id));

          remainingQty -= allocateQty;
        }

        if (remainingQty > 0) {
          throw new Error(
            `Insufficient inventory for item ${item.lineNumber}. Needed ${orderedQty}, allocated ${orderedQty - remainingQty}`
          );
        }

        // Update SO item allocated quantity
        await tx
          .update(salesOrderItems)
          .set({
            allocatedQuantity: orderedQty.toString(),
          })
          .where(eq(salesOrderItems.id, item.id));
      }

      // Get next workflow step
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

      // Find next step after 'allocate'
      const currentStepIndex = workflowResults.findIndex(s => s.stepKey === 'allocate');
      const nextStep = workflowResults[currentStepIndex + 1]?.stepKey || 'pick';

      // Update SO status
      await tx
        .update(salesOrders)
        .set({
          status: 'allocated',
          workflowState: nextStep,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(salesOrders.id, id));

      return { allocationRecords, nextWorkflowState: nextStep };
    });

    // Generate allocation document number
    const allocationDocNumber = await axios.post(
      `${req.protocol}://${req.get('host')}/api/modules/document-numbering/generate`,
      { documentType: 'ALLOCATION', options: {} },
      { headers: { Authorization: req.headers.authorization } }
    );

    const allocationNumber = allocationDocNumber.data.documentNumber;

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

    // Fetch product and bin details for allocations
    const productIds = soItems.map(item => item.productId);
    const productDetails = await db
      .select()
      .from(products)
      .where(and(
        eq(products.tenantId, tenantId),
        inArray(products.id, productIds)
      ));
    const productMap = new Map(productDetails.map(p => [p.id, p]));

    // Fetch bin location paths for allocated items
    const inventoryItemIds = result.allocationRecords.map((rec: any) => rec.inventoryItemId);
    const binLocations = await db.execute(sql`
      SELECT 
        ii.id as inventory_item_id,
        w.name || ' > ' || z.name || ' > ' || a.name || ' > ' || s.name || ' > ' || b.name as location_path
      FROM inventory_items ii
      JOIN bins b ON b.id = ii.bin_id
      JOIN shelves s ON s.id = b.shelf_id
      JOIN aisles a ON a.id = s.aisle_id
      JOIN zones z ON z.id = a.zone_id
      JOIN warehouses w ON w.id = z.warehouse_id
      WHERE ii.id = ANY(${inventoryItemIds})
    `);
    const binLocationMap = new Map((binLocations as any[]).map(bl => [bl.inventory_item_id, bl.location_path]));

    // Build item data with allocations for document
    const itemsForDocument = soItems.map(item => {
      const product = productMap.get(item.productId);
      const itemAllocations = result.allocationRecords.filter((rec: any) => rec.salesOrderItemId === item.id);
      
      return {
        productSku: product?.sku || 'N/A',
        productName: product?.name || 'Unknown Product',
        orderedQuantity: Number(item.orderedQuantity),
        allocatedQuantity: Number(item.orderedQuantity),
        allocations: itemAllocations.map((alloc: any) => ({
          binLocation: binLocationMap.get(alloc.inventoryItemId) || 'Unknown Location',
          quantity: Number(alloc.allocatedQuantity),
          batchNumber: alloc.batchNumber,
          lotNumber: alloc.lotNumber,
          expiryDate: alloc.expiryDate,
        })),
      };
    });

    // Generate and save HTML allocation document
    let documentPath = null;
    try {
      const allocationDocData = {
        id: so.id,
        tenantId,
        allocationNumber,
        orderNumber: so.orderNumber,
        orderDate: so.orderDate,
        customerName: customerData?.name || 'N/A',
        totalAmount: so.totalAmount,
        allocatedByName: userData?.fullname || null,
        items: itemsForDocument,
      };

      const docResult = await AllocationDocumentGenerator.generateAndSave(allocationDocData, userId);
      documentPath = docResult.filePath;
    } catch (docError) {
      console.error('Error generating allocation document:', docError);
      documentPath = null;
    }

    // Log audit
    await logAudit({
      tenantId,
      userId,
      module: 'sales-order',
      action: 'allocate',
      resourceType: 'sales_order',
      resourceId: id,
      description: `Allocated inventory for sales order ${so.orderNumber}. Generated allocation ${allocationNumber}.`,
      changedFields: {
        orderNumber: so.orderNumber,
        status: 'allocated',
        workflowState: result.nextWorkflowState,
        allocationNumber,
        allocatedItems: result.allocationRecords.length,
      },
      documentPath: documentPath || undefined,
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      data: {
        allocationNumber,
        documentPath,
        allocations: result.allocationRecords,
      },
    });
  } catch (error: any) {
    console.error('Error confirming allocation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

router.put('/sales-orders/:id', authorized('ADMIN', 'sales-order.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerId,
      shippingLocationId,
      shippingMethodId,
      orderDate,
      requestedDeliveryDate,
      trackingNumber,
      deliveryInstructions,
      notes,
      items,
    } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    // Check if SO exists and is editable
    const [existing] = await db
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sales order not found' });
    }

    if (existing.status !== 'created') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only orders with status "created" can be edited' 
      });
    }

    // Validate item locations if items provided
    if (items) {
      for (const item of items) {
        if (!item.locations || item.locations.length === 0) {
          return res.status(400).json({ 
            success: false, 
            message: `Item ${item.productName} must have at least one delivery location` 
          });
        }
        
        const totalLocationQty = item.locations.reduce((sum: number, loc: any) => sum + Number(loc.quantity), 0);
        if (Math.abs(totalLocationQty - Number(item.orderedQuantity)) > 0.001) {
          return res.status(400).json({ 
            success: false, 
            message: `Location quantities for ${item.productName} must sum to ${item.orderedQuantity}` 
          });
        }
      }
    }

    // Use transaction for updates
    await db.transaction(async (tx) => {
      if (items) {
        // Calculate new total
        const totalAmount = items.reduce((sum: number, item: any) => {
          return sum + (item.orderedQuantity * item.unitPrice);
        }, 0);

        // Delete existing locations and items
        await tx.execute(sql`
          DELETE FROM sales_order_item_locations
          WHERE sales_order_item_id IN (
            SELECT id FROM sales_order_items WHERE sales_order_id = ${id}
          )
        `);

        await tx
          .delete(salesOrderItems)
          .where(eq(salesOrderItems.salesOrderId, id));

        // Update SO
        await tx
          .update(salesOrders)
          .set({
            customerId,
            shippingLocationId: shippingLocationId || null,
            shippingMethodId: shippingMethodId || null,
            orderDate,
            requestedDeliveryDate: requestedDeliveryDate || null,
            trackingNumber: trackingNumber || null,
            deliveryInstructions: deliveryInstructions || null,
            totalAmount: totalAmount.toFixed(2),
            notes: notes || null,
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(eq(salesOrders.id, id));

        // Create new items and locations
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const totalPrice = item.orderedQuantity * item.unitPrice;

          const [createdItem] = await tx
            .insert(salesOrderItems)
            .values({
              tenantId,
              salesOrderId: id,
              lineNumber: i + 1,
              productId: item.productId,
              orderedQuantity: item.orderedQuantity,
              unitPrice: item.unitPrice,
              totalPrice: totalPrice.toFixed(2),
              notes: item.notes || null,
            })
            .returning();

          for (const location of item.locations) {
            await tx.execute(sql`
              INSERT INTO sales_order_item_locations (
                tenant_id, sales_order_item_id, customer_location_id, quantity, delivery_notes
              ) VALUES (
                ${tenantId}, ${createdItem.id}, ${location.customerLocationId}, 
                ${location.quantity}, ${location.deliveryNotes || null}
              )
            `);
          }
        }
      } else {
        // Simple update without items
        await tx
          .update(salesOrders)
          .set({
            customerId: customerId || existing.customerId,
            shippingLocationId: shippingLocationId !== undefined ? shippingLocationId : existing.shippingLocationId,
            shippingMethodId: shippingMethodId !== undefined ? shippingMethodId : existing.shippingMethodId,
            orderDate: orderDate || existing.orderDate,
            requestedDeliveryDate: requestedDeliveryDate !== undefined ? requestedDeliveryDate : existing.requestedDeliveryDate,
            trackingNumber: trackingNumber !== undefined ? trackingNumber : existing.trackingNumber,
            deliveryInstructions: deliveryInstructions !== undefined ? deliveryInstructions : existing.deliveryInstructions,
            notes: notes !== undefined ? notes : existing.notes,
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(eq(salesOrders.id, id));
      }
    });

    // Fetch updated SO
    const [updated] = await db
      .select()
      .from(salesOrders)
      .where(eq(salesOrders.id, id))
      .limit(1);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating sales order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.delete('/sales-orders/:id', authorized('ADMIN', 'sales-order.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    // Check if SO exists and can be deleted
    const [existing] = await db
      .select()
      .from(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sales order not found' });
    }

    if (existing.status !== 'created') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only orders with status "created" can be deleted' 
      });
    }

    await db
      .delete(salesOrders)
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)));

    res.json({ success: true, message: 'Sales order deleted successfully' });
  } catch (error) {
    console.error('Error deleting sales order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/products-with-stock', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const tenantId = req.user!.activeTenantId;

    const searchCondition = search
      ? or(
          ilike(products.sku, `%${search}%`),
          ilike(products.name, `%${search}%`)
        )
      : undefined;

    const whereConditions = [eq(products.tenantId, tenantId)];
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const result = await db.execute(sql`
      SELECT 
        p.id as "productId",
        p.sku,
        p.name,
        p.minimum_stock_level as "minimumStockLevel",
        COALESCE(SUM(ii.available_quantity), 0) as "availableStock"
      FROM products p
      LEFT JOIN inventory_items ii ON ii.product_id = p.id AND ii.tenant_id = p.tenant_id
      WHERE p.tenant_id = ${tenantId}
        ${search ? sql`AND (p.sku ILIKE ${'%' + search + '%'} OR p.name ILIKE ${'%' + search + '%'})` : sql``}
      GROUP BY p.id, p.sku, p.name, p.minimum_stock_level
      HAVING COALESCE(SUM(ii.available_quantity), 0) > 0
      ORDER BY p.name
      LIMIT ${limit} OFFSET ${offset}
    `);

    const [totalResult] = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM (
        SELECT p.id
        FROM products p
        LEFT JOIN inventory_items ii ON ii.product_id = p.id AND ii.tenant_id = p.tenant_id
        WHERE p.tenant_id = ${tenantId}
          ${search ? sql`AND (p.sku ILIKE ${'%' + search + '%'} OR p.name ILIKE ${'%' + search + '%'})` : sql``}
        GROUP BY p.id
        HAVING COALESCE(SUM(ii.available_quantity), 0) > 0
      ) as filtered_products
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
    console.error('Error fetching products with stock:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/workflow-steps', authorized('ADMIN', 'sales-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;

    const workflowResults = await db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.tenantId, tenantId),
          eq(workflows.type, 'SALES_ORDER'),
          eq(workflows.isDefault, true),
          eq(workflows.isActive, true)
        )
      )
      .limit(1);

    if (workflowResults.length === 0) {
      return res.status(404).json({ error: 'No active Sales Order workflow found' });
    }

    const workflow = workflowResults[0];

    const steps = await db
      .select()
      .from(workflowSteps)
      .where(
        and(
          eq(workflowSteps.workflowId, workflow.id),
          eq(workflowSteps.isActive, true)
        )
      )
      .orderBy(workflowSteps.stepOrder);

    res.json({
      workflow,
      steps,
    });
  } catch (error) {
    console.error('Error fetching workflow steps:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
