import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@server/lib/db';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';

interface DeliveryItemData {
  productName: string;
  sku: string;
  shippedQuantity: string;
  acceptedQuantity: string;
  rejectedQuantity: string;
  rejectionNotes: string | null;
}

interface DeliverDocumentData {
  id: string;
  tenantId: string;
  deliveryNumber: string;
  orderNumber: string;
  orderDate: string;
  shipmentNumber: string;
  trackingNumber: string;
  deliveryDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  recipientName: string | null;
  status: string;
  notes: string | null;
  returnPurchaseOrderNumber: string | null;
  deliveredByName: string | null;
  items: DeliveryItemData[];
}

export class DeliverDocumentGenerator {
  static generateHTML(data: DeliverDocumentData): string {
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

    const formattedDeliveryDate = data.deliveryDate 
      ? new Date(data.deliveryDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    // Calculate totals
    let totalShipped = 0;
    let totalAccepted = 0;
    let totalRejected = 0;

    data.items.forEach(item => {
      totalShipped += parseFloat(item.shippedQuantity);
      totalAccepted += parseFloat(item.acceptedQuantity);
      totalRejected += parseFloat(item.rejectedQuantity);
    });

    // Generate items table
    const itemsHTML = data.items.map((item, idx) => {
      const hasRejection = parseFloat(item.rejectedQuantity) > 0;
      const rowClass = hasRejection ? 'rejected-row' : '';
      
      return `
        <tr class="${rowClass}">
          <td style="padding: 10px; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px;">${item.sku}</td>
          <td style="padding: 10px;">${item.productName}</td>
          <td style="padding: 10px; text-align: center;">${item.shippedQuantity}</td>
          <td style="padding: 10px; text-align: center; font-weight: bold; color: #2e7d32;">${item.acceptedQuantity}</td>
          <td style="padding: 10px; text-align: center; ${hasRejection ? 'font-weight: bold; color: #d32f2f;' : ''}">${item.rejectedQuantity}</td>
          <td style="padding: 10px; font-size: 12px; color: #666;">${item.rejectionNotes || '-'}</td>
        </tr>
      `;
    }).join('');

    // Return section (only for partial deliveries)
    const returnSection = data.status === 'partial' && data.returnPurchaseOrderNumber ? `
      <div class="return-section">
        <h2>⚠️ Return Purchase Order Created</h2>
        <div class="return-info">
          <div class="return-detail">
            <span class="label">Return PO Number:</span>
            <strong>${data.returnPurchaseOrderNumber}</strong>
          </div>
          <div class="return-detail">
            <span class="label">Total Rejected Items:</span>
            <strong style="color: #d32f2f;">${totalRejected.toFixed(3)}</strong>
          </div>
          <p class="return-note">
            Rejected items will be processed through the receiving workflow and returned to inventory.
          </p>
        </div>
      </div>
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Confirmation - ${data.deliveryNumber}</title>
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
      color: ${data.status === 'complete' ? '#2e7d32' : '#ff6f00'};
    }
    
    .header p {
      font-size: 14px;
      color: #666;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      margin-top: 8px;
      background-color: ${data.status === 'complete' ? '#c8e6c9' : '#ffe0b2'};
      color: ${data.status === 'complete' ? '#1b5e20' : '#e65100'};
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
      margin: 6px 0;
    }
    
    .info-section .label {
      font-weight: 600;
      display: inline-block;
      width: 140px;
    }

    .delivery-info {
      background-color: ${data.status === 'complete' ? '#e8f5e9' : '#fff3cd'};
      border: 2px solid ${data.status === 'complete' ? '#4caf50' : '#ffc107'};
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .delivery-info h2 {
      font-size: 18px;
      font-weight: bold;
      color: ${data.status === 'complete' ? '#2e7d32' : '#856404'};
      margin-bottom: 12px;
    }

    .delivery-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    .delivery-detail {
      font-size: 14px;
    }

    .delivery-detail .label {
      font-weight: 600;
      display: inline-block;
      width: 160px;
      color: ${data.status === 'complete' ? '#2e7d32' : '#856404'};
    }

    .return-section {
      background-color: #ffebee;
      border: 2px solid #f44336;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .return-section h2 {
      font-size: 18px;
      font-weight: bold;
      color: #c62828;
      margin-bottom: 12px;
    }

    .return-info {
      background-color: #fff;
      padding: 15px;
      border-radius: 6px;
    }

    .return-detail {
      font-size: 14px;
      margin: 8px 0;
    }

    .return-detail .label {
      font-weight: 600;
      display: inline-block;
      width: 180px;
      color: #c62828;
    }

    .return-note {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f44336;
      font-size: 13px;
      color: #666;
      font-style: italic;
    }
    
    .items-section {
      margin-top: 30px;
    }
    
    .items-section h2 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 16px;
      color: #333;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      background-color: #fff;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .items-table thead {
      background-color: #424242;
      color: #fff;
    }
    
    .items-table th {
      padding: 12px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
    }
    
    .items-table tbody tr {
      border-bottom: 1px solid #e0e0e0;
    }
    
    .items-table tbody tr:last-child {
      border-bottom: none;
    }
    
    .items-table tbody tr:hover {
      background-color: #f5f5f5;
    }

    .items-table tbody tr.rejected-row {
      background-color: #ffebee;
    }

    .items-table tbody tr.rejected-row:hover {
      background-color: #ffcdd2;
    }
    
    .items-table td {
      padding: 10px;
      font-size: 14px;
    }

    .items-table tfoot {
      background-color: #f5f5f5;
      font-weight: bold;
    }

    .items-table tfoot td {
      padding: 12px 10px;
      border-top: 2px solid #424242;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 12px;
    }

    .signature-section {
      margin-top: 50px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
    }

    .signature-box {
      border-top: 2px solid #000;
      padding-top: 10px;
    }

    .signature-box .label {
      font-weight: 600;
      font-size: 14px;
    }

    .signature-box .sublabel {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
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
    <h1>DELIVERY CONFIRMATION</h1>
    <p>Document Number: ${data.deliveryNumber}</p>
    <div class="status-badge">${data.status === 'complete' ? '✓ COMPLETE DELIVERY' : '⚠ PARTIAL DELIVERY'}</div>
  </div>

  <div class="document-info">
    <div class="info-section">
      <h2>Delivery Information</h2>
      <div class="detail-line">
        <span class="label">Delivery Number:</span>
        <strong>${data.deliveryNumber}</strong>
      </div>
      <div class="detail-line">
        <span class="label">Sales Order:</span>
        ${data.orderNumber}
      </div>
      <div class="detail-line">
        <span class="label">Order Date:</span>
        ${formattedOrderDate}
      </div>
      <div class="detail-line">
        <span class="label">Shipment Number:</span>
        ${data.shipmentNumber}
      </div>
      <div class="detail-line">
        <span class="label">Tracking Number:</span>
        ${data.trackingNumber}
      </div>
      <div class="detail-line">
        <span class="label">Delivery Date:</span>
        <strong>${formattedDeliveryDate}</strong>
      </div>
      ${data.deliveredByName ? `
        <div class="detail-line" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
          <span class="label">Confirmed By:</span>
          ${data.deliveredByName}
        </div>
      ` : ''}
    </div>

    <div class="info-section">
      <h2>Customer Information</h2>
      <div class="company-name">${data.customerName}</div>
      ${data.customerEmail ? `<div class="detail-line">📧 ${data.customerEmail}</div>` : ''}
      ${data.customerPhone ? `<div class="detail-line">📞 ${data.customerPhone}</div>` : ''}
      ${data.recipientName ? `
        <div class="detail-line" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
          <span class="label">Received By:</span>
          <strong>${data.recipientName}</strong>
        </div>
      ` : ''}
    </div>
  </div>

  <div class="delivery-info">
    <h2>${data.status === 'complete' ? '✓ Complete Delivery' : '⚠️ Partial Delivery'}</h2>
    <div class="delivery-grid">
      <div class="delivery-detail">
        <span class="label">Total Items Shipped:</span>
        <strong>${totalShipped.toFixed(3)}</strong>
      </div>
      <div class="delivery-detail">
        <span class="label">Total Items Accepted:</span>
        <strong style="color: #2e7d32;">${totalAccepted.toFixed(3)}</strong>
      </div>
      ${data.status === 'partial' ? `
        <div class="delivery-detail">
          <span class="label">Total Items Rejected:</span>
          <strong style="color: #d32f2f;">${totalRejected.toFixed(3)}</strong>
        </div>
      ` : ''}
      <div class="delivery-detail">
        <span class="label">Delivery Status:</span>
        <strong>${data.status === 'complete' ? 'Complete' : 'Partial (with returns)'}</strong>
      </div>
    </div>
    ${data.notes ? `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid ${data.status === 'complete' ? '#4caf50' : '#ffc107'};">
        <div class="delivery-detail">
          <span class="label">Delivery Notes:</span>
        </div>
        <div style="margin-top: 8px; padding: 10px; background-color: #fff; border-radius: 4px;">
          ${data.notes}
        </div>
      </div>
    ` : ''}
  </div>

  ${returnSection}

  <div class="items-section">
    <h2>📋 Delivery Items</h2>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50px;">#</th>
          <th style="width: 120px;">SKU</th>
          <th>Product Name</th>
          <th style="width: 100px; text-align: center;">Shipped</th>
          <th style="width: 100px; text-align: center;">Accepted</th>
          <th style="width: 100px; text-align: center;">Rejected</th>
          <th style="width: 200px;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align: right;">TOTALS:</td>
          <td style="text-align: center;">${totalShipped.toFixed(3)}</td>
          <td style="text-align: center; color: #2e7d32;">${totalAccepted.toFixed(3)}</td>
          <td style="text-align: center; ${data.status === 'partial' ? 'color: #d32f2f;' : ''}">${totalRejected.toFixed(3)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="label">Delivery Confirmed By</div>
      <div class="sublabel">Name & Date</div>
    </div>
    <div class="signature-box">
      <div class="label">Customer Signature</div>
      <div class="sublabel">Name & Date</div>
    </div>
  </div>

  <div class="footer">
    <p>This is a computer-generated delivery confirmation document.</p>
    <p>Generated on ${currentDate} | Document: ${data.deliveryNumber}</p>
  </div>
</body>
</html>`;
  }

  static async save(data: DeliverDocumentData, userId: string): Promise<{ filePath: string; documentId: string }> {
    // Generate HTML content
    const htmlContent = this.generateHTML(data);

    // Determine storage path
    const year = new Date(data.deliveryDate).getFullYear();
    const relativePath = `storage/sales-order/deliveries/tenants/${data.tenantId}/${year}`;
    const fileName = `${data.deliveryNumber}.html`;
    
    // Create directory if it doesn't exist
    const fullDirPath = path.join(process.cwd(), relativePath);
    await fs.mkdir(fullDirPath, { recursive: true });
    
    // Write HTML file
    const fullFilePath = path.join(fullDirPath, fileName);
    await fs.writeFile(fullFilePath, htmlContent, 'utf-8');
    
    // Store in generated_documents table
    const relativeFilePath = `${relativePath}/${fileName}`;
    
    const [document] = await db
      .insert(generatedDocuments)
      .values({
        tenantId: data.tenantId,
        documentType: 'DELIVERY',
        documentNumber: data.deliveryNumber,
        referenceType: 'sales_order',
        referenceId: data.id,
        files: {
          html: {
            path: relativeFilePath,
            size: Buffer.byteLength(htmlContent, 'utf-8'),
            generated_at: new Date().toISOString(),
          },
        },
        version: 1,
        generatedBy: userId,
      })
      .returning();

    return {
      filePath: relativeFilePath,
      documentId: document.id,
    };
  }
}
