// ============================================================
// RKD Export Buyer PO — API Layer (Google Apps Script)
// ============================================================

import type {
  APIResponse,
  DashboardStats,
  DropdownData,
  POHeader,
  POListItem,
  PurchaseOrder,
  SKUItem,
  PendingPO
} from './types';

const BASE_URL = 'https://script.google.com/macros/s/AKfycbyS0_yiIt4M9CNOf5ALQylcyg9jTYlAXFmTnQFpPbXmO40KNdFoR2BtCg1NVSVOpuCK/exec';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<APIResponse<T>> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    try {
      const json: APIResponse<T> = JSON.parse(text);
      return json;
    } catch (e) {
      if (text.trim().startsWith('<')) {
        return { status: 'error', message: "Google Apps Script returned an HTML error. This usually happens if the uploaded file is too large (causing a memory crash), or if the script permissions are incorrect. Please ensure the Apps Script is deployed as 'Execute as: Me' and 'Who has access: Anyone'." };
      }
      return { status: 'error', message: 'Invalid JSON response from server' };
    }
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

// ─── GET Endpoints ──────────────────────────────────────────
export async function getDropdowns(): Promise<APIResponse<DropdownData>> {
  return post({ action: 'getDropdowns', data: {} });
}

export async function extractPOData(internalPO: string, dropdowns: Partial<DropdownData>): Promise<APIResponse<any>> {
  return post({ action: 'extractPOData', data: { internalPO, dropdowns } });
}

export async function getDashboardStats(): Promise<APIResponse<DashboardStats>> {
  return apiFetch<DashboardStats>(`${BASE_URL}?action=getStats&_t=${Date.now()}`);
}

export async function getAllPOs(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<APIResponse<{ pos: POListItem[]; total: number; page: number; limit: number }>> {
  const query = new URLSearchParams({
    action: 'getAllPOs',
    page: String(params?.page ?? 1),
    limit: String(params?.limit ?? 20),
    search: params?.search ?? '',
    _t: String(Date.now()),
  });
  return apiFetch(`${BASE_URL}?${query.toString()}`);
}

export async function getPOById(uid: string): Promise<APIResponse<PurchaseOrder>> {
  return apiFetch<PurchaseOrder>(`${BASE_URL}?action=getPOById&uid=${encodeURIComponent(uid)}&_t=${Date.now()}`);
}

// ─── POST Endpoints ──────────────────────────────────────────
function post<T>(body: object): Promise<APIResponse<T>> {
  return apiFetch<T>(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // GAS requires text/plain for doPost
    body: JSON.stringify(body),
  });
}

export async function getPendingInternalPOs(): Promise<APIResponse<PendingPO[]>> {
  return apiFetch<PendingPO[]>(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'getPendingInternalPOs', data: {} }),
  });
}

export async function createPO(
  header: Omit<POHeader, 'uid' | 'internalPO'>,
  skus: Omit<SKUItem, 'id' | 'lineTotal' | 'totalQtyMfg' | 'skuCode'>[]
): Promise<APIResponse<{ uid: string; internalPO: string }>> {
  return post({ action: 'createPO', data: { header, skus } });
}

export async function updatePO(
  uid: string,
  header: Omit<POHeader, 'uid' | 'internalPO'>,
  skus: Omit<SKUItem, 'id' | 'lineTotal' | 'totalQtyMfg' | 'skuCode'>[]
): Promise<APIResponse<{ uid: string; internalPO: string }>> {
  return post({ action: 'updatePO', data: { uid, header, skus } });
}

export async function deletePO(uid: string): Promise<APIResponse<{ message: string }>> {
  return post({ action: 'deletePO', data: { uid } });
}

export async function savePDFtoDrive(
  uid: string,
  fileName: string,
  base64Content: string
): Promise<APIResponse<{ fileUrl: string; fileId: string }>> {
  return post({
    action: 'savePDF',
    data: { uid, fileName, fileContent: base64Content, mimeType: 'application/pdf' },
  });
}


export async function addDropdownOption(
  field: string,
  value: string
): Promise<APIResponse<{ message: string }>> {
  return post({ action: 'addDropdown', data: { field, value } });
}

export async function sendWhatsAppNotification(
  internalPO: string,
  pdfUrl: string,
  buyerName: string,
  buyerPO: string
): Promise<APIResponse<{ message: string; results: object[] }>> {
  return post({ action: 'sendWhatsApp', data: { internalPO, pdfUrl, buyerName, buyerPO } });
}
