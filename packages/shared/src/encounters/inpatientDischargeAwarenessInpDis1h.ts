/**
 * INP.DIS.1H — Canonical inpatient discharge awareness for census / unit / bed boards.
 * Derived from dischargeSummaryJson + existing 1E readiness — no second readiness engine.
 */

import {
  hydrateInpatientProviderDischarge1C,
} from "./inpatientProviderDischargeInpDis1c.js";
import {
  hydrateInpatientNursingDischarge,
  isMedReconCompleteInSummary,
} from "./inpatientNursingDischargeInpDis1d.js";
import { projectInpatientFinalDischargeReadiness } from "./inpatientFinalDischargeInpDis1e.js";

export type InpatientDischargeAwarenessTone =
  | "ordinary"
  | "transfer"
  | "ama"
  | "eloped"
  | "deceased"
  | "other";

export type InpatientDischargeAwarenessSubstatus =
  | "NONE"
  | "MED_RECON_PENDING"
  | "NURSING_PENDING"
  | "DEPARTURE_PENDING"
  | "READY_FOR_FINAL";

export type InpatientDischargeAwarenessV1 = {
  providerFinalized: boolean;
  dispositionCode: string | null;
  dispositionLabel: string | null;
  destinationName: string | null;
  providerFinalizedAt: string | null;
  nursingComplete: boolean;
  medReconComplete: boolean;
  departureDocumented: boolean;
  finalDischargeReady: boolean;
  /** Presentation tone — not ordinary “ready discharge” for AMA/ELOPED/DECEASED. */
  tone: InpatientDischargeAwarenessTone;
  /** Compact operational substatus for bed tiles. */
  substatus: InpatientDischargeAwarenessSubstatus;
  /** Stable badge key for i18n (e.g. HOME, HOME_WITH_HOME_HEALTH, TRANSFER_ACUTE_CARE). */
  badgeKey: string | null;
};

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

export function resolveInpatientDischargeAwarenessTone(
  dispositionCode: string | null | undefined
): InpatientDischargeAwarenessTone {
  const c = trimOrNull(dispositionCode)?.toUpperCase() ?? null;
  if (!c) return "other";
  if (c === "TRANSFER_ACUTE_CARE") return "transfer";
  if (c === "AGAINST_MEDICAL_ADVICE") return "ama";
  if (c === "ELOPED") return "eloped";
  if (c === "DECEASED") return "deceased";
  if (
    c === "HOME" ||
    c === "HOME_WITH_HOME_HEALTH" ||
    c === "SKILLED_NURSING_FACILITY" ||
    c === "ACUTE_REHAB" ||
    c === "LONG_TERM_ACUTE_CARE" ||
    c === "ASSISTED_LIVING" ||
    c === "HOSPICE" ||
    c === "BEHAVIORAL_HEALTH_FACILITY" ||
    c === "CORRECTIONAL_FACILITY"
  ) {
    return "ordinary";
  }
  return "other";
}

/** Destination fragment when documented on disposition details. */
export function resolveInpatientDischargeDestinationName(
  dischargeSummaryJson: unknown
): string | null {
  const provider = hydrateInpatientProviderDischarge1C(
    isRecord(dischargeSummaryJson)
      ? dischargeSummaryJson.inpatientProviderDischarge
      : null
  );
  const fd = provider?.finalDisposition;
  if (!fd) return null;
  const code = trimOrNull(fd.code)?.toUpperCase();
  if (code === "HOME_WITH_HOME_HEALTH") {
    return trimOrNull(fd.homeHealth?.agencyName);
  }
  if (code === "SKILLED_NURSING_FACILITY") {
    return trimOrNull(fd.snf?.facilityName) ?? trimOrNull(fd.destinationDetails);
  }
  if (code === "TRANSFER_ACUTE_CARE") {
    return trimOrNull(fd.transfer?.receivingHospital) ?? trimOrNull(fd.destinationDetails);
  }
  if (code === "CORRECTIONAL_FACILITY") {
    return (
      trimOrNull(fd.correctional?.facilityName) ??
      trimOrNull(fd.correctional?.agencyName) ??
      trimOrNull(fd.destinationDetails)
    );
  }
  if (
    code === "ACUTE_REHAB" ||
    code === "LONG_TERM_ACUTE_CARE" ||
    code === "ASSISTED_LIVING" ||
    code === "HOSPICE" ||
    code === "BEHAVIORAL_HEALTH_FACILITY" ||
    code === "OTHER"
  ) {
    return trimOrNull(fd.destinationDetails);
  }
  return null;
}

export function resolveInpatientDischargeAwarenessSubstatus(input: {
  providerFinalized: boolean;
  medReconComplete: boolean;
  nursingComplete: boolean;
  departureDocumented: boolean;
  finalDischargeReady: boolean;
  tone: InpatientDischargeAwarenessTone;
}): InpatientDischargeAwarenessSubstatus {
  if (!input.providerFinalized) return "NONE";
  // Non-ordinary outcomes still show pending work but never “ready discharge” marketing.
  if (!input.medReconComplete && input.tone !== "deceased" && input.tone !== "eloped") {
    return "MED_RECON_PENDING";
  }
  if (!input.nursingComplete) return "NURSING_PENDING";
  if (!input.departureDocumented && input.tone !== "deceased" && input.tone !== "eloped") {
    return "DEPARTURE_PENDING";
  }
  if (input.finalDischargeReady && input.tone === "ordinary") return "READY_FOR_FINAL";
  if (input.finalDischargeReady) return "READY_FOR_FINAL";
  return "NURSING_PENDING";
}

/**
 * Build discharge awareness for an OPEN inpatient (or hospital) encounter.
 * Returns null when provider has not finalized (no badge / no order alert).
 */
export function buildInpatientDischargeAwareness(input: {
  dischargeSummaryJson: unknown;
  encounterStatus?: string | null;
}): InpatientDischargeAwarenessV1 | null {
  const status = trimOrNull(input.encounterStatus)?.toUpperCase() ?? "OPEN";
  if (status === "CLOSED") return null;

  const readiness = projectInpatientFinalDischargeReadiness({
    dischargeSummaryJson: input.dischargeSummaryJson,
    encounterStatus: status,
  });
  const provider = hydrateInpatientProviderDischarge1C(
    isRecord(input.dischargeSummaryJson)
      ? input.dischargeSummaryJson.inpatientProviderDischarge
      : null
  );
  const providerFinalized = Boolean(provider?.providerDocumentationFinalizedAt);
  if (!providerFinalized) return null;

  const nursing = hydrateInpatientNursingDischarge(
    isRecord(input.dischargeSummaryJson)
      ? input.dischargeSummaryJson.inpatientNursingDischarge
      : null
  );
  const nursingComplete = nursing?.executionStatus === "COMPLETED";
  const medReconComplete = isMedReconCompleteInSummary(input.dischargeSummaryJson) === true;
  const departureDocumented = Boolean(readiness.departedAt);
  const dispositionCode = readiness.dispositionCode;
  const tone = resolveInpatientDischargeAwarenessTone(dispositionCode);
  const finalDischargeReady = readiness.ready === true;
  const substatus = resolveInpatientDischargeAwarenessSubstatus({
    providerFinalized,
    medReconComplete,
    nursingComplete,
    departureDocumented,
    finalDischargeReady,
    tone,
  });

  return {
    providerFinalized: true,
    dispositionCode,
    dispositionLabel: readiness.dispositionLabel,
    destinationName: resolveInpatientDischargeDestinationName(input.dischargeSummaryJson),
    providerFinalizedAt: readiness.providerFinalizedAt,
    nursingComplete,
    medReconComplete,
    departureDocumented,
    finalDischargeReady,
    tone,
    substatus,
    badgeKey: dispositionCode,
  };
}

/** English fallback labels for tests / print — UI should prefer i18n. */
export function formatInpatientDischargeAwarenessBadgeEn(
  awareness: InpatientDischargeAwarenessV1
): string {
  const code = awareness.dispositionCode?.toUpperCase() ?? "";
  const dest = awareness.destinationName;
  switch (code) {
    case "HOME":
      return "Discharge → Home";
    case "HOME_WITH_HOME_HEALTH":
      return dest ? `Discharge → Home Health · ${dest}` : "Discharge → Home Health";
    case "SKILLED_NURSING_FACILITY":
      return dest ? `Discharge → SNF · ${dest}` : "Discharge → SNF";
    case "ACUTE_REHAB":
      return "Discharge → Acute Rehab";
    case "LONG_TERM_ACUTE_CARE":
      return "Discharge → LTAC";
    case "ASSISTED_LIVING":
      return "Discharge → Assisted Living";
    case "HOSPICE":
      return "Discharge → Hospice";
    case "TRANSFER_ACUTE_CARE":
      return dest ? `Transfer → ${dest}` : "Transfer";
    case "BEHAVIORAL_HEALTH_FACILITY":
      return "Discharge → Behavioral Health";
    case "CORRECTIONAL_FACILITY":
      return dest ? `Discharge → Correctional · ${dest}` : "Discharge → Correctional Facility";
    case "AGAINST_MEDICAL_ADVICE":
      return "Leaving AMA";
    case "ELOPED":
      return "Eloped";
    case "DECEASED":
      return "Deceased";
    default:
      return awareness.dispositionLabel
        ? `Discharge → ${awareness.dispositionLabel}`
        : "Discharge order";
  }
}

export function formatInpatientDischargeAwarenessSubstatusEn(
  substatus: InpatientDischargeAwarenessSubstatus
): string | null {
  switch (substatus) {
    case "MED_RECON_PENDING":
      return "Med Rec pending";
    case "NURSING_PENDING":
      return "Nursing pending";
    case "DEPARTURE_PENDING":
      return "Departure pending";
    case "READY_FOR_FINAL":
      return "Ready for final discharge";
    default:
      return null;
  }
}
