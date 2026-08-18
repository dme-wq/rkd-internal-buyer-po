// ============================================================
// RKD Export Buyer PO — PDF Generation (jsPDF)
// Matches the "RKD Buyer PO" target layout from reference screenshot
//
// ROOT-CAUSE FIX (121-page bug):
//   Base64 image strings were placed directly in table cell data.
//   jsPDF-AutoTable calculates cell height from raw content BEFORE
//   willDrawCell clears it → each row became the height of the
//   decoded base64 string (hundreds of mm). Fix: store images
//   in a separate array indexed by row; table cells get empty string.
// ============================================================

import type { POHeader, SKUItem } from './types';
import { formatDate, formatNumber } from './utils';

interface GeneratePDFOptions {
  header: POHeader;
  skus: SKUItem[];
}

// ─── Logo cache (one fetch per browser session) ──────────────
let _cachedLogoBase64: string | null = null;

async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:image')) return imageUrl;
  if (_cachedLogoBase64) return _cachedLogoBase64;
  try {
    const res  = await fetch(imageUrl);
    const blob = await res.blob();
    const result = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror   = reject;
      reader.readAsDataURL(blob);
    });
    _cachedLogoBase64 = result;
    return result;
  } catch {
    return '';
  }
}

// ─── Indian timestamp: dd-MMM-yyyy HH:mm ────────────────────
function indianTimestamp(): string {
  const now    = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd  = String(now.getDate()).padStart(2, '0');
  const mon = months[now.getMonth()];
  const yr  = now.getFullYear();
  const hh  = String(now.getHours()).padStart(2, '0');
  const mm  = String(now.getMinutes()).padStart(2, '0');
  return `${dd}-${mon}-${yr} ${hh}:${mm}`;
}

// ─── Colour constants (Modern Export Theme) ─────────────────────
const PRIMARY_BLUE = [44,  62,  80]  as [number, number, number]; // Sleek navy for prominent headers
const DARK_GREY    = [180, 180, 180] as [number, number, number]; // Softer borders
const GREY_BG      = [236, 240, 241] as [number, number, number]; // Very light slate for col headers
const LIGHT_GREY   = [248, 249, 250] as [number, number, number]; // Alternate row bg / subtle cells
const WHITE        = [255, 255, 255] as [number, number, number];
const DARK_TEXT    = [45,  55,  72]  as [number, number, number]; // Soft dark text for readability

// ─── Layout constants ─────────────────────────────────────────
const PAGE_W = 297;   // landscape A4
const PAGE_H = 210;
const M      = 12.7;  // 0.5 inch margin
const CW     = PAGE_W - 2 * M;  // 271.6 mm content width

// ─── Column definitions (widths must sum to CW = 271.6) ────────
const COLS = [
  { key: 'skuCode',     header: 'SKU Code',                                width: 22 },
  { key: 'product',     header: 'Product',                                  width: 17 },
  { key: 'img',         header: 'Design\nImage',                            width: 20 },
  { key: 'shape',       header: 'Shape',                                    width: 15 },
  { key: 'designer',    header: 'Designer\nName',                           width: 16 },
  { key: 'brand',       header: 'Brand Name',                               width: 25 },
  { key: 'size1',       header: 'Size 1',                                   width: 14 },
  { key: 'size2',       header: 'Size 2',                                   width: 13.6 },
  { key: 'quality',     header: 'Quality',                                  width: 13 },
  { key: 'color',       header: 'Color',                                    width: 15 },
  { key: 'orderQty',    header: 'Buyer PO\nQuantity',                       width: 17 },
  { key: 'samples',     header: 'PP/TOP/\nTesting\nSamples',                width: 14 },
  { key: 'addProd',     header: 'Additional\nProduction\nPieces Required',  width: 17 },
  { key: 'totalQtyMfg', header: 'Total Qty to\nManufacture',                width: 19 },
  { key: 'innerPack',   header: 'Inner\nPack',                              width: 12 },
  { key: 'outerPack',   header: 'Outer\nPack',                              width: 12 },
];

const IMG_COL = 2;   // index of the image column
const IMG_DIM = 10.5;  // mm — slightly smaller to decrease row height

export async function generatePOPDF(
  options: GeneratePDFOptions
): Promise<{ blob: Blob; base64: string; filename: string }> {
  const { jsPDF }    = await import('jspdf');
  const autoTable    = (await import('jspdf-autotable')).default;
  const { header, skus } = options;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const ts         = indianTimestamp();
  const internalPO = header.internalPO || '';

  // Fetch logo
  const logoUrl    = 'https://static.wixstatic.com/media/68b92a_d71e34133826499983234774dea1945b~mv2.png/v1/fill/w_186,h_156,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/RKD-Logo.png';
  const logoBase64 = await getBase64ImageFromUrl(logoUrl);

  // ─── KEY FIX: Separate image lookup array ─────────────────
  // Never put base64 strings in table body — AutoTable sizes rows
  // from raw cell content before willDrawCell can clear them.
  const skuImages: string[] = skus.map(s => s.designImage || '');

  // ─── Determine active columns based on Size 2 presence ────────
  const hasSize2 = skus.some(s => (s.sizes && s.sizes.length > 1 && s.sizes[1]) || s.size2);
  let finalCols = COLS;
  if (!hasSize2) {
    finalCols = COLS.filter(c => c.key !== 'size2').map(c => {
      if (c.key === 'skuCode') {
        return { ...c, width: c.width + 13.6 }; // Add Size 2's width to SKU Code
      }
      return c;
    });
  }

  // ─── Helper: orange page border ───────────────────────────
  function drawBorder() {
    doc.setDrawColor(...DARK_GREY);
    doc.setLineWidth(1.0);
    // Draw exactly on the 0.5 inch margins
    doc.rect(M, M, CW, PAGE_H - 2 * M);
  }

  // ─── Helper: footer (page n of total, timestamp, PO) ──────
  function drawFooter(pg: number, total: number) {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 110);
    const fy = PAGE_H - M + 2;
    doc.text(`Internal PO: ${internalPO}`, M + 1, fy);
    doc.text(`Generated: ${ts}`, PAGE_W / 2, fy, { align: 'center' });
    doc.text(`Page ${pg} of ${total}`, PAGE_W - M - 1, fy, { align: 'right' });
  }

  // ═══════════════════════════════════════════════════════════
  // 1. HEADER TABLE
  //    Row 0 (head): "RKD Buyer PO" — grey, full width
  //    Row 1: File Number | value | PO Date | value | logo (rowspan 2)
  //    Row 2: Internal PO | value | Ex-Factory | value
  //
  // Column layout widths (must sum to CW = 283):
  //   35 + 55 + 32 + 42 + 119 = 283
  // ═══════════════════════════════════════════════════════════
  autoTable(doc, {
    startY: M,
    head: [[{
      content: 'RKD Buyer PO',
      colSpan: 5,
      styles: {
        halign: 'center', fillColor: PRIMARY_BLUE, textColor: WHITE,
        fontStyle: 'bold', fontSize: 11, cellPadding: 3,
      },
    }]],
    body: [
      [
        { content: 'File Number',
          styles: { fontStyle: 'bold', fillColor: LIGHT_GREY, fontSize: 8, cellPadding: 2 } },
        { content: header.fileNumber || '',
          styles: { halign: 'center', fontSize: 8, cellPadding: 2 } },
        { content: 'PO Date',
          styles: { fontStyle: 'bold', fillColor: LIGHT_GREY, fontSize: 8, cellPadding: 2 } },
        { content: formatDate(header.poDate),
          styles: { halign: 'center', fontSize: 8, cellPadding: 2 } },
        // Logo cell — spans both body rows
        { content: '', rowSpan: 2,
          styles: { halign: 'center', valign: 'middle', cellPadding: 2 } },
      ],
      [
        { content: 'Internal PO Number',
          styles: { fontStyle: 'bold', fillColor: LIGHT_GREY, fontSize: 8, cellPadding: 2 } },
        { content: header.internalPO || '',
          styles: { halign: 'center', fontSize: 8, cellPadding: 2 } },
        { content: 'Ex-Factory Date',
          styles: { fontStyle: 'bold', fillColor: LIGHT_GREY, fontSize: 8, cellPadding: 2 } },
        { content: formatDate(header.exFactory),
          styles: { halign: 'center', fontSize: 8, cellPadding: 2 } },
      ],
    ],
    theme: 'grid',
    styles: { lineColor: DARK_GREY, lineWidth: 0.1, font: 'helvetica', textColor: DARK_TEXT, minCellHeight: 8 },
    columnStyles: {
      0: { cellWidth: 35  },
      1: { cellWidth: 55  },
      2: { cellWidth: 32  },
      3: { cellWidth: 42  },
      4: { cellWidth: 107.6 },
    },
    margin: { left: M, right: M },
    didDrawCell: (data) => {
      // Draw logo centred in the merged logo cell
      if (
        data.section === 'body' &&
        data.row.index === 0 &&
        data.column.index === 4 &&
        logoBase64
      ) {
        // Image is 186x156 (aspect ratio ~1.192)
        const lw = 21, lh = 17.6;
        doc.addImage(
          logoBase64, 'PNG',
          data.cell.x + (data.cell.width  - lw) / 2,
          data.cell.y + (data.cell.height - lh) / 2,
          lw, lh
        );
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headerFinalY = (doc as any).lastAutoTable.finalY;

  // ═══════════════════════════════════════════════════════════
  // 2. SKU TABLE
  // ═══════════════════════════════════════════════════════════
  const colStyles: Record<number, { cellWidth: number }> = {};
  finalCols.forEach((c, i) => { colStyles[i] = { cellWidth: c.width }; });

  // Body rows — image column is always '' (prevents AutoTable height explosion)
  const bodyRows = skus.map(s => finalCols.map(c => {
    switch (c.key) {
      case 'img':         return '';
      case 'skuCode':     return s.skuCode     || '';
      case 'product':     return s.product     || '';
      case 'shape':       return s.shape       || '';
      case 'designer':    return s.designer    || 'N/A';
      case 'brand':       return s.brand       || '';
      case 'size1':       return s.sizes?.[0]  || s.size1 || '';
      case 'size2':       return s.sizes?.[1]  || s.size2 || '';
      case 'quality':     return s.quality     || '';
      case 'color':       return s.color       || '';
      case 'orderQty':    return `${formatNumber(s.orderQty    || 0)}\npieces`;
      case 'samples':     return String(s.addSample || 0);
      case 'addProd':     return s.addProd     || '0%';
      case 'totalQtyMfg': return `${formatNumber(s.totalQtyMfg || 0)}\npieces`;
      case 'innerPack':   return s.innerPack   ? String(s.innerPack) : 'N/A';
      case 'outerPack':   return s.outerPack   ? String(s.outerPack) : 'N/A';
      default: return '';
    }
  }));

  // Totals
  let totOQ = 0, totMQ = 0, totSmp = 0;
  skus.forEach(s => {
    totOQ  += Number(s.orderQty    || 0);
    totMQ  += Number(s.totalQtyMfg || 0);
    totSmp += Number(s.addSample   || 0);
  });

  // Footer row (totals)
  const colorIndex = finalCols.findIndex(c => c.key === 'color');
  const footRow = finalCols.map((c, i) => {
    const base = { lineWidth: 0.5 as number, lineColor: DARK_GREY };
    if (i < colorIndex)  return { content: '', styles: { ...base, fillColor: WHITE, lineWidth: 0 as number } };
    if (i === colorIndex) return { content: 'Total\nQuantity', styles: { ...base, fontStyle: 'bold' as const, halign: 'center' as const, fillColor: WHITE, textColor: 0 } };
    if (c.key === 'orderQty')    return { content: formatNumber(totOQ),  styles: { ...base, fontStyle: 'bold' as const, halign: 'center' as const, fillColor: WHITE, textColor: 0 } };
    if (c.key === 'samples')     return { content: formatNumber(totSmp), styles: { ...base, fontStyle: 'bold' as const, halign: 'center' as const, fillColor: WHITE, textColor: 0 } };
    if (c.key === 'addProd')     return { content: '', styles: { ...base, fillColor: WHITE } };
    if (c.key === 'totalQtyMfg') return { content: formatNumber(totMQ),  styles: { ...base, fontStyle: 'bold' as const, halign: 'center' as const, fillColor: WHITE, textColor: 0 } };
    return { content: '', styles: { ...base, fillColor: WHITE } };
  });

  autoTable(doc, {
    startY: headerFinalY + 3,
    head:   [finalCols.map(c => c.header)],
    body:   bodyRows,
    foot:   [footRow],

    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      overflow: 'linebreak',
      font: 'helvetica',
      textColor: DARK_TEXT,
      valign: 'middle',
      halign: 'center',
      lineColor: DARK_GREY,
      lineWidth: 0.1,
      minCellHeight: 10,
    },
    headStyles: {
      fillColor: GREY_BG,
      textColor: DARK_TEXT,
      fontStyle: 'bold',
      lineColor: DARK_GREY,
      lineWidth: 0.1,
      fontSize: 6.5,
      cellPadding: 1.5,
      valign: 'middle',
      halign: 'center',
      minCellHeight: 8,
    },
    footStyles: {
      fillColor: WHITE,
      fontStyle: 'bold',
      textColor: DARK_TEXT,
      lineColor: DARK_GREY,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: LIGHT_GREY
    },
    theme: 'grid',
    tableLineColor: DARK_GREY,
    tableLineWidth: 0.5,
    columnStyles: colStyles,
    margin: { left: M, right: M, bottom: 12 },

    // Draw thumbnail from separate skuImages array (never from cell.raw)
    didDrawCell: (data) => {
      const imgColIndex = finalCols.findIndex(c => c.key === 'img');
      if (data.section === 'body' && data.column.index === imgColIndex) {
        const img = skuImages[data.row.index];
        if (img && img.length > 20) {
          try {
            const x = data.cell.x + (data.cell.width  - IMG_DIM) / 2;
            const y = data.cell.y + (data.cell.height - IMG_DIM) / 2;
            doc.addImage(img, 'JPEG', x, y, IMG_DIM, IMG_DIM);
          } catch { /* skip bad images silently */ }
        }
      }
    },

    // Draw border on every new page as it is created
    didDrawPage: () => {
      drawBorder();
    },
  });

  // ═══════════════════════════════════════════════════════════
  // 3. AUTHORIZED SIGNATORY BOX (last page, bottom-right)
  // ═══════════════════════════════════════════════════════════
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableEndY = (doc as any).lastAutoTable.finalY;
  const BOX_W = 62, BOX_H = 26;
  const BOX_X = PAGE_W - M - BOX_W;
  const BOX_Y = Math.min(tableEndY + 5, PAGE_H - M - BOX_H - 14);

  doc.setDrawColor(...DARK_GREY);
  doc.setLineWidth(0.6);
  doc.rect(BOX_X, BOX_Y, BOX_W, BOX_H);

  // Top label bar
  doc.setFillColor(...GREY_BG);
  doc.rect(BOX_X, BOX_Y, BOX_W, 5.5, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_TEXT);
  doc.text('Authorized Signatory', BOX_X + BOX_W / 2, BOX_Y + 4, { align: 'center' });

  // Bottom label (inside)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text('Signature / Stamp', BOX_X + BOX_W / 2, BOX_Y + BOX_H - 2, { align: 'center' });

  // Company Name below the box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK_TEXT);
  doc.text('RKD Furnishings Pvt Ltd', BOX_X + BOX_W / 2, BOX_Y + BOX_H + 4, { align: 'center' });

  // ═══════════════════════════════════════════════════════════
  // 4. PAGE NUMBERS + FOOTERS + BORDERS (post-pass all pages)
  // ═══════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    drawBorder();
    drawFooter(pg, totalPages);
  }

  const filename = `RKD_Buyer_PO_${internalPO || 'export'}.pdf`;
  const blob     = doc.output('blob');
  const base64   = doc.output('datauristring').split(',')[1];

  return { blob, base64, filename };
}
