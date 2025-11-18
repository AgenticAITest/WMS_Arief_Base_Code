import { db } from '@server/lib/db';
import { and, eq, isNull } from 'drizzle-orm';
import {
  documentNumberConfig,
  documentNumberHistory,
  documentSequenceTracker,
} from '../lib/db/schemas/documentNumbering';

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

interface GenerateDocumentNumberParams {
  tenantId: string;
  documentType: string;
  prefix1?: string | null;
  prefix2?: string | null;
  documentId?: string | null;
  documentTableName?: string | null;
  userId?: string | null;
}

interface GenerateDocumentNumberResult {
  documentNumber: string;
  period: string;
  sequenceNumber: number;
  historyId: string;
}

/**
 * Generate a new document number
 * This is an internal service function that can be called directly
 * without making HTTP requests
 */
export async function generateDocumentNumber(
  params: GenerateDocumentNumberParams
): Promise<GenerateDocumentNumberResult> {
  const { tenantId, documentType, prefix1, prefix2, documentId, documentTableName, userId } = params;

  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }

  if (!documentType) {
    throw new Error('Document type is required');
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
    throw new Error(`Configuration not found for document type: ${documentType}`);
  }

  // Apply defaults from config if caller doesn't provide prefixes
  const actualPrefix1 = prefix1 || config.prefix1DefaultValue || null;
  const actualPrefix2 = prefix2 || config.prefix2DefaultValue || null;

  // Validate required prefixes AFTER applying defaults
  if (config.prefix1Required && !actualPrefix1) {
    throw new Error(`Prefix 1 (${config.prefix1Label}) is required`);
  }

  if (config.prefix2Required && !actualPrefix2) {
    throw new Error(`Prefix 2 (${config.prefix2Label}) is required`);
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

  return {
    documentNumber,
    period,
    sequenceNumber,
    historyId: history.id,
  };
}
