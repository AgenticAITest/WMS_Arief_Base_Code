import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@server/lib/db';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';

interface PutawayDocumentData {
  putawayNumber: string;
  tenantId: string;
  poNumber: string;
  poId: string;
  putawayDate: string;
  putawayByName: string | null;
  supplierName: string;
  warehouseName: string | null;
  warehouseAddress: string | null;
  notes: string | null;
  items: Array<{
    productSku: string;
    productName: string;
    receivedQuantity: number;
    zoneName: string | null;
    aisleName: string | null;
    shelfName: string | null;
    binName: string | null;
    locationPath: string;
  }>;
}

export class PutawayDocumentGenerator {
  static generateHTML(putawayData: PutawayDocumentData): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedPutawayDate = putawayData.putawayDate 
      ? new Date(putawayData.putawayDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    const warehouseAddress = putawayData.warehouseAddress || 'N/A';
    const totalItems = putawayData.items.reduce((sum, item) => sum + item.receivedQuantity, 0);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Putaway Document - ${putawayData.putawayNumber}</title>
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
    
    .header .putaway-number {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
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
    
    .info-section .company-name {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
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
    }
    
    .items-table thead {
      background-color: #000;
      color: #fff;
    }
    
    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
    }
    
    .items-table tbody tr {
      border-bottom: 1px solid #e0e0e0;
    }
    
    .items-table tbody tr:last-child {
      border-bottom: 2px solid #000;
    }
    
    .items-table td {
      padding: 14px 12px;
      font-size: 14px;
    }
    
    .product-name {
      font-weight: 600;
      margin-bottom: 2px;
    }
    
    .product-sku {
      font-size: 12px;
      color: #666;
    }
    
    .location-path {
      font-size: 12px;
      color: #28a745;
      font-weight: 500;
      font-family: 'Courier New', monospace;
    }
    
    .notes-section {
      background-color: #fff3cd;
      border: 2px solid #ffc107;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .notes-section h3 {
      font-size: 16px;
      font-weight: bold;
      color: #856404;
      margin-bottom: 10px;
    }
    
    .notes-section p {
      font-size: 14px;
      color: #856404;
      line-height: 1.5;
    }
    
    .footer {
      text-align: center;
      padding-top: 30px;
      border-top: 2px solid #e0e0e0;
      color: #666;
      font-size: 12px;
    }
    
    .footer p {
      margin: 4px 0;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .header {
        page-break-after: avoid;
      }
      
      .items-table {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PUTAWAY DOCUMENT</h1>
    <div class="putaway-number">${putawayData.putawayNumber}</div>
    <p>Generated on ${currentDate}</p>
  </div>

  <div class="document-info">
    <div class="info-section">
      <h2>Putaway Details</h2>
      <div class="detail-line">
        <span class="label">PO Reference:</span>
        ${putawayData.poNumber}
      </div>
      <div class="detail-line">
        <span class="label">Putaway Date:</span>
        ${formattedPutawayDate}
      </div>
      <div class="detail-line">
        <span class="label">Putaway By:</span>
        ${putawayData.putawayByName || 'N/A'}
      </div>
    </div>

    <div class="info-section">
      <h2>Supplier & Warehouse</h2>
      <div class="company-name">${putawayData.supplierName}</div>
      <div class="detail-line">
        <span class="label">Warehouse:</span>
        ${putawayData.warehouseName || 'N/A'}
      </div>
      <div class="detail-line">
        <span class="label">Location:</span>
        ${warehouseAddress}
      </div>
    </div>
  </div>

  <div class="summary-section">
    <h3>Putaway Summary</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="label">Items Put Away</div>
        <div class="value">${putawayData.items.length}</div>
      </div>
      <div class="summary-item">
        <div class="label">Total Quantity</div>
        <div class="value">${totalItems}</div>
      </div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align: center; width: 100px;">Quantity</th>
        <th style="width: 300px;">Location</th>
      </tr>
    </thead>
    <tbody>
      ${putawayData.items.map(item => {
        return `
      <tr>
        <td>
          <div class="product-name">${item.productName}</div>
          <div class="product-sku">SKU: ${item.productSku}</div>
        </td>
        <td style="text-align: center; font-weight: 600;">${item.receivedQuantity}</td>
        <td>
          <div class="location-path">${item.locationPath}</div>
        </td>
      </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  ${putawayData.notes ? `
  <div class="notes-section">
    <h3>Additional Notes</h3>
    <p>${putawayData.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>This is an electronically generated document. No signature is required.</p>
    <p>Putaway #${putawayData.putawayNumber} | PO Reference: ${putawayData.poNumber}</p>
  </div>
</body>
</html>`;
  }

  static async generateAndSave(
    putawayData: PutawayDocumentData,
    userId: string,
    tx?: any
  ): Promise<{ filePath: string; documentId: string }> {
    try {
      const year = new Date().getFullYear().toString();
      const fileName = `${putawayData.putawayNumber}.html`;
      
      const dirPath = path.join(
        process.cwd(),
        'storage',
        'purchase-order',
        'documents',
        'tenants',
        putawayData.tenantId,
        'putaway',
        year
      );

      await fs.mkdir(dirPath, { recursive: true });

      const filePath = path.join(dirPath, fileName);
      const htmlContent = this.generateHTML(putawayData);

      await fs.writeFile(filePath, htmlContent, 'utf-8');

      const relativePath = `storage/purchase-order/documents/tenants/${putawayData.tenantId}/putaway/${year}/${fileName}`;
      const fileStats = await fs.stat(filePath);

      // Use transaction if provided, otherwise use global db
      const dbInstance = tx || db;
      
      const [document] = await dbInstance
        .insert(generatedDocuments)
        .values({
          tenantId: putawayData.tenantId,
          documentType: 'PUTAWAY',
          documentNumber: putawayData.putawayNumber,
          referenceType: 'purchase_order',
          referenceId: putawayData.poId,
          generatedBy: userId,
          version: 1,
          files: {
            html: {
              path: relativePath,
              size: fileStats.size,
              mimeType: 'text/html'
            }
          }
        })
        .returning();

      return {
        filePath: relativePath,
        documentId: document.id
      };
    } catch (error) {
      console.error('Error generating and saving putaway document:', error);
      throw error;
    }
  }
}
