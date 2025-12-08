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
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs until this date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failure, error]
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description and resource ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (starting from 1)
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Records per page (max 500)
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
      dateFrom,
      dateTo,
      status,
      search,
      page = '1',
      perPage = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const perPageNum = Math.min(Math.max(1, parseInt(perPage as string) || 20), 500);
    const offset = (pageNum - 1) * perPageNum;

    const conditions = [eq(auditLogs.tenantId, tenantId)];

    if (module && module !== 'all') {
      conditions.push(eq(auditLogs.module, module as string));
    }
    if (action && action !== 'all') {
      conditions.push(eq(auditLogs.action, action as string));
    }
    if (resourceType && resourceType !== 'all') {
      conditions.push(eq(auditLogs.resourceType, resourceType as string));
    }
    if (resourceId) {
      conditions.push(eq(auditLogs.resourceId, resourceId as string));
    }
    if (userId) {
      conditions.push(eq(auditLogs.userId, userId as string));
    }
    if (dateFrom) {
      conditions.push(gte(auditLogs.createdAt, new Date(dateFrom as string)));
    }
    if (dateTo) {
      const toDate = new Date(dateTo as string);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLogs.createdAt, toDate));
    }
    if (status && status !== 'all') {
      conditions.push(eq(auditLogs.status, status as string));
    }
    if (search) {
      conditions.push(
        sql`(${auditLogs.description} ILIKE ${`%${search}%`} OR ${auditLogs.resourceId} ILIKE ${`%${search}%`})`
      );
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(perPageNum)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(...conditions));

    const totalRecords = Number(countResult.count);
    const totalPages = Math.ceil(totalRecords / perPageNum);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total: totalRecords,
        totalPages,
        page: pageNum,
        perPage: perPageNum,
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
