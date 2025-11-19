import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@server/lib/db';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';

interface AdjustmentDocumentData {
  adjustmentNumber: string;
  tenantId: string;
  adjustmentId: string;
  status: string;
  type: string;
  createdDate: string;
  approvedDate: string;
  createdBy: string;
  approvedBy: string;
  notes: string | null;
  items: Array<{
    productSku: string;
    productName: string;
    binName: string;
    location: string;
    systemQuantity: number;
    adjustedQuantity: number;
    quantityDifference: number;
    reasonCode: string | null;
  }>;
}

export class AdjustmentDocumentGenerator {
  static generateHTML(adjustmentData: AdjustmentDocumentData): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedCreatedDate = adjustmentData.createdDate 
      ? new Date(adjustmentData.createdDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    const formattedApprovedDate = adjustmentData.approvedDate 
      ? new Date(adjustmentData.approvedDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    const totalPositive = adjustmentData.items
      .filter(item => item.quantityDifference > 0)
      .reduce((sum, item) => sum + item.quantityDifference, 0);

    const totalNegative = adjustmentData.items
      .filter(item => item.quantityDifference < 0)
      .reduce((sum, item) => sum + Math.abs(item.quantityDifference), 0);

    const totalItems = adjustmentData.items.length;

    const typeDisplay = adjustmentData.type === 'cycle_count' ? 'Cycle Count' : 'Regular';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inventory Adjustment - ${adjustmentData.adjustmentNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #000;
      background: #fff;
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .header .adjustment-number {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }
    
    .header .status-badge {
      display: inline-block;
      padding: 6px 16px;
      background-color: #10b981;
      color: #fff;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 8px;
    }
    
    .header p {
      font-size: 14px;
      color: #666;
    }
    
    .document-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    
    .info-section {
      border: 2px solid #e0e0e0;
      padding: 20px;
      border-radius: 8px;
    }
    
    .info-section h2 {
      font-size: 14px;
      font-weight: bold;
      color: #555;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .detail-line {
      margin-bottom: 6px;
      font-size: 14px;
    }
    
    .label {
      font-weight: 600;
      color: #555;
      margin-right: 8px;
    }
    
    .summary-section {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    
    .summary-section h3 {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .summary-item {
      text-align: center;
    }
    
    .summary-item .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    
    .summary-item .value {
      font-size: 28px;
      font-weight: bold;
      color: #000;
    }
    
    .summary-item .value.positive {
      color: #10b981;
    }
    
    .summary-item .value.negative {
      color: #ef4444;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .items-table thead {
      background-color: #f1f5f9;
    }
    
    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
    }
    
    .items-table td {
      padding: 12px;
      font-size: 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .items-table tbody tr:hover {
      background-color: #f8fafc;
    }
    
    .items-table tbody tr:last-child td {
      border-bottom: 2px solid #cbd5e1;
    }
    
    .text-right {
      text-align: right;
    }
    
    .font-medium {
      font-weight: 500;
    }
    
    .text-positive {
      color: #10b981;
      font-weight: 600;
    }
    
    .text-negative {
      color: #ef4444;
      font-weight: 600;
    }
    
    .text-neutral {
      color: #6b7280;
    }
    
    .location-info {
      font-size: 13px;
    }
    
    .location-info .bin {
      font-weight: 600;
      color: #000;
    }
    
    .location-info .path {
      color: #6b7280;
      font-size: 11px;
      display: block;
    }
    
    .notes-section {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin-top: 30px;
      border-radius: 4px;
    }
    
    .notes-section h3 {
      font-size: 14px;
      font-weight: bold;
      color: #92400e;
      margin-bottom: 8px;
    }
    
    .notes-section p {
      font-size: 14px;
      color: #78350f;
    }
    
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      color: #666;
      font-size: 12px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .items-table {
        page-break-inside: auto;
      }
      
      .items-table tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>INVENTORY ADJUSTMENT - APPROVED</h1>
    <div class="adjustment-number">${adjustmentData.adjustmentNumber}</div>
    <div class="status-badge">${adjustmentData.status.toUpperCase()}</div>
    <p>Generated on ${currentDate}</p>
  </div>

  <div class="document-info">
    <div class="info-section">
      <h2>Adjustment Details</h2>
      <div class="detail-line">
        <span class="label">Type:</span>
        <span>${typeDisplay}</span>
      </div>
      <div class="detail-line">
        <span class="label">Created Date:</span>
        <span>${formattedCreatedDate}</span>
      </div>
      <div class="detail-line">
        <span class="label">Created By:</span>
        <span>${adjustmentData.createdBy}</span>
      </div>
    </div>

    <div class="info-section">
      <h2>Approval Details</h2>
      <div class="detail-line">
        <span class="label">Approved Date:</span>
        <span>${formattedApprovedDate}</span>
      </div>
      <div class="detail-line">
        <span class="label">Approved By:</span>
        <span>${adjustmentData.approvedBy}</span>
      </div>
    </div>
  </div>

  <div class="summary-section">
    <h3>Summary</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="label">Total Items</div>
        <div class="value">${totalItems}</div>
      </div>
      <div class="summary-item">
        <div class="label">Positive Adjustments</div>
        <div class="value positive">+${totalPositive}</div>
      </div>
      <div class="summary-item">
        <div class="label">Negative Adjustments</div>
        <div class="value negative">-${totalNegative}</div>
      </div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>SKU</th>
        <th>Product Name</th>
        <th>Location</th>
        <th class="text-right">System Qty</th>
        <th class="text-right">Adjusted Qty</th>
        <th class="text-right">Difference</th>
        <th>Reason</th>
      </tr>
    </thead>
    <tbody>
      ${adjustmentData.items.map(item => `
      <tr>
        <td class="font-medium">${item.productSku}</td>
        <td>${item.productName}</td>
        <td class="location-info">
          <span class="bin">${item.binName}</span>
          <span class="path">${item.location}</span>
        </td>
        <td class="text-right">${item.systemQuantity}</td>
        <td class="text-right">${item.adjustedQuantity}</td>
        <td class="text-right ${
          item.quantityDifference === 0 
            ? 'text-neutral' 
            : item.quantityDifference > 0 
            ? 'text-positive' 
            : 'text-negative'
        }">
          ${item.quantityDifference > 0 ? '+' : ''}${item.quantityDifference}
        </td>
        <td>${item.reasonCode ? item.reasonCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '-'}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  ${adjustmentData.notes ? `
  <div class="notes-section">
    <h3>Notes</h3>
    <p>${adjustmentData.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>This is a system-generated document for Inventory Adjustment ${adjustmentData.adjustmentNumber}</p>
    <p>Generated on ${currentDate}</p>
  </div>
</body>
</html>
`;
  }

  static async generateAndSaveDocument(
    adjustmentData: AdjustmentDocumentData,
    userId: string,
    txClient?: any
  ): Promise<string> {
    try {
      // Generate HTML content
      const htmlContent = this.generateHTML(adjustmentData);

      // Extract year from approval date
      const approvalYear = new Date(adjustmentData.approvedDate).getFullYear().toString();

      // Create directory structure: storage/inventory/adjustment/tenants/{tenantId}/{yyyy}
      const dirPath = path.join(
        process.cwd(),
        'storage',
        'inventory',
        'adjustment',
        'tenants',
        adjustmentData.tenantId,
        approvalYear
      );

      await fs.mkdir(dirPath, { recursive: true });

      // Create file path
      const fileName = `${adjustmentData.adjustmentNumber}.html`;
      const filePath = path.join(dirPath, fileName);

      // Write HTML file
      await fs.writeFile(filePath, htmlContent, 'utf-8');

      // Get file stats for size
      const stats = await fs.stat(filePath);

      // Create relative path for database storage
      const relativePath = path.join(
        'storage',
        'inventory',
        'adjustment',
        'tenants',
        adjustmentData.tenantId,
        approvalYear,
        fileName
      );

      // Use transaction client if provided, otherwise use global db
      const dbClient = txClient || db;

      // Save document metadata to database
      await dbClient.insert(generatedDocuments).values({
        tenantId: adjustmentData.tenantId,
        documentType: 'ADJUSTMENT',
        documentNumber: adjustmentData.adjustmentNumber,
        referenceType: 'adjustment',
        referenceId: adjustmentData.adjustmentId,
        files: {
          html: {
            path: relativePath,
            size: stats.size,
            generated_at: new Date().toISOString(),
          },
          metadata: {
            adjustmentNumber: adjustmentData.adjustmentNumber,
            type: adjustmentData.type,
            status: adjustmentData.status,
            totalItems: adjustmentData.items.length,
          },
        },
        generatedBy: userId,
      });

      return relativePath;
    } catch (error) {
      console.error('Error generating and saving adjustment document:', error);
      throw error;
    }
  }
}
