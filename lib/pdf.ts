// ============================================================
// RKD Export Buyer PO — PDF Generation (jsPDF)
// Matches the "Old Format" RKD Buyer PO layout
// ============================================================

import type { POHeader, SKUItem } from './types';
import { formatDate, formatCurrency, formatNumber } from './utils';

interface GeneratePDFOptions {
  header: POHeader;
  skus: SKUItem[];
  returnBase64?: boolean;
}

// Convert image URL to base64 to avoid CORS issues in jsPDF
// Cache in module scope — only fetched once per browser session
let _cachedLogoBase64: string | null = null;

async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:image')) return imageUrl;
  if (_cachedLogoBase64) return _cachedLogoBase64;
  
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const result = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    _cachedLogoBase64 = result;
    return result;
  } catch (e) {
    console.error("Failed to load image for PDF", e);
    return "";
  }
}

export async function generatePOPDF(
  options: GeneratePDFOptions
): Promise<{ blob: Blob; base64: string; filename: string }> {
  const { jsPDF } = await import('jspdf');
  const autoTable  = (await import('jspdf-autotable')).default;

  const { header, skus } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const PAGE_W = 297;
  const MARGIN = 10;
  
  // Theme Colors from Screenshot
  const TITLE_BG = [220, 220, 220] as [number, number, number]; // Light Grey
  const GRID_LINE = [255, 170, 0] as [number, number, number]; // Orange/Yellow
  
  // Fetch logo
  const logoUrl = "https://static.wixstatic.com/media/68b92a_d71e34133826499983234774dea1945b~mv2.png/v1/fill/w_186,h_156,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/RKD-Logo.png";
  const logoBase64 = await getBase64ImageFromUrl(logoUrl);

  let y = MARGIN;

  // ─── Header Info Table ──────────────────────────────────────
  // We'll draw the header using autoTable for perfect borders
  autoTable(doc, {
    startY: y,
    head: [[{ content: 'RKD Buyer PO', colSpan: 6, styles: { halign: 'center', fillColor: TITLE_BG, textColor: 0, fontStyle: 'bold', fontSize: 10 } }]],
    body: [
      [
        { content: 'File Number', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: header.fileNumber || '', styles: { halign: 'center' } },
        { content: 'PO Date', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: formatDate(header.poDate), styles: { halign: 'center' } },
        { content: '', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, // Space for Logo
        { content: '', rowSpan: 2 } // Empty space
      ],
      [
        { content: 'Internal PO Number', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: header.internalPO || '', styles: { halign: 'center' } },
        { content: 'Ex-Factory Date', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: formatDate(header.exFactory), styles: { halign: 'center' } }
      ]
    ],
    theme: 'grid',
    styles: {
      lineColor: GRID_LINE,
      lineWidth: 0.5,
      fontSize: 8,
      textColor: 0,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 45 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 60 },
      5: { cellWidth: 'auto' }
    },
    margin: { left: MARGIN, right: MARGIN },
    didDrawCell: (data) => {
      // Draw Logo in the designated cell
      if (data.row.index === 0 && data.column.index === 4 && data.section === 'body') {
         if (logoBase64 && typeof logoBase64 === 'string' && logoBase64.length > 20) {
           doc.addImage(logoBase64, 'PNG', data.cell.x + 10, data.cell.y + 2, 40, 10);
         }
      }
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  // ─── SKU Table ───────────────────────────────────────────
  const columns = [
    { header: 'SKU Code',        dataKey: 'skuCode' },
    { header: 'Product',         dataKey: 'product' },
    { header: 'Design Image',    dataKey: 'designImage' },
    { header: 'Shape',           dataKey: 'shape' },
    { header: 'Designer\nName',  dataKey: 'designer' },
    { header: 'Brand Name',      dataKey: 'brand' },
    { header: 'Size 1',          dataKey: 'size1' },
    { header: 'Size 2',          dataKey: 'size2' },
    { header: 'Quality',         dataKey: 'quality' },
    { header: 'Color',           dataKey: 'color' },
    { header: 'Buyer PO\nQuantity', dataKey: 'orderQty' },
    { header: 'PP/TOP/\nTesting\nSamples', dataKey: 'samples' },
    { header: 'Additional\nProduction\nPieces\nRequired', dataKey: 'addProd' },
    { header: 'Total\nQuantity to\nManufacture', dataKey: 'totalQtyMfg' },
    { header: 'Inner\nPack',     dataKey: 'innerPack' },
    { header: 'Outer\nPack',     dataKey: 'outerPack' },
  ];

  const rows = skus.map(sku => ({
    skuCode    : sku.skuCode     || '',
    product    : sku.product     || '',
    designImage: sku.designImage || '', // base64 string handled in didDrawCell
    shape      : sku.shape       || '',
    designer   : sku.designer    || 'N/A',
    brand      : sku.brand       || '',
    size1      : sku.size1       || '',
    size2      : sku.size2       || '',
    quality    : sku.quality     || '',
    color      : sku.color       || '',
    orderQty   : `${formatNumber(sku.orderQty || 0)}\npieces`,
    samples    : sku.addSample   || '0',
    addProd    : sku.addProd     || '1%',
    totalQtyMfg: `${formatNumber(sku.totalQtyMfg || 0)}\npieces`,
    innerPack  : sku.innerPack ? String(sku.innerPack) : 'N/A',
    outerPack  : sku.outerPack ? String(sku.outerPack) : 'N/A',
  }));

  let totalOrderQty = 0;
  let totalMfgQty = 0;
  let totalSamples = 0;
  
  skus.forEach(s => {
    totalOrderQty += Number(s.orderQty || 0);
    totalMfgQty += Number(s.totalQtyMfg || 0);
    totalSamples += Number(s.addSample || 0);
  });

  autoTable(doc, {
    startY: y,
    head: [columns.map(c => c.header)],
    body: rows.map(r => columns.map(c => (r as Record<string, string>)[c.dataKey])),
    foot: [
      [
        { content: '', colSpan: 9, styles: { fillColor: [255, 255, 255], lineWidth: 0 } },
        { content: 'Total\nQuantity', styles: { fontStyle: 'bold', halign: 'center', fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.5, lineColor: GRID_LINE } },
        { content: formatNumber(totalOrderQty), styles: { fontStyle: 'bold', halign: 'center', fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.5, lineColor: GRID_LINE } },
        { content: formatNumber(totalSamples), styles: { fontStyle: 'bold', halign: 'center', fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.5, lineColor: GRID_LINE } },
        { content: '', styles: { fillColor: [255, 255, 255], lineWidth: 0.5, lineColor: GRID_LINE } },
        { content: formatNumber(totalMfgQty), styles: { fontStyle: 'bold', halign: 'center', fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.5, lineColor: GRID_LINE } },
        { content: '', colSpan: 2, styles: { fillColor: [255, 255, 255], lineWidth: 0.5, lineColor: GRID_LINE } }
      ]
    ],
    styles: {
      fontSize: 6.5,
      cellPadding: 3,
      overflow: 'linebreak',
      font: 'helvetica',
      textColor: 0,
      valign: 'middle',
      halign: 'center',
      minCellHeight: 18
    },
    headStyles: {
      fillColor: TITLE_BG,
      textColor: 0,
      fontStyle: 'bold',
      lineColor: GRID_LINE,
      lineWidth: 0.5,
    },
    theme: 'grid',
    tableLineColor: GRID_LINE,
    tableLineWidth: 0.5,
    columnStyles: {
      0: { cellWidth: 20 }, // SKU Code
      1: { cellWidth: 15 }, // Product
      2: { cellWidth: 25 }, // Design Image (requires space)
      3: { cellWidth: 15 }, // Shape
      4: { cellWidth: 15 }, // Designer
      5: { cellWidth: 28 }, // Brand
      6: { cellWidth: 18 }, // Size 1
      7: { cellWidth: 15 }, // Size 2
      8: { cellWidth: 12 }, // Quality
      9: { cellWidth: 15 }, // Color
      10: { cellWidth: 18 }, // Buyer PO Qty
      11: { cellWidth: 15 }, // PP/TOP
      12: { cellWidth: 18 }, // Add Prod
      13: { cellWidth: 20 }, // Total Mfg
      14: { cellWidth: 12 }, // Inner
      15: { cellWidth: 12 }, // Outer
    },
    didDrawCell: (data) => {
      // Custom draw for Design Image
      if (data.column.index === 2 && data.section === 'body') {
        const imgBase64 = data.cell.raw;
        if (imgBase64 && typeof imgBase64 === 'string' && imgBase64.length > 20) {
          try {
             const imgDim = 16;
             const xPos = data.cell.x + (data.cell.width - imgDim) / 2;
             const yPos = data.cell.y + (data.cell.height - imgDim) / 2;
             doc.addImage(imgBase64, 'JPEG', xPos, yPos, imgDim, imgDim);
          } catch(e) {
             console.error("Failed to draw image", e);
          }
        }
      }
    },
    willDrawCell: (data) => {
      // Clear text for image cell
      if (data.column.index === 2 && data.section === 'body') {
         data.cell.text = [];
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });


  // ─── Page Numbers ────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      PAGE_W / 2, 205, { align: 'center' }
    );
  }

  const filename = `Internal_Buyer_PO_${header.internalPO || 'export'}.pdf`;
  const blob     = doc.output('blob');
  const base64   = doc.output('datauristring').split(',')[1];

  return { blob, base64, filename };
}
