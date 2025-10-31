import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  salesOrders,
  salesOrderItems,
  salesOrderAllocations,
  salesOrderPicks,
} from '../lib/db/schemas/salesOrder';
import { workflows, workflowSteps } from '../../../workflow/server/lib/db/schemas/workflow';
import { documentNumberConfigs } from '../../../document-numbering/server/lib/db/schemas/documentNumbering';
import { customers } from '../../../master-data/server/lib/db/schemas/masterData';

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
      eq(salesOrders.status, 'created' as any),
    ];

    if (workflowState) {
      whereConditions.push(eq(salesOrders.workflowState, workflowState));
    } else {
      whereConditions.push(ne(salesOrders.workflowState, 'completed'));
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
        expectedDeliveryDate: salesOrders.expectedDeliveryDate,
        totalAmount: salesOrders.totalAmount,
        currency: salesOrders.currency,
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

    const itemsResult = await db.execute(`
      SELECT 
        soi.id,
        soi.line_number as "lineNumber",
        soi.product_id as "productId",
        soi.quantity,
        soi.unit_price as "unitPrice",
        soi.discount_percentage as "discountPercentage",
        soi.tax_percentage as "taxPercentage",
        soi.line_total as "lineTotal",
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
      WHERE soi.sales_order_id = $1
      GROUP BY soi.id, soi.line_number, soi.product_id, soi.quantity, soi.unit_price, 
               soi.discount_percentage, soi.tax_percentage, soi.line_total, soi.notes,
               p.name, p.sku
      ORDER BY soi.line_number
    `, [id]);

    res.json({
      success: true,
      data: {
        ...order,
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching sales order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/sales-orders', authorized('ADMIN', 'sales-order.create'), async (req, res) => {
  const client = await db.$client.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      customerId,
      orderDate,
      expectedDeliveryDate,
      currency = 'USD',
      notes,
      internalNotes,
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
      if (Math.abs(totalLocationQty - Number(item.quantity)) > 0.001) {
        return res.status(400).json({ 
          success: false, 
          message: `Location quantities for ${item.productName} must sum to ${item.quantity}` 
        });
      }
    }

    // Generate SO number using document_number_config
    const soNumberResult = await client.query(`
      WITH config AS (
        SELECT * FROM document_number_configs
        WHERE tenant_id = $1 
        AND document_type = 'SO'
        AND is_active = true
        LIMIT 1
      ),
      updated AS (
        UPDATE document_number_configs
        SET current_sequence = current_sequence + 1,
            updated_at = NOW()
        WHERE id = (SELECT id FROM config)
        RETURNING current_sequence - 1 as sequence_number
      )
      SELECT 
        c.prefix,
        c.period_type,
        c.separator,
        c.sequence_length,
        COALESCE(u.sequence_number, c.current_sequence) as sequence_number
      FROM config c
      LEFT JOIN updated u ON true
    `, [tenantId]);

    if (soNumberResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'No active SO document number configuration found' 
      });
    }

    const config = soNumberResult.rows[0];
    const periodPart = new Date(orderDate).toISOString().slice(2, 7).replace('-', '');
    const sequencePart = String(config.sequence_number).padStart(config.sequence_length, '0');
    const orderNumber = `${config.prefix}${config.separator}${periodPart}${config.separator}${sequencePart}`;

    // Get initial workflow state
    const workflowResult = await client.query(`
      SELECT ws.state_key
      FROM workflows w
      JOIN workflow_steps ws ON ws.workflow_id = w.id
      WHERE w.tenant_id = $1 
      AND w.type = 'SALES_ORDER'
      AND w.is_default = true
      AND w.is_active = true
      AND ws.is_active = true
      ORDER BY ws.step_order ASC
      LIMIT 1
    `, [tenantId]);

    const initialWorkflowState = workflowResult.rows[0]?.state_key || 'created';

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discount = lineTotal * (item.discountPercentage || 0) / 100;
      const afterDiscount = lineTotal - discount;
      const tax = afterDiscount * (item.taxPercentage || 0) / 100;
      return sum + afterDiscount + tax;
    }, 0);

    // Create sales order
    const orderResult = await client.query(`
      INSERT INTO sales_orders (
        tenant_id, order_number, customer_id, order_date, expected_delivery_date,
        currency, total_amount, notes, internal_notes, status, workflow_state,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'created', $10, $11, $11)
      RETURNING *
    `, [
      tenantId, orderNumber, customerId, orderDate, expectedDeliveryDate || null,
      currency, totalAmount, notes || null, internalNotes || null, 
      initialWorkflowState, userId
    ]);

    const createdOrder = orderResult.rows[0];

    // Create sales order items and locations
    const createdItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineTotal = item.quantity * item.unitPrice;
      const discount = lineTotal * (item.discountPercentage || 0) / 100;
      const afterDiscount = lineTotal - discount;
      const tax = afterDiscount * (item.taxPercentage || 0) / 100;
      const finalLineTotal = afterDiscount + tax;

      const itemResult = await client.query(`
        INSERT INTO sales_order_items (
          tenant_id, sales_order_id, line_number, product_id, quantity, 
          unit_price, discount_percentage, tax_percentage, line_total, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        tenantId, createdOrder.id, i + 1, item.productId, item.quantity,
        item.unitPrice, item.discountPercentage || 0, item.taxPercentage || 0,
        finalLineTotal, item.notes || null
      ]);

      const createdItem = itemResult.rows[0];

      // Create item locations
      for (const location of item.locations) {
        await client.query(`
          INSERT INTO sales_order_item_locations (
            tenant_id, sales_order_item_id, customer_location_id, quantity, delivery_notes
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          tenantId, createdItem.id, location.customerLocationId, location.quantity,
          location.deliveryNotes || null
        ]);
      }

      createdItems.push({
        ...createdItem,
        productName: item.productName,
        locations: item.locations,
      });
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        ...createdOrder,
        items: createdItems,
      },
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating sales order:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Order number already exists' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.put('/sales-orders/:id', authorized('ADMIN', 'sales-order.edit'), async (req, res) => {
  const client = await db.$client.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      customerId,
      orderDate,
      expectedDeliveryDate,
      currency,
      notes,
      internalNotes,
      items,
    } = req.body;
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;

    // Check if SO exists and is editable
    const existingResult = await client.query(`
      SELECT status FROM sales_orders
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Sales order not found' });
    }

    if (existingResult.rows[0].status !== 'created') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Only orders with status "created" can be edited' 
      });
    }

    // Validate item locations if items provided
    if (items) {
      for (const item of items) {
        if (!item.locations || item.locations.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            success: false, 
            message: `Item ${item.productName} must have at least one delivery location` 
          });
        }
        
        const totalLocationQty = item.locations.reduce((sum: number, loc: any) => sum + Number(loc.quantity), 0);
        if (Math.abs(totalLocationQty - Number(item.quantity)) > 0.001) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            success: false, 
            message: `Location quantities for ${item.productName} must sum to ${item.quantity}` 
          });
        }
      }

      // Delete existing items and locations
      await client.query(`
        DELETE FROM sales_order_item_locations
        WHERE sales_order_item_id IN (
          SELECT id FROM sales_order_items WHERE sales_order_id = $1
        )
      `, [id]);

      await client.query(`
        DELETE FROM sales_order_items WHERE sales_order_id = $1
      `, [id]);

      // Calculate new total
      const totalAmount = items.reduce((sum: number, item: any) => {
        const lineTotal = item.quantity * item.unitPrice;
        const discount = lineTotal * (item.discountPercentage || 0) / 100;
        const afterDiscount = lineTotal - discount;
        const tax = afterDiscount * (item.taxPercentage || 0) / 100;
        return sum + afterDiscount + tax;
      }, 0);

      // Update SO
      await client.query(`
        UPDATE sales_orders
        SET customer_id = $1, order_date = $2, expected_delivery_date = $3,
            currency = $4, total_amount = $5, notes = $6, internal_notes = $7,
            updated_by = $8, updated_at = NOW()
        WHERE id = $9 AND tenant_id = $10
      `, [
        customerId, orderDate, expectedDeliveryDate || null,
        currency, totalAmount, notes || null, internalNotes || null,
        userId, id, tenantId
      ]);

      // Create new items and locations
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const lineTotal = item.quantity * item.unitPrice;
        const discount = lineTotal * (item.discountPercentage || 0) / 100;
        const afterDiscount = lineTotal - discount;
        const tax = afterDiscount * (item.taxPercentage || 0) / 100;
        const finalLineTotal = afterDiscount + tax;

        const itemResult = await client.query(`
          INSERT INTO sales_order_items (
            tenant_id, sales_order_id, line_number, product_id, quantity, 
            unit_price, discount_percentage, tax_percentage, line_total, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [
          tenantId, id, i + 1, item.productId, item.quantity,
          item.unitPrice, item.discountPercentage || 0, item.taxPercentage || 0,
          finalLineTotal, item.notes || null
        ]);

        const itemId = itemResult.rows[0].id;

        for (const location of item.locations) {
          await client.query(`
            INSERT INTO sales_order_item_locations (
              tenant_id, sales_order_item_id, customer_location_id, quantity, delivery_notes
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            tenantId, itemId, location.customerLocationId, location.quantity,
            location.deliveryNotes || null
          ]);
        }
      }
    } else {
      // Simple update without items
      await client.query(`
        UPDATE sales_orders
        SET customer_id = COALESCE($1, customer_id), 
            order_date = COALESCE($2, order_date),
            expected_delivery_date = $3,
            currency = COALESCE($4, currency),
            notes = $5,
            internal_notes = $6,
            updated_by = $7,
            updated_at = NOW()
        WHERE id = $8 AND tenant_id = $9
      `, [
        customerId, orderDate, expectedDeliveryDate,
        currency, notes, internalNotes,
        userId, id, tenantId
      ]);
    }

    await client.query('COMMIT');

    // Fetch updated SO
    const updatedResult = await client.query(`
      SELECT * FROM sales_orders WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      data: updatedResult.rows[0],
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating sales order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
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
