import { db } from '@server/lib/db';
import { movementHistory, NewMovementHistory } from '../lib/db/schemas/movementHistory';

/**
 * Movement History Service
 * Centralized logging for all inventory movements
 */

interface LogMovementParams {
  tenantId: string;
  userId: string;
  inventoryItemId: string;
  binId: string;
  quantityChanged: number;
  movementType: 'putaway' | 'pick' | 'adjustment' | 'relocate';
  referenceType?: 'purchase_order' | 'sales_order' | 'adjustment' | 'relocation';
  referenceId?: string;
  referenceNumber?: string;
  notes?: string;
  tx?: any;
}

/**
 * Log a single inventory movement
 * Can be called within a transaction or standalone
 */
export async function logMovement(params: LogMovementParams): Promise<void> {
  const {
    tenantId,
    userId,
    inventoryItemId,
    binId,
    quantityChanged,
    movementType,
    referenceType,
    referenceId,
    referenceNumber,
    notes,
    tx,
  } = params;

  const dbInstance = tx || db;

  const movementRecord: NewMovementHistory = {
    tenantId,
    userId,
    inventoryItemId,
    binId,
    quantityChanged,
    movementType,
    referenceType: referenceType || null,
    referenceId: referenceId || null,
    referenceNumber: referenceNumber || null,
    notes: notes || null,
  };

  await dbInstance.insert(movementHistory).values(movementRecord);
}

/**
 * Log multiple movements at once (useful for relocations)
 */
export async function logMovements(movements: LogMovementParams[]): Promise<void> {
  if (movements.length === 0) return;

  const tx = movements[0].tx || db;

  const movementRecords: NewMovementHistory[] = movements.map((m) => ({
    tenantId: m.tenantId,
    userId: m.userId,
    inventoryItemId: m.inventoryItemId,
    binId: m.binId,
    quantityChanged: m.quantityChanged,
    movementType: m.movementType,
    referenceType: m.referenceType || null,
    referenceId: m.referenceId || null,
    referenceNumber: m.referenceNumber || null,
    notes: m.notes || null,
  }));

  await tx.insert(movementHistory).values(movementRecords);
}
