// ============================================================
// RKD Export Buyer PO — TypeScript Type Definitions
// ============================================================

export interface PendingPO {
  internalPO: string;
  buyerName: string;
  buyerPO: string;
  fileNumber: string;
  poDate: string;
  exFactory: string;
  deliveryAddr: string;
  onboardDate: string;
}

export interface SKUItem {
  id: string; // client-side only for React key
  skuCode: string;
  product: string;
  articleNum: string;
  designImage: string; // Google Drive URL or Base64
  shape: string;
  designer: string;
  brand: string;
  description: string;
  sizes: string[]; // For multi-select UI
  size1: string;
  size2: string;
  quality: string;
  color: string;
  colorRef: string;
  orderQty: number | string;
  unitQty: string;
  price: number | string;
  unitPrice: string;
  currency: string;
  innerPack: string;
  outerPack: string;
  addSample: string; // PP/TOP
  addProd: string; // 0% to 10%
  totalQtyMfg: number;
  lineTotal: number; // computed: orderQty * price
}

export interface POHeader {
  uid?: string;
  internalPO?: string;
  fileNumber: string;
  buyerName: string;
  buyerPO: string;
  poDate: string;
  exFactory: string;
  deliveryTerms: string;
  portName: string;
  payTerm1: string;
  payTerm2: string;
  buyerSource: string;
  buyerSubSrc: string;
  buyerSrcPct: number;
  buyerSubPct: number;
  billingAddr: string;
  deliveryAddr: string;
  onboardDate: string;
  totalAmount: number;
  pay1Pct: string | number;
  pay1Days: string | number;
  pay1Activity: string;
  pay1Amount: number;
  pay1DueDate: string;
  pay2Pct: string | number;
  pay2Days: string | number;
  pay2Activity: string;
  pay2Amount: number;
  pay2DueDate: string;
}

export interface PurchaseOrder {
  header: POHeader;
  skus: SKUItem[];
}

export interface POListItem {
  uid: string;
  timestamp: string;
  fileNumber: string;
  buyerName: string;
  internalPO: string;
  buyerPO: string;
  poDate: string;
  exFactory: string;
  deliveryTerms: string;
  portName: string;
  currency: string;
  totalAmount: number;
  payTerm1: string;
  payTerm2: string;
}

export interface DropdownData {
  buyerNames: string[];
  fileNumbers: string[];
  deliveryTerms: string[];
  portNames: string[];
  paymentTerms1: string[];
  paymentTerms2: string[];
  buyerSources: string[];
  buyerSubSources: string[];
  products: string[];
  shapes: string[];
  designers: string[];
  brands: string[];
  sizes: string[];
  qualities: string[];
  colors: string[];
  unitsQty: string[];
  unitsPrice: string[];
  packs: string[];
  ppTopSamples: string[];
  payActivities: string[];
}

export interface DashboardStats {
  totalPOs: number;
  totalValue: number;
  thisMonth: number;
  buyers: number;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export interface APIResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}
