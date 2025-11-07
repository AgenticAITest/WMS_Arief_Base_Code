import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@server/lib/db';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';

interface PackageItem {
  productId: string;
  salesOrderItemId: string;
  quantity: number;
  productName: string;
  sku: string;
}

interface PackageData {
  id: string;
  packageId: string;
  packageNumber: string;
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  items: PackageItem[];
}

interface PackDocumentData {
  id: string;
  tenantId: string;
  packNumber: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  totalAmount: string;
  packedByName: string | null;
  packages: PackageData[];
}

export class PackDocumentGenerator {
  static generateHTML(data: PackDocumentData): string {
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
  <title>Pack Document - ${data.packNumber}</title>
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
      width: 120px;
    }
    
    .packages-section {
      margin-top: 30px;
    }
    
    .packages-section h2 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 16px;
      color: #1976d2;
    }
    
    .package-card {
      border: 2px solid #1976d2;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      background-color: #f8f9fa;
    }
    
    .package-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #1976d2;
    }
    
    .package-header h3 {
      font-size: 18px;
      font-weight: bold;
      color: #1976d2;
    }
    
    .package-number {
      font-size: 14px;
      color: #666;
      font-family: monospace;
      background-color: #fff;
      padding: 4px 12px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    
    .package-dimensions {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px;
      background-color: #fff;
      border-radius: 6px;
    }
    
    .dimension-item {
      text-align: center;
      padding: 8px;
      border-right: 1px solid #e0e0e0;
    }
    
    .dimension-item:last-child {
      border-right: none;
    }
    
    .dimension-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .dimension-value {
      font-size: 16px;
      font-weight: bold;
      color: #000;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #ddd;
      background-color: #fff;
    }
    
    .items-table thead {
      background-color: #1976d2;
      color: #fff;
    }
    
    .items-table th {
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      border: 1px solid #fff;
    }
    
    .items-table td {
      padding: 8px 12px;
      border: 1px solid #ddd;
      font-size: 13px;
    }
    
    .items-table tbody tr:nth-child(even) {
      background-color: #f5f5f5;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .summary {
      margin-top: 30px;
      padding: 20px;
      background-color: #f5f5f5;
      border-radius: 8px;
      border-left: 4px solid #1976d2;
    }
    
    .summary .summary-line {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      margin: 6px 0;
    }
    
    .summary .summary-line.total {
      font-size: 18px;
      font-weight: bold;
      padding-top: 12px;
      border-top: 2px solid #1976d2;
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
    <h1>PACK DOCUMENT</h1>
    <p>Generated on ${currentDate}</p>
  </div>

  <div class="document-info">
    <div class="info-section">
      <h2>Pack Information</h2>
      <div class="detail-line">
        <span class="label">Pack Number:</span>
        <span>${data.packNumber}</span>
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
        <span class="label">Packed By:</span>
        <span>${data.packedByName || 'N/A'}</span>
      </div>
    </div>

    <div class="info-section">
      <h2>Customer Information</h2>
      <div class="company-name">${data.customerName}</div>
    </div>
  </div>

  <div class="packages-section">
    <h2>Packages (${data.packages.length} Total)</h2>
    ${data.packages.map((pkg, index) => `
      <div class="package-card">
        <div class="package-header">
          <h3>Package ${index + 1} of ${data.packages.length}</h3>
          <span class="package-number">${pkg.packageNumber}</span>
        </div>
        
        <div class="package-dimensions">
          <div class="dimension-item">
            <div class="dimension-label">Length</div>
            <div class="dimension-value">${pkg.length ?? 'N/A'} ${pkg.length ? 'cm' : ''}</div>
          </div>
          <div class="dimension-item">
            <div class="dimension-label">Width</div>
            <div class="dimension-value">${pkg.width ?? 'N/A'} ${pkg.width ? 'cm' : ''}</div>
          </div>
          <div class="dimension-item">
            <div class="dimension-label">Height</div>
            <div class="dimension-value">${pkg.height ?? 'N/A'} ${pkg.height ? 'cm' : ''}</div>
          </div>
          <div class="dimension-item">
            <div class="dimension-label">Weight</div>
            <div class="dimension-value">${pkg.weight ?? 'N/A'} ${pkg.weight ? 'kg' : ''}</div>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>Product SKU</th>
              <th>Product Name</th>
              <th class="text-right" style="width: 120px;">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${pkg.items.map((item, itemIndex) => `
              <tr>
                <td class="text-center">${itemIndex + 1}</td>
                <td style="font-weight: 600;">${item.sku}</td>
                <td>${item.productName}</td>
                <td class="text-right">${Number(item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  </div>

  <div class="summary">
    <div class="summary-line">
      <span>Total Packages:</span>
      <span>${data.packages.length}</span>
    </div>
    <div class="summary-line">
      <span>Total Items:</span>
      <span>${data.packages.reduce((sum, pkg) => sum + pkg.items.length, 0)}</span>
    </div>
    <div class="summary-line total">
      <span>Order Total Amount:</span>
      <span>$${parseFloat(data.totalAmount).toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <p>This is a computer-generated document. No signature is required.</p>
    <p>Pack Document ID: ${data.id}</p>
  </div>
</body>
</html>`;
  }

  static async save(data: PackDocumentData, userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const dirPath = path.join(
      process.cwd(),
      'storage',
      'sales-order',
      'packs',
      'tenants',
      data.tenantId,
      year.toString()
    );

    await fs.mkdir(dirPath, { recursive: true });

    const fileName = `${data.packNumber}.html`;
    const filePath = path.join(dirPath, fileName);

    const html = this.generateHTML(data);
    await fs.writeFile(filePath, html, 'utf-8');

    const relativePath = `storage/sales-order/packs/tenants/${data.tenantId}/${year}/${fileName}`;
    const fileStats = await fs.stat(filePath);

    await db.insert(generatedDocuments).values({
      tenantId: data.tenantId,
      documentType: 'PACK',
      documentNumber: data.packNumber,
      referenceType: 'sales_order',
      referenceId: data.id,
      files: {
        html: {
          path: relativePath,
          size: fileStats.size,
          generated_at: new Date().toISOString()
        }
      },
      version: 1,
      generatedBy: userId
    });

    return relativePath;
  }
}
