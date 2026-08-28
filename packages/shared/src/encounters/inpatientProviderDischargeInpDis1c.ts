/**
 * INP.DIS.1C — Enterprise inpatient discharge completion extensions.
 * Extends INP.DIS.1B provider discharge: disposition taxonomy, conditional details,
 * patient instructions (ED template reuse target), follow-ups, chart draft assembly,
 * disposition-aware validation, lifecycle mapping. Same store: dischargeSummaryJson.
 */

import {
  INPATIENT_CONDITION_AT_DISCHARGE_STATUSES,
  INPATIENT_PENDING_STUDY_TYPES,
  type InpatientConditionAtDischargeStatus,
  type InpatientPendingStudyType,
  type InpatientProviderDischargeDiagnosis,
  type InpatientProviderDischargePendingStudy,
  type InpatientProviderDischargeSaveMode,
  type InpatientProviderDischargeSchemaVersion,
  type InpatientProviderDischargeV1B,
  type InpatientProviderDischargeValidationResult,
  countPrimaryDischargeDiagnoses,
  emptyInpatientProviderDischarge,
  hydrateInpatientProviderDischarge,
  normalizeDischargeDiagnoses,
} from "./inpatientProviderDischargeInpDis1b.js";

export const INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION_1C = "INP.DIS.1C" as const;

/** Expanded final disposition taxonomy (superset of 1B; hydrate unknown as OTHER). */
export const INPATIENT_FINAL_DISPOSITION_CODES_1C = [
  "HOME",
  "HOME_WITH_HOME_HEALTH",
  "SKILLED_NURSING_FACILITY",
  "ACUTE_REHAB",
  "LONG_TERM_ACUTE_CARE",
  "ASSISTED_LIVING",
  "HOSPICE",
  "TRANSFER_ACUTE_CARE",
  "BEHAVIORAL_HEALTH_FACILITY",
  "CORRECTIONAL_FACILITY",
  "AGAINST_MEDICAL_ADVICE",
  "ELOPED",
  "DECEASED",
  "OTHER",
] as const;

export type InpatientFinalDispositionCode1C =
  (typeof INPATIENT_FINAL_DISPOSITION_CODES_1C)[number];

/** Prisma Encounter.dischargeStatus-compatible mapping (lifecycle, not UI taxonomy). */
export const INPATIENT_LIFECYCLE_DISCHARGE_STATUSES = [
  "DISCHARGED",
  "TRANSFERRED",
  "AMA",
  "DECEASED",
] as const;

export type InpatientLifecycleDischargeStatus =
  (typeof INPATIENT_LIFECYCLE_DISCHARGE_STATUSES)[number];

export const INPATIENT_CONDITION_AT_DISCHARGE_STATUSES_1C = [
  ...INPATIENT_CONDITION_AT_DISCHARGE_STATUSES,
  "UNKNOWN",
] as const;

export type InpatientConditionAtDischargeStatus1C =
  (typeof INPATIENT_CONDITION_AT_DISCHARGE_STATUSES_1C)[number];

export const INPATIENT_TRANSFER_SERVICES = [
  "EMERGENCY_DEPARTMENT",
  "HOSPITAL_MEDICINE",
  "ICU",
  "CARDIOLOGY",
  "NEUROLOGY",
  "SURGERY",
  "TRAUMA",
  "OB_GYN",
  "PEDIATRICS",
  "PSYCHIATRY",
  "OTHER",
] as const;

export const INPATIENT_TRANSFER_REASONS = [
  "HIGHER_LEVEL_OF_CARE",
  "SPECIALTY_UNAVAILABLE",
  "PROCEDURE_UNAVAILABLE",
  "ICU_CAPABILITY",
  "PATIENT_PREFERENCE",
  "CONTINUITY_OF_CARE",
  "INSURANCE_NETWORK",
  "OTHER",
] as const;

export const INPATIENT_TRANSPORT_MODES = [
  "ALS",
  "BLS",
  "AIR_MEDICAL",
  "AMBULANCE",
  "WHEELCHAIR_VAN",
  "PRIVATE_VEHICLE",
  "LAW_ENFORCEMENT",
  "OTHER",
] as const;

export const INPATIENT_HOME_HEALTH_SERVICES = [
  "SKILLED_NURSING",
  "PT",
  "OT",
  "SPEECH",
  "WOUND_CARE",
  "OTHER",
] as const;

export type InpatientFieldProvenance = {
  /** Fields the clinician explicitly edited — refresh must not overwrite without confirm. */
  clinicianEditedFields?: string[];
  /** Last chart-draft generation timestamp. */
  lastChartDraftAt?: string | null;
  /** Last patient-instruction generation from diagnosis templates. */
  lastInstructionDraftAt?: string | null;
};

export type InpatientTransferDispositionDetails = {
  receivingHospital?: string | null;
  receivingService?: string | null;
  receivingPhysician?: string | null;
  reasonCode?: string | null;
  reasonNarrative?: string | null;
  transferAccepted?: boolean | null;
  acceptedBy?: string | null;
  acceptedAt?: string | null;
  transportMode?: string | null;
  conditionAtTransfer?: string | null;
  documentsSent?: string | null;
  pendingResultsCommunicated?: string | null;
};

export type InpatientSnfDispositionDetails = {
  facilityName?: string | null;
  facilityAddress?: string | null;
  facilityPhone?: string | null;
  acceptingProvider?: string | null;
  transferAt?: string | null;
  transportMode?: string | null;
  documentsSent?: string | null;
};

export type InpatientHomeHealthDispositionDetails = {
  agencyName?: string | null;
  services?: string[];
  startOfCareNotes?: string | null;
};

export type InpatientCorrectionalDispositionDetails = {
  facilityName?: string | null;
  agencyName?: string | null;
  officerName?: string | null;
  badgeId?: string | null;
  custodyTransferredAt?: string | null;
  transportByLawEnforcement?: boolean | null;
};

export type InpatientAmaDispositionDetails = {
  capacityDocumented?: boolean | null;
  risksDiscussed?: boolean | null;
  alternativesDiscussed?: boolean | null;
  treatmentOffered?: boolean | null;
  returnPrecautionsReviewed?: boolean | null;
  notes?: string | null;
};

export type InpatientElopedDispositionDetails = {
  lastKnownAt?: string | null;
  lastKnownLocation?: string | null;
  conditionWhenLastObserved?: string | null;
  ivOrLinesPresent?: "YES" | "NO" | "UNKNOWN" | null;
  providerNotified?: boolean | null;
  nursingSupervisorNotified?: boolean | null;
  securityNotified?: boolean | null;
  lawEnforcementNotified?: boolean | null;
  emergencyContactAttempted?: boolean | null;
  notes?: string | null;
};

export type InpatientDeceasedDispositionDetails = {
  pronouncedAt?: string | null;
  pronouncedBy?: string | null;
  preliminaryContext?: string | null;
  nextOfKinNotified?: boolean | null;
  notifiedBy?: string | null;
  organDonationReferralStatus?: string | null;
  medicalExaminerStatus?: string | null;
  bodyDisposition?: "MORGUE" | "FUNERAL_HOME" | "MEDICAL_EXAMINER" | "OTHER" | null;
  bodyDispositionOther?: string | null;
};

export type InpatientFinalDisposition1C = {
  code: InpatientFinalDispositionCode1C | string;
  labelSnapshot?: string | null;
  destinationDetails?: string | null;
  transfer?: InpatientTransferDispositionDetails | null;
  snf?: InpatientSnfDispositionDetails | null;
  homeHealth?: InpatientHomeHealthDispositionDetails | null;
  correctional?: InpatientCorrectionalDispositionDetails | null;
  ama?: InpatientAmaDispositionDetails | null;
  eloped?: InpatientElopedDispositionDetails | null;
  deceased?: InpatientDeceasedDispositionDetails | null;
};

export type InpatientPatientInstructions1C = {
  schemaVersion?: typeof INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION_1C | "INP.DIS.1A";
  documentedAt?: string | null;
  documentedByUserId?: string | null;
  /** Generated from ED diagnosis template engine; clinician-editable. */
  dischargeDiagnosisSummary?: string | null;
  diagnosisInstructions?: string | null;
  medicationInstructions?: string | null;
  returnPrecautions?: string | null;
  followUpInstructions?: string | null;
  activityInstructions?: string | null;
  woundCareInstructions?: string | null;
  workSchoolNote?: string | null;
  /** Never auto-set — clinical workflow action only. */
  patientInstructionsGiven?: boolean | null;
  /** Template provenance (not displayed as chrome keys). */
  generatedFromPrimaryDiagnosisCode?: string | null;
  generatedAt?: string | null;
  clinicianEdited?: boolean | null;
  sections?: Record<string, string>;
};

export type InpatientDischargeFollowUp1C = {
  id: string;
  specialty: string;
  timing?: string | null;
  providerOrFacility?: string | null;
  phone?: string | null;
  notes?: string | null;
  source?: "TEMPLATE" | "CONSULT" | "ORDER" | "PLANNING" | "MANUAL" | string | null;
};

export type InpatientProviderDischargeV1C = InpatientProviderDischargeV1B & {
  schemaVersion: InpatientProviderDischargeSchemaVersion;
  conditionAtDischarge?: {
    status: InpatientConditionAtDischargeStatus1C | InpatientConditionAtDischargeStatus;
    narrative?: string | null;
  } | null;
  finalDisposition?: InpatientFinalDisposition1C | null;
  /** No known pending studies affirmed by provider. */
  noKnownPendingStudies?: boolean | null;
  /** Embedded patient instructions (also mirrored to inpatientPatientInstructions namespace). */
  patientInstructions?: InpatientPatientInstructions1C | null;
  followUps?: InpatientDischargeFollowUp1C[];
  fieldProvenance?: InpatientFieldProvenance | null;
  /** Provider finalized documentation — does NOT close encounter (1E). */
  providerDocumentationFinalizedAt?: string | null;
};

/** Chart snapshot input for deterministic draft assembly (no fabrication). */
export type InpatientDischargeChartSnapshot = {
  admissionDiagnosis?: { code?: string | null; description?: string | null } | null;
  reasonForAdmission?: string | null;
  chiefComplaint?: string | null;
  dischargeDiagnoses?: InpatientProviderDischargeDiagnosis[];
  consults?: Array<{ specialty?: string | null; reason?: string | null; status?: string | null }>;
  proceduresSummary?: string | null;
  significantFindingsSummary?: string | null;
  progressNoteExcerpts?: string[];
  problemPlanSummaries?: string[];
  pendingStudySuggestions?: Array<{
    type?: InpatientPendingStudyType | string;
    description: string;
    responsibleParty?: string | null;
  }>;
  language?: "en" | "fr";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

export function mapInpatientDispositionToLifecycleStatus(
  code: string | null | undefined
): InpatientLifecycleDischargeStatus | null {
  const c = trimOrNull(code)?.toUpperCase();
  if (!c) return null;
  if (c === "DECEASED") return "DECEASED";
  if (c === "AGAINST_MEDICAL_ADVICE" || c === "AMA") return "AMA";
  if (
    c === "TRANSFER_ACUTE_CARE" ||
    c === "BEHAVIORAL_HEALTH_FACILITY" ||
    c === "SKILLED_NURSING_FACILITY" ||
    c === "ACUTE_REHAB" ||
    c === "LONG_TERM_ACUTE_CARE" ||
    c === "ASSISTED_LIVING" ||
    c === "HOSPICE" ||
    c === "CORRECTIONAL_FACILITY"
  ) {
    return "TRANSFERRED";
  }
  // Coarse Encounter.dischargeStatus enum has no ELOPED — map to AMA for lifecycle only.
  // Clinical / print / reporting MUST retain detailed code ELOPED (see inpatientFinalDischarge).
  if (c === "ELOPED") return "AMA";
  return "DISCHARGED";
}

export function dispositionRequiresConditionAtDischarge(code: string | null | undefined): boolean {
  const c = trimOrNull(code)?.toUpperCase();
  if (!c) return true;
  return c !== "DECEASED" && c !== "ELOPED";
}

export function dispositionUsesHomeInstructionEngine(code: string | null | undefined): boolean {
  const c = trimOrNull(code)?.toUpperCase();
  return c === "HOME" || c === "HOME_WITH_HOME_HEALTH" || c === "AGAINST_MEDICAL_ADVICE";
}

export function dispositionSkipsPatientInstructionRequirement(
  code: string | null | undefined
): boolean {
  const c = trimOrNull(code)?.toUpperCase();
  return c === "DECEASED" || c === "ELOPED" || c === "CORRECTIONAL_FACILITY";
}

/** Map planning destination → suggested final disposition (never auto-apply). */
export function suggestFinalDispositionFromPlannedDestination1C(
  plannedDestination: string | null | undefined
): InpatientFinalDispositionCode1C | null {
  const raw = trimOrNull(plannedDestination)?.toUpperCase() ?? "";
  if (!raw) return null;
  if (raw.includes("HOME") && (raw.includes("HEALTH") || raw.includes("HH"))) {
    return "HOME_WITH_HOME_HEALTH";
  }
  if (raw === "HOME" || raw.includes("DOMICILE")) return "HOME";
  if (raw.includes("SNF") || raw.includes("SKILLED") || raw.includes("EHPAD")) {
    return "SKILLED_NURSING_FACILITY";
  }
  if (raw.includes("REHAB")) return "ACUTE_REHAB";
  if (raw.includes("LTAC") || raw.includes("LONG_TERM")) return "LONG_TERM_ACUTE_CARE";
  if (raw.includes("ASSISTED")) return "ASSISTED_LIVING";
  if (raw.includes("HOSPICE")) return "HOSPICE";
  if (raw.includes("TRANSFER")) return "TRANSFER_ACUTE_CARE";
  if (raw.includes("BEHAVIOR") || raw.includes("PSYCH")) return "BEHAVIORAL_HEALTH_FACILITY";
  if (raw.includes("CORRECTION") || raw.includes("CUSTODY") || raw.includes("JAIL")) {
    return "CORRECTIONAL_FACILITY";
  }
  if (raw.includes("AMA") || raw.includes("AGAINST")) return "AGAINST_MEDICAL_ADVICE";
  if (raw.includes("ELOP")) return "ELOPED";
  if (raw.includes("DECEAS") || raw.includes("EXPIR") || raw.includes("DEATH")) return "DECEASED";
  return null;
}

export function markClinicianEditedField(
  provenance: InpatientFieldProvenance | null | undefined,
  field: string
): InpatientFieldProvenance {
  const set = new Set(provenance?.clinicianEditedFields ?? []);
  set.add(field);
  return {
    ...provenance,
    clinicianEditedFields: [...set],
  };
}

export function isFieldClinicianEdited(
  provenance: InpatientFieldProvenance | null | undefined,
  field: string
): boolean {
  return (provenance?.clinicianEditedFields ?? []).includes(field);
}

/**
 * Merge chart draft into existing doc without overwriting clinician-edited fields.
 * Returns next doc + list of fields that were refreshed.
 */
export function mergeChartDraftPreservingClinicianEdits(input: {
  existing: InpatientProviderDischargeV1C;
  draft: Partial<InpatientProviderDischargeV1C>;
  /** When true, overwrite even clinician-edited fields (user confirmed). */
  forceReplaceFields?: string[];
}): { next: InpatientProviderDischargeV1C; refreshed: string[] } {
  const force = new Set(input.forceReplaceFields ?? []);
  const provenance = input.existing.fieldProvenance ?? {};
  const refreshed: string[] = [];
  const next: InpatientProviderDischargeV1C = { ...input.existing };

  const candidates: Array<keyof InpatientProviderDischargeV1C> = [
    "admissionDiagnosis",
    "reasonForHospitalization",
    "hospitalCourse",
    "significantFindings",
    "proceduresAndTreatments",
    "consultations",
    "complications",
    "dischargeDiagnoses",
    "pendingStudies",
  ];

  for (const key of candidates) {
    if (input.draft[key] === undefined) continue;
    const edited = isFieldClinicianEdited(provenance, key) && !force.has(key);
    if (edited) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (next as any)[key] = input.draft[key];
    refreshed.push(key);
  }

  next.fieldProvenance = {
    ...provenance,
    clinicianEditedFields: (provenance.clinicianEditedFields ?? []).filter(
      (f) => !(force.has(f) && refreshed.includes(f))
    ),
    lastChartDraftAt: new Date().toISOString(),
  };
  next.schemaVersion = INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION_1C;
  return { next, refreshed };
}

/** Deterministic chart → draft narratives. Only uses provided snapshot facts. */
export function buildInpatientDischargeChartDraft(
  snapshot: InpatientDischargeChartSnapshot
): Partial<InpatientProviderDischargeV1C> {
  const fr = snapshot.language === "fr";
  const lines: string[] = [];
  const adm =
    snapshot.admissionDiagnosis?.description?.trim() ||
    snapshot.admissionDiagnosis?.code?.trim() ||
    null;
  const reason =
    trimOrNull(snapshot.reasonForAdmission) ||
    trimOrNull(snapshot.chiefComplaint) ||
    adm;

  if (adm) {
    lines.push(
      fr ? `Diagnostic d'admission : ${adm}` : `Admission diagnosis: ${adm}`
    );
  }
  if (reason && reason !== adm) {
    lines.push(fr ? `Motif d'hospitalisation : ${reason}` : `Reason for hospitalization: ${reason}`);
  }

  const dxLabels = (snapshot.dischargeDiagnoses ?? [])
    .map((d) => [d.code, d.description].filter(Boolean).join(" — "))
    .filter(Boolean);
  if (dxLabels.length) {
    lines.push(
      fr
        ? `Diagnostics de sortie documentés : ${dxLabels.join("; ")}`
        : `Documented discharge diagnoses: ${dxLabels.join("; ")}`
    );
  }

  const consultLines = (snapshot.consults ?? [])
    .map((c) => {
      const specialty = trimOrNull(c.specialty);
      if (!specialty) return null;
      const status = trimOrNull(c.status);
      const reasonC = trimOrNull(c.reason);
      return [specialty, status, reasonC].filter(Boolean).join(" — ");
    })
    .filter(Boolean);
  if (consultLines.length) {
    lines.push(
      fr
        ? `Consultations : ${consultLines.join("; ")}`
        : `Consultations: ${consultLines.join("; ")}`
    );
  }

  if (trimOrNull(snapshot.proceduresSummary)) {
    lines.push(
      fr
        ? `Procédures / traitements : ${snapshot.proceduresSummary!.trim()}`
        : `Procedures / treatments: ${snapshot.proceduresSummary!.trim()}`
    );
  }

  if (trimOrNull(snapshot.significantFindingsSummary)) {
    lines.push(
      fr
        ? `Constats significatifs : ${snapshot.significantFindingsSummary!.trim()}`
        : `Significant findings: ${snapshot.significantFindingsSummary!.trim()}`
    );
  }

  for (const excerpt of snapshot.progressNoteExcerpts ?? []) {
    const t = trimOrNull(excerpt);
    if (t) lines.push(t);
  }
  for (const plan of snapshot.problemPlanSummaries ?? []) {
    const t = trimOrNull(plan);
    if (t) lines.push(t);
  }

  if (!lines.length) {
    lines.push(
      fr
        ? "Brouillon généré à partir du dossier — compléter selon les données cliniques documentées."
        : "Chart-derived draft — complete using documented clinical data."
    );
  }

  const pendingStudies: InpatientProviderDischargePendingStudy[] = (
    snapshot.pendingStudySuggestions ?? []
  )
    .filter((s) => trimOrNull(s.description))
    .map((s, i) => {
      const typeRaw = trimOrNull(s.type)?.toUpperCase() ?? "OTHER";
      const type = (INPATIENT_PENDING_STUDY_TYPES as readonly string[]).includes(typeRaw)
        ? (typeRaw as InpatientPendingStudyType)
        : "OTHER";
      return {
        id: `chart-pending-${i + 1}`,
        type,
        description: s.description.trim(),
        responsibleParty: trimOrNull(s.responsibleParty),
        followUpPlan: null,
      };
    });

  return {
    schemaVersion: INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION_1C,
    admissionDiagnosis: snapshot.admissionDiagnosis ?? null,
    reasonForHospitalization: reason,
    hospitalCourse: lines.join("\n"),
    significantFindings: trimOrNull(snapshot.significantFindingsSummary),
    proceduresAndTreatments: trimOrNull(snapshot.proceduresSummary),
    consultations: consultLines.length ? consultLines.join("\n") : null,
    complications: null,
    dischargeDiagnoses: snapshot.dischargeDiagnoses?.length
      ? normalizeDischargeDiagnoses(snapshot.dischargeDiagnoses)
      : undefined,
    pendingStudies: pendingStudies.length ? pendingStudies : undefined,
  };
}

export function emptyInpatientPatientInstructions1C(): InpatientPatientInstructions1C {
  return {
    schemaVersion: INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION_1C,
    patientInstructionsGiven: false,
  };
}

/** Disposition-aware complete validation (extends 1B). */
export function validateInpatientProviderDischarge1C(
  doc: InpatientProviderDischargeV1C,
  mode: InpatientProviderDischargeSaveMode
): InpatientProviderDischargeValidationResult {
  if (mode === "draft") return { ok: true };

  const errors: string[] = [];
  const code = trimOrNull(doc.finalDisposition?.code)?.toUpperCase() ?? null;

  if (!code) {
    errors.push("FINAL_DISPOSITION_REQUIRED");
  }

  const diagnoses = normalizeDischargeDiagnoses(doc.dischargeDiagnoses ?? []);
  const skipDx = code === "DECEASED" || code === "ELOPED";
  if (!skipDx) {
    if (diagnoses.length === 0) errors.push("DISCHARGE_DIAGNOSIS_REQUIRED");
    if (diagnoses.length > 0 && countPrimaryDischargeDiagnoses(diagnoses) !== 1) {
      errors.push("PRIMARY_DISCHARGE_DIAGNOSIS_REQUIRED");
    }
  }

  if (code !== "DECEASED" && code !== "ELOPED" && !trimOrNull(doc.hospitalCourse)) {
    errors.push("HOSPITAL_COURSE_REQUIRED");
  }

  if (dispositionRequiresConditionAtDischarge(code)) {
    if (!doc.conditionAtDischarge?.status) {
      errors.push("CONDITION_AT_DISCHARGE_REQUIRED");
    } else if (
      doc.conditionAtDischarge.status === "OTHER" &&
      !trimOrNull(doc.conditionAtDischarge.narrative)
    ) {
      errors.push("CONDITION_AT_DISCHARGE_NARRATIVE_REQUIRED");
    }
  }

  if (code === "OTHER" && !trimOrNull(doc.finalDisposition?.destinationDetails)) {
    errors.push("OTHER_DISPOSITION_DETAILS_REQUIRED");
  }
  if (code === "TRANSFER_ACUTE_CARE") {
    if (!trimOrNull(doc.finalDisposition?.transfer?.receivingHospital)) {
      errors.push("TRANSFER_RECEIVING_HOSPITAL_REQUIRED");
    }
  }
  if (code === "SKILLED_NURSING_FACILITY") {
    if (
      !trimOrNull(doc.finalDisposition?.snf?.facilityName) &&
      !trimOrNull(doc.finalDisposition?.destinationDetails)
    ) {
      errors.push("SNF_FACILITY_REQUIRED");
    }
  }
  if (code === "DECEASED" && !trimOrNull(doc.finalDisposition?.deceased?.pronouncedAt)) {
    errors.push("DECEASED_PRONOUNCED_AT_REQUIRED");
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

export type DischargeReadinessChipStatus = "complete" | "attention" | "incomplete" | "not_applicable";

export type DischargeReadinessChip = {
  id: string;
  status: DischargeReadinessChipStatus;
};

/** Documentation/workflow readiness only — not clinical authorization. */
export function projectInpatientDischargeReadiness(
  doc: InpatientProviderDischargeV1C,
  extras?: {
    medReconComplete?: boolean | null;
    nursingDischargePresent?: boolean | null;
  }
): DischargeReadinessChip[] {
  const code = trimOrNull(doc.finalDisposition?.code);
  const hasDx = (doc.dischargeDiagnoses?.length ?? 0) > 0;
  const hasCourse = Boolean(trimOrNull(doc.hospitalCourse));
  const hasPending =
    (doc.pendingStudies?.length ?? 0) > 0 || doc.noKnownPendingStudies === true;
  const hasFollowUp = (doc.followUps?.length ?? 0) > 0;
  const hasInstructions = Boolean(
    trimOrNull(doc.patientInstructions?.returnPrecautions) ||
      trimOrNull(doc.patientInstructions?.diagnosisInstructions) ||
      trimOrNull(doc.patientInstructions?.dischargeDiagnosisSummary)
  );
  const skipInstr = dispositionSkipsPatientInstructionRequirement(code);

  return [
    {
      id: "dischargeDiagnoses",
      status: hasDx || code === "DECEASED" || code === "ELOPED" ? "complete" : "incomplete",
    },
    {
      id: "medicationReconciliation",
      status:
        extras?.medReconComplete === true
          ? "complete"
          : extras?.medReconComplete === false
            ? "attention"
            : "incomplete",
    },
    {
      id: "pendingStudies",
      status: hasPending
        ? (doc.pendingStudies?.some((p) => !trimOrNull(p.followUpPlan)) ? "attention" : "complete")
        : "incomplete",
    },
    {
      id: "followUp",
      status: skipInstr ? "not_applicable" : hasFollowUp ? "complete" : "incomplete",
    },
    {
      id: "patientInstructions",
      status: skipInstr
        ? "not_applicable"
        : hasInstructions
          ? "complete"
          : dispositionUsesHomeInstructionEngine(code)
            ? "attention"
            : "incomplete",
    },
    {
      id: "finalDisposition",
      status: code ? "complete" : "incomplete",
    },
    {
      id: "providerSummary",
      status: hasCourse || code === "DECEASED" || code === "ELOPED" ? "complete" : "incomplete",
    },
    {
      id: "nursingDischarge",
      status:
        extras?.nursingDischargePresent === true
          ? "complete"
          : "incomplete",
    },
  ];
}

/** Project patient instructions into flat legacy keys for print/summary. */
export function projectInpatientPatientInstructionsToFlat(
  instr: InpatientPatientInstructions1C | null | undefined
): Record<string, unknown> {
  if (!instr) return {};
  return {
    dischargeDiagnosisSummary: instr.dischargeDiagnosisSummary ?? null,
    dischargeInstructions: instr.diagnosisInstructions ?? null,
    medicationInstructions: instr.medicationInstructions ?? null,
    returnPrecautions: instr.returnPrecautions ?? null,
    followUpInstructions: instr.followUpInstructions ?? null,
    activityInstructions: instr.activityInstructions ?? null,
    woundCareInstructions: instr.woundCareInstructions ?? null,
    workSchoolNote: instr.workSchoolNote ?? null,
    patientInstructionsGiven: instr.patientInstructionsGiven === true,
  };
}

export function mergeInpatientProviderDischargeIntoDischargeSummary1C(
  existingDischargeSummary: unknown,
  providerDoc: InpatientProviderDischargeV1C
): Record<string, unknown> {
  const base = isRecord(existingDischargeSummary) ? { ...existingDischargeSummary } : {};
  const primary =
    providerDoc.dischargeDiagnoses?.find((d) => d.isPrimary) ??
    providerDoc.dischargeDiagnoses?.[0];
  const secondary = (providerDoc.dischargeDiagnoses ?? []).filter((d) => d !== primary);
  const diagnosisSummary = [
    primary ? [primary.code, primary.description].filter(Boolean).join(" — ") : null,
    ...secondary.map((d) => [d.code, d.description].filter(Boolean).join(" — ")),
  ]
    .filter(Boolean)
    .join("; ");

  const finalCode = trimOrNull(providerDoc.finalDisposition?.code);
  const finalLabel =
    trimOrNull(providerDoc.finalDisposition?.labelSnapshot) ?? finalCode;
  const lifecycle = mapInpatientDispositionToLifecycleStatus(finalCode);

  const instrFlat = projectInpatientPatientInstructionsToFlat(providerDoc.patientInstructions);
  const pendingLines = (providerDoc.pendingStudies ?? []).map((s) => {
    const parts = [s.type, s.description];
    if (s.responsibleParty) parts.push(`(${s.responsibleParty})`);
    if (s.followUpPlan) parts.push(`— ${s.followUpPlan}`);
    return parts.join(" ");
  });

  const followUpText =
    (providerDoc.followUps ?? [])
      .map((f) => [f.specialty, f.timing, f.providerOrFacility].filter(Boolean).join(" — "))
      .filter(Boolean)
      .join("\n") ||
    (typeof instrFlat.followUpInstructions === "string" ? instrFlat.followUpInstructions : null);

  return {
    ...base,
    ...instrFlat,
    dischargeDiagnosisSummary:
      (instrFlat.dischargeDiagnosisSummary as string | null) || diagnosisSummary || null,
    hospitalCourse: providerDoc.hospitalCourse ?? null,
    reasonForHospitalization: providerDoc.reasonForHospitalization ?? null,
    significantFindings: providerDoc.significantFindings ?? null,
    proceduresAndTreatments: providerDoc.proceduresAndTreatments ?? null,
    consultations: providerDoc.consultations ?? null,
    complications: providerDoc.complications ?? null,
    finalDisposition: finalCode,
    dischargeMode: finalLabel,
    dischargeStatusMapped: lifecycle,
    exitCondition: providerDoc.conditionAtDischarge?.status ?? null,
    conditionAtDischargeNarrative: providerDoc.conditionAtDischarge?.narrative ?? null,
    pendingStudiesSummary: pendingLines.length ? pendingLines.join("\n") : null,
    followUpInstructions: followUpText,
    providerDischargeDocumentedAt: providerDoc.documentedAt ?? null,
    providerDischargeDocumentedByDisplayName:
      providerDoc.documentedByDisplayNameSnapshot ?? null,
    providerDischargeDocumentedByTitle:
      providerDoc.documentedByProfessionalTitleSnapshot ?? null,
    plannedDestinationNotFinalDisposition: true,
    inpatientProviderDischarge: providerDoc,
    inpatientPatientInstructions: providerDoc.patientInstructions
      ? {
          schemaVersion: INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION_1C,
          documentedAt: providerDoc.patientInstructions.documentedAt ?? null,
          documentedByUserId: providerDoc.patientInstructions.documentedByUserId ?? null,
          sections: {
            dischargeDiagnosisSummary:
              providerDoc.patientInstructions.dischargeDiagnosisSummary ?? "",
            diagnosisInstructions:
              providerDoc.patientInstructions.diagnosisInstructions ?? "",
            medicationInstructions:
              providerDoc.patientInstructions.medicationInstructions ?? "",
            returnPrecautions: providerDoc.patientInstructions.returnPrecautions ?? "",
            followUpInstructions:
              providerDoc.patientInstructions.followUpInstructions ?? "",
            activityInstructions:
              providerDoc.patientInstructions.activityInstructions ?? "",
            woundCareInstructions:
              providerDoc.patientInstructions.woundCareInstructions ?? "",
          },
        }
      : base.inpatientPatientInstructions,
  };
}

function readNestedDispositionDetails<T>(
  finalDispositionRaw: unknown,
  key: string
): T | null {
  if (!isRecord(finalDispositionRaw)) return null;
  const nested = finalDispositionRaw[key];
  return isRecord(nested) ? (nested as T) : null;
}

export function hydrateInpatientProviderDischarge1C(
  raw: unknown
): InpatientProviderDischargeV1C | null {
  if (!isRecord(raw)) return null;
  const hydrated = hydrateInpatientProviderDischarge(raw);
  if (!hydrated) return null;

  const fdRaw = raw.finalDisposition;
  const fd = hydrated.finalDisposition;
  let finalDisposition: InpatientFinalDisposition1C | null = null;
  if (fd) {
    const code = String(fd.code).toUpperCase();
    finalDisposition = {
      code: (INPATIENT_FINAL_DISPOSITION_CODES_1C as readonly string[]).includes(code)
        ? (code as InpatientFinalDispositionCode1C)
        : code,
      labelSnapshot: fd.labelSnapshot ?? null,
      destinationDetails: fd.destinationDetails ?? null,
      transfer: readNestedDispositionDetails(fdRaw, "transfer"),
      snf: readNestedDispositionDetails(fdRaw, "snf"),
      homeHealth: readNestedDispositionDetails(fdRaw, "homeHealth"),
      correctional: readNestedDispositionDetails(fdRaw, "correctional"),
      ama: readNestedDispositionDetails(fdRaw, "ama"),
      eloped: readNestedDispositionDetails(fdRaw, "eloped"),
      deceased: readNestedDispositionDetails(fdRaw, "deceased"),
    };
  }

  const pi = isRecord(raw.patientInstructions)
    ? (raw.patientInstructions as InpatientPatientInstructions1C)
    : null;

  const followUps = Array.isArray(raw.followUps)
    ? (raw.followUps as InpatientDischargeFollowUp1C[]).filter(
        (f) => f && typeof f === "object" && trimOrNull(f.specialty)
      )
    : [];

  return {
    ...hydrated,
    schemaVersion:
      String(raw.schemaVersion ?? "") === "INP.DIS.1C"
        ? INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION_1C
        : hydrated.schemaVersion === "INP.DIS.1B"
          ? "INP.DIS.1B"
          : INPATIENT_PROVIDER_DISCHARGE_SCHEMA_VERSION_1C,
    finalDisposition,
    noKnownPendingStudies: raw.noKnownPendingStudies === true,
    patientInstructions: pi,
    followUps,
    fieldProvenance: isRecord(raw.fieldProvenance)
      ? (raw.fieldProvenance as InpatientFieldProvenance)
      : null,
    providerDocumentationFinalizedAt: trimOrNull(raw.providerDocumentationFinalizedAt),
  };
}

/** Prefer 1C validation when available; keep 1B export behavior for callers. */
export function asProviderDischarge1C(
  doc: InpatientProviderDischargeV1B
): InpatientProviderDischargeV1C {
  return doc as InpatientProviderDischargeV1C;
}
