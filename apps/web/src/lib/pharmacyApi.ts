import { apiFetch } from "./apiClient";
import { searchCatalog } from "./catalogSearchApi";
import type { CatalogSearchItem } from "./catalogSearchTypes";

/** Réponse normalisée `GET /catalog/medications/search` (identique au type catalogue). */
export type MedicationSearchItem = CatalogSearchItem;

export function medicationSearchLabel(m: CatalogSearchItem): string {
  return [m.displayNameFr, m.secondaryText].filter(Boolean).join(" · ");
}

export type CatalogMedication = {
  id: string;
  code: string;
  name: string;
  displayNameFr?: string | null;
  genericName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  route?: string | null;
};

export async function searchMedications(
  facilityId: string,
  params: { q: string; limit?: number; favoritesFirst?: boolean }
) {
  const items = await searchCatalog(facilityId, "MEDICATION", {
    q: params.q,
    limit: params.limit,
    favoritesFirst: params.favoritesFirst,
  });
  return { items };
}

export async function fetchMedicationFavorites(facilityId: string) {
  return apiFetch("/pharmacy/medications/favorites", {
    facilityId,
  }) as Promise<{ items: MedicationSearchItem[] }>;
}

export async function fetchMedicationRecent(facilityId: string) {
  return apiFetch("/pharmacy/medications/recent", {
    facilityId,
  }) as Promise<{ items: MedicationSearchItem[] }>;
}

export type InventoryItemRow = {
  id: string;
  sku: string;
  lotNumber: string | null;
  expirationDate: string | null;
  quantityOnHand: number;
  reorderLevel: number;
  unit: string | null;
  isActive: boolean;
  catalogMedication: CatalogMedication;
};

export async function fetchCatalogMedications(facilityId: string) {
  return apiFetch("/pharmacy/catalog-medications", { facilityId }) as Promise<
    CatalogMedication[]
  >;
}

export async function fetchInventoryList(
  facilityId: string,
  params: Record<string, string | undefined>
) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") q.set(k, v);
  });
  return apiFetch(`/pharmacy/inventory?${q.toString()}`, {
    facilityId,
  }) as Promise<{ items: InventoryItemRow[]; total: number }>;
}

export async function fetchInventoryItem(facilityId: string, id: string) {
  return apiFetch(`/pharmacy/inventory/${id}`, { facilityId }) as Promise<
    InventoryItemRow
  >;
}

export async function createInventoryItem(
  facilityId: string,
  body: Record<string, unknown>
) {
  return apiFetch("/pharmacy/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  });
}

export async function receiveStock(
  facilityId: string,
  inventoryItemId: string,
  body: { quantity: number; notes?: string }
) {
  return apiFetch(`/pharmacy/inventory/${inventoryItemId}/receive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  });
}

export async function adjustStock(
  facilityId: string,
  inventoryItemId: string,
  body: { quantity: number; notes?: string }
) {
  return apiFetch(`/pharmacy/inventory/${inventoryItemId}/adjust`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  });
}

export async function fetchLowStock(facilityId: string) {
  return apiFetch("/pharmacy/inventory-low-stock", { facilityId }) as Promise<InventoryItemRow[]>;
}

export async function fetchExpiring(facilityId: string, withinDays: number) {
  return apiFetch(`/pharmacy/inventory-expiring?withinDays=${withinDays}`, {
    facilityId,
  }) as Promise<InventoryItemRow[]>;
}

export type PharmacyPatientSummary = {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string | null;
    dob: string | null;
    sexAtBirth: string | null;
  };
  encounters: Array<{ id: string; type: string; status: string; createdAt: string }>;
  medicationOrders: unknown[];
  recentDispenses: unknown[];
};

export type PharmacyDispenseContext = {
  encounter: { id: string; type: string; status: string; createdAt: string };
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string | null;
    dob: string | null;
    sexAtBirth: string | null;
  };
  medicationOrders: Array<{
    id: string;
    status: string;
    createdAt: string;
    prescriberName?: string | null;
    prescriberLicense?: string | null;
    prescriberContact?: string | null;
    items: Array<{
      id: string;
      catalogItemId: string;
      quantity: number | null;
      strength?: string | null;
      notes?: string | null;
      status: string;
      catalogMedication?: { code: string; name: string; displayNameFr?: string | null };
    }>;
  }>;
};

export async function fetchPharmacyPatientSummary(facilityId: string, patientId: string) {
  return apiFetch(`/pharmacy/patients/${patientId}/summary`, {
    facilityId,
  }) as Promise<PharmacyPatientSummary>;
}

export async function fetchPharmacyDispenseContext(facilityId: string, encounterId: string) {
  return apiFetch(`/pharmacy/encounters/${encounterId}/dispense-context`, {
    facilityId,
  }) as Promise<PharmacyDispenseContext>;
}

export async function dispenseMedication(
  facilityId: string,
  body: {
    inventoryItemId: string;
    patientId: string;
    encounterId: string;
    quantityDispensed: number;
    dosageInstructions?: string;
    notes?: string;
  }
) {
  return apiFetch("/pharmacy/dispenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  });
}
