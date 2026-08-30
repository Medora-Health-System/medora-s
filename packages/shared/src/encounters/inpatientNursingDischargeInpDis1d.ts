/**
 * INP.DIS.1D — Nursing inpatient discharge execution.
 * Persisted under Encounter.dischargeSummaryJson.inpatientNursingDischarge.
 * Provider finalDisposition remains authoritative; nursing documents execution only.
 * Does NOT close the encounter (INP.DIS.1E).
 */

import {
  hydrateInpatientProviderDischarge1C,
  mapInpatientDispositionToLifecycleStatus,
  type InpatientProviderDischargeV1C,
} from "./inpatientProviderDischargeInpDis1c.js";
import {
  hydrateInpatientDischargeMedReconLine,
  isInpatientMedReconEffectivelyComplete,
  mergeSavedMedReconWithCurrentProviderPlan,
} from "./inpatientDischargeMedReconPreloadInpDis1g.js";

export const INPATIENT_NURSING_DISCHARGE_SCHEMA_VERSION = "INP.DIS.1D" as const;

export const INPATIENT_NURSING_EXECUTION_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
] as const;

export type InpatientNursingExecutionStatus =
  (typeof INPATIENT_NURSING_EXECUTION_STATUSES)[number];

export const INPATIENT_NURSING_UNDERSTANDING = [
  "VERBALIZED",
  "NEEDS_REINFORCEMENT",
  "UNABLE_TO_ASSESS",
  "DECLINED",
  "LEFT_BEFORE_COMPLETE",
] as const;

export const INPATIENT_NURSING_EDUCATION_RECIPIENTS = [
  "PATIENT",
  "FAMILY_CAREGIVER",
  "FACILITY_STAFF",
  "LAW_ENFORCEMENT",
  "OTHER",
] as const;

/** Departure accompaniment codes — persist codes, not UI labels. Same 1D JSON field. */
export const INPATIENT_DEPARTURE_ACCOMPANIED_BY = [
  "SELF",
  "FAMILY_CAREGIVER",
  "FACILITY_STAFF",
  "EMS",
  "LAW_ENFORCEMENT",
  "OTHER",
] as const;

export type InpatientDepartureAccompaniedBy =
  (typeof INPATIENT_DEPARTURE_ACCOMPANIED_BY)[number];

export const INPATIENT_NURSING_TRANSPORT_MODES = [
  "PRIVATE_VEHICLE",
  "AMBULANCE",
  "WHEELCHAIR_VAN",
  "ALS",
  "BLS",
  "AIR_MEDICAL",
  "LAW_ENFORCEMENT",
  "FUNERAL_HOME",
  "OTHER",
] as const;

export type InpatientNursingProviderDispositionSnapshot = {
  code: string;
  labelSnapshot?: string | null;
  providerFinalizedAt?: string | null;
  providerUserId?: string | null;
  providerRevision?: number | null;
};

export type InpatientNursingEducation = {
  instructionsReviewed: boolean;
  medicationInstructionsReviewed: boolean;
  followUpReviewed: boolean;
  returnPrecautionsReviewed: boolean;
  patientUnderstanding?: (typeof INPATIENT_NURSING_UNDERSTANDING)[number] | null;
  recipient?: (typeof INPATIENT_NURSING_EDUCATION_RECIPIENTS)[number] | null;
  recipientName?: string | null;
  interpreterUsed?: boolean;
  interpreterDetails?: string | null;
  patientDeclinedInstructions?: boolean;
  leftBeforeInstructionsComplete?: boolean;
};

export type InpatientNursingDevices = {
  ivRemoved?: boolean | null;
  ivLeftInPlaceForTransfer?: boolean | null;
  centralLineDisposition?: string | null;
  urinaryCatheterDisposition?: string | null;
  drainsDisposition?: string | null;
  otherDevices?: string | null;
};

export type InpatientNursingBelongings = {
  returned: boolean;
  retainedByFacility?: boolean;
  transferredWithPatient?: boolean;
  transferredToLawEnforcement?: boolean;
  unknown?: boolean;
  details?: string | null;
};

export type InpatientNursingHandoff = {
  reportCalled?: boolean | null;
  reportGivenTo?: string | null;
  reportAt?: string | null;
  documentsSent?: {
    dischargeSummary?: boolean;
    marOrMedList?: boolean;
    medicationReconciliation?: boolean;
    relevantResults?: boolean;
    imaging?: boolean;
    pendingStudies?: boolean;
    other?: boolean;
    otherDetails?: string | null;
  } | null;
};

export type InpatientNursingTransport = {
  mode?: string | null;
  company?: string | null;
  details?: string | null;
};

export type InpatientNursingDeparture = {
  departedAt?: string | null;
  mode?: string | null;
  accompaniedBy?: string | null;
  /** Free-text details when accompaniedBy is OTHER (same JSON blob, no migration). */
  accompaniedByDetail?: string | null;
  conditionAtDeparture?: string | null;
};

export type InpatientNursingHomeHealthConfirm = {
  agencyConfirmed?: boolean;
  familyKnowsAgency?: boolean;
  contactProvided?: boolean;
  documentsSent?: boolean;
};

export type InpatientNursingCorrectionalConfirm = {
  facilityName?: string | null;
  agencyName?: string | null;
  officerName?: string | null;
  badgeId?: string | null;
  custodyTransferredAt?: string | null;
  instructionsProvided?: boolean | null;
};

export type InpatientNursingElopedConfirm = {
  lastKnownAt?: string | null;
  lastKnownLocation?: string | null;
  conditionWhenLastObserved?: string | null;
  ivOrLinesPresent?: "YES" | "NO" | "UNKNOWN" | null;
  belongingsStatus?: "KNOWN" | "UNKNOWN" | null;
  providerNotified?: boolean | null;
  chargeNurseNotified?: boolean | null;
  securityNotified?: boolean | null;
  emergencyContactAttempted?: boolean | null;
  lawEnforcementNotified?: boolean | null;
  discoveredAt?: string | null;
  notes?: string | null;
};

export type InpatientNursingDeceasedConfirm = {
  identificationCompleted?: boolean | null;
  nextOfKinNotified?: boolean | null;
  postmortemCare?: "PERFORMED" | "NOT_APPLICABLE" | "DEFERRED" | null;
  linesTubesDisposition?: "REMOVED" | "RETAINED_ME" | "OTHER" | null;
  bodyDestination?: "MORGUE" | "FUNERAL_HOME" | "MEDICAL_EXAMINER" | "OTHER" | null;
  transferredTo?: string | null;
  transferredAt?: string | null;
  notes?: string | null;
};

export type InpatientNursingDischargeV1D = {
  schemaVersion: typeof INPATIENT_NURSING_DISCHARGE_SCHEMA_VERSION;
  providerDispositionSnapshot?: InpatientNursingProviderDispositionSnapshot | null;
  executionStatus: InpatientNursingExecutionStatus;
  education?: InpatientNursingEducation | null;
  devices?: InpatientNursingDevices | null;
  belongings?: InpatientNursingBelongings | null;
  destinationConfirmation?: {
    confirmed: boolean;
    destinationLabel?: string | null;
    notes?: string | null;
  } | null;
  handoff?: InpatientNursingHandoff | null;
  transport?: InpatientNursingTransport | null;
  departure?: InpatientNursingDeparture | null;
  homeHealth?: InpatientNursingHomeHealthConfirm | null;
  correctional?: InpatientNursingCorrectionalConfirm | null;
  eloped?: InpatientNursingElopedConfirm | null;
  deceased?: InpatientNursingDeceasedConfirm | null;
  dispositionMismatch?: {
    detected: boolean;
    previousCode?: string | null;
    currentCode?: string | null;
    message?: string | null;
  } | null;
  completedAt?: string | null;
  completedByUserId?: string | null;
  completedByDisplayNameSnapshot?: string | null;
  completedByProfessionalTitleSnapshot?: string | null;
  lastUpdatedAt?: string | null;
  revision?: number;
};

export type InpatientNursingDischargeSaveMode = "draft" | "complete";

export type InpatientNursingDischargeValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

export function emptyInpatientNursingDischarge(): InpatientNursingDischargeV1D {
  return {
    schemaVersion: INPATIENT_NURSING_DISCHARGE_SCHEMA_VERSION,
    executionStatus: "NOT_STARTED",
    revision: 0,
  };
}

export function hydrateInpatientNursingDischarge(raw: unknown): InpatientNursingDischargeV1D | null {
  if (!isRecord(raw)) return null;
  const statusRaw = trimOrNull(raw.executionStatus)?.toUpperCase() ?? "NOT_STARTED";
  const executionStatus = (INPATIENT_NURSING_EXECUTION_STATUSES as readonly string[]).includes(
    statusRaw
  )
    ? (statusRaw as InpatientNursingExecutionStatus)
    : "NOT_STARTED";

  const hasContent =
    executionStatus !== "NOT_STARTED" ||
    isRecord(raw.education) ||
    isRecord(raw.departure) ||
    isRecord(raw.handoff) ||
    trimOrNull(raw.completedByUserId) ||
    trimOrNull(raw.documentedByUserId) ||
    trimOrNull(raw.departureAt) ||
    trimOrNull(raw.destinationConfirmed);

  if (!hasContent && Object.keys(raw).length === 0) return null;

  // Legacy 1A shell
  const legacyDeparture = trimOrNull(raw.departureAt);
  const legacyDestination = trimOrNull(raw.destinationConfirmed);

  return {
    schemaVersion: INPATIENT_NURSING_DISCHARGE_SCHEMA_VERSION,
    providerDispositionSnapshot: isRecord(raw.providerDispositionSnapshot)
      ? (raw.providerDispositionSnapshot as InpatientNursingProviderDispositionSnapshot)
      : null,
    executionStatus:
      hasContent && executionStatus === "NOT_STARTED" && (legacyDeparture || legacyDestination)
        ? "IN_PROGRESS"
        : executionStatus,
    education: isRecord(raw.education) ? (raw.education as InpatientNursingEducation) : null,
    devices: isRecord(raw.devices) ? (raw.devices as InpatientNursingDevices) : null,
    belongings: isRecord(raw.belongings)
      ? (raw.belongings as InpatientNursingBelongings)
      : legacyDestination
        ? { returned: false }
        : null,
    destinationConfirmation: isRecord(raw.destinationConfirmation)
      ? (raw.destinationConfirmation as InpatientNursingDischargeV1D["destinationConfirmation"])
      : legacyDestination
        ? { confirmed: true, destinationLabel: legacyDestination }
        : null,
    handoff: isRecord(raw.handoff) ? (raw.handoff as InpatientNursingHandoff) : null,
    transport: isRecord(raw.transport) ? (raw.transport as InpatientNursingTransport) : null,
    departure: isRecord(raw.departure)
      ? (raw.departure as InpatientNursingDeparture)
      : legacyDeparture
        ? {
            departedAt: legacyDeparture,
            conditionAtDeparture: trimOrNull(raw.conditionAtDeparture),
          }
        : null,
    homeHealth: isRecord(raw.homeHealth)
      ? (raw.homeHealth as InpatientNursingHomeHealthConfirm)
      : null,
    correctional: isRecord(raw.correctional)
      ? (raw.correctional as InpatientNursingCorrectionalConfirm)
      : null,
    eloped: isRecord(raw.eloped) ? (raw.eloped as InpatientNursingElopedConfirm) : null,
    deceased: isRecord(raw.deceased) ? (raw.deceased as InpatientNursingDeceasedConfirm) : null,
    dispositionMismatch: isRecord(raw.dispositionMismatch)
      ? (raw.dispositionMismatch as InpatientNursingDischargeV1D["dispositionMismatch"])
      : null,
    completedAt: trimOrNull(raw.completedAt),
    completedByUserId:
      trimOrNull(raw.completedByUserId) ?? trimOrNull(raw.documentedByUserId),
    completedByDisplayNameSnapshot:
      trimOrNull(raw.completedByDisplayNameSnapshot) ??
      trimOrNull(raw.displayNameSnapshot),
    completedByProfessionalTitleSnapshot:
      trimOrNull(raw.completedByProfessionalTitleSnapshot) ??
      trimOrNull(raw.professionalTitleSnapshot),
    lastUpdatedAt: trimOrNull(raw.lastUpdatedAt),
    revision:
      typeof raw.revision === "number" && Number.isFinite(raw.revision)
        ? Math.max(0, Math.floor(raw.revision))
        : 0,
  };
}

export function readInpatientNursingDischargeFromSummary(
  dischargeSummaryJson: unknown
): InpatientNursingDischargeV1D | null {
  if (!isRecord(dischargeSummaryJson)) return null;
  return hydrateInpatientNursingDischarge(dischargeSummaryJson.inpatientNursingDischarge);
}

export function sanitizeInpatientNursingDischargeClientPayload(
  input: unknown
): Partial<InpatientNursingDischargeV1D> {
  if (!isRecord(input)) return {};
  const {
    completedAt: _a,
    completedByUserId: _b,
    completedByDisplayNameSnapshot: _c,
    completedByProfessionalTitleSnapshot: _d,
    lastUpdatedAt: _e,
    revision: _r,
    schemaVersion: _s,
    documentedByUserId: _legacy,
    displayNameSnapshot: _legacy2,
    professionalTitleSnapshot: _legacy3,
    ...rest
  } = input;
  return rest as Partial<InpatientNursingDischargeV1D>;
}

export function detectProviderDispositionMismatch(input: {
  nursing: InpatientNursingDischargeV1D;
  provider: InpatientProviderDischargeV1C | null;
}): InpatientNursingDischargeV1D["dispositionMismatch"] {
  const snap = input.nursing.providerDispositionSnapshot;
  const current = trimOrNull(input.provider?.finalDisposition?.code)?.toUpperCase() ?? null;
  const previous = trimOrNull(snap?.code)?.toUpperCase() ?? null;
  if (!previous || !current) return { detected: false };
  if (previous === current) return { detected: false };
  return {
    detected: true,
    previousCode: previous,
    currentCode: current,
    message: "PROVIDER_DISPOSITION_CHANGED",
  };
}

export function buildProviderDispositionSnapshot(
  provider: InpatientProviderDischargeV1C | null
): InpatientNursingProviderDispositionSnapshot | null {
  const code = trimOrNull(provider?.finalDisposition?.code);
  if (!code) return null;
  return {
    code,
    labelSnapshot: provider?.finalDisposition?.labelSnapshot ?? null,
    providerFinalizedAt: provider?.providerDocumentationFinalizedAt ?? null,
    providerUserId: provider?.documentedByUserId ?? null,
    providerRevision: provider?.revision ?? null,
  };
}

/** Whether ordinary nursing completion requires provider finalize. */
export function nursingRequiresProviderFinalize(dispositionCode: string | null | undefined): boolean {
  const c = trimOrNull(dispositionCode)?.toUpperCase();
  if (!c) return true;
  return c !== "ELOPED" && c !== "DECEASED";
}

export function nursingRequiresMedRecon(dispositionCode: string | null | undefined): boolean {
  const c = trimOrNull(dispositionCode)?.toUpperCase();
  if (!c) return true;
  return c !== "ELOPED" && c !== "DECEASED";
}

export function nursingRequiresEducation(dispositionCode: string | null | undefined): boolean {
  const c = trimOrNull(dispositionCode)?.toUpperCase();
  if (!c) return true;
  return !(
    c === "ELOPED" ||
    c === "DECEASED" ||
    c === "AGAINST_MEDICAL_ADVICE"
  );
}

export function validateInpatientNursingDischarge(input: {
  nursing: InpatientNursingDischargeV1D;
  mode: InpatientNursingDischargeSaveMode;
  provider: InpatientProviderDischargeV1C | null;
  medReconComplete?: boolean | null;
}): InpatientNursingDischargeValidationResult {
  if (input.mode === "draft") return { ok: true };

  const errors: string[] = [];
  const code =
    trimOrNull(input.provider?.finalDisposition?.code)?.toUpperCase() ??
    trimOrNull(input.nursing.providerDispositionSnapshot?.code)?.toUpperCase() ??
    null;

  const providerFinalized = Boolean(input.provider?.providerDocumentationFinalizedAt);
  if (nursingRequiresProviderFinalize(code) && !providerFinalized) {
    errors.push("PROVIDER_DISCHARGE_NOT_FINALIZED");
  }

  const mismatch = detectProviderDispositionMismatch({
    nursing: input.nursing,
    provider: input.provider,
  });
  if (mismatch?.detected) {
    errors.push("PROVIDER_DISPOSITION_MISMATCH");
  }

  if (nursingRequiresMedRecon(code) && input.medReconComplete === false) {
    errors.push("MEDICATION_RECONCILIATION_INCOMPLETE");
  }

  if (code === "ELOPED") {
    if (!trimOrNull(input.nursing.eloped?.discoveredAt) && !trimOrNull(input.nursing.eloped?.lastKnownAt)) {
      errors.push("ELOPED_TIME_REQUIRED");
    }
    if (input.nursing.eloped?.providerNotified !== true) {
      errors.push("ELOPED_PROVIDER_NOTIFY_REQUIRED");
    }
  } else if (code === "DECEASED") {
    if (!input.nursing.deceased?.bodyDestination) {
      errors.push("DECEASED_BODY_DESTINATION_REQUIRED");
    }
  } else if (code === "CORRECTIONAL_FACILITY") {
    if (!trimOrNull(input.nursing.correctional?.officerName) && !trimOrNull(input.nursing.correctional?.agencyName)) {
      errors.push("CORRECTIONAL_CUSTODY_HANDOFF_REQUIRED");
    }
    if (!trimOrNull(input.nursing.correctional?.custodyTransferredAt) && !trimOrNull(input.nursing.departure?.departedAt)) {
      errors.push("DEPARTURE_TIME_REQUIRED");
    }
  } else if (
    code === "TRANSFER_ACUTE_CARE" ||
    code === "SKILLED_NURSING_FACILITY" ||
    code === "ACUTE_REHAB" ||
    code === "LONG_TERM_ACUTE_CARE" ||
    code === "BEHAVIORAL_HEALTH_FACILITY" ||
    code === "ASSISTED_LIVING"
  ) {
    if (input.nursing.handoff?.reportCalled !== true) {
      errors.push("HANDOFF_REPORT_REQUIRED");
    }
    if (!trimOrNull(input.nursing.departure?.departedAt)) {
      errors.push("DEPARTURE_TIME_REQUIRED");
    }
  } else if (code === "AGAINST_MEDICAL_ADVICE") {
    if (!trimOrNull(input.nursing.departure?.departedAt)) {
      errors.push("DEPARTURE_TIME_REQUIRED");
    }
  } else {
    // HOME / HOME_WITH_HOME_HEALTH / OTHER / ASSISTED_LIVING / HOSPICE
    if (nursingRequiresEducation(code)) {
      const edu = input.nursing.education;
      const declined = edu?.patientDeclinedInstructions === true || edu?.leftBeforeInstructionsComplete === true;
      if (!declined) {
        if (!edu?.instructionsReviewed) errors.push("INSTRUCTIONS_REVIEWED_REQUIRED");
        if (!edu?.returnPrecautionsReviewed) errors.push("RETURN_PRECAUTIONS_REVIEWED_REQUIRED");
      }
    }
    if (input.nursing.devices?.ivRemoved !== true && input.nursing.devices?.ivLeftInPlaceForTransfer !== true) {
      errors.push("IV_DISPOSITION_REQUIRED");
    }
    if (input.nursing.belongings?.returned !== true && input.nursing.belongings?.unknown !== true) {
      errors.push("BELONGINGS_REQUIRED");
    }
    if (!trimOrNull(input.nursing.departure?.departedAt)) {
      errors.push("DEPARTURE_TIME_REQUIRED");
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

export type NursingDischargeReadinessChip = {
  id: string;
  status: "complete" | "attention" | "incomplete" | "not_applicable" | "blocked";
};

export function projectInpatientNursingDischargeReadiness(input: {
  nursing: InpatientNursingDischargeV1D;
  provider: InpatientProviderDischargeV1C | null;
  medReconComplete?: boolean | null;
  instructionsAvailable?: boolean | null;
}): NursingDischargeReadinessChip[] {
  const code = trimOrNull(input.provider?.finalDisposition?.code);
  const providerFinalized = Boolean(input.provider?.providerDocumentationFinalizedAt);
  const mismatch = detectProviderDispositionMismatch({
    nursing: input.nursing,
    provider: input.provider,
  });
  const skipEdu = !nursingRequiresEducation(code);
  const skipMed = !nursingRequiresMedRecon(code);

  return [
    {
      id: "providerDisposition",
      status: mismatch?.detected
        ? "blocked"
        : providerFinalized || !nursingRequiresProviderFinalize(code)
          ? "complete"
          : "blocked",
    },
    {
      id: "medicationReconciliation",
      status: skipMed
        ? "not_applicable"
        : input.medReconComplete === true
          ? "complete"
          : input.medReconComplete === false
            ? "attention"
            : "incomplete",
    },
    {
      id: "patientInstructions",
      status: skipEdu
        ? "not_applicable"
        : input.instructionsAvailable
          ? "complete"
          : "incomplete",
    },
    {
      id: "educationReviewed",
      status: skipEdu
        ? "not_applicable"
        : input.nursing.education?.instructionsReviewed ||
            input.nursing.education?.patientDeclinedInstructions
          ? "complete"
          : "incomplete",
    },
    {
      id: "ivDevices",
      status:
        code === "ELOPED" || code === "DECEASED"
          ? "not_applicable"
          : input.nursing.devices?.ivRemoved === true ||
              input.nursing.devices?.ivLeftInPlaceForTransfer === true
            ? "complete"
            : "incomplete",
    },
    {
      id: "belongings",
      status:
        code === "ELOPED"
          ? "not_applicable"
          : input.nursing.belongings?.returned ||
              input.nursing.belongings?.unknown ||
              input.nursing.belongings?.transferredWithPatient
            ? "complete"
            : "incomplete",
    },
    {
      id: "transport",
      status:
        code === "ELOPED"
          ? "not_applicable"
          : trimOrNull(input.nursing.transport?.mode) || trimOrNull(input.nursing.departure?.mode)
            ? "complete"
            : "incomplete",
    },
    {
      id: "departure",
      status: trimOrNull(input.nursing.departure?.departedAt) ||
        trimOrNull(input.nursing.eloped?.discoveredAt) ||
        trimOrNull(input.nursing.deceased?.transferredAt)
        ? "complete"
        : "incomplete",
    },
    {
      id: "nursingComplete",
      status: input.nursing.executionStatus === "COMPLETED" ? "complete" : "incomplete",
    },
  ];
}

/** Merge nursing namespace + project flat compatibility fields without deleting unrelated keys. */
export function mergeInpatientNursingDischargeIntoDischargeSummary(
  existingDischargeSummary: unknown,
  nursingDoc: InpatientNursingDischargeV1D,
  provider?: InpatientProviderDischargeV1C | null
): Record<string, unknown> {
  const base = isRecord(existingDischargeSummary) ? { ...existingDischargeSummary } : {};
  const code =
    trimOrNull(provider?.finalDisposition?.code) ??
    trimOrNull(nursingDoc.providerDispositionSnapshot?.code);
  const flat: Record<string, unknown> = {
    inpatientNursingDischarge: nursingDoc,
    patientDestination:
      nursingDoc.destinationConfirmation?.destinationLabel ??
      provider?.finalDisposition?.labelSnapshot ??
      code ??
      base.patientDestination ??
      null,
    exitCondition: nursingDoc.departure?.conditionAtDeparture ?? base.exitCondition ?? null,
  };

  if (nursingDoc.departure?.departedAt) {
    flat.instructionsGivenAt = base.instructionsGivenAt ?? null;
  }

  // Project instruction-given only after actual nursing education delivery
  if (
    nursingDoc.education?.instructionsReviewed === true &&
    !nursingDoc.education.patientDeclinedInstructions &&
    !nursingDoc.education.leftBeforeInstructionsComplete
  ) {
    flat.patientInstructionsGiven = true;
    flat.instructionsGivenBy = nursingDoc.completedByDisplayNameSnapshot ?? null;
    flat.instructionsGivenAt =
      nursingDoc.completedAt ?? nursingDoc.departure?.departedAt ?? null;
  }

  if (nursingDoc.executionStatus === "COMPLETED") {
    flat.nursingDischargeCompletedAt = nursingDoc.completedAt ?? null;
    flat.nursingDischargeCompletedBy = nursingDoc.completedByDisplayNameSnapshot ?? null;
    flat.nursingDepartureAt = nursingDoc.departure?.departedAt ?? null;
    flat.nursingTransportMode =
      nursingDoc.transport?.mode ?? nursingDoc.departure?.mode ?? null;
    flat.dischargeStatusMapped = mapInpatientDispositionToLifecycleStatus(code);
  }

  return { ...base, ...flat };
}

export function readProviderDischargeFromSummary(
  dischargeSummaryJson: unknown
): InpatientProviderDischargeV1C | null {
  if (!isRecord(dischargeSummaryJson)) return null;
  return hydrateInpatientProviderDischarge1C(dischargeSummaryJson.inpatientProviderDischarge);
}

export function isMedReconCompleteInSummary(dischargeSummaryJson: unknown): boolean | null {
  if (!isRecord(dischargeSummaryJson)) return null;
  const med = dischargeSummaryJson.inpatientMedRecon;
  if (!isRecord(med)) return null;
  const storedComplete = Boolean(trimOrNull(med.finalizedAt));
  const savedLines = Array.isArray(med.lines)
    ? med.lines
        .map(hydrateInpatientDischargeMedReconLine)
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
    : [];
  const provider = hydrateInpatientProviderDischarge1C(
    dischargeSummaryJson.inpatientProviderDischarge
  );
  const lines = mergeSavedMedReconWithCurrentProviderPlan({
    savedLines,
    providerDischargeMedications: provider?.dischargeMedications ?? null,
  });
  return isInpatientMedReconEffectivelyComplete({ storedComplete, lines });
}

export function hasPatientInstructionsInSummary(dischargeSummaryJson: unknown): boolean {
  if (!isRecord(dischargeSummaryJson)) return false;
  const provider = hydrateInpatientProviderDischarge1C(
    dischargeSummaryJson.inpatientProviderDischarge
  );
  const pi = provider?.patientInstructions;
  if (
    trimOrNull(pi?.returnPrecautions) ||
    trimOrNull(pi?.diagnosisInstructions) ||
    trimOrNull(pi?.dischargeDiagnosisSummary)
  ) {
    return true;
  }
  const ns = dischargeSummaryJson.inpatientPatientInstructions;
  if (isRecord(ns) && isRecord(ns.sections)) {
    return Object.values(ns.sections).some((v) => typeof v === "string" && v.trim());
  }
  return false;
}
