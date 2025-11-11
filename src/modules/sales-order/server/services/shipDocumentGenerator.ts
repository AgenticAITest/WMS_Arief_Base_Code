import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@server/lib/db';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';
import { transporters as transportersTable, shippingMethods } from '@modules/master-data/server/lib/db/schemas/masterData';
import { eq } from 'drizzle-orm';

interface PackageItem {
  productId: string;
  salesOrderItemId: string;
  quantity: number;
  productName: string;
  sku: string;
}

interface DeliveryLocation {
  id: string;
  locationType: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
}

interface PackageData {
  id: string;
  packageId: string;
  packageNumber: string;
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  barcode: string | null;
  items: PackageItem[];
  deliveryLocation: DeliveryLocation | null;
}

interface ShipDocumentData {
  id: string;
  tenantId: string;
  shipNumber: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: string;
  shippedByName: string | null;
  trackingNumber: string;
  shippingDate: string;
  estimatedDeliveryDate: string | null;
  notes: string;
  packages: PackageData[];
  transporterId: string;
  shippingMethodId: string | null;
}

export class ShipDocumentGenerator {
  static generateHTML(data: ShipDocumentData, transporterName: string, shippingMethodName: string | null): string {
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

    const formattedShippingDate = data.shippingDate 
      ? new Date(data.shippingDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'N/A';

    const formattedEstimatedDelivery = data.estimatedDeliveryDate 
      ? new Date(data.estimatedDeliveryDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'Not specified';

    // Generate package cards HTML
    const packagesHTML = data.packages.map((pkg, index) => {
      const dimensions = [pkg.length, pkg.width, pkg.height]
        .filter(d => d !== null)
        .map(d => `${d} cm`)
        .join(' × ') || 'Not specified';

      const weight = pkg.weight ? `${pkg.weight} kg` : 'Not specified';

      // Generate items table
      const itemsHTML = pkg.items.map((item, idx) => `
        <tr>
          <td style="padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px;">${item.sku}</td>
          <td style="padding: 8px;">${item.productName}</td>
          <td style="padding: 8px; text-align: center;">${item.quantity}</td>
        </tr>
      `).join('');

      // Delivery location details
      const locationHTML = pkg.deliveryLocation ? `
        <div class="location-box">
          <h4>📍 Delivery Destination</h4>
          <div class="location-details">
            <div class="detail-line"><strong>Type:</strong> ${pkg.deliveryLocation.locationType || 'N/A'}</div>
            ${pkg.deliveryLocation.address ? `<div class="detail-line"><strong>Address:</strong> ${pkg.deliveryLocation.address}</div>` : ''}
            <div class="detail-line"><strong>City:</strong> ${pkg.deliveryLocation.city || 'N/A'}</div>
            <div class="detail-line"><strong>State:</strong> ${pkg.deliveryLocation.state || 'N/A'}</div>
            <div class="detail-line"><strong>Postal Code:</strong> ${pkg.deliveryLocation.postalCode || 'N/A'}</div>
            <div class="detail-line"><strong>Country:</strong> ${pkg.deliveryLocation.country || 'N/A'}</div>
            ${pkg.deliveryLocation.contactPerson ? `<div class="detail-line"><strong>Contact:</strong> ${pkg.deliveryLocation.contactPerson}</div>` : ''}
            ${pkg.deliveryLocation.phone ? `<div class="detail-line"><strong>Phone:</strong> ${pkg.deliveryLocation.phone}</div>` : ''}
            ${pkg.deliveryLocation.email ? `<div class="detail-line"><strong>Email:</strong> ${pkg.deliveryLocation.email}</div>` : ''}
          </div>
        </div>
      ` : '<div class="location-box"><p style="color: #999;">No delivery location assigned</p></div>';

      return `
        <div class="package-card">
          <div class="package-header">
            <h3>Package ${index + 1}</h3>
            <span class="package-number">${pkg.packageNumber}</span>
          </div>
          
          <div class="package-details">
            <div class="detail-row">
              <span class="label">Package ID:</span>
              <span class="value">${pkg.packageId}</span>
            </div>
            ${pkg.barcode ? `
              <div class="detail-row">
                <span class="label">Barcode:</span>
                <span class="value">${pkg.barcode}</span>
              </div>
            ` : ''}
            <div class="detail-row">
              <span class="label">Dimensions:</span>
              <span class="value">${dimensions}</span>
            </div>
            <div class="detail-row">
              <span class="label">Weight:</span>
              <span class="value">${weight}</span>
            </div>
          </div>

          ${locationHTML}

          <div class="items-section">
            <h4>Package Contents</h4>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 60px;">#</th>
                  <th style="width: 150px;">SKU</th>
                  <th>Product Name</th>
                  <th style="width: 100px;">Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipment Instruction - ${data.shipNumber}</title>
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
      color: #d32f2f;
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

    .shipping-info {
      background-color: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .shipping-info h2 {
      font-size: 18px;
      font-weight: bold;
      color: #856404;
      margin-bottom: 12px;
    }

    .shipping-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    .shipping-detail {
      font-size: 14px;
    }

    .shipping-detail .label {
      font-weight: 600;
      display: inline-block;
      width: 160px;
      color: #856404;
    }
    
    .packages-section {
      margin-top: 30px;
    }
    
    .packages-section h2 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 16px;
      color: #d32f2f;
    }
    
    .package-card {
      border: 2px solid #d32f2f;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      background-color: #f8f9fa;
      page-break-inside: avoid;
    }
    
    .package-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #d32f2f;
    }
    
    .package-header h3 {
      font-size: 18px;
      font-weight: bold;
      color: #d32f2f;
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

    .package-details {
      background-color: #fff;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 15px;
    }

    .detail-row {
      display: flex;
      padding: 6px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row .label {
      font-weight: 600;
      width: 140px;
      color: #555;
    }

    .detail-row .value {
      flex: 1;
      color: #000;
    }

    .location-box {
      background-color: #e3f2fd;
      border: 2px solid #2196f3;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
    }

    .location-box h4 {
      font-size: 16px;
      font-weight: bold;
      color: #1565c0;
      margin-bottom: 10px;
    }

    .location-details {
      background-color: #fff;
      padding: 12px;
      border-radius: 4px;
    }

    .location-details .detail-line {
      font-size: 14px;
      margin: 6px 0;
      color: #333;
    }

    .location-details .detail-line strong {
      display: inline-block;
      width: 100px;
      color: #1565c0;
    }
    
    .items-section {
      margin-top: 15px;
    }

    .items-section h4 {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      background-color: #fff;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .items-table thead {
      background-color: #d32f2f;
      color: #fff;
    }
    
    .items-table th {
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
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
    
    .items-table td {
      padding: 8px;
      font-size: 14px;
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
      
      .package-card {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>SHIPMENT INSTRUCTION</h1>
    <p>Document Number: ${data.shipNumber}</p>
  </div>

  <div class="document-info">
    <div class="info-section">
      <h2>Shipment Information</h2>
      <div class="detail-line">
        <span class="label">Shipment Number:</span>
        <strong>${data.shipNumber}</strong>
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
        <span class="label">Shipping Date:</span>
        ${formattedShippingDate}
      </div>
      <div class="detail-line">
        <span class="label">Est. Delivery:</span>
        ${formattedEstimatedDelivery}
      </div>
      <div class="detail-line">
        <span class="label">Tracking Number:</span>
        <strong>${data.trackingNumber}</strong>
      </div>
      <div class="detail-line">
        <span class="label">Total Packages:</span>
        ${data.packages.length}
      </div>
    </div>

    <div class="info-section">
      <h2>Customer Information</h2>
      <div class="company-name">${data.customerName}</div>
      ${data.customerEmail ? `<div class="detail-line">📧 ${data.customerEmail}</div>` : ''}
      ${data.customerPhone ? `<div class="detail-line">📞 ${data.customerPhone}</div>` : ''}
      <div class="detail-line">
        <span class="label">Total Amount:</span>
        <strong>$${parseFloat(data.totalAmount).toFixed(2)}</strong>
      </div>
      ${data.shippedByName ? `
        <div class="detail-line" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
          <span class="label">Shipped By:</span>
          ${data.shippedByName}
        </div>
      ` : ''}
    </div>
  </div>

  <div class="shipping-info">
    <h2>🚚 Shipping Details</h2>
    <div class="shipping-grid">
      <div class="shipping-detail">
        <span class="label">Transporter:</span>
        <strong>${transporterName}</strong>
      </div>
      <div class="shipping-detail">
        <span class="label">Shipping Method:</span>
        ${shippingMethodName || 'Standard Shipping'}
      </div>
      <div class="shipping-detail">
        <span class="label">Tracking Number:</span>
        <strong>${data.trackingNumber}</strong>
      </div>
      <div class="shipping-detail">
        <span class="label">Date Generated:</span>
        ${currentDate}
      </div>
    </div>
    ${data.notes ? `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ffc107;">
        <div class="shipping-detail">
          <span class="label">Special Instructions:</span>
        </div>
        <div style="margin-top: 8px; padding: 10px; background-color: #fff; border-radius: 4px;">
          ${data.notes}
        </div>
      </div>
    ` : ''}
  </div>

  <div class="packages-section">
    <h2>📦 Package Details & Delivery Locations</h2>
    ${packagesHTML}
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="label">Warehouse Staff Signature</div>
      <div class="sublabel">Name & Date</div>
    </div>
    <div class="signature-box">
      <div class="label">Transporter Signature</div>
      <div class="sublabel">Name & Date</div>
    </div>
  </div>

  <div class="footer">
    <p>This is a computer-generated shipment instruction document.</p>
    <p>Generated on ${currentDate} | Document: ${data.shipNumber}</p>
  </div>
</body>
</html>`;
  }

  static async save(data: ShipDocumentData, userId: string, shipmentId: string): Promise<{ filePath: string; documentId: string }> {
    // Fetch transporter name
    const [transporter] = await db
      .select()
      .from(transportersTable)
      .where(eq(transportersTable.id, data.transporterId))
      .limit(1);

    const transporterName = transporter?.name || 'Unknown Transporter';

    // Fetch shipping method name if provided
    let shippingMethodName: string | null = null;
    if (data.shippingMethodId) {
      const [method] = await db
        .select()
        .from(shippingMethods)
        .where(eq(shippingMethods.id, data.shippingMethodId))
        .limit(1);
      shippingMethodName = method?.name || null;
    }

    // Generate HTML content
    const htmlContent = this.generateHTML(data, transporterName, shippingMethodName);

    // Determine storage path
    const year = new Date(data.shippingDate).getFullYear();
    const relativePath = `storage/sales-order/ships/tenants/${data.tenantId}/${year}`;
    const fileName = `${data.shipNumber}.html`;
    
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
        documentType: 'SHIP',
        documentNumber: data.shipNumber,
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
