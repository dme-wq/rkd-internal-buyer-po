// ============================================================
// RKD Export Buyer PO — Utility Functions
// ============================================================

import { format, addDays, parseISO } from 'date-fns';
import type { SKUItem } from './types';

// ─── Date Formatting ─────────────────────────────────────────
export function formatDate(dateStr: string | null | undefined, fmt = 'dd-MMM-yyyy'): string {
  if (!dateStr) return 'N/A';
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return String(dateStr);
  }
}

export function formatDateInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'yyyy-MM-dd');
  } catch {
    return String(dateStr);
  }
}

export function calcDueDate(baseDate: string, days: number): string {
  if (!baseDate || !days) return '';
  try {
    const result = addDays(parseISO(baseDate), days);
    return format(result, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

// ─── Currency Formatting ─────────────────────────────────────
export function formatCurrency(amount: number, currency = 'USD'): string {
  if (isNaN(amount)) return `${currency} 0.00`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number | string): string {
  const parsed = typeof num === 'string' ? parseFloat(num.replace(/[^0-9.-]+/g,"")) : num;
  if (isNaN(parsed)) return String(num);
  return new Intl.NumberFormat('en-IN').format(parsed);
}

// ─── PO Calculations ─────────────────────────────────────────
export function calcSKUTotal(sku: Partial<SKUItem>): number {
  const qty   = parseFloat(String(sku.orderQty ?? 0)) || 0;
  const price = parseFloat(String(sku.price ?? 0)) || 0;
  return Math.round(qty * price * 100) / 100;
}

export function calcGrandTotal(skus: Partial<SKUItem>[]): number {
  return Math.round(skus.reduce((s, sku) => s + calcSKUTotal(sku), 0) * 100) / 100;
}

export function calcTotalQtyMfg(sku: Partial<SKUItem>): number {
  const qty    = parseFloat(String(sku.orderQty   ?? 0)) || 0;
  const sample = parseFloat(String(sku.addSample  ?? 0)) || 0;
  const prod   = parseFloat(String(sku.addProd    ?? 0)) || 0;
  return qty + sample + prod;
}

export function calcPaymentAmount(totalAmount: number, pct: number): number {
  return Math.round(totalAmount * (pct / 100) * 100) / 100;
}

// ─── ID / Code Generators ────────────────────────────────────
export function generateClientId(): string {
  return `sku_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Misc ────────────────────────────────────────────────────
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str: string, max = 40): string {
  return str && str.length > max ? str.slice(0, max) + '…' : str;
}

export function isEmpty(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return true;
  if (Array.isArray(val)) return val.length === 0;
  return false;
}

// ─── File / Base64 ───────────────────────────────────────────
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => {
      const result = reader.result as string;
      // Remove the data URI prefix: "data:...;base64,"
      resolve(result.split(',')[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── SKU default ────────────────────────────────────────────
export function createEmptySKU(): SKUItem {
  return {
    id         : generateClientId(),
    skuCode    : '',
    product    : '',
    articleNum : '',
    designImage: '',
    shape      : '',
    designer   : '',
    brand      : '',
    description: '',
    sizes      : [],
    size1      : '',
    size2      : '',
    quality    : '',
    color      : '',
    colorRef   : '',
    orderQty   : 0,
    unitQty    : 'pieces',
    price      : 0,
    unitPrice  : 'piece',
    currency   : 'USD',
    innerPack  : '',
    outerPack  : '',
    addSample  : '',
    addProd    : '',
    totalQtyMfg: 0,
    lineTotal  : 0,
  };
}
