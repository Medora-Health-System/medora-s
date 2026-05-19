/**
 * Phase 19C.1 — read-only canonical medication master explorer (`/api/backend/medication-master/*`).
 */

import { parseApiResponse } from "./apiClient";
import { normalizeUserFacingError } from "./userFacingError";

const API_BASE = "/api/backend/medication-master";

export type MedicationMasterBadges = {
  edFormulary: boolean;
  rsi: boolean;
  crashCart: boolean;
  infusion: boolean;
  controlled: boolean;
  highAlert: boolean;
  billingReview: boolean;
  ndcPresent: boolean;
};

export type MedicationMasterSearchHit = {
  conceptId: string;
  conceptCode: string;
  displayName: string;
  genericName: string;
  productId: string | null;
  productCode: string | null;
  strengthDisplay: string | null;
  packageId: string | null;
  packageCode: string | null;
  packageDescription: string | null;
  ndc11: string | null;
  administrationType: string | null;
  badges: MedicationMasterBadges;
  matchKind: "concept" | "product" | "package" | "alias";
};

export type MedicationMasterSearchParams = {
  q?: string;
  limit?: number;
  offset?: number;
  facilityId?: string;
  activeOnly?: boolean;
  edFormularyOnly?: boolean;
  controlledOnly?: boolean;
  highAlertOnly?: boolean;
  infusionOnly?: boolean;
  onFormularyOnly?: boolean;
  ndcStatus?: "present" | "missing" | "any";
  administrationType?: string;
};

export type MedicationMasterConceptDetail = {
  concept: {
    id: string;
    code: string;
    genericName: string;
    displayName: string;
    isActive: boolean;
    rxNormConceptId: string | null;
    therapeuticClass: { code: string; name: string } | null;
    safetyProfile: {
      isHighAlert: boolean;
      isControlled: boolean;
      controlledSchedule: string | null;
      requiresWitness: boolean;
      requiresDoubleSign: boolean;
    } | null;
    aliases: Array<{ alias: string; aliasType: string | null }>;
  };
  products: Array<{
    id: string;
    code: string;
    strengthDisplay: string;
    dosageForm: string;
    administrationType: string;
    billingClass: string;
    isActive: boolean;
    legacyCatalogMedicationId: string | null;
    defaultRoute: { code: string; label: string } | null;
    administrationProfile: {
      defaultMarWorkflow: string;
      requiresInfusionSession: boolean;
      hydrationFluid: boolean;
    } | null;
    infusionProfile: { infusionType: string; rateRequired: boolean } | null;
    packages: Array<{
      id: string;
      code: string;
      packageDescription: string;
      packageType: string;
      ndc11: string | null;
      ndcDisplay: string | null;
      isDefaultForProduct: boolean;
      badges: MedicationMasterBadges;
      billingProfiles: Array<{
        requiresManualReview: boolean;
        hcpcsCodeSuggested: string | null;
        revenueCodeSuggested: string | null;
      }>;
      facilityFormulary: {
        id: string;
        isOnFormulary: boolean;
        isEDFormulary: boolean;
        favoriteTier: string | null;
        sortPriority: number | null;
      } | null;
    }>;
  }>;
};

export type MedicationMasterFormularyItem = {
  formularyItemId: string;
  facilityId: string;
  packageId: string;
  isOnFormulary: boolean;
  isEDFormulary: boolean;
  favoriteTier: string | null;
  sortPriority: number | null;
  conceptId: string;
  conceptCode: string;
  displayName: string;
  genericName: string;
  productId: string;
  productCode: string;
  strengthDisplay: string;
  administrationType: string;
  packageCode: string;
  packageDescription: string;
  ndc11: string | null;
  badges: MedicationMasterBadges;
};

function buildSearchQuery(params: MedicationMasterSearchParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  if (params.facilityId) sp.set("facilityId", params.facilityId);
  if (params.activeOnly === false) sp.set("activeOnly", "false");
  if (params.edFormularyOnly) sp.set("edFormularyOnly", "true");
  if (params.controlledOnly) sp.set("controlledOnly", "true");
  if (params.highAlertOnly) sp.set("highAlertOnly", "true");
  if (params.infusionOnly) sp.set("infusionOnly", "true");
  if (params.onFormularyOnly) sp.set("onFormularyOnly", "true");
  if (params.ndcStatus && params.ndcStatus !== "any") sp.set("ndcStatus", params.ndcStatus);
  if (params.administrationType) sp.set("administrationType", params.administrationType);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

async function medicationMasterFetch<T>(path: string, facilityId: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { "x-facility-id": facilityId },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(normalizeUserFacingError(txt || `HTTP ${res.status}`) || `HTTP ${res.status}`);
  }
  return (await parseApiResponse(res)) as T;
}

export async function searchMedicationMaster(
  facilityId: string,
  params: MedicationMasterSearchParams
): Promise<{ items: MedicationMasterSearchHit[]; total: number }> {
  return medicationMasterFetch(
    `/search${buildSearchQuery({ ...params, facilityId })}`,
    facilityId
  );
}

export async function fetchMedicationMasterConcept(
  facilityId: string,
  conceptId: string
): Promise<MedicationMasterConceptDetail> {
  const qs = new URLSearchParams({ facilityId }).toString();
  return medicationMasterFetch(`/concepts/${encodeURIComponent(conceptId)}?${qs}`, facilityId);
}

export async function fetchMedicationMasterFormulary(
  facilityId: string
): Promise<{ items: MedicationMasterFormularyItem[]; total: number }> {
  return medicationMasterFetch(
    `/formulary/facility/${encodeURIComponent(facilityId)}`,
    facilityId
  );
}
