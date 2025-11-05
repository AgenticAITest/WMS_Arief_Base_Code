import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@server/lib/db';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';

interface AllocationItem {
  productSku: string;
  productName: string;
  orderedQuantity: number;
  allocatedQuantity: number;
  allocations: Array<{
    binLocation: string;
    quantity: number;
    batchNumber: string | null;
    lotNumber: string | null;
    expiryDate: string | null;
  }>;
}

interface AllocationDocumentData {
  id: string;
  tenantId: string;
  allocationNumber: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  totalAmount: string;
  allocatedByName: string | null;
  items: AllocationItem[];
}

export class AllocationDocumentGenerator {
  static generateHTML(data: AllocationDocumentData): string {
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
  <title>Allocation Document - ${data.allocationNumber}</title>
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
      color: #1976d2;
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
      width: 160px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      border: 2px solid #000;
    }
    
    .items-table thead {
      background-color: #1976d2;
      color: white;
    }
    
    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: bold;
      font-size: 14px;
      text-transform: uppercase;
    }
    
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #ddd;
      font-size: 14px;
    }
    
    .items-table tbody tr:last-child td {
      border-bottom: 2px solid #000;
    }
    
    .items-table .text-right {
      text-align: right;
    }
    
    .items-table .text-center {
      text-align: center;
    }
    
    .allocation-breakdown {
      padding-left: 20px;
      margin-top: 8px;
    }
    
    .allocation-item {
      font-size: 12px;
      color: #555;
      padding: 6px 0;
      border-left: 3px solid #4CAF50;
      padding-left: 12px;
      margin: 4px 0;
      background-color: #f9f9f9;
    }
    
    .allocation-item strong {
      color: #000;
    }
    
    .allocation-details {
      font-size: 11px;
      color: #777;
      margin-top: 2px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      background-color: #4CAF50;
      color: white;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #000;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    
    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>INVENTORY ALLOCATION</h1>
    <p>This document confirms the allocation of inventory items to sales order</p>
  </div>
  
  <div class="document-info">
    <div class="info-section">
      <h2>Sales Order Information</h2>
      <div class="detail-line">
        <span class="label">SO Number:</span>
        <strong>${data.orderNumber}</strong>
      </div>
      <div class="detail-line">
        <span class="label">Order Date:</span>
        ${formattedOrderDate}
      </div>
      <div class="detail-line">
        <span class="label">Customer:</span>
        ${data.customerName}
      </div>
      <div class="detail-line">
        <span class="label">Total Amount:</span>
        <strong>$${parseFloat(data.totalAmount).toFixed(2)}</strong>
      </div>
    </div>

    <div class="info-section">
      <h2>Allocation Information</h2>
      <div class="detail-line">
        <span class="label">Allocation Number:</span>
        <strong>${data.allocationNumber}</strong>
      </div>
      <div class="detail-line">
        <span class="label">Allocation Date:</span>
        ${currentDate}
      </div>
      ${data.allocatedByName ? `
      <div class="detail-line">
        <span class="label">Allocated By:</span>
        ${data.allocatedByName}
      </div>
      ` : ''}
      <div class="detail-line">
        <span class="label">Status:</span>
        <span class="status-badge">ALLOCATED</span>
      </div>
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 15%;">SKU</th>
        <th style="width: 30%;">Product Name</th>
        <th class="text-center" style="width: 12%;">Ordered Qty</th>
        <th class="text-center" style="width: 12%;">Allocated Qty</th>
        <th style="width: 31%;">Allocation Details</th>
      </tr>
    </thead>
    <tbody>
      ${data.items.map(item => `
      <tr>
        <td>${item.productSku}</td>
        <td><strong>${item.productName}</strong></td>
        <td class="text-center">${item.orderedQuantity}</td>
        <td class="text-center"><strong>${item.allocatedQuantity}</strong></td>
        <td>
          <div class="allocation-breakdown">
            ${item.allocations.map(alloc => `
            <div class="allocation-item">
              <strong>📦 ${alloc.binLocation}</strong> × ${alloc.quantity} units
              <div class="allocation-details">
                ${alloc.batchNumber ? `Batch: ${alloc.batchNumber} | ` : ''}
                ${alloc.lotNumber ? `Lot: ${alloc.lotNumber} | ` : ''}
                ${alloc.expiryDate ? `Exp: ${new Date(alloc.expiryDate).toLocaleDateString()}` : 'No expiry'}
              </div>
            </div>
            `).join('')}
          </div>
        </td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>This is a computer-generated allocation document. No signature is required.</p>
    <p>Generated on ${currentDate} | Document ID: ${data.id}</p>
  </div>
</body>
</html>`;
  }

  static async generateAndSave(
    data: AllocationDocumentData,
    userId: string,
    version: number = 1
  ): Promise<{ filePath: string; documentId: string }> {
    try {
      const year = new Date().getFullYear();
      const dirPath = path.join(
        process.cwd(),
        'storage',
        'sales-order',
        'allocations',
        'tenants',
        data.tenantId,
        year.toString()
      );

      await fs.mkdir(dirPath, { recursive: true });

      const fileName = `${data.allocationNumber}.html`;
      const filePath = path.join(dirPath, fileName);
      const htmlContent = this.generateHTML(data);

      await fs.writeFile(filePath, htmlContent, 'utf-8');

      const relativePath = `storage/sales-order/allocations/tenants/${data.tenantId}/${year}/${fileName}`;
      const fileStats = await fs.stat(filePath);

      const [document] = await db
        .insert(generatedDocuments)
        .values({
          tenantId: data.tenantId,
          documentType: 'allocation',
          documentNumber: data.allocationNumber,
          referenceType: 'sales_order',
          referenceId: data.id,
          files: {
            html: {
              path: relativePath,
              size: fileStats.size,
              generated_at: new Date().toISOString()
            }
          },
          version,
          generatedBy: userId
        })
        .returning();

      return {
        filePath: relativePath,
        documentId: document.id
      };
    } catch (error) {
      console.error('Error generating allocation document:', error);
      throw error;
    }
  }
}
