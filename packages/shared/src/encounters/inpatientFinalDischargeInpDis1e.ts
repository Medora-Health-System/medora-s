/**
 * INP.DIS.1E — Final inpatient discharge convergence + readiness gate.
 * Persists under Encounter.dischargeSummaryJson.inpatientFinalDischarge.
 * Reuses InpatientLifecycleService.dischargeEncounter for encounter closure.
 * Detailed disposition (e.g. ELOPED) is preserved clinically even when coarse
 * Encounter.dischargeStatus maps to AMA for enum compatibility.
 */

import {
  hydrateInpatientProviderDischarge1C,
  mapInpatientDispositionToLifecycleStatus,
  type InpatientLifecycleDischargeStatus,
  type InpatientProviderDischargeV1C,
} from "./inpatientProviderDischargeInpDis1c.js";
import {
  detectProviderDispositionMismatch,
  hydrateInpatientNursingDischarge,
  isMedReconCompleteInSummary,
  nursingRequiresMedRecon,
  nursingRequiresProviderFinalize,
  validateInpatientNursingDischarge,
  type InpatientNursingDischargeV1D,
} from "./inpatientNursingDischargeInpDis1d.js";

export const INPATIENT_FINAL_DISCHARGE_SCHEMA_VERSION = "INP.DIS.1E" as const;

export type FinalDischargeReadinessState =
  | "complete"
  | "incomplete"
  | "attention"
  | "blocked"
  | "not_applicable";

export type InpatientFinalDischargeBlocker = {
  code: string;
  labelKey: string;
};

export type InpatientFinalDischargeReadiness = {
  ready: boolean;
  dispositionCode: string | null;
  dispositionLabel: string | null;
  /** Coarse Encounter.dischargeStatus-compatible mapping (ELOPED → AMA for enum only). */
  projectedLifecycleStatus: InpatientLifecycleDischargeStatus | null;
  /** Always the detailed clinical disposition; ELOPED stays ELOPED. */
  detailedDispositionCode: string | null;
  provider: FinalDischargeReadinessState;
  medicationReconciliation: FinalDischargeReadinessState;
  nursing: FinalDischargeReadinessState;
  departure: FinalDischargeReadinessState;
  disposition: FinalDischargeReadinessState;
  blockers: InpatientFinalDischargeBlocker[];
  warnings: InpatientFinalDischargeBlocker[];
  providerRevision: number;
  nursingRevision: number;
  departedAt: string | null;
  providerFinalizedAt: string | null;
  nursingCompletedAt: string | null;
};

export type InpatientFinalDischargeV1E = {
  schemaVersion: typeof INPATIENT_FINAL_DISCHARGE_SCHEMA_VERSION;
  dispositionCode: string;
  dispositionLabelSnapshot?: string | null;
  /** Coarse lifecycle enum projection — may map ELOPED → AMA. */
  lifecycleStatus: InpatientLifecycleDischargeStatus;
  /** Explicit clinical identity — never collapse ELOPED to AMA here. */
  clinicalDispositionCode: string;
  dischargedAt: string;
  dischargedByUserId: string;
  dischargedByDisplayNameSnapshot?: string | null;
  dischargedByProfessionalTitleSnapshot?: string | null;
  providerRevision?: number | null;
  nursingRevision?: number | null;
  departedAt?: string | null;
  providerFinalizedAt?: string | null;
  nursingCompletedAt?: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

/** Clinical identity for reporting/print — ELOPED is never AMA. */
export function resolveDetailedClinicalDisposition(
  code: string | null | undefined
): string | null {
  return trimOrNull(code)?.toUpperCase() ?? null;
}

/**
 * Coarse Encounter.dischargeStatus mapping.
 * ELOPED maps to AMA for enum compatibility ONLY — clinical code remains ELOPED.
 */
export function mapDetailedDispositionToCoarseDischargeStatus(
  code: string | null | undefined
): InpatientLifecycleDischargeStatus | null {
  return mapInpatientDispositionToLifecycleStatus(code);
}

export function isClinicallyEloped(code: string | null | undefined): boolean {
  return resolveDetailedClinicalDisposition(code) === "ELOPED";
}

export function emptyInpatientFinalDischargeReadiness(): InpatientFinalDischargeReadiness {
  return {
    ready: false,
    dispositionCode: null,
    dispositionLabel: null,
    projectedLifecycleStatus: null,
    detailedDispositionCode: null,
    provider: "incomplete",
    medicationReconciliation: "incomplete",
    nursing: "incomplete",
    departure: "incomplete",
    disposition: "incomplete",
    blockers: [],
    warnings: [],
    providerRevision: 0,
    nursingRevision: 0,
    departedAt: null,
    providerFinalizedAt: null,
    nursingCompletedAt: null,
  };
}

export function hydrateInpatientFinalDischarge(raw: unknown): InpatientFinalDischargeV1E | null {
  if (!isRecord(raw)) return null;
  const dispositionCode = trimOrNull(raw.dispositionCode) ?? trimOrNull(raw.clinicalDispositionCode);
  const lifecycleStatus = trimOrNull(raw.lifecycleStatus) as InpatientLifecycleDischargeStatus | null;
  const dischargedAt = trimOrNull(raw.dischargedAt);
  const dischargedByUserId = trimOrNull(raw.dischargedByUserId);
  if (!dispositionCode || !lifecycleStatus || !dischargedAt || !dischargedByUserId) return null;
  return {
    schemaVersion: INPATIENT_FINAL_DISCHARGE_SCHEMA_VERSION,
    dispositionCode,
    dispositionLabelSnapshot: trimOrNull(raw.dispositionLabelSnapshot),
    lifecycleStatus,
    clinicalDispositionCode:
      trimOrNull(raw.clinicalDispositionCode) ?? dispositionCode,
    dischargedAt,
    dischargedByUserId,
    dischargedByDisplayNameSnapshot: trimOrNull(raw.dischargedByDisplayNameSnapshot),
    dischargedByProfessionalTitleSnapshot: trimOrNull(
      raw.dischargedByProfessionalTitleSnapshot
    ),
    providerRevision:
      typeof raw.providerRevision === "number" ? raw.providerRevision : null,
    nursingRevision: typeof raw.nursingRevision === "number" ? raw.nursingRevision : null,
    departedAt: trimOrNull(raw.departedAt),
    providerFinalizedAt: trimOrNull(raw.providerFinalizedAt),
    nursingCompletedAt: trimOrNull(raw.nursingCompletedAt),
  };
}

export function readInpatientFinalDischargeFromSummary(
  dischargeSummaryJson: unknown
): InpatientFinalDischargeV1E | null {
  if (!isRecord(dischargeSummaryJson)) return null;
  return hydrateInpatientFinalDischarge(dischargeSummaryJson.inpatientFinalDischarge);
}

function resolveDepartureAt(
  nursing: InpatientNursingDischargeV1D | null,
  code: string | null
): string | null {
  if (!nursing) return null;
  if (code === "ELOPED") {
    return (
      trimOrNull(nursing.eloped?.discoveredAt) ||
      trimOrNull(nursing.eloped?.lastKnownAt) ||
      null
    );
  }
  if (code === "DECEASED") {
    return trimOrNull(nursing.deceased?.transferredAt) || null;
  }
  if (code === "CORRECTIONAL_FACILITY") {
    return (
      trimOrNull(nursing.correctional?.custodyTransferredAt) ||
      trimOrNull(nursing.departure?.departedAt) ||
      null
    );
  }
  return trimOrNull(nursing.departure?.departedAt);
}

function departureRequired(code: string | null): boolean {
  if (!code) return true;
  if (code === "DECEASED") return false; // body transfer may substitute
  return true;
}

/**
 * Authoritative final-discharge readiness — reuses 1C/1D rules, does not invent a second engine.
 */
export function projectInpatientFinalDischargeReadiness(input: {
  dischargeSummaryJson: unknown;
  encounterStatus?: string | null;
}): InpatientFinalDischargeReadiness {
  const result = emptyInpatientFinalDischargeReadiness();
  const summary = isRecord(input.dischargeSummaryJson) ? input.dischargeSummaryJson : {};

  const already = hydrateInpatientFinalDischarge(summary.inpatientFinalDischarge);
  if (already || String(input.encounterStatus ?? "").toUpperCase() === "CLOSED") {
    const code =
      already?.clinicalDispositionCode ??
      already?.dispositionCode ??
      null;
    result.ready = false;
    result.dispositionCode = code;
    result.detailedDispositionCode = code;
    result.projectedLifecycleStatus = already?.lifecycleStatus ?? null;
    result.dispositionLabel = already?.dispositionLabelSnapshot ?? null;
    result.provider = "complete";
    result.nursing = "complete";
    result.medicationReconciliation = "complete";
    result.departure = "complete";
    result.disposition = code ? "complete" : "incomplete";
    result.blockers.push({
      code: "ENCOUNTER_ALREADY_CLOSED",
      labelKey: "ENCOUNTER_ALREADY_CLOSED",
    });
    return result;
  }

  const provider = hydrateInpatientProviderDischarge1C(summary.inpatientProviderDischarge);
  const nursing =
    hydrateInpatientNursingDischarge(summary.inpatientNursingDischarge) ??
    null;
  const medReconComplete = isMedReconCompleteInSummary(summary);

  const code =
    trimOrNull(provider?.finalDisposition?.code)?.toUpperCase() ?? null;
  const label =
    trimOrNull(provider?.finalDisposition?.labelSnapshot) ?? code;

  result.dispositionCode = code;
  result.detailedDispositionCode = code;
  result.dispositionLabel = label;
  result.projectedLifecycleStatus = mapDetailedDispositionToCoarseDischargeStatus(code);
  result.providerRevision = provider?.revision ?? 0;
  result.nursingRevision = nursing?.revision ?? 0;
  result.providerFinalizedAt = provider?.providerDocumentationFinalizedAt ?? null;
  result.nursingCompletedAt = nursing?.completedAt ?? null;
  result.departedAt = resolveDepartureAt(nursing, code);

  const providerFinalized = Boolean(provider?.providerDocumentationFinalizedAt);
  const needsProvider = nursingRequiresProviderFinalize(code);

  if (!code) {
    result.disposition = "blocked";
    result.blockers.push({
      code: "DISPOSITION_REQUIRED",
      labelKey: "DISPOSITION_REQUIRED",
    });
  } else {
    result.disposition = "complete";
  }

  if (needsProvider && !providerFinalized) {
    result.provider = "blocked";
    result.blockers.push({
      code: "PROVIDER_DISCHARGE_NOT_FINALIZED",
      labelKey: "PROVIDER_DISCHARGE_NOT_FINALIZED",
    });
  } else if (providerFinalized || !needsProvider) {
    result.provider = "complete";
  } else {
    result.provider = "incomplete";
  }

  const mismatch =
    nursing && provider
      ? detectProviderDispositionMismatch({ nursing, provider })
      : null;
  if (mismatch?.detected) {
    result.blockers.push({
      code: "PROVIDER_DISPOSITION_MISMATCH",
      labelKey: "PROVIDER_DISPOSITION_MISMATCH",
    });
    result.disposition = "blocked";
  }

  const needsMed = nursingRequiresMedRecon(code);
  if (!needsMed) {
    result.medicationReconciliation = "not_applicable";
  } else if (medReconComplete === true) {
    result.medicationReconciliation = "complete";
  } else {
    result.medicationReconciliation = "attention";
    result.blockers.push({
      code: "MEDICATION_RECONCILIATION_INCOMPLETE",
      labelKey: "MEDICATION_RECONCILIATION_INCOMPLETE",
    });
  }

  const nursingComplete = nursing?.executionStatus === "COMPLETED";
  if (nursingComplete) {
    result.nursing = "complete";
  } else {
    result.nursing = "incomplete";
    result.blockers.push({
      code: "NURSING_DISCHARGE_INCOMPLETE",
      labelKey: "NURSING_DISCHARGE_INCOMPLETE",
    });
  }

  if (nursingComplete && nursing && provider) {
    const revalidate = validateInpatientNursingDischarge({
      nursing,
      mode: "complete",
      provider,
      medReconComplete,
    });
    if (!revalidate.ok) {
      for (const err of revalidate.errors) {
        if (!result.blockers.some((b) => b.code === err)) {
          result.blockers.push({ code: err, labelKey: err });
        }
      }
      result.nursing = "attention";
    }
  }

  const departed = result.departedAt;
  if (!departureRequired(code)) {
    if (code === "DECEASED" && !departed && !trimOrNull(nursing?.deceased?.bodyDestination)) {
      result.departure = "incomplete";
      result.blockers.push({
        code: "DECEASED_BODY_DESTINATION_REQUIRED",
        labelKey: "DECEASED_BODY_DESTINATION_REQUIRED",
      });
    } else {
      result.departure = departed ? "complete" : "not_applicable";
    }
  } else if (departed) {
    result.departure = "complete";
  } else {
    result.departure = "incomplete";
    result.blockers.push({
      code: "DEPARTURE_TIME_REQUIRED",
      labelKey: "DEPARTURE_TIME_REQUIRED",
    });
  }

  result.ready = result.blockers.length === 0;
  return result;
}

export function buildInpatientFinalDischargeRecord(input: {
  readiness: InpatientFinalDischargeReadiness;
  actorUserId: string;
  displayNameSnapshot: string;
  professionalTitleSnapshot?: string | null;
  dischargedAt?: string;
}): InpatientFinalDischargeV1E {
  const code = input.readiness.detailedDispositionCode ?? "OTHER";
  const lifecycle =
    input.readiness.projectedLifecycleStatus ??
    mapDetailedDispositionToCoarseDischargeStatus(code) ??
    "DISCHARGED";
  return {
    schemaVersion: INPATIENT_FINAL_DISCHARGE_SCHEMA_VERSION,
    dispositionCode: code,
    dispositionLabelSnapshot: input.readiness.dispositionLabel,
    lifecycleStatus: lifecycle,
    clinicalDispositionCode: code,
    dischargedAt: input.dischargedAt ?? new Date().toISOString(),
    dischargedByUserId: input.actorUserId,
    dischargedByDisplayNameSnapshot: input.displayNameSnapshot,
    dischargedByProfessionalTitleSnapshot: input.professionalTitleSnapshot ?? null,
    providerRevision: input.readiness.providerRevision,
    nursingRevision: input.readiness.nursingRevision,
    departedAt: input.readiness.departedAt,
    providerFinalizedAt: input.readiness.providerFinalizedAt,
    nursingCompletedAt: input.readiness.nursingCompletedAt,
  };
}

export function mergeInpatientFinalDischargeIntoDischargeSummary(
  existing: unknown,
  finalDoc: InpatientFinalDischargeV1E
): Record<string, unknown> {
  const base = isRecord(existing) ? { ...existing } : {};
  return {
    ...base,
    inpatientFinalDischarge: finalDoc,
    finalDisposition: finalDoc.dispositionLabelSnapshot ?? finalDoc.dispositionCode,
    /** Detailed clinical disposition for print/reporting — ELOPED stays ELOPED. */
    clinicalDispositionCode: finalDoc.clinicalDispositionCode,
    dischargeStatusMapped: finalDoc.lifecycleStatus,
    dischargedAt: finalDoc.dischargedAt,
    nursingDepartureAt: finalDoc.departedAt ?? base.nursingDepartureAt ?? null,
  };
}

export function readProviderAndNursingRevisions(dischargeSummaryJson: unknown): {
  providerRevision: number;
  nursingRevision: number;
  provider: InpatientProviderDischargeV1C | null;
  nursing: InpatientNursingDischargeV1D | null;
} {
  const summary = isRecord(dischargeSummaryJson) ? dischargeSummaryJson : {};
  const provider = hydrateInpatientProviderDischarge1C(summary.inpatientProviderDischarge);
  const nursing = hydrateInpatientNursingDischarge(summary.inpatientNursingDischarge);
  return {
    providerRevision: provider?.revision ?? 0,
    nursingRevision: nursing?.revision ?? 0,
    provider,
    nursing,
  };
}
