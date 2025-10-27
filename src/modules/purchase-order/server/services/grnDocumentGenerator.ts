import { promises as fs } from 'fs';
import path from 'path';

interface GRNDocumentData {
  grnNumber: string;
  tenantId: string;
  poNumber: string;
  poId: string;
  receiptDate: string;
  receivedByName: string | null;
  supplierName: string;
  warehouseName: string | null;
  warehouseAddress: string | null;
  warehouseCity: string | null;
  notes: string | null;
  items: Array<{
    productSku: string;
    productName: string;
    orderedQuantity: number;
    receivedQuantity: number;
    discrepancy: number;
    expiryDate: string | null;
    discrepancyNote: string | null;
  }>;
}

export class GRNDocumentGenerator {
  static generateHTML(grnData: GRNDocumentData): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedReceiptDate = grnData.receiptDate 
      ? new Date(grnData.receiptDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    const warehouseAddress = [
      grnData.warehouseAddress,
      grnData.warehouseCity
    ].filter(Boolean).join(', ') || 'N/A';

    const totalOrdered = grnData.items.reduce((sum, item) => sum + item.orderedQuantity, 0);
    const totalReceived = grnData.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
    const hasDiscrepancies = grnData.items.some(item => item.discrepancy !== 0);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Goods Receipt Note - ${grnData.grnNumber}</title>
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
    
    .header .grn-number {
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
      width: 140px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-complete {
      background-color: #d4edda;
      color: #155724;
    }
    
    .status-partial {
      background-color: #fff3cd;
      color: #856404;
    }
    
    .status-discrepancy {
      background-color: #f8d7da;
      color: #721c24;
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
      font-size: 13px;
      text-transform: uppercase;
    }
    
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #ddd;
      font-size: 14px;
    }
    
    .items-table tr:last-child td {
      border-bottom: none;
    }
    
    .items-table .product-name {
      font-weight: 600;
      margin-bottom: 2px;
    }
    
    .items-table .product-sku {
      font-size: 12px;
      color: #666;
    }
    
    .items-table .qty-match {
      color: #28a745;
      font-weight: 600;
    }
    
    .items-table .qty-short {
      color: #dc3545;
      font-weight: 600;
    }
    
    .items-table .qty-over {
      color: #ffc107;
      font-weight: 600;
    }
    
    .discrepancy-note {
      margin-top: 4px;
      padding: 6px 10px;
      background-color: #fff3cd;
      border-left: 3px solid #ffc107;
      font-size: 12px;
      font-style: italic;
    }
    
    .summary-section {
      margin: 30px 0;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #007bff;
    }
    
    .summary-section h3 {
      font-size: 16px;
      margin-bottom: 12px;
      color: #333;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    
    .summary-item {
      text-align: center;
    }
    
    .summary-item .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .summary-item .value {
      font-size: 28px;
      font-weight: bold;
      color: #333;
    }
    
    .notes-section {
      margin: 30px 0;
      padding: 20px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
    }
    
    .notes-section h3 {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .notes-section p {
      font-size: 14px;
      color: #555;
      line-height: 1.6;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #999;
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
      
      .footer {
        position: fixed;
        bottom: 0;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>GOODS RECEIPT NOTE</h1>
    <div class="grn-number">GRN #${grnData.grnNumber}</div>
    <p>Generated on ${currentDate}</p>
  </div>

  <div class="document-info">
    <div class="info-section">
      <h2>Receipt Information</h2>
      <div class="detail-line">
        <span class="label">GRN Number:</span>
        <strong>${grnData.grnNumber}</strong>
      </div>
      <div class="detail-line">
        <span class="label">PO Reference:</span>
        <strong>${grnData.poNumber}</strong>
      </div>
      <div class="detail-line">
        <span class="label">Receipt Date:</span>
        ${formattedReceiptDate}
      </div>
      <div class="detail-line">
        <span class="label">Received By:</span>
        ${grnData.receivedByName || 'N/A'}
      </div>
    </div>

    <div class="info-section">
      <h2>Supplier & Warehouse</h2>
      <div class="company-name">${grnData.supplierName}</div>
      <div class="detail-line">
        <span class="label">Warehouse:</span>
        ${grnData.warehouseName || 'N/A'}
      </div>
      <div class="detail-line">
        <span class="label">Location:</span>
        ${warehouseAddress}
      </div>
    </div>
  </div>

  <div class="summary-section">
    <h3>Receipt Summary</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="label">Items Received</div>
        <div class="value">${grnData.items.length}</div>
      </div>
      <div class="summary-item">
        <div class="label">Total Ordered</div>
        <div class="value">${totalOrdered}</div>
      </div>
      <div class="summary-item">
        <div class="label">Total Received</div>
        <div class="value">${totalReceived}</div>
      </div>
    </div>
  </div>

  ${hasDiscrepancies ? `
  <div class="info-section" style="background-color: #fff3cd; border-color: #ffc107; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">⚠️</span>
      <strong style="color: #856404;">Discrepancies Detected</strong>
    </div>
    <p style="margin-top: 8px; font-size: 13px; color: #856404;">
      Some items have quantity discrepancies. Please review the notes below for details.
    </p>
  </div>
  ` : ''}

  <table class="items-table">
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align: center; width: 100px;">Ordered</th>
        <th style="text-align: center; width: 100px;">Received</th>
        <th style="text-align: center; width: 100px;">Variance</th>
        <th style="text-align: center; width: 120px;">Expiry Date</th>
        <th style="text-align: center; width: 80px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${grnData.items.map(item => {
        const varianceClass = item.discrepancy === 0 ? 'qty-match' 
          : item.discrepancy < 0 ? 'qty-short' 
          : 'qty-over';
        const statusClass = item.discrepancy === 0 ? 'status-complete' 
          : 'status-discrepancy';
        const statusText = item.discrepancy === 0 ? 'Complete' 
          : item.discrepancy < 0 ? 'Short' 
          : 'Over';
        
        const formattedExpiry = item.expiryDate 
          ? new Date(item.expiryDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : 'N/A';

        return `
      <tr>
        <td>
          <div class="product-name">${item.productName}</div>
          <div class="product-sku">SKU: ${item.productSku}</div>
          ${item.discrepancyNote ? `
          <div class="discrepancy-note">
            <strong>Note:</strong> ${item.discrepancyNote}
          </div>
          ` : ''}
        </td>
        <td style="text-align: center;">${item.orderedQuantity}</td>
        <td style="text-align: center;">${item.receivedQuantity}</td>
        <td style="text-align: center;" class="${varianceClass}">
          ${item.discrepancy > 0 ? '+' : ''}${item.discrepancy}
        </td>
        <td style="text-align: center;">${formattedExpiry}</td>
        <td style="text-align: center;">
          <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
      </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  ${grnData.notes ? `
  <div class="notes-section">
    <h3>Additional Notes</h3>
    <p>${grnData.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>This is an electronically generated document. No signature is required.</p>
    <p>GRN #${grnData.grnNumber} | PO Reference: ${grnData.poNumber}</p>
  </div>
</body>
</html>`;
  }
}
