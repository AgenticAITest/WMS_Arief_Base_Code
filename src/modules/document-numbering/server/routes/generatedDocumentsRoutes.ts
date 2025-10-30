import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import express from 'express';
import { generatedDocuments } from '../lib/db/schemas/documentNumbering';
import { promises as fs } from 'fs';
import path from 'path';

const router = express.Router();
router.use(authenticated());

/**
 * @swagger
 * components:
 *   schemas:
 *     GeneratedDocument:
 *       type: object
 *       required:
 *         - documentType
 *         - documentNumber
 *         - referenceType
 *         - referenceId
 *         - files
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique document record identifier
 *         tenantId:
 *           type: string
 *           format: uuid
 *           description: Tenant ownership
 *         documentType:
 *           type: string
 *           maxLength: 50
 *           description: Document type (e.g., purchase_order, sales_order, packing_slip)
 *         documentNumber:
 *           type: string
 *           maxLength: 100
 *           description: The formatted document number (e.g., PO-2510-0001)
 *         referenceType:
 *           type: string
 *           maxLength: 50
 *           description: Type of source record (e.g., purchase_order, sales_order)
 *         referenceId:
 *           type: string
 *           format: uuid
 *           description: UUID of the source record
 *         files:
 *           type: object
 *           description: File metadata in JSONB format
 *           example:
 *             html:
 *               path: documents/tenants/uuid/po/2025/PO-2510-0001.html
 *               size: 15234
 *               generated_at: 2025-10-22T10:30:00Z
 *             signature:
 *               path: documents/tenants/uuid/signatures/sig-uuid.png
 *               size: 8192
 *               signed_by: user-uuid
 *               signed_at: 2025-10-22T11:00:00Z
 *         version:
 *           type: integer
 *           default: 1
 *           description: Version number for document regenerations
 *         generatedBy:
 *           type: string
 *           format: uuid
 *           description: User who generated the document
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/modules/document-numbering/documents:
 *   get:
 *     summary: Get all generated documents
 *     tags: [Generated Documents]
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
 *           default: 20
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *         description: Filter by document type
 *       - in: query
 *         name: referenceType
 *         schema:
 *           type: string
 *         description: Filter by reference type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by document number
 *     responses:
 *       200:
 *         description: List of generated documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GeneratedDocument'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/documents', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const documentType = req.query.documentType as string;
    const referenceType = req.query.referenceType as string;
    const search = req.query.search as string;
    const tenantId = req.user?.activeTenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    let conditions = [eq(generatedDocuments.tenantId, tenantId)];

    if (documentType) {
      conditions.push(eq(generatedDocuments.documentType, documentType));
    }

    if (referenceType) {
      conditions.push(eq(generatedDocuments.referenceType, referenceType));
    }

    if (search) {
      conditions.push(ilike(generatedDocuments.documentNumber, `%${search}%`));
    }

    const filterCondition = and(...conditions);

    const totalResult = await db
      .select()
      .from(generatedDocuments)
      .where(filterCondition);

    const total = { count: totalResult.length };

    const documents = await db
      .select()
      .from(generatedDocuments)
      .where(filterCondition)
      .orderBy(desc(generatedDocuments.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      data: documents,
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        totalPages: Math.ceil((total?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching generated documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/documents/{id}:
 *   get:
 *     summary: Get a generated document by ID
 *     tags: [Generated Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GeneratedDocument'
 *       404:
 *         description: Document not found
 *       401:
 *         description: Unauthorized
 */
router.get('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.activeTenantId;

    const [document] = await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.id, id),
          eq(generatedDocuments.tenantId, tenantId!)
        )
      )
      .limit(1);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ data: document });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/documents/by-number/{documentNumber}:
 *   get:
 *     summary: Get a document by document number
 *     tags: [Generated Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Document number (e.g., PO-2510-0001)
 *     responses:
 *       200:
 *         description: Document details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GeneratedDocument'
 *       404:
 *         description: Document not found
 *       401:
 *         description: Unauthorized
 */
router.get('/documents/by-number/:documentNumber', async (req, res) => {
  try {
    const { documentNumber } = req.params;
    const tenantId = req.user?.activeTenantId;

    const [document] = await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.documentNumber, documentNumber),
          eq(generatedDocuments.tenantId, tenantId!)
        )
      )
      .limit(1);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ data: document });
  } catch (error) {
    console.error('Error fetching document by number:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/documents/by-reference/{referenceType}/{referenceId}:
 *   get:
 *     summary: Get all document versions for a reference
 *     tags: [Generated Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: referenceType
 *         required: true
 *         schema:
 *           type: string
 *         description: Reference type (e.g., purchase_order)
 *       - in: path
 *         name: referenceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Reference ID
 *     responses:
 *       200:
 *         description: List of all document versions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GeneratedDocument'
 *       401:
 *         description: Unauthorized
 */
router.get('/documents/by-reference/:referenceType/:referenceId', async (req, res) => {
  try {
    const { referenceType, referenceId } = req.params;
    const tenantId = req.user?.activeTenantId;

    const documents = await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.referenceType, referenceType),
          eq(generatedDocuments.referenceId, referenceId),
          eq(generatedDocuments.tenantId, tenantId!)
        )
      )
      .orderBy(desc(generatedDocuments.version));

    res.json({ data: documents });
  } catch (error) {
    console.error('Error fetching documents by reference:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/documents:
 *   post:
 *     summary: Create a new generated document record
 *     tags: [Generated Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentType
 *               - documentNumber
 *               - referenceType
 *               - referenceId
 *               - files
 *             properties:
 *               documentType:
 *                 type: string
 *                 maxLength: 50
 *               documentNumber:
 *                 type: string
 *                 maxLength: 100
 *               referenceType:
 *                 type: string
 *                 maxLength: 50
 *               referenceId:
 *                 type: string
 *                 format: uuid
 *               files:
 *                 type: object
 *                 description: JSONB file metadata
 *               version:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       201:
 *         description: Document created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GeneratedDocument'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/documents', async (req, res) => {
  try {
    const { documentType, documentNumber, referenceType, referenceId, files, version } = req.body;
    const tenantId = req.user?.activeTenantId;
    const userId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!documentType || !documentNumber || !referenceType || !referenceId || !files) {
      return res.status(400).json({ 
        error: 'documentType, documentNumber, referenceType, referenceId, and files are required' 
      });
    }

    const [newDocument] = await db
      .insert(generatedDocuments)
      .values({
        tenantId,
        documentType,
        documentNumber,
        referenceType,
        referenceId,
        files,
        version: version || 1,
        generatedBy: userId!,
      })
      .returning();

    res.status(201).json({ data: newDocument });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/documents/{id}:
 *   put:
 *     summary: Update a generated document
 *     tags: [Generated Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: object
 *                 description: Updated file metadata
 *               version:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Document updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GeneratedDocument'
 *       404:
 *         description: Document not found
 *       401:
 *         description: Unauthorized
 */
router.put('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { files, version } = req.body;
    const tenantId = req.user?.activeTenantId;

    const existing = await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.id, id),
          eq(generatedDocuments.tenantId, tenantId!)
        )
      )
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const updateData: any = { updatedAt: new Date() };
    if (files !== undefined) updateData.files = files;
    if (version !== undefined) updateData.version = version;

    const [updated] = await db
      .update(generatedDocuments)
      .set(updateData)
      .where(eq(generatedDocuments.id, id))
      .returning();

    res.json({ data: updated });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/documents/{id}:
 *   delete:
 *     summary: Delete a generated document
 *     tags: [Generated Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.activeTenantId;

    const existing = await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.id, id),
          eq(generatedDocuments.tenantId, tenantId!)
        )
      )
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await db
      .delete(generatedDocuments)
      .where(eq(generatedDocuments.id, id));

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/documents/{id}/view:
 *   get:
 *     summary: View a generated document file (authenticated)
 *     tags: [Generated Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document HTML file
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Document not found
 *       401:
 *         description: Unauthorized
 */
router.get('/documents/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.activeTenantId;

    // Fetch document metadata and verify access
    const [document] = await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.id, id),
          eq(generatedDocuments.tenantId, tenantId!)
        )
      )
      .limit(1);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get HTML file path from metadata
    const htmlPath = document.files?.html?.path;
    if (!htmlPath) {
      return res.status(404).json({ error: 'Document file path not found' });
    }

    // Construct absolute file path
    const filePath = path.join(process.cwd(), htmlPath);

    // Check if file exists and read it
    try {
      const htmlContent = await fs.readFile(filePath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (fileError) {
      console.error('Error reading document file:', fileError);
      return res.status(404).json({ error: 'Document file not found on disk' });
    }
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
