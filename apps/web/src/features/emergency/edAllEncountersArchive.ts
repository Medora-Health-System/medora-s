import {
  EdClosedEncounterCertificationResponsibleRole,
  EdClosedEncounterCertificationStatus,
  isEdProviderDocumentationSigned,
  type EdClosedEncounterCertificationResult,
} from "@medora/shared";
import { calculateAge } from "@/lib/patientDisplay";
import { computeLos } from "@/features/emergency/erLengthOfStay";
import {
  buildEdClosedEncounterCertificationFromEncounter,
  type EdClosureCertificationEncounter,
} from "@/features/emergency/edClosedEncounterCertificationFromEncounter";
import { buildEdTrackboardLifecycleSnapshot } from "@/features/emergency/edIncompleteChartsFilter";
import { emergencyChartPath } from "@/features/emergency/emergencyRoutes";
import { apiFetch } from "@/lib/apiClient";
import { shouldReplaceEncounterRows } from "@/features/emergency/edTrackboardSilentRefresh";

/** Archive list is paginated server-side; UI must not assume full history is loaded. */
export const ED_ALL_ENCOUNTERS_ARCHIVE_DEFAULT_LIMIT = 100;
export const ED_ALL_ENCOUNTERS_ARCHIVE_MAX_LIMIT = 200;

export type EdAllEncountersArchiveRow = {
  id: string;
  patientName: string;
  mrn: string | null;
  gender: string | null;
  age: number | null;
  dob: string | null;
  chiefComplaint: string | null;
  visitDate: string;
  los: string;
  status: EdArchiveEncounterStatusLabelKey;
  facilityName: string | null;
  billingStatusLabel: EdArchiveBillingStatusLabelKey;
  billingReady: boolean;
  codingReady: boolean;
  billingFinalizationStatus: string | null;
  billingReadinessSnapshot: Record<string, unknown> | null;
  phone: string | null;
  chartHref: string;
  demoHref: string | null;
  certifiedClosed: boolean;
  allEncountersEligible: boolean;
  updatedAt: string;
};

export type EdArchiveEncounterStatusLabelKey = "closed" | "certified_closed";

export type EdArchiveBillingStatusLabelKey =
  | "ready_for_billing"
  | "ready_for_coding"
  | "billing_not_ready"
  | "coding_review_needed"
  | "not_reviewed";

export type EdAllEncountersArchiveFilters = {
  search: string;
  startDate: string;
  endDate: string;
  facilityId: string;
};

export type EmergencyEncountersArchiveApiRow = EdClosureCertificationEncounter & {
  id: string;
  createdAt?: string | null;
  dischargedAt?: string | null;
  facility?: { name?: string | null } | null;
  diagnosisCount?: number;
  certification?: Pick<
    EdClosedEncounterCertificationResult,
    | "status"
    | "allEncountersEligible"
    | "certifiedClosed"
    | "billingReady"
    | "closureReady"
    | "billingBlockers"
    | "codingDeficiencies"
    | "advisoryFindings"
  >;
};

export function isEncounterEligibleForAllEncounters(
  encounter: EdClosureCertificationEncounter
): boolean {
  const status = (encounter.status ?? "").trim().toUpperCase();
  if (status !== "CLOSED") return false;
  const snapshot = buildEdTrackboardLifecycleSnapshot(encounter);
  return isEdProviderDocumentationSigned(snapshot);
}

export function isEncounterCertifiedClosedForDisplay(
  encounter: EdClosureCertificationEncounter,
  opts?: { diagnosisCount?: number | null }
): boolean {
  const certification = buildEdClosedEncounterCertificationFromEncounter(encounter, {
    diagnosisCount: opts?.diagnosisCount ?? null,
  });
  return certification.certifiedClosed;
}

export function resolveAllEncountersCertificationDisplayStatus(
  encounter: EdClosureCertificationEncounter,
  opts?: { diagnosisCount?: number | null }
): Pick<
  EdClosedEncounterCertificationResult,
  "status" | "certifiedClosed" | "allEncountersEligible" | "billingReady" | "billingBlockers"
> {
  const certification = buildEdClosedEncounterCertificationFromEncounter(encounter, {
    diagnosisCount: opts?.diagnosisCount ?? null,
  });
  return {
    status: certification.status,
    certifiedClosed: certification.certifiedClosed,
    allEncountersEligible: certification.allEncountersEligible,
    billingReady: certification.billingReady,
    billingBlockers: certification.billingBlockers,
  };
}

export function resolveEdArchiveEncounterStatusLabelKey(
  certification: Pick<EdClosedEncounterCertificationResult, "certifiedClosed">
): EdArchiveEncounterStatusLabelKey {
  return certification.certifiedClosed ? "certified_closed" : "closed";
}

function hasArchiveCodingReviewNeeded(
  certification: {
    billingBlockers: EdClosedEncounterCertificationResult["billingBlockers"];
    codingDeficiencies?: EdClosedEncounterCertificationResult["codingDeficiencies"];
    advisoryFindings?: EdClosedEncounterCertificationResult["advisoryFindings"];
  }
): boolean {
  if (
    certification.billingBlockers.some(
      (blocker) =>
        blocker.responsibleRole === EdClosedEncounterCertificationResponsibleRole.CODING
    )
  ) {
    return true;
  }
  const codingDefs = certification.codingDeficiencies ?? [];
  if (codingDefs.some((d) => d.suggestsBillingReview || d.id === "billing:diagnosis-missing")) {
    return true;
  }
  const advisory = certification.advisoryFindings ?? [];
  return advisory.some(
    (d) =>
      d.responsibleRole === EdClosedEncounterCertificationResponsibleRole.CODING ||
      d.id === "billing:diagnosis-missing"
  );
}

export function resolveEdArchiveBillingStatusLabelKey(
  encounter: Pick<EdClosureCertificationEncounter, "billingReadinessSnapshotJson">,
  certification: Pick<
    EdClosedEncounterCertificationResult,
    | "billingReady"
    | "billingBlockers"
    | "status"
    | "codingDeficiencies"
    | "advisoryFindings"
  >
): EdArchiveBillingStatusLabelKey {
  const snapshot = encounter.billingReadinessSnapshotJson;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return "not_reviewed";
  }
  if (hasArchiveCodingReviewNeeded(certification)) {
    return "coding_review_needed";
  }
  if (certification.billingReady) {
    if (certification.status === EdClosedEncounterCertificationStatus.CERTIFIED_CLOSED) {
      return "ready_for_billing";
    }
    return "ready_for_coding";
  }
  return "billing_not_ready";
}

/**
 * Archive coding column — advisory coding findings may mark review needed for display.
 * Does not independently block billing submission APIs.
 */
export function resolveEdArchiveCodingReady(
  certification: Pick<
    EdClosedEncounterCertificationResult,
    "billingReady" | "billingBlockers" | "codingDeficiencies" | "advisoryFindings"
  >
): boolean {
  if (hasArchiveCodingReviewNeeded(certification)) return false;
  return certification.billingReady;
}

function formatPatientName(encounter: EmergencyEncountersArchiveApiRow): string {
  const first = (encounter.patient?.firstName ?? "").trim();
  const last = (encounter.patient?.lastName ?? "").trim();
  const full = `${first} ${last}`.trim();
  return full || "—";
}

function resolveChiefComplaint(encounter: EmergencyEncountersArchiveApiRow): string | null {
  const direct = (encounter.chiefComplaint ?? "").trim();
  if (direct) return direct;
  const triage = (encounter.triage?.chiefComplaint ?? "").trim();
  return triage || null;
}

export function computeArchiveLos(
  createdAt: string | null | undefined,
  dischargedAt: string | null | undefined
): string {
  if (!createdAt) return "—";
  const endMs = dischargedAt ? new Date(dischargedAt).getTime() : new Date(createdAt).getTime();
  if (!Number.isFinite(endMs)) return "—";
  const los = computeLos(createdAt, endMs);
  return los?.labelPadded ?? "—";
}

export function mapEmergencyEncountersArchiveApiRow(
  row: EmergencyEncountersArchiveApiRow
): EdAllEncountersArchiveRow | null {
  if (!isEncounterEligibleForAllEncounters(row)) return null;

  const certification =
    row.certification ??
    buildEdClosedEncounterCertificationFromEncounter(row, {
      diagnosisCount: row.diagnosisCount ?? null,
    });

  const patientRecord = row.patient as { id?: string; mrn?: string | null } | null | undefined;
  const demoPatientId = patientRecord?.id ?? null;

  const dob = row.patient?.dob ?? null;
  const age =
    dob && Number.isFinite(calculateAge(dob)) && calculateAge(dob) >= 0 ? calculateAge(dob) : null;

  const billingStatusLabel = resolveEdArchiveBillingStatusLabelKey(row, certification);
  const billingReadinessSnapshot =
    row.billingReadinessSnapshotJson &&
    typeof row.billingReadinessSnapshotJson === "object" &&
    !Array.isArray(row.billingReadinessSnapshotJson)
      ? (row.billingReadinessSnapshotJson as Record<string, unknown>)
      : null;

  return {
    id: row.id,
    patientName: formatPatientName(row),
    mrn: row.patient?.mrn ?? null,
    gender: row.patient?.sexAtBirth ?? null,
    age,
    dob,
    chiefComplaint: resolveChiefComplaint(row),
    visitDate: row.createdAt ?? "",
    los: computeArchiveLos(row.createdAt, row.dischargedAt),
    status: resolveEdArchiveEncounterStatusLabelKey(certification),
    facilityName: row.facility?.name ?? null,
    billingStatusLabel,
    billingReady: certification.billingReady,
    codingReady: resolveEdArchiveCodingReady(certification),
    billingFinalizationStatus: row.billingFinalizationStatus ?? null,
    billingReadinessSnapshot,
    phone: row.patient?.phone ?? null,
    chartHref: emergencyChartPath(row.id),
    demoHref: demoPatientId ? `/app/patients/${encodeURIComponent(demoPatientId)}/profile` : null,
    certifiedClosed: certification.certifiedClosed,
    allEncountersEligible: certification.allEncountersEligible,
    updatedAt: row.dischargedAt ?? row.createdAt ?? row.id,
  };
}

export function mapEmergencyEncountersArchiveApiRows(
  rows: readonly EmergencyEncountersArchiveApiRow[]
): EdAllEncountersArchiveRow[] {
  return rows
    .map((row) => mapEmergencyEncountersArchiveApiRow(row))
    .filter((row): row is EdAllEncountersArchiveRow => row != null);
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function filterEdAllEncountersArchiveRows(
  rows: readonly EdAllEncountersArchiveRow[],
  filters: Pick<EdAllEncountersArchiveFilters, "search" | "startDate" | "endDate">
): EdAllEncountersArchiveRow[] {
  const search = normalizeSearch(filters.search);
  const startMs = filters.startDate ? new Date(filters.startDate).getTime() : null;
  const endMs = filters.endDate ? new Date(filters.endDate).getTime() : null;
  const endInclusive =
    endMs != null && Number.isFinite(endMs)
      ? new Date(filters.endDate).setHours(23, 59, 59, 999)
      : null;

  return rows.filter((row) => {
    if (search) {
      const haystack = [
        row.patientName,
        row.mrn ?? "",
        row.chiefComplaint ?? "",
        row.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (startMs != null && Number.isFinite(startMs)) {
      const visitMs = new Date(row.visitDate).getTime();
      if (!Number.isFinite(visitMs) || visitMs < startMs) return false;
    }

    if (endInclusive != null && Number.isFinite(endInclusive)) {
      const visitMs = new Date(row.visitDate).getTime();
      if (!Number.isFinite(visitMs) || visitMs > endInclusive) return false;
    }

    return true;
  });
}

export function shouldReplaceArchiveRows(
  prev: readonly EdAllEncountersArchiveRow[],
  next: readonly EdAllEncountersArchiveRow[]
): boolean {
  return shouldReplaceEncounterRows(prev, next);
}

export async function fetchEdAllEncountersArchive(params: {
  facilityId: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: EdAllEncountersArchiveRow[]; total: number }> {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.search?.trim()) query.set("search", params.search.trim());
  const boundedLimit = Math.min(
    Math.max(params.limit ?? ED_ALL_ENCOUNTERS_ARCHIVE_DEFAULT_LIMIT, 1),
    ED_ALL_ENCOUNTERS_ARCHIVE_MAX_LIMIT
  );
  query.set("limit", String(boundedLimit));
  if (params.offset != null) query.set("offset", String(params.offset));

  const suffix = query.toString();
  const path = `/emergency/encounters/archive?${suffix}`;
  const data = (await apiFetch(path, { facilityId: params.facilityId })) as {
    rows?: EmergencyEncountersArchiveApiRow[];
    total?: number;
  };

  const apiRows = Array.isArray(data?.rows) ? data.rows : [];
  return {
    rows: mapEmergencyEncountersArchiveApiRows(apiRows),
    total: typeof data?.total === "number" ? data.total : apiRows.length,
  };
}
