import fs from 'fs/promises';
import path from 'path';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface CycleCountDocumentData {
  cycleCountId: string;
  countNumber: string;
  tenantId: string;
  countType: string;
  scheduledDate: string | Date;
  createdDate: string | Date;
  approvedDate: string | Date;
  createdBy: string;
  approvedBy: string;
  notes?: string | null;
  items: Array<{
    productSku: string;
    productName: string;
    binName: string;
    shelfName: string;
    aisleName: string;
    zoneName: string;
    warehouseName: string;
    systemQuantity: number;
    countedQuantity: number | null;
    varianceQuantity: number | null;
    reasonCode?: string | null;
    reasonDescription?: string | null;
  }>;
}

export class CycleCountDocumentGenerator {
  static generateHTML(cycleCountData: CycleCountDocumentData): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedCreatedDate = cycleCountData.createdDate 
      ? new Date(cycleCountData.createdDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    const formattedApprovedDate = cycleCountData.approvedDate 
      ? new Date(cycleCountData.approvedDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    const formattedScheduledDate = cycleCountData.scheduledDate 
      ? new Date(cycleCountData.scheduledDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'N/A';

    const totalVariancePositive = cycleCountData.items
      .filter(item => (item.varianceQuantity ?? 0) > 0)
      .reduce((sum, item) => sum + (item.varianceQuantity ?? 0), 0);

    const totalVarianceNegative = cycleCountData.items
      .filter(item => (item.varianceQuantity ?? 0) < 0)
      .reduce((sum, item) => sum + Math.abs(item.varianceQuantity ?? 0), 0);

    const itemsWithVariance = cycleCountData.items.filter(item => (item.varianceQuantity ?? 0) !== 0);

    const itemRows = cycleCountData.items
      .map((item, index) => {
        const variance = item.varianceQuantity ?? 0;
        const varianceClass = variance > 0 ? 'positive' : variance < 0 ? 'negative' : 'neutral';
        const varianceSign = variance > 0 ? '+' : '';

        return `
          <tr class="${varianceClass}">
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${index + 1}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.productSku}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.productName}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-size: 0.9em;">
              ${item.warehouseName} / ${item.zoneName} / ${item.aisleName} / ${item.shelfName} / ${item.binName}
            </td>
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">${item.systemQuantity}</td>
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0; font-weight: 600;">
              ${item.countedQuantity !== null ? item.countedQuantity : 'N/A'}
            </td>
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0; font-weight: 600;">
              ${variance !== 0 ? `${varianceSign}${variance}` : '0'}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-size: 0.85em;">
              ${item.reasonCode || '-'}
              ${item.reasonDescription ? `<br><span style="color: #666;">${item.reasonDescription}</span>` : ''}
            </td>
          </tr>
        `;
      })
      .join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cycle Count - ${cycleCountData.countNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { 
      max-width: 1200px; 
      margin: 0 auto; 
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header { 
      border-bottom: 3px solid #2563eb; 
      padding-bottom: 20px; 
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header h1 { 
      color: #2563eb; 
      font-size: 28px;
      margin-bottom: 5px;
    }
    .header .doc-number {
      font-size: 16px;
      color: #666;
      font-weight: normal;
    }
    .header .print-date {
      text-align: right;
      color: #666;
      font-size: 14px;
    }
    .info-grid { 
      display: grid; 
      grid-template-columns: repeat(2, 1fr); 
      gap: 20px; 
      margin-bottom: 30px;
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
    }
    .info-item { 
      display: flex;
      flex-direction: column;
    }
    .info-label { 
      font-weight: 600; 
      color: #64748b;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .info-value { 
      color: #1e293b;
      font-size: 15px;
    }
    .variance-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin: 30px 0;
    }
    .variance-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #64748b;
    }
    .variance-card.positive {
      background: #f0fdf4;
      border-left-color: #22c55e;
    }
    .variance-card.negative {
      background: #fef2f2;
      border-left-color: #ef4444;
    }
    .variance-card .label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .variance-card .value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
    }
    .variance-card.positive .value {
      color: #22c55e;
    }
    .variance-card.negative .value {
      color: #ef4444;
    }
    .section-title { 
      font-size: 18px; 
      font-weight: 600; 
      color: #1e293b;
      margin: 30px 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 30px;
      font-size: 14px;
    }
    thead { 
      background: #f1f5f9;
    }
    th { 
      padding: 14px 12px; 
      text-align: left; 
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #cbd5e1;
    }
    th.center, td.center { text-align: center; }
    tbody tr.positive {
      background: #f0fdf4;
    }
    tbody tr.negative {
      background: #fef2f2;
    }
    tbody tr:hover {
      background: #f8fafc;
    }
    .notes-section {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 30px 0;
      border-radius: 4px;
    }
    .notes-section .title {
      font-weight: 600;
      color: #92400e;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .notes-section .content {
      color: #78350f;
      font-size: 14px;
      line-height: 1.6;
    }
    .footer { 
      margin-top: 50px; 
      padding-top: 20px; 
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Cycle Count Report</h1>
        <div class="doc-number">${cycleCountData.countNumber}</div>
      </div>
      <div class="print-date">
        <strong>Print Date:</strong><br>${currentDate}
      </div>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Count Type</div>
        <div class="info-value">${cycleCountData.countType.toUpperCase()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Scheduled Date</div>
        <div class="info-value">${formattedScheduledDate}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Created By</div>
        <div class="info-value">${cycleCountData.createdBy}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Created Date</div>
        <div class="info-value">${formattedCreatedDate}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Approved By</div>
        <div class="info-value">${cycleCountData.approvedBy}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Approved Date</div>
        <div class="info-value">${formattedApprovedDate}</div>
      </div>
    </div>

    <div class="variance-summary">
      <div class="variance-card">
        <div class="label">Total Items</div>
        <div class="value">${cycleCountData.items.length}</div>
      </div>
      <div class="variance-card positive">
        <div class="label">Surplus (+)</div>
        <div class="value">+${totalVariancePositive}</div>
      </div>
      <div class="variance-card negative">
        <div class="label">Shortage (-)</div>
        <div class="value">-${totalVarianceNegative}</div>
      </div>
    </div>

    ${itemsWithVariance.length > 0 ? `
      <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <strong style="color: #9a3412;">⚠ Variances Detected:</strong> 
        <span style="color: #7c2d12;">${itemsWithVariance.length} item(s) with quantity differences will be auto-adjusted.</span>
      </div>
    ` : `
      <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <strong style="color: #166534;">✓ Perfect Match:</strong> 
        <span style="color: #15803d;">All counted quantities match system quantities. No adjustment needed.</span>
      </div>
    `}

    ${cycleCountData.notes ? `
      <div class="notes-section">
        <div class="title">Notes</div>
        <div class="content">${cycleCountData.notes}</div>
      </div>
    ` : ''}

    <div class="section-title">Count Details (${cycleCountData.items.length} Items)</div>

    <table>
      <thead>
        <tr>
          <th class="center" style="width: 50px;">#</th>
          <th style="width: 120px;">SKU</th>
          <th>Product</th>
          <th>Location</th>
          <th class="center" style="width: 100px;">System Qty</th>
          <th class="center" style="width: 100px;">Counted Qty</th>
          <th class="center" style="width: 100px;">Variance</th>
          <th style="width: 150px;">Reason</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="footer">
      <p>This is a system-generated document for cycle count ${cycleCountData.countNumber}</p>
      <p>Generated on ${currentDate}</p>
    </div>
  </div>

  <script>
    window.print = function() {
      return window.parent.postMessage({ type: 'print', source: 'cycle-count-document' }, '*');
    };
  </script>
</body>
</html>
    `.trim();
  }

  static async generateAndSave(
    cycleCountData: CycleCountDocumentData,
    userId: string,
    dbClient: NodePgDatabase<any> | any
  ): Promise<string> {
    try {
      const htmlContent = this.generateHTML(cycleCountData);

      const approvalYear = new Date(cycleCountData.approvedDate).getFullYear().toString();

      const dirPath = path.join(
        process.cwd(),
        'storage',
        'inventory',
        'cycle-count',
        'tenants',
        cycleCountData.tenantId,
        approvalYear
      );

      await fs.mkdir(dirPath, { recursive: true });

      const fileName = `${cycleCountData.countNumber}.html`;
      const filePath = path.join(dirPath, fileName);

      await fs.writeFile(filePath, htmlContent, 'utf-8');

      const stats = await fs.stat(filePath);

      const relativePath = path.join(
        'storage',
        'inventory',
        'cycle-count',
        'tenants',
        cycleCountData.tenantId,
        approvalYear,
        fileName
      );

      await dbClient.insert(generatedDocuments).values({
        tenantId: cycleCountData.tenantId,
        documentType: 'CYCCOUNT',
        documentNumber: cycleCountData.countNumber,
        referenceType: 'cycle_count',
        referenceId: cycleCountData.cycleCountId,
        files: {
          html: {
            path: relativePath,
            size: stats.size,
            generated_at: new Date().toISOString(),
          },
          metadata: {
            countNumber: cycleCountData.countNumber,
            countType: cycleCountData.countType,
            totalItems: cycleCountData.items.length,
            itemsWithVariance: cycleCountData.items.filter(item => (item.varianceQuantity ?? 0) !== 0).length,
          },
        },
        generatedBy: userId,
      });

      return relativePath;
    } catch (error) {
      console.error('Error generating cycle count document:', error);
      throw new Error('Failed to generate cycle count document');
    }
  }
}
