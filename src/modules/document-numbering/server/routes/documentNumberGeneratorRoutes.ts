import { db } from '@server/lib/db';
import { authenticated } from '@server/middleware/authMiddleware';
import { and, eq, isNull } from 'drizzle-orm';
import express from 'express';
import {
  documentNumberConfig,
  documentNumberHistory,
  documentSequenceTracker,
} from '../lib/db/schemas/documentNumbering';

const router = express.Router();
router.use(authenticated());
// Document number generator routes

/**
 * Generate current period string based on format
 */
function getCurrentPeriod(format: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const yearShort = year.toString().slice(-2);

  switch (format) {
    case 'YYMM':
      return `${yearShort}${month.toString().padStart(2, '0')}`;
    case 'YYYYMM':
      return `${year}${month.toString().padStart(2, '0')}`;
    case 'YYWW':
    case 'YYYYWW': {
      const weekNum = getWeekNumber(now);
      const yearPart = format === 'YYWW' ? yearShort : year.toString();
      return `${yearPart}${weekNum.toString().padStart(2, '0')}`;
    }
    default:
      return `${yearShort}${month.toString().padStart(2, '0')}`;
  }
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * @swagger
 * /api/modules/document-numbering/generate:
 *   post:
 *     summary: Generate a new document number
 *     tags: [Document Numbering]
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
 *             properties:
 *               documentType:
 *                 type: string
 *                 description: Document type code (e.g., PO, SO)
 *               prefix1:
 *                 type: string
 *                 description: First prefix value (optional if not required)
 *               prefix2:
 *                 type: string
 *                 description: Second prefix value (optional if not required)
 *               documentId:
 *                 type: string
 *                 format: uuid
 *                 description: Reference to the actual document
 *               documentTableName:
 *                 type: string
 *                 description: Table name of the document
 *     responses:
 *       201:
 *         description: Document number generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documentNumber:
 *                   type: string
 *                   example: PO-0125-WH1-LOCAL-0001
 *                 period:
 *                   type: string
 *                   example: '0125'
 *                 sequenceNumber:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Invalid request or missing required prefix
 *       404:
 *         description: Configuration not found
 */
router.post('/generate', async (req, res) => {
  try {
    const { documentType, prefix1, prefix2, documentId, documentTableName } = req.body;
    const tenantId = req.user?.activeTenantId;
    const userId = null;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    const [config] = await db
      .select()
      .from(documentNumberConfig)
      .where(
        and(
          eq(documentNumberConfig.tenantId, tenantId),
          eq(documentNumberConfig.documentType, documentType),
          eq(documentNumberConfig.isActive, true)
        )
      )
      .limit(1);

    if (!config) {
      return res.status(404).json({ 
        error: `Configuration not found for document type: ${documentType}` 
      });
    }

    // Apply defaults from config if caller doesn't provide prefixes
    const actualPrefix1 = prefix1 || config.prefix1DefaultValue || null;
    const actualPrefix2 = prefix2 || config.prefix2DefaultValue || null;

    // Validate required prefixes AFTER applying defaults
    if (config.prefix1Required && !actualPrefix1) {
      return res.status(400).json({ 
        error: `Prefix 1 (${config.prefix1Label}) is required` 
      });
    }

    if (config.prefix2Required && !actualPrefix2) {
      return res.status(400).json({ 
        error: `Prefix 2 (${config.prefix2Label}) is required` 
      });
    }

    const period = getCurrentPeriod(config.periodFormat);

    // Build WHERE conditions for tracker lookup
    const whereConditions = [
      eq(documentSequenceTracker.tenantId, tenantId),
      eq(documentSequenceTracker.documentType, documentType),
      eq(documentSequenceTracker.period, period),
    ];

    // Handle prefix1 - use isNull() for NULL comparison
    if (actualPrefix1) {
      whereConditions.push(eq(documentSequenceTracker.prefix1, actualPrefix1));
    } else {
      whereConditions.push(isNull(documentSequenceTracker.prefix1));
    }

    // Handle prefix2 - use isNull() for NULL comparison
    if (actualPrefix2) {
      whereConditions.push(eq(documentSequenceTracker.prefix2, actualPrefix2));
    } else {
      whereConditions.push(isNull(documentSequenceTracker.prefix2));
    }

    let tracker = await db
      .select()
      .from(documentSequenceTracker)
      .where(and(...whereConditions))
      .limit(1);

    let sequenceNumber: number;
    let trackerId: string;

    if (tracker.length === 0) {
      sequenceNumber = 1;
      const [newTracker] = await db
        .insert(documentSequenceTracker)
        .values({
          tenantId,
          configId: config.id,
          documentType,
          period,
          prefix1: actualPrefix1,
          prefix2: actualPrefix2,
          currentSequence: 1,
        })
        .returning();
      trackerId = newTracker.id;
    } else {
      sequenceNumber = tracker[0].currentSequence + 1;
      await db
        .update(documentSequenceTracker)
        .set({
          currentSequence: sequenceNumber,
          lastGeneratedAt: new Date(),
        })
        .where(eq(documentSequenceTracker.id, tracker[0].id));
      trackerId = tracker[0].id;
    }

    const paddedSequence = sequenceNumber
      .toString()
      .padStart(config.sequenceLength, config.sequencePadding);

    const parts = [documentType, period];
    if (actualPrefix1) parts.push(actualPrefix1);
    if (actualPrefix2) parts.push(actualPrefix2);
    parts.push(paddedSequence);

    const documentNumber = parts.join(config.separator);

    await db
      .update(documentSequenceTracker)
      .set({ lastGeneratedNumber: documentNumber })
      .where(eq(documentSequenceTracker.id, trackerId));

    const [history] = await db
      .insert(documentNumberHistory)
      .values({
        tenantId,
        configId: config.id,
        trackerId,
        documentType,
        generatedNumber: documentNumber,
        period,
        prefix1: actualPrefix1,
        prefix2: actualPrefix2,
        sequenceNumber,
        documentId,
        documentTableName,
        generatedBy: userId as any,
      })
      .returning();

    res.status(201).json({
      documentNumber,
      period,
      sequenceNumber,
      historyId: history.id,
    });
  } catch (error) {
    console.error('Error generating document number:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/preview:
 *   post:
 *     summary: Preview what the next document number would be (without generating)
 *     tags: [Document Numbering]
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
 *             properties:
 *               documentType:
 *                 type: string
 *               prefix1:
 *                 type: string
 *               prefix2:
 *                 type: string
 *     responses:
 *       200:
 *         description: Preview of next document number
 */
router.post('/preview', async (req, res) => {
  try {
    const { documentType, prefix1, prefix2 } = req.body;
    const tenantId = req.user?.activeTenantId;

    if (!tenantId || !documentType) {
      return res.status(400).json({ error: 'Tenant ID and document type are required' });
    }

    const [config] = await db
      .select()
      .from(documentNumberConfig)
      .where(
        and(
          eq(documentNumberConfig.tenantId, tenantId),
          eq(documentNumberConfig.documentType, documentType),
          eq(documentNumberConfig.isActive, true)
        )
      )
      .limit(1);

    if (!config) {
      return res.status(404).json({ 
        error: `Configuration not found for document type: ${documentType}` 
      });
    }

    const period = getCurrentPeriod(config.periodFormat);
    // Apply defaults from config if caller doesn't provide prefixes
    const actualPrefix1 = prefix1 || config.prefix1DefaultValue || null;
    const actualPrefix2 = prefix2 || config.prefix2DefaultValue || null;

    // Build WHERE conditions for preview tracker lookup
    const previewWhereConditions = [
      eq(documentSequenceTracker.tenantId, tenantId),
      eq(documentSequenceTracker.documentType, documentType),
      eq(documentSequenceTracker.period, period),
    ];

    // Handle prefix1 - use isNull() for NULL comparison
    if (actualPrefix1) {
      previewWhereConditions.push(eq(documentSequenceTracker.prefix1, actualPrefix1));
    } else {
      previewWhereConditions.push(isNull(documentSequenceTracker.prefix1));
    }

    // Handle prefix2 - use isNull() for NULL comparison
    if (actualPrefix2) {
      previewWhereConditions.push(eq(documentSequenceTracker.prefix2, actualPrefix2));
    } else {
      previewWhereConditions.push(isNull(documentSequenceTracker.prefix2));
    }

    const tracker = await db
      .select()
      .from(documentSequenceTracker)
      .where(and(...previewWhereConditions))
      .limit(1);

    const nextSequence = tracker.length === 0 ? 1 : tracker[0].currentSequence + 1;
    const paddedSequence = nextSequence
      .toString()
      .padStart(config.sequenceLength, config.sequencePadding);

    const parts = [documentType, period];
    if (actualPrefix1) parts.push(actualPrefix1);
    if (actualPrefix2) parts.push(actualPrefix2);
    parts.push(paddedSequence);

    const previewNumber = parts.join(config.separator);

    res.json({
      previewNumber,
      period,
      nextSequence,
      config: {
        documentType: config.documentType,
        documentName: config.documentName,
        periodFormat: config.periodFormat,
        prefix1Label: config.prefix1Label,
        prefix1Required: config.prefix1Required,
        prefix2Label: config.prefix2Label,
        prefix2Required: config.prefix2Required,
      },
    });
  } catch (error) {
    console.error('Error previewing document number:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
