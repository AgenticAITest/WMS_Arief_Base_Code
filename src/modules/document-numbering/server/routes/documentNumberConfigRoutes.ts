import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import express from 'express';
import { documentNumberConfig } from '../lib/db/schemas/documentNumbering';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('document-numbering'));

/**
 * @swagger
 * components:
 *   schemas:
 *     DocumentNumberConfig:
 *       type: object
 *       required:
 *         - documentType
 *         - documentName
 *         - periodFormat
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         documentType:
 *           type: string
 *           maxLength: 50
 *           description: Document type code (e.g., PO, SO, INV)
 *         documentName:
 *           type: string
 *           maxLength: 255
 *           description: Display name (e.g., Purchase Order)
 *         description:
 *           type: string
 *           maxLength: 500
 *         periodFormat:
 *           type: string
 *           enum: [YYMM, YYYYMM, YYWW, YYYYWW]
 *           default: YYMM
 *         prefix1Label:
 *           type: string
 *           maxLength: 100
 *         prefix1DefaultValue:
 *           type: string
 *           maxLength: 50
 *         prefix1Required:
 *           type: boolean
 *           default: false
 *         prefix2Label:
 *           type: string
 *           maxLength: 100
 *         prefix2DefaultValue:
 *           type: string
 *           maxLength: 50
 *         prefix2Required:
 *           type: boolean
 *           default: false
 *         sequenceLength:
 *           type: integer
 *           default: 4
 *         sequencePadding:
 *           type: string
 *           maxLength: 1
 *           default: '0'
 *         separator:
 *           type: string
 *           maxLength: 5
 *           default: '-'
 *         isActive:
 *           type: boolean
 *           default: true
 */

/**
 * @swagger
 * /api/modules/document-numbering/configs:
 *   get:
 *     summary: Get all document number configurations
 *     tags: [Document Numbering]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of configurations
 *       401:
 *         description: Unauthorized
 */
router.get('/configs', authorized('ADMIN', 'document-numbering.view'), async (req, res) => {
  try {
    // Fetch document number configurations with pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const isActive = req.query.isActive as string;
    const tenantId = req.user?.activeTenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    let conditions = [eq(documentNumberConfig.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          ilike(documentNumberConfig.documentType, `%${search}%`),
          ilike(documentNumberConfig.documentName, `%${search}%`)
        ) as any
      );
    }

    if (isActive !== undefined) {
      conditions.push(eq(documentNumberConfig.isActive, isActive === 'true'));
    }

    const filterCondition = and(...conditions);

    const totalResult = await db
      .select()
      .from(documentNumberConfig)
      .where(filterCondition);
    
    const total = { count: totalResult.length };

    const configs = await db
      .select()
      .from(documentNumberConfig)
      .where(filterCondition)
      .orderBy(desc(documentNumberConfig.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      data: configs,
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        totalPages: Math.ceil((total?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching document number configs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/configs/{id}:
 *   get:
 *     summary: Get a document number configuration by ID
 *     tags: [Document Numbering]
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
 *         description: Configuration details
 *       404:
 *         description: Configuration not found
 */
router.get('/configs/:id', authorized('ADMIN', 'document-numbering.view'),async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.activeTenantId;

    const config = await db
      .select()
      .from(documentNumberConfig)
      .where(
        and(
          eq(documentNumberConfig.id, id),
          eq(documentNumberConfig.tenantId, tenantId!)
        )
      )
      .limit(1);

    if (!config.length) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({ data: config[0] });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/configs:
 *   post:
 *     summary: Create a new document number configuration
 *     tags: [Document Numbering]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DocumentNumberConfig'
 *     responses:
 *       201:
 *         description: Configuration created
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Document type already exists
 */
router.post('/configs', authorized('ADMIN', 'document-numbering.create'), async (req, res) => {
  try {
    const tenantId = req.user?.activeTenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const existing = await db
      .select()
      .from(documentNumberConfig)
      .where(
        and(
          eq(documentNumberConfig.tenantId, tenantId),
          eq(documentNumberConfig.documentType, req.body.documentType)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'Document type already exists for this tenant' 
      });
    }

    const [newConfig] = await db
      .insert(documentNumberConfig)
      .values({
        tenantId,
        documentType: req.body.documentType,
        documentName: req.body.documentName,
        description: req.body.description,
        periodFormat: req.body.periodFormat || 'YYMM',
        prefix1Label: req.body.prefix1Label,
        prefix1DefaultValue: req.body.prefix1DefaultValue,
        prefix1Required: req.body.prefix1Required || false,
        prefix2Label: req.body.prefix2Label,
        prefix2DefaultValue: req.body.prefix2DefaultValue,
        prefix2Required: req.body.prefix2Required || false,
        sequenceLength: req.body.sequenceLength || 4,
        sequencePadding: req.body.sequencePadding || '0',
        separator: req.body.separator || '-',
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      })
      .returning();

    res.status(201).json({ data: newConfig });
  } catch (error) {
    console.error('Error creating config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/configs/{id}:
 *   put:
 *     summary: Update a document number configuration
 *     tags: [Document Numbering]
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
 *             $ref: '#/components/schemas/DocumentNumberConfig'
 *     responses:
 *       200:
 *         description: Configuration updated
 *       404:
 *         description: Configuration not found
 */
router.put('/configs/:id',authorized('ADMIN', 'document-numbering.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.activeTenantId;

    const existing = await db
      .select()
      .from(documentNumberConfig)
      .where(
        and(
          eq(documentNumberConfig.id, id),
          eq(documentNumberConfig.tenantId, tenantId!)
        )
      )
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const [updated] = await db
      .update(documentNumberConfig)
      .set({
        documentName: req.body.documentName,
        description: req.body.description,
        periodFormat: req.body.periodFormat,
        prefix1Label: req.body.prefix1Label,
        prefix1DefaultValue: req.body.prefix1DefaultValue,
        prefix1Required: req.body.prefix1Required,
        prefix2Label: req.body.prefix2Label,
        prefix2DefaultValue: req.body.prefix2DefaultValue,
        prefix2Required: req.body.prefix2Required,
        sequenceLength: req.body.sequenceLength,
        sequencePadding: req.body.sequencePadding,
        separator: req.body.separator,
        isActive: req.body.isActive,
        updatedAt: new Date(),
      })
      .where(eq(documentNumberConfig.id, id))
      .returning();

    res.json({ data: updated });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/configs/{id}:
 *   delete:
 *     summary: Delete a document number configuration
 *     tags: [Document Numbering]
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
 *         description: Configuration deleted
 *       404:
 *         description: Configuration not found
 */
router.delete('/configs/:id', authorized('ADMIN', 'document-numbering.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.activeTenantId;

    const existing = await db
      .select()
      .from(documentNumberConfig)
      .where(
        and(
          eq(documentNumberConfig.id, id),
          eq(documentNumberConfig.tenantId, tenantId!)
        )
      )
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    await db
      .delete(documentNumberConfig)
      .where(eq(documentNumberConfig.id, id));

    res.json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
