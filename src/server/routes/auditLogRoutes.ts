import express from 'express';
import { db } from '../lib/db';
import { auditLogs } from '../lib/db/schema';
import { authenticated } from '../middleware/authMiddleware';
import { and, eq, desc, gte, lte, sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
router.use(authenticated());

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Get audit logs with filters
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *         description: Filter by module
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action (create, update, delete, etc.)
 *       - in: query
 *         name: resourceType
 *         schema:
 *           type: string
 *         description: Filter by resource type
 *       - in: query
 *         name: resourceId
 *         schema:
 *           type: string
 *         description: Filter by resource ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs until this date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failure]
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records to return (max 500)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: List of audit logs
 *       401:
 *         description: Unauthorized
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const {
      module,
      action,
      resourceType,
      resourceId,
      userId,
      dateFrom: startDate,
      dateTo: endDate,
      status,
      limit = '50',
      offset = '0',
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 50, 500);
    const offsetNum = parseInt(offset as string) || 0;

    const conditions = [eq(auditLogs.tenantId, tenantId)];

    if (module) {
      conditions.push(eq(auditLogs.module, module as string));
    }
    if (action) {
      conditions.push(eq(auditLogs.action, action as string));
    }
    if (resourceType) {
      conditions.push(eq(auditLogs.resourceType, resourceType as string));
    }
    if (resourceId) {
      conditions.push(eq(auditLogs.resourceId, resourceId as string));
    }
    if (userId) {
      conditions.push(eq(auditLogs.userId, userId as string));
    }
    if (startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(endDate as string)));
    }
    if (status) {
      conditions.push(eq(auditLogs.status, status as string));
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(...conditions));

    res.json({
      success: true,
      data: logs,
      pagination: {
        total: Number(countResult.count),
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
    });
  }
});

/**
 * @swagger
 * /api/audit-logs/resource/{type}/{id}:
 *   get:
 *     summary: Get audit log history for a specific resource
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource type (e.g., purchase_order, warehouse)
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of records to return (max 500)
 *     responses:
 *       200:
 *         description: Resource audit history
 *       401:
 *         description: Unauthorized
 */
router.get('/resource/:type/:id', async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { type, id } = req.params;
    const { limit = '100' } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 100, 500);

    const logs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenantId, tenantId),
          eq(auditLogs.resourceType, type),
          eq(auditLogs.resourceId, id)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limitNum);

    res.json({
      success: true,
      data: logs,
      resourceType: type,
      resourceId: id,
    });
  } catch (error) {
    console.error('Error fetching resource audit history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource audit history',
    });
  }
});

/**
 * @swagger
 * /api/audit-logs/document:
 *   get:
 *     summary: Securely serve generated HTML documents with authentication
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Document path from audit log (e.g., storage/sales-order/documents/...)
 *     responses:
 *       200:
 *         description: HTML document
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - document belongs to different tenant
 *       404:
 *         description: Document not found
 */
router.get('/document', async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { path: documentPath } = req.query;

    if (!documentPath || typeof documentPath !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Document path is required',
      });
    }

    // Security: Verify the document path contains the user's tenant ID
    // This prevents accessing documents from other tenants
    if (!documentPath.includes(`/tenants/${tenantId}/`)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - document belongs to different tenant',
      });
    }

    // Security: Prevent path traversal attacks
    if (documentPath.includes('..') || documentPath.includes('~')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document path',
      });
    }

    // Construct full file path
    const fullPath = path.join(process.cwd(), documentPath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Read and serve the HTML file
    const htmlContent = await fs.readFile(fullPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve document',
    });
  }
});

export default router;
