import { db } from '../lib/db';
import { auditLogs } from '../lib/db/schema';

export interface AuditLogData {
  tenantId: string;
  userId?: string | null;
  module: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changedFields?: any;
  description?: string;
  previousState?: string;
  newState?: string;
  batchId?: string;
  status?: 'success' | 'failure';
  errorMessage?: string;
  ipAddress?: string;
  documentPath?: string;
}

export async function logAudit(data: AuditLogData) {
  try {
    await db.insert(auditLogs).values({
      tenantId: data.tenantId,
      userId: data.userId || null,
      module: data.module,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      changedFields: data.changedFields || null,
      description: data.description || null,
      previousState: data.previousState || null,
      newState: data.newState || null,
      batchId: data.batchId || null,
      status: data.status || 'success',
      errorMessage: data.errorMessage || null,
      ipAddress: data.ipAddress || null,
      documentPath: data.documentPath || null,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export function getClientIp(req: any): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
  }
  return req.socket?.remoteAddress;
}
