import { Router } from 'express';
import crypto from 'crypto';
import { and, asc, count, desc, eq, ilike, sql } from 'drizzle-orm';
import { 
  apikeyInputSchema,
  apiKeyEditInputSchema,
  apiKeyQuerySchema 
} from '../schemas/apiKeySchema';
import { apiKey, partner } from '@server/lib/db/schema';
import { authorized } from '@server/middleware/authMiddleware';
import { db } from '@server/lib/db';
import { validateData } from '@server/middleware/validationMiddleware';

const router = Router();


/**
 * @swagger
 * /api/modules/integration/api-keys:
 *   get:
 *     tags:
 *       - Integration - API Keys
 *     summary: Get all integration inbound API keys
 *     description: Retrieve a paginated list of integration inbound API keys with filtering and sorting
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [apiKey, status, createdAt, updatedAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: Filter by API key
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of integration inbound API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IntegrationInbound'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/api-keys", authorized('ADMIN', 'integration.apiKey.view'), async (req, res) => {
  try {
    const queryParams = apiKeyQuerySchema.parse(req.query);
    const { page, perPage, sort, order, filter, status } = queryParams;
    const offset = (page - 1) * perPage;
    const orderDirection = order === 'desc' ? desc : asc;

    // Build where conditions with tenant isolation
    const whereConditions = [
      // Multitenancy: only show keys for partners in current tenant
      sql`${apiKey.partnerId} IN (SELECT id FROM int_partner WHERE tenant_id = ${req.user!.activeTenantId})`
    ];

    if (filter) {
      whereConditions.push(ilike(apiKey.apiKey, `%${filter}%`));
    }

    if (status) {
      whereConditions.push(eq(apiKey.status, status));
    }

    // Get integration inbound keys with partner details
    const keys = await db
      .select({
        id: apiKey.id,
        partnerId: apiKey.partnerId,
        apiKey: apiKey.apiKey,
        description: apiKey.description,
        status: apiKey.status,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
        partnerName: partner.name,
        partnerCode: partner.code,
      })
      .from(apiKey)
      .leftJoin(partner, eq(apiKey.partnerId, partner.id))
      .where(and(...whereConditions))
      .limit(perPage)
      .offset(offset)
      .orderBy(
        sort === 'apiKey' ? orderDirection(apiKey.apiKey) :
        sort === 'status' ? orderDirection(apiKey.status) :
        sort === 'updatedAt' ? orderDirection(apiKey.updatedAt) :
        orderDirection(apiKey.createdAt)
      );

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(apiKey)
      .where(and(...whereConditions));

    const total = totalResult[0].count;
    const totalPages = Math.ceil(total / perPage);

    res.json({
      success: true,
      data: keys,
      pagination: {
        page,
        perPage,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching integration inbound keys:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integration inbound keys'
    });
  }
});

/**
 * @swagger
 * /api/modules/integration/api-keys:
 *   post:
 *     tags:
 *       - Integration - API Keys
 *     summary: Create new integration inbound API key
 *     description: Create a new integration inbound API key for a partner
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partnerId
 *               - apiKey
 *             properties:
 *               partnerId:
 *                 type: string
 *                 format: uuid
 *               apiKey:
 *                 type: string
 *                 minLength: 32
 *                 maxLength: 128
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *     responses:
 *       201:
 *         description: Integration inbound API key created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/IntegrationInbound'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post("/api-keys", validateData(apikeyInputSchema), authorized('ADMIN', 'integration.apiKey.add'), async (req, res) => {
  try {
    const { partnerId, apiKey : _apiKey, description, status } = req.body;

    // Ensure partner belongs to current tenant
    const partnerCheck = await db
      .select()
      .from(partner)
      .where(and(
        eq(partner.id, partnerId),
        eq(partner.tenantId, req.user!.activeTenantId)
      ));

    if (partnerCheck.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Partner not found or not in your tenant'
      });
    }

    const newKey = await db
      .insert(apiKey)
      .values({
        id: crypto.randomUUID(),
        partnerId,
        apiKey: _apiKey,
        description,
        status,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newKey[0]
    });
  } catch (error) {
    console.error('Error creating integration inbound key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create integration inbound key'
    });
  }
});

/**
 * @swagger
 * /api/modules/integration/api-keys/{id}:
 *   get:
 *     tags:
 *       - Integration - API Keys
 *     summary: Get integration inbound API key by ID
 *     description: Retrieve a specific integration inbound API key by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Integration inbound API key ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integration inbound API key details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/IntegrationInbound'
 *       404:
 *         description: Integration inbound API key not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/api-keys/:id", authorized('ADMIN', 'integration.apiKey.view'), async (req, res) => {
  try {
    const { id } = req.params;

    const foundKey = await db
      .select({
        id: apiKey.id,
        partnerId: apiKey.partnerId,
        apiKey: apiKey.apiKey,
        description: apiKey.description,
        status: apiKey.status,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
        partnerName: partner.name,
        partnerCode: partner.code,
      })
      .from(apiKey)
      .leftJoin(partner, eq(apiKey.partnerId, partner.id))
      .where(and(
        eq(apiKey.id, id),
        eq(partner.tenantId, req.user!.activeTenantId)
      ))
      .limit(1);

    if (foundKey.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Integration inbound API key not found'
      });
    }

    res.json({
      success: true,
      data: foundKey[0]
    });
  } catch (error) {
    console.error('Error fetching integration inbound key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integration inbound key'
    });
  }
});

/**
 * @swagger
 * /api/modules/integration/api-keys/{id}:
 *   put:
 *     tags:
 *       - Integration - API Keys
 *     summary: Update integration inbound API key
 *     description: Update an existing integration inbound API key
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Integration inbound API key ID
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partnerId
 *               - apiKey
 *             properties:
 *               partnerId:
 *                 type: string
 *                 format: uuid
 *               apiKey:
 *                 type: string
 *                 minLength: 32
 *                 maxLength: 128
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Integration inbound API key updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/IntegrationInbound'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Integration inbound API key not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put("/api-keys/:id", validateData(apiKeyEditInputSchema), authorized('ADMIN', 'integration.apiKey.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { partnerId, apiKey : _apiKey, description, status } = req.body;

    // Ensure partner belongs to current tenant
    const partnerCheck = await db
      .select()
      .from(partner)
      .where(and(
        eq(partner.id, partnerId),
        eq(partner.tenantId, req.user!.activeTenantId)
      ));

    if (partnerCheck.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Partner not found or not in your tenant'
      });
    }

    const updatedKey = await db
      .update(apiKey)
      .set({
        partnerId,
        apiKey: _apiKey,
        description,
        status,
      })
      .where(and(
        eq(apiKey.id, id),
        sql`${apiKey.partnerId} IN (SELECT id FROM int_partner WHERE tenant_id = ${req.user!.activeTenantId})`
      ))
      .returning();

    if (updatedKey.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Integration inbound API key not found'
      });
    }

    res.json({
      success: true,
      data: updatedKey[0]
    });
  } catch (error) {
    console.error('Error updating integration inbound key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update integration inbound key'
    });
  }
});

/**
 * @swagger
 * /api/modules/integration/api-keys/{id}:
 *   delete:
 *     tags:
 *       - Integration - API Keys
 *     summary: Delete integration inbound API key
 *     description: Delete an integration inbound API key by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Integration inbound API key ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integration inbound API key deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Integration inbound API key not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete("/api-keys/:id", authorized('ADMIN', 'integration.apiKey.delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db
      .delete(apiKey)
      .where(and(
        eq(apiKey.id, id),
        sql`${apiKey.partnerId} IN (SELECT id FROM int_partner WHERE tenant_id = ${req.user!.activeTenantId})`
      ))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Integration inbound API key not found'
      });
    }

    res.json({
      success: true,
      message: 'Integration inbound API key deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting integration inbound key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete integration inbound key'
    });
  }
});

export default router;