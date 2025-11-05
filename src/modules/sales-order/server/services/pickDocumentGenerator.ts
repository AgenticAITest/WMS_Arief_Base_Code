import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@server/lib/db';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';

interface PickItem {
  productSku: string;
  productName: string;
  allocatedQuantity: number;
  pickedQuantity: number;
  picks: Array<{
    binLocation: string;
    quantity: number;
    batchNumber: string | null;
    lotNumber: string | null;
    expiryDate: string | null;
  }>;
}

interface PickDocumentData {
  id: string;
  tenantId: string;
  pickNumber: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  totalAmount: string;
  pickedByName: string | null;
  items: PickItem[];
}

export class PickDocumentGenerator {
  static generateHTML(data: PickDocumentData): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedOrderDate = data.orderDate 
      ? new Date(data.orderDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'N/A';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pick Document - ${data.pickNumber}</title>
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
      color: #2e7d32;
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
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .info-section .detail-line {
      font-size: 14px;
      margin: 4px 0;
    }
    
    .info-section .label {
      font-weight: 600;
      display: inline-block;
      width: 120px;
    }
    
    .items-section {
      margin-top: 30px;
    }
    
    .items-section h2 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 16px;
      color: #2e7d32;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border: 2px solid #000;
    }
    
    .items-table thead {
      background-color: #2e7d32;
      color: #fff;
    }
    
    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      border: 1px solid #fff;
    }
    
    .items-table td {
      padding: 10px 12px;
      border: 1px solid #ddd;
      font-size: 13px;
    }
    
    .items-table tbody tr:nth-child(even) {
      background-color: #f5f5f5;
    }
    
    .items-table tbody tr:hover {
      background-color: #e8f5e9;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .location-details {
      margin-top: 12px;
      padding-left: 20px;
    }
    
    .location-row {
      font-size: 12px;
      padding: 6px 12px;
      background-color: #f9f9f9;
      border-left: 3px solid #2e7d32;
      margin-bottom: 4px;
    }
    
    .location-row .location {
      font-weight: 600;
      color: #2e7d32;
      display: inline-block;
      min-width: 150px;
    }
    
    .location-row .batch-info {
      color: #555;
      margin-left: 12px;
    }
    
    .location-row .qty {
      font-weight: 600;
      float: right;
      color: #000;
    }
    
    .summary {
      margin-top: 30px;
      padding: 20px;
      background-color: #f5f5f5;
      border-radius: 8px;
      border-left: 4px solid #2e7d32;
    }
    
    .summary .total-line {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      margin: 8px 0;
    }
    
    .summary .total-line.grand-total {
      font-size: 20px;
      font-weight: bold;
      padding-top: 12px;
      border-top: 2px solid #2e7d32;
      margin-top: 12px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .items-table tbody tr:hover {
        background-color: inherit;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PICK DOCUMENT</h1>
    <p>Generated on ${currentDate}</p>
  </div>

  <div class="document-info">
    <div class="info-section">
      <h2>Pick Information</h2>
      <div class="detail-line">
        <span class="label">Pick Number:</span>
        <span>${data.pickNumber}</span>
      </div>
      <div class="detail-line">
        <span class="label">Order Number:</span>
        <span>${data.orderNumber}</span>
      </div>
      <div class="detail-line">
        <span class="label">Order Date:</span>
        <span>${formattedOrderDate}</span>
      </div>
      <div class="detail-line">
        <span class="label">Picked By:</span>
        <span>${data.pickedByName || 'N/A'}</span>
      </div>
    </div>

    <div class="info-section">
      <h2>Customer Information</h2>
      <div class="company-name">${data.customerName}</div>
    </div>
  </div>

  <div class="items-section">
    <h2>Picked Items</h2>
    ${data.items.map((item, index) => `
      <div style="margin-bottom: 24px;">
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 60px;">#</th>
              <th>Product SKU</th>
              <th>Product Name</th>
              <th class="text-right" style="width: 140px;">Allocated Qty</th>
              <th class="text-right" style="width: 140px;">Picked Qty</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center">${index + 1}</td>
              <td style="font-weight: 600;">${item.productSku}</td>
              <td>${item.productName}</td>
              <td class="text-right">${item.allocatedQuantity.toFixed(2)}</td>
              <td class="text-right" style="font-weight: 600;">${item.pickedQuantity.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="location-details">
          ${item.picks.map(pick => `
            <div class="location-row">
              <span class="location">${pick.binLocation}</span>
              <span class="batch-info">
                ${pick.batchNumber ? `Batch: ${pick.batchNumber}` : ''}
                ${pick.lotNumber ? `Lot: ${pick.lotNumber}` : ''}
                ${pick.expiryDate ? `| Exp: ${new Date(pick.expiryDate).toLocaleDateString()}` : ''}
              </span>
              <span class="qty">Qty: ${pick.quantity.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>

  <div class="summary">
    <div class="total-line grand-total">
      <span>Total Amount:</span>
      <span>$${parseFloat(data.totalAmount).toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <p>This is a computer-generated document. No signature is required.</p>
    <p>Pick Document ID: ${data.id}</p>
  </div>
</body>
</html>`;
  }

  static async save(data: PickDocumentData): Promise<string> {
    const dirPath = path.join(
      process.cwd(),
      'storage',
      'sales-order',
      'picks',
      'tenants',
      data.tenantId
    );

    await fs.mkdir(dirPath, { recursive: true });

    const fileName = `${data.pickNumber.replace(/\//g, '-')}_${Date.now()}.html`;
    const filePath = path.join(dirPath, fileName);

    const html = this.generateHTML(data);
    await fs.writeFile(filePath, html, 'utf-8');

    const relativePath = path.join(
      'storage',
      'sales-order',
      'picks',
      'tenants',
      data.tenantId,
      fileName
    );

    await db.insert(generatedDocuments).values({
      tenantId: data.tenantId,
      documentType: 'PICK',
      documentNumber: data.pickNumber,
      referenceType: 'sales_order',
      referenceId: data.id,
      storagePaths: {
        html: relativePath,
      },
      metadata: {
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        itemCount: data.items.length,
      },
    });

    return relativePath;
  }
}
