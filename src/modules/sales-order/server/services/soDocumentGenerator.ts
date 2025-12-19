import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@server/lib/db';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';
import { eq, and, desc } from 'drizzle-orm';

interface SOItemLocation {
  locationAddress: string;
  quantity: number;
}

interface SODocumentData {
  id: string;
  tenantId: string;
  orderNumber: string;
  orderDate: string;
  requestedDeliveryDate: string | null;
  totalAmount: string;
  notes: string | null;
  deliveryInstructions: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  createdByName: string | null;
  status: string;
  items: Array<{
    productSku: string;
    productName: string;
    orderedQuantity: number;
    unitPrice: string;
    totalPrice: string;
    locations: SOItemLocation[];
  }>;
}

export class SODocumentGenerator {
  static generateHTML(soData: SODocumentData): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedOrderDate = soData.orderDate 
      ? new Date(soData.orderDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'N/A';

    const formattedDeliveryDate = soData.requestedDeliveryDate
      ? new Date(soData.requestedDeliveryDate).toLocaleDateString('en-US', {
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
  <title>Sales Order - ${soData.orderNumber}</title>
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
      background-color: #f5f5f5;
    }
    
    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #000;
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
    
    .location-breakdown {
      padding-left: 20px;
      margin-top: 8px;
    }
    
    .location-item {
      font-size: 13px;
      color: #555;
      padding: 4px 0;
      border-left: 3px solid #4CAF50;
      padding-left: 12px;
      margin: 4px 0;
    }
    
    .total-section {
      display: flex;
      justify-content: flex-end;
      margin: 20px 0;
    }
    
    .total-box {
      background-color: #f9f9f9;
      border: 2px solid #000;
      padding: 15px 25px;
      min-width: 300px;
    }
    
    .total-box .total-label {
      font-size: 18px;
      font-weight: bold;
      display: inline-block;
      margin-right: 20px;
    }
    
    .total-box .total-amount {
      font-size: 24px;
      font-weight: bold;
      float: right;
    }
    
    .notes-section {
      margin: 30px 0;
      padding: 20px;
      background-color: #f9f9f9;
      border-left: 4px solid #000;
    }
    
    .notes-section h3 {
      font-size: 16px;
      margin-bottom: 10px;
      font-weight: bold;
    }
    
    .notes-section p {
      font-size: 14px;
      line-height: 1.8;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #000;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      background-color: #e3f2fd;
      color: #1976d2;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>SALES ORDER</h1>
    <p>This document serves as an official sales order</p>
  </div>
  
  <div class="document-info">
    <div class="info-section">
      <h2>Customer Information</h2>
      <div class="company-name">${soData.customerName}</div>
      ${soData.customerEmail ? `<div class="detail-line">Email: ${soData.customerEmail}</div>` : ''}
      ${soData.customerPhone ? `<div class="detail-line">Phone: ${soData.customerPhone}</div>` : ''}
    </div>

    <div class="info-section">
      <h2>Order Information</h2>
      <div class="detail-line">
        <span class="label">SO Number:</span>
        <strong>${soData.orderNumber}</strong>
      </div>
      <div class="detail-line">
        <span class="label">Order Date:</span>
        ${formattedOrderDate}
      </div>
      ${soData.requestedDeliveryDate ? `
      <div class="detail-line">
        <span class="label">Requested Delivery:</span>
        ${formattedDeliveryDate}
      </div>
      ` : ''}
      <div class="detail-line">
        <span class="label">Status:</span>
        <span class="status-badge">${soData.status}</span>
      </div>
      ${soData.createdByName ? `
      <div class="detail-line">
        <span class="label">Created By:</span>
        ${soData.createdByName}
      </div>
      ` : ''}
      <div class="detail-line">
        <span class="label">Generated:</span>
        ${currentDate}
      </div>
    </div>
  </div>

  ${soData.deliveryInstructions ? `
  <div class="notes-section" style="margin-bottom: 20px;">
    <h3>Delivery Instructions</h3>
    <p>${soData.deliveryInstructions}</p>
  </div>
  ` : ''}
  
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 15%;">SKU</th>
        <th style="width: 30%;">Product Name</th>
        <th class="text-center" style="width: 12%;">Quantity</th>
        <th class="text-right" style="width: 15%;">Unit Price</th>
        <th class="text-right" style="width: 15%;">Total Price</th>
      </tr>
    </thead>
    <tbody>
      ${soData.items.map(item => `
      <tr>
        <td>${item.productSku}</td>
        <td>
          ${item.productName}
          ${item.locations.length > 1 ? `
          <div class="location-breakdown">
            <strong style="font-size: 12px; color: #666;">Multi-Location Delivery:</strong>
            ${item.locations.map(loc => `
            <div class="location-item">
              📍 ${loc.locationAddress} × ${loc.quantity} units
            </div>
            `).join('')}
          </div>
          ` : item.locations.length === 1 ? `
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            📍 Deliver to: ${item.locations[0].locationAddress}
          </div>
          ` : ''}
        </td>
        <td class="text-center">${parseInt(item.orderedQuantity.toString(), 10)}</td>
        <td class="text-right">$${parseFloat(item.unitPrice).toFixed(2)}</td>
        <td class="text-right">$${parseFloat(item.totalPrice).toFixed(2)}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="total-section">
    <div class="total-box">
      <span class="total-label">TOTAL AMOUNT:</span>
      <span class="total-amount">$${parseFloat(soData.totalAmount).toFixed(2)}</span>
    </div>
  </div>
  
  ${soData.notes ? `
  <div class="notes-section">
    <h3>Notes</h3>
    <p>${soData.notes}</p>
  </div>
  ` : ''}
  
  <div class="footer">
    <p>This is a computer-generated document. No signature is required.</p>
    <p>Generated on ${currentDate} | Document ID: ${soData.id}</p>
  </div>
</body>
</html>`;
  }

  /**
   * Generate HTML preview without saving to file system or database
   * Used for showing preview in confirmation modal
   */
  static generatePreview(soData: SODocumentData): string {
    return this.generateHTML(soData);
  }

  static async generateAndSave(
    soData: SODocumentData,
    userId: string,
    version: number = 1
  ): Promise<{ filePath: string; documentId: string }> {
    try {
      const year = new Date(soData.orderDate).getFullYear();
      const dirPath = path.join(
        process.cwd(),
        'storage',
        'sales-order',
        'documents',
        'tenants',
        soData.tenantId,
        'so',
        year.toString()
      );

      await fs.mkdir(dirPath, { recursive: true });

      const fileName = `${soData.orderNumber}.html`;
      const filePath = path.join(dirPath, fileName);
      const htmlContent = this.generateHTML(soData);

      await fs.writeFile(filePath, htmlContent, 'utf-8');

      const relativePath = `storage/sales-order/documents/tenants/${soData.tenantId}/so/${year}/${fileName}`;
      const fileStats = await fs.stat(filePath);

      const [document] = await db
        .insert(generatedDocuments)
        .values({
          tenantId: soData.tenantId,
          documentType: 'sales_order',
          documentNumber: soData.orderNumber,
          referenceType: 'sales_order',
          referenceId: soData.id,
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
      console.error('Error generating SO document:', error);
      throw error;
    }
  }

  static async regenerateDocument(
    soData: SODocumentData,
    userId: string
  ): Promise<{ filePath: string; documentId: string }> {
    const existingDocs = await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.tenantId, soData.tenantId),
          eq(generatedDocuments.referenceType, 'sales_order'),
          eq(generatedDocuments.referenceId, soData.id)
        )
      )
      .orderBy(desc(generatedDocuments.version))
      .limit(1);

    const nextVersion = existingDocs.length > 0 ? existingDocs[0].version + 1 : 1;

    return this.generateAndSave(soData, userId, nextVersion);
  }
}
