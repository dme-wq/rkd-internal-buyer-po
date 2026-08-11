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
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<APIResponse<T>> {
  try {
    const res = await fetch(url, options);
    const json: APIResponse<T> = await res.json();
    return json;
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

// ─── GET Endpoints ──────────────────────────────────────────
export async function getDropdowns(): Promise<APIResponse<DropdownData>> {
  return apiFetch<DropdownData>(`${BASE_URL}?action=getDropdowns`);
}

export async function getDashboardStats(): Promise<APIResponse<DashboardStats>> {
  return apiFetch<DashboardStats>(`${BASE_URL}?action=getStats`);
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
  });
  return apiFetch(`${BASE_URL}?${query.toString()}`);
}

export async function getPOById(uid: string): Promise<APIResponse<PurchaseOrder>> {
  return apiFetch<PurchaseOrder>(`${BASE_URL}?action=getPOById&uid=${encodeURIComponent(uid)}`);
}

// ─── POST Endpoints ──────────────────────────────────────────
function post<T>(body: object): Promise<APIResponse<T>> {
  return apiFetch<T>(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // GAS requires text/plain for doPost
    body: JSON.stringify(body),
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
