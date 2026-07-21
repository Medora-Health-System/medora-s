/**
 * D3E.6 — Hospital Care operational dashboard summary (pure, facility-scoped inputs).
 * Counts derive from real placement rows — never invent census data.
 */

export type HospitalCareDashboardPlacementRow = {
  id: string;
  status: string;
  requestedEncounterType?: string | null;
  arrivedDestinationAt?: string | Date | null;
  receivingEncounterId?: string | null;
  departedEdAt?: string | Date | null;
  readyForTransferAt?: string | Date | null;
  assignedBedKey?: string | null;
  assignedUnitCode?: string | null;
  requestedAt?: string | Date | null;
  createdAt?: string | Date | null;
  acceptingProviderNameSnapshot?: string | null;
  patient?: {
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
  } | null;
};

export type HospitalCareDashboardCapabilities = {
  emergencyDepartment: boolean;
  observation: boolean;
  inpatient: boolean;
  directAdmission: boolean;
  bedManagement: boolean;
  transfers: boolean;
  placementWorkflow: boolean;
  receivingEncounters: boolean;
};

export type HospitalCareDashboardCounts = {
  placementRequested: number;
  placementAccepted: number;
  awaitingBed: number;
  readyForTransfer: number;
  activeObservation: number;
  activeInpatient: number;
  admissionsToday: number;
  dischargesToday: number;
  bedsAvailable: number | null;
  bedsOccupied: number | null;
  bedsUnavailable: number | null;
};

export type HospitalCareAttentionItem = {
  code: string;
  count: number;
  severity: "info" | "warning" | "critical";
};

export type HospitalCareRecentActivityItem = {
  id: string;
  kind: string;
  occurredAt: string;
  label: string;
  destination?: string | null;
};

export type HospitalCareDashboardSummary = {
  facilityId: string;
  generatedAt: string;
  placementAvailability: "ENABLED" | "FEATURE_DISABLED";
  capabilities: HospitalCareDashboardCapabilities;
  counts: HospitalCareDashboardCounts;
  attention: HospitalCareAttentionItem[];
  recentActivity: HospitalCareRecentActivityItem[];
  emptyGuidance: {
    boardEmpty: boolean;
    observationOptional: true;
    directInpatientSupported: boolean;
  };
};

function statusOf(row: HospitalCareDashboardPlacementRow): string {
  return String(row.status ?? "")
    .trim()
    .toUpperCase();
}

function destOf(row: HospitalCareDashboardPlacementRow): string {
  return String(row.requestedEncounterType ?? "")
    .trim()
    .toUpperCase();
}

function isArrived(row: HospitalCareDashboardPlacementRow): boolean {
  const s = statusOf(row);
  return (
    s === "ARRIVED_DESTINATION" ||
    s === "COMPLETED" ||
    Boolean(row.arrivedDestinationAt) ||
    Boolean(row.receivingEncounterId)
  );
}

function isSameUtcDay(iso: string | Date | null | undefined, now: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return false;
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function patientLabel(row: HospitalCareDashboardPlacementRow): string {
  const p = row.patient;
  const name = `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim();
  return name || p?.mrn?.trim() || row.id;
}

/**
 * Build operational dashboard from placement rows + optional clinical census overrides.
 *
 * D3E.6A: When placementAvailability is FEATURE_DISABLED, only placement metrics
 * zero out. Clinical activeObservation / activeInpatient come from clinicalCensus
 * (open encounters) and remain visible.
 */
export function buildHospitalCareDashboardSummary(input: {
  facilityId: string;
  generatedAt?: string;
  placementAvailability: "ENABLED" | "FEATURE_DISABLED";
  rows: HospitalCareDashboardPlacementRow[];
  capabilities: HospitalCareDashboardCapabilities;
  now?: Date;
  /** Canonical open-encounter census — authoritative for Observation/Inpatient tiles. */
  clinicalCensus?: {
    activeObservation: number;
    activeInpatient: number;
    admissionsToday?: number;
    bedsAvailable?: number | null;
    bedsOccupied?: number | null;
    bedsUnavailable?: number | null;
  } | null;
}): HospitalCareDashboardSummary {
  const now = input.now ?? new Date();
  const facilityId = String(input.facilityId ?? "").trim();
  const rows =
    input.placementAvailability === "ENABLED" ? input.rows : [];

  let placementRequested = 0;
  let placementAccepted = 0;
  let awaitingBed = 0;
  let readyForTransfer = 0;
  let placementDerivedObservation = 0;
  let placementDerivedInpatient = 0;
  let admissionsToday = 0;

  const attentionMap = new Map<string, number>();
  const bump = (code: string) => attentionMap.set(code, (attentionMap.get(code) ?? 0) + 1);

  for (const row of rows) {
    const s = statusOf(row);
    const dest = destOf(row);
    if (s === "REQUESTED" || s === "SIGNED") placementRequested += 1;
    if (s === "ACCEPTED") {
      placementAccepted += 1;
      awaitingBed += 1;
      bump("ACCEPTED_WITHOUT_BED");
    }
    if (s === "UNDER_REVIEW") bump("PLACEMENTS_AWAITING_REVIEW");
    if (s === "BED_ASSIGNED") awaitingBed += 0; // has bed
    if (s === "READY_FOR_TRANSFER") readyForTransfer += 1;
    if (s === "DEPARTED_ED") bump("DEPARTED_ED_AWAITING_ARRIVAL");
    if (isArrived(row) && dest === "OBSERVATION") placementDerivedObservation += 1;
    if (isArrived(row) && dest === "INPATIENT") placementDerivedInpatient += 1;
    if (
      isSameUtcDay(row.arrivedDestinationAt ?? row.requestedAt ?? row.createdAt, now) &&
      (dest === "OBSERVATION" || dest === "INPATIENT")
    ) {
      admissionsToday += 1;
    }
  }

  const clinical = input.clinicalCensus;
  const activeObservation = clinical
    ? clinical.activeObservation
    : placementDerivedObservation;
  const activeInpatient = clinical ? clinical.activeInpatient : placementDerivedInpatient;
  if (clinical?.admissionsToday != null) {
    admissionsToday = clinical.admissionsToday;
  }

  const attention: HospitalCareAttentionItem[] = [...attentionMap.entries()].map(
    ([code, count]) => ({
      code,
      count,
      severity:
        code === "DEPARTED_ED_AWAITING_ARRIVAL" || code === "ACCEPTED_WITHOUT_BED"
          ? "warning"
          : "info",
    })
  );

  const recentActivity: HospitalCareRecentActivityItem[] = [...rows]
    .sort((a, b) => {
      const ta = Date.parse(String(a.arrivedDestinationAt ?? a.requestedAt ?? a.createdAt ?? 0));
      const tb = Date.parse(String(b.arrivedDestinationAt ?? b.requestedAt ?? b.createdAt ?? 0));
      return tb - ta;
    })
    .slice(0, 12)
    .map((row) => {
      const s = statusOf(row);
      const dest = destOf(row);
      let kind = "PLACEMENT_UPDATE";
      if (s === "REQUESTED" || s === "SIGNED") kind = "ADMISSION_REQUESTED";
      else if (s === "ACCEPTED") kind = "PLACEMENT_ACCEPTED";
      else if (s === "BED_ASSIGNED") kind = "BED_ASSIGNED";
      else if (s === "DEPARTED_ED") kind = "DEPARTED_ED";
      else if (isArrived(row) && dest === "OBSERVATION") kind = "ARRIVED_OBSERVATION";
      else if (isArrived(row) && dest === "INPATIENT") kind = "ARRIVED_INPATIENT";
      return {
        id: row.id,
        kind,
        occurredAt: String(
          row.arrivedDestinationAt ?? row.requestedAt ?? row.createdAt ?? now.toISOString()
        ),
        label: patientLabel(row),
        destination: dest || null,
      };
    });

  const boardEmpty =
    placementRequested +
      placementAccepted +
      awaitingBed +
      readyForTransfer +
      activeObservation +
      activeInpatient ===
    0;

  return {
    facilityId,
    generatedAt: input.generatedAt ?? now.toISOString(),
    placementAvailability: input.placementAvailability,
    capabilities: input.capabilities,
    counts: {
      placementRequested,
      placementAccepted,
      awaitingBed,
      readyForTransfer,
      activeObservation,
      activeInpatient,
      admissionsToday,
      dischargesToday: 0,
      bedsAvailable: clinical?.bedsAvailable ?? null,
      bedsOccupied: clinical?.bedsOccupied ?? null,
      bedsUnavailable: clinical?.bedsUnavailable ?? null,
    },
    attention,
    recentActivity,
    emptyGuidance: {
      boardEmpty,
      observationOptional: true,
      directInpatientSupported: input.capabilities.directAdmission || input.capabilities.inpatient,
    },
  };
}

/** Empty-state copy keys must never imply Observation is required. */
export function hospitalCareEmptyStateImpliesObservationRequired(
  emptyStateKey: string
): boolean {
  const k = emptyStateKey.toLowerCase();
  return k.includes("must use observation") || k.includes("requires observation");
}
