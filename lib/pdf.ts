// ============================================================
// RKD Export Buyer PO — PDF Generation (jsPDF)
// Matches the existing "RKD Buyer PO" PDF layout from screenshots
// ============================================================

import type { POHeader, SKUItem } from './types';
import { formatDate, formatCurrency, formatNumber } from './utils';

interface GeneratePDFOptions {
  header: POHeader;
  skus: SKUItem[];
  returnBase64?: boolean;
}

export async function generatePOPDF(
  options: GeneratePDFOptions
): Promise<{ blob: Blob; base64: string; filename: string }> {
  // Dynamic import to avoid SSR issues
  const { jsPDF } = await import('jspdf');
  const autoTable  = (await import('jspdf-autotable')).default;

  const { header, skus } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const PAGE_W = 297;
  const MARGIN = 10;
  const GOLD   = [197, 160, 48] as [number, number, number];
  const DARK   = [28, 35, 58] as [number, number, number];
  const LIGHT  = [248, 245, 235] as [number, number, number];

  // ─── Header Banner ──────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PAGE_W, 18, 'F');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(197, 160, 48);
  doc.text('RKD', MARGIN + 2, 12);

  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('BUYER PURCHASE ORDER', MARGIN + 18, 12);

  // Company info right-aligned
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text('RKD Exports | Handicrafts & Home Textiles', PAGE_W - MARGIN, 8, { align: 'right' });
  doc.text('India | Export Division', PAGE_W - MARGIN, 13, { align: 'right' });

  // ─── PO Info Table ──────────────────────────────────────
  let y = 22;

  doc.setFillColor(245, 240, 220);
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 20, 'F');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 20);

  const col1x = MARGIN + 2;
  const col2x = MARGIN + 55;
  const col3x = MARGIN + 135;
  const col4x = MARGIN + 185;

  function infoRow(label: string, value: string, x: number, yOff: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(label + ':', x, y + yOff);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(value || '—', x + 30, y + yOff);
  }

  infoRow('File Number',    header.fileNumber  || '',                    col1x,  6);
  infoRow('Internal PO No', header.internalPO  || '',                    col1x, 12);
  infoRow('Buyer PO No',    header.buyerPO     || '',                    col2x,  6);
  infoRow('Buyer Name',     header.buyerName   || '',                    col2x, 12);
  infoRow('PO Date',        formatDate(header.poDate),                   col3x,  6);
  infoRow('Ex-Factory',     formatDate(header.exFactory),                col3x, 12);
  infoRow('Delivery Terms', header.deliveryTerms || '',                  col4x,  6);
  infoRow('Port',           header.portName    || '',                    col4x, 12);

  y += 24;

  // ─── Payment & Address Info ──────────────────────────────
  doc.setFillColor(235, 235, 245);
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 14, 'F');

  infoRow('Payment Term 1', header.payTerm1 || '', col1x, 5);
  infoRow('Payment Term 2', header.payTerm2 || '', col1x, 11);
  infoRow('Onboard Date',   formatDate(header.onboardDate), col2x, 5);
  infoRow('Buyer Source',   `${header.buyerSource || ''} (${header.buyerSrcPct || 0}%)`, col2x, 11);
  infoRow('Billing Addr',   header.billingAddr  || '', col3x, 5);
  infoRow('Delivery Addr',  header.deliveryAddr || '', col3x, 11);

  y += 18;

  // ─── SKU Table ───────────────────────────────────────────
  const columns = [
    { header: 'SKU Code',        dataKey: 'skuCode' },
    { header: 'Product',         dataKey: 'product' },
    { header: 'Shape',           dataKey: 'shape' },
    { header: 'Designer',        dataKey: 'designer' },
    { header: 'Brand',           dataKey: 'brand' },
    { header: 'Description',     dataKey: 'description' },
    { header: 'Size 1',          dataKey: 'size1' },
    { header: 'Size 2',          dataKey: 'size2' },
    { header: 'Quality',         dataKey: 'quality' },
    { header: 'Color',           dataKey: 'color' },
    { header: 'Buyer PO Qty',    dataKey: 'orderQty' },
    { header: 'Unit',            dataKey: 'unitQty' },
    { header: 'Add. Sample',     dataKey: 'addSample' },
    { header: 'Add. Prod.',      dataKey: 'addProd' },
    { header: 'Total Mfg Qty',   dataKey: 'totalQtyMfg' },
    { header: 'Inner Pack',      dataKey: 'innerPack' },
    { header: 'Outer Pack',      dataKey: 'outerPack' },
    { header: 'Price',           dataKey: 'price' },
    { header: 'Currency',        dataKey: 'currency' },
    { header: 'Line Total',      dataKey: 'lineTotal' },
  ];

  const rows = skus.map(sku => ({
    skuCode    : sku.skuCode     || '',
    product    : sku.product     || '',
    shape      : sku.shape       || '',
    designer   : sku.designer    || '',
    brand      : sku.brand       || '',
    description: sku.description || '',
    size1      : sku.size1       || '',
    size2      : sku.size2       || '',
    quality    : sku.quality     || '',
    color      : sku.color       || '',
    orderQty   : formatNumber(sku.orderQty),
    unitQty    : sku.unitQty     || '',
    addSample  : formatNumber(sku.addSample),
    addProd    : formatNumber(sku.addProd),
    totalQtyMfg: formatNumber(sku.totalQtyMfg),
    innerPack  : sku.innerPack ? formatNumber(sku.innerPack) : 'N/A',
    outerPack  : sku.outerPack ? formatNumber(sku.outerPack) : 'N/A',
    price      : `${sku.price.toFixed(2)} / ${sku.unitPrice || 'pc'}`,
    currency   : sku.currency    || 'USD',
    lineTotal  : sku.lineTotal.toFixed(2),
  }));

  autoTable(doc, {
    startY: y,
    head: [columns.map(c => c.header)],
    body: rows.map(r => columns.map(c => (r as Record<string, string>)[c.dataKey] || '')),
    styles: {
      fontSize  : 6.5,
      cellPadding: 1.5,
      overflow  : 'linebreak',
      font      : 'helvetica',
    },
    headStyles: {
      fillColor : DARK,
      textColor : GOLD,
      fontStyle : 'bold',
      fontSize  : 7,
    },
    alternateRowStyles: {
      fillColor: LIGHT,
    },
    columnStyles: {
      0: { cellWidth: 22 },  // SKU Code
      1: { cellWidth: 18 },  // Product
      5: { cellWidth: 30 },  // Description
      19: { cellWidth: 16 }, // Line Total
    },
    margin: { left: MARGIN, right: MARGIN },
    theme: 'grid',
  });

  // ─── Payment Summary Footer ──────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 5;

  if (finalY < 180) {
    doc.setFillColor(...DARK);
    doc.rect(MARGIN, finalY, PAGE_W - MARGIN * 2, 28, 'F');

    // Grand Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text('GRAND TOTAL:', MARGIN + 4, finalY + 8);
    doc.setTextColor(255, 255, 255);
    doc.text(
      formatCurrency(header.totalAmount, skus[0]?.currency || 'USD'),
      MARGIN + 50, finalY + 8
    );

    // Payment Term 1
    doc.setFontSize(7.5);
    doc.setTextColor(200, 200, 200);
    doc.text('Payment Term 1:', MARGIN + 4, finalY + 15);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${header.payTerm1} | ${header.pay1Pct}% | ${header.pay1Days} Days | ${header.pay1Activity} | ${formatCurrency(header.pay1Amount, skus[0]?.currency)} | Due: ${formatDate(header.pay1DueDate)}`,
      MARGIN + 32, finalY + 15
    );

    // Payment Term 2
    doc.setTextColor(200, 200, 200);
    doc.text('Payment Term 2:', MARGIN + 4, finalY + 21);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${header.payTerm2} | ${header.pay2Pct}% | ${header.pay2Days} Days | ${header.pay2Activity} | ${formatCurrency(header.pay2Amount, skus[0]?.currency)} | Due: ${formatDate(header.pay2DueDate)}`,
      MARGIN + 32, finalY + 21
    );

    // Signature line
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(6.5);
    doc.text('Authorized Signature: ___________________________', PAGE_W - MARGIN - 80, finalY + 21);
  }

  // ─── Page Numbers ────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      PAGE_W / 2, 207, { align: 'center' }
    );
  }

  const filename = `RKD_PO_${header.internalPO || header.buyerPO || 'export'}.pdf`;
  const blob     = doc.output('blob');
  const base64   = doc.output('datauristring').split(',')[1];

  return { blob, base64, filename };
}
