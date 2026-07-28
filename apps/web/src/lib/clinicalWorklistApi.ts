import { apiFetch } from "./apiClient";
import type { HospitalisationBoardEncounterRow } from "./hospitalisationBoardTypes";
import { getPendingCreateOrdersForEncounter, mergeOrders } from "@/lib/offline/pendingEncounterOrders";

/** Open encounters for nursing/provider worklists (same source as trackboard). */
export async function fetchOpenEncounters(facilityId: string): Promise<any[]> {
  const data = await apiFetch("/trackboard?status=OPEN", { facilityId });
  return Array.isArray(data) ? data : [];
}

/**
 * Phase 10A — operational ER ownership self-assignment endpoints.
 * Returns the updated encounter row from the API on success; throws on 4xx/5xx
 * so the caller can surface the user-facing message.
 */
export async function assignProviderSelf(facilityId: string, encounterId: string): Promise<unknown> {
  return apiFetch(`/encounters/${encounterId}/assign-provider/me`, {
    method: "POST",
    facilityId,
    body: JSON.stringify({}),
  });
}

export async function assignNurseSelf(facilityId: string, encounterId: string): Promise<unknown> {
  return apiFetch(`/encounters/${encounterId}/assign-nurse/me`, {
    method: "POST",
    facilityId,
    body: JSON.stringify({}),
  });
}

/** Enterprise encounter workflow transition (ARRIVED→TRIAGE, TRIAGE→IN_TREATMENT, …). Audited via PATCH. */
export async function patchEncounterWorkflowState(
  facilityId: string,
  encounterId: string,
  workflowState: string
): Promise<unknown> {
  return apiFetch(`/encounters/${encounterId}`, {
    method: "PATCH",
    facilityId,
    body: JSON.stringify({ workflowState }),
  });
}

/**
 * MEDUI.D4C.7D — thin ambulatory adapter: delegates 100% to enterprise
 * `POST /encounters/:id/close` (EncountersService.close). No Clinic-local status write.
 */
export async function closeAmbulatoryEncounterViaEnterprise(
  facilityId: string,
  encounterId: string,
  body?: {
    acknowledgeDeficiencies?: boolean;
    acknowledgeDispositionSafety?: boolean;
    acknowledgePendingItems?: boolean;
    acknowledgementVersion?: string;
    pendingItemsOverrideReason?: string;
    dischargeStatus?: string;
  }
): Promise<unknown> {
  return apiFetch(`/encounters/${encounterId}/close`, {
    method: "POST",
    facilityId,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

export async function closeCheckAmbulatoryEncounter(
  facilityId: string,
  encounterId: string,
  body?: Record<string, unknown>
): Promise<unknown> {
  return apiFetch(`/encounters/${encounterId}/close-check`, {
    method: "POST",
    facilityId,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

/** D4A.3.0 — hospital-lane assignment (Observation/Inpatient bag). Re-export for worklists. */
export {
  assignHospitalRoleToMe,
  unassignHospitalRole,
  reassignHospitalRole,
  fetchHospitalAssignmentProjection,
  mutateHospitalAssignment,
} from "@/features/hospital-care/hospitalAssignmentApi";

/** Orders for one encounter (same payload as OrdersTab). */
export async function fetchOrdersForEncounter(facilityId: string, encounterId: string): Promise<unknown[]> {
  const pending = await getPendingCreateOrdersForEncounter(facilityId, encounterId).catch(() => [] as Record<string, unknown>[]);
  try {
    const data = await apiFetch(`/encounters/${encounterId}/orders`, { facilityId });
    const server = Array.isArray(data) ? data : [];
    return mergeOrders(server, pending);
  } catch {
    return mergeOrders([], pending);
  }
}

/** Order lifecycle event stream for one encounter (descending by performedAt). */
export async function fetchOrderEventsForEncounter(
  facilityId: string,
  encounterId: string
): Promise<unknown[]> {
  const data = await apiFetch(`/encounters/${encounterId}/order-events`, { facilityId });
  return Array.isArray(data) ? data : [];
}

/** Open inpatient encounters (hospitalisation board — no today-only filter on API). */
export async function fetchHospitalisationEncounters(
  facilityId: string
): Promise<HospitalisationBoardEncounterRow[]> {
  const data = await apiFetch("/trackboard?status=OPEN&type=INPATIENT", { facilityId });
  return Array.isArray(data) ? (data as HospitalisationBoardEncounterRow[]) : [];
}
