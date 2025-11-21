import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@server/lib/db';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';

interface RelocationDocumentData {
  relocationNumber: string;
  tenantId: string;
  relocationId: string;
  status: string;
  createdDate: string;
  approvedDate: string | null;
  completedDate: string | null;
  createdBy: string;
  approvedBy: string | null;
  notes: string | null;
  items: Array<{
    productSku: string;
    productName: string;
    quantity: number;
    fromBinName: string;
    fromLocation: string;
    toBinName: string;
    toLocation: string;
  }>;
}

export class RelocationDocumentGenerator {
  static generateHTML(relocationData: RelocationDocumentData): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedCreatedDate = relocationData.createdDate 
      ? new Date(relocationData.createdDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    const formattedApprovedDate = relocationData.approvedDate 
      ? new Date(relocationData.approvedDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    const formattedCompletedDate = relocationData.completedDate 
      ? new Date(relocationData.completedDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    const totalItems = relocationData.items.length;
    const totalQuantity = relocationData.items.reduce((sum, item) => sum + item.quantity, 0);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inventory Relocation - ${relocationData.relocationNumber}</title>
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
    
    .header .relocation-number {
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
    
    .header .status-badge.rejected {
      background-color: #ef4444;
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
    
    .text-center {
      text-align: center;
    }
    
    .font-medium {
      font-weight: 500;
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
    
    .relocation-arrow {
      text-align: center;
      color: #3b82f6;
      font-weight: bold;
      font-size: 18px;
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
    <h1>INVENTORY RELOCATION - ${relocationData.status.toUpperCase()}</h1>
    <div class="relocation-number">${relocationData.relocationNumber}</div>
    <div class="status-badge ${relocationData.status === 'rejected' ? 'rejected' : ''}">${relocationData.status.toUpperCase()}</div>
    <p>Generated on ${currentDate}</p>
  </div>

  <div class="document-info">
    <div class="info-section">
      <h2>Relocation Details</h2>
      <div class="detail-line">
        <span class="label">Created Date:</span>
        <span>${formattedCreatedDate}</span>
      </div>
      <div class="detail-line">
        <span class="label">Created By:</span>
        <span>${relocationData.createdBy}</span>
      </div>
      <div class="detail-line">
        <span class="label">Status:</span>
        <span>${relocationData.status.charAt(0).toUpperCase() + relocationData.status.slice(1)}</span>
      </div>
    </div>

    <div class="info-section">
      <h2>Completion Details</h2>
      <div class="detail-line">
        <span class="label">Approved Date:</span>
        <span>${formattedApprovedDate}</span>
      </div>
      <div class="detail-line">
        <span class="label">Approved By:</span>
        <span>${relocationData.approvedBy || 'N/A'}</span>
      </div>
      <div class="detail-line">
        <span class="label">Completed Date:</span>
        <span>${formattedCompletedDate}</span>
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
        <div class="label">Total Quantity</div>
        <div class="value">${totalQuantity}</div>
      </div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>SKU</th>
        <th>Product Name</th>
        <th class="text-right">Quantity</th>
        <th>From Location</th>
        <th class="text-center">→</th>
        <th>To Location</th>
      </tr>
    </thead>
    <tbody>
      ${relocationData.items.map(item => `
      <tr>
        <td class="font-medium">${item.productSku}</td>
        <td>${item.productName}</td>
        <td class="text-right">${item.quantity}</td>
        <td class="location-info">
          <span class="bin">${item.fromBinName}</span>
          <span class="path">${item.fromLocation}</span>
        </td>
        <td class="relocation-arrow">→</td>
        <td class="location-info">
          <span class="bin">${item.toBinName}</span>
          <span class="path">${item.toLocation}</span>
        </td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  ${relocationData.notes ? `
  <div class="notes-section">
    <h3>Notes</h3>
    <p>${relocationData.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>This is a system-generated document for Inventory Relocation ${relocationData.relocationNumber}</p>
    <p>Generated on ${currentDate}</p>
  </div>
</body>
</html>
`;
  }

  static async generateAndSaveDocument(
    relocationData: RelocationDocumentData,
    userId: string,
    txClient?: any
  ): Promise<string> {
    try {
      const htmlContent = this.generateHTML(relocationData);

      const dateForYear = relocationData.approvedDate || relocationData.createdDate;
      const approvalYear = new Date(dateForYear).getFullYear().toString();

      const dirPath = path.join(
        process.cwd(),
        'storage',
        'inventory',
        'relocation',
        'tenants',
        relocationData.tenantId,
        approvalYear
      );

      await fs.mkdir(dirPath, { recursive: true });

      const fileName = `${relocationData.relocationNumber}.html`;
      const filePath = path.join(dirPath, fileName);

      await fs.writeFile(filePath, htmlContent, 'utf-8');

      const stats = await fs.stat(filePath);

      const relativePath = path.join(
        'storage',
        'inventory',
        'relocation',
        'tenants',
        relocationData.tenantId,
        approvalYear,
        fileName
      );

      const dbClient = txClient || db;

      await dbClient.insert(generatedDocuments).values({
        tenantId: relocationData.tenantId,
        documentType: 'RELOCATION',
        documentNumber: relocationData.relocationNumber,
        referenceType: 'relocation',
        referenceId: relocationData.relocationId,
        files: {
          html: {
            path: relativePath,
            size: stats.size,
            generated_at: new Date().toISOString(),
          },
          metadata: {
            relocationNumber: relocationData.relocationNumber,
            status: relocationData.status,
            totalItems: relocationData.items.length,
            totalQuantity: relocationData.items.reduce((sum, item) => sum + item.quantity, 0),
          },
        },
        generatedBy: userId,
      });

      return relativePath;
    } catch (error) {
      console.error('Error generating and saving relocation document:', error);
      throw error;
    }
  }
}
