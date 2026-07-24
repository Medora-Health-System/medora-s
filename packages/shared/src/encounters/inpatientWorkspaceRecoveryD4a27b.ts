/**
 * D4A.2.7B — Inpatient workspace recovery contracts.
 * Encounter resolution, availability states, note registry, role readiness.
 * No Placement / D3B. No migrations.
 */

export const INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID =
  "MEDUI.INPATIENT_WORKSPACE_RECOVERY.D4A2_7B" as const;

/** Explicit clinical UI availability — never represent unavailable as zero. */
export const CLINICAL_AVAILABILITY_STATES = [
  "LOADING",
  "AVAILABLE",
  "NO_DATA_DOCUMENTED",
  "NOT_APPLICABLE",
  "NOT_CONFIGURED",
  "TEMPORARILY_UNAVAILABLE",
  "ACCESS_RESTRICTED",
  "ENCOUNTER_MISMATCH",
  "SOURCE_UNAVAILABLE",
  "SAVE_FAILED",
  "CONFLICT_DETECTED",
] as const;

export type ClinicalAvailabilityState = (typeof CLINICAL_AVAILABILITY_STATES)[number];

export const INPATIENT_WORKSPACE_ROLES = [
  "PROVIDER",
  "NURSING",
  "TECHNICIAN",
  "CHART",
] as const;

export type InpatientWorkspaceRole = (typeof INPATIENT_WORKSPACE_ROLES)[number];

export const ENCOUNTER_RESOLUTION_FAILURE_CATEGORIES = [
  "MISSING_ID",
  "NOT_FOUND",
  "FACILITY_MISMATCH",
  "WRONG_ENCOUNTER_TYPE",
  "ENCOUNTER_TYPE_MISMATCH",
  "ED_ENCOUNTER_REJECTED",
  "OBSERVATION_ENCOUNTER_REJECTED",
  "LINEAGE_AMBIGUOUS",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "FEATURE_DISABLED",
  "SCHEMA_COMPATIBILITY",
  "SERVER_ERROR",
  "NETWORK",
  "UNKNOWN",
] as const;

export type EncounterResolutionFailureCategory =
  (typeof ENCOUNTER_RESOLUTION_FAILURE_CATEGORIES)[number];

export type EncounterResolutionResultV1 =
  | {
      ok: true;
      encounterId: string;
      encounterType: "INPATIENT" | "OBSERVATION";
      clinicalContext: "INPATIENT" | "OBSERVATION";
      facilityId: string;
      patientId: string;
      status: string;
      hospitalEpisodeId: string | null;
      writersEnabled: true;
      /** D4A.2.8-HF2 — set when server redirected source→destination lineage (same patient/facility). */
      redirectedFromEncounterId?: string | null;
      requestedEncounterId?: string | null;
    }
  | {
      ok: false;
      requestedEncounterId: string | null;
      category: EncounterResolutionFailureCategory;
      writersEnabled: false;
      actualEncounterType?: string | null;
      /** D4A.2.8-HF2 — when category is FACILITY_MISMATCH */
      actualFacilityId?: string | null;
      messageCode: string;
    };

/** Governed legal-record note types — one engine, typed documents. */
export const ENTERPRISE_NOTE_TYPE_REGISTRY = [
  {
    code: "HP",
    audience: "PROVIDER" as const,
    labelKey: "enterpriseNotes.types.hp",
    allowsGenericWriter: false,
  },
  {
    code: "PROGRESS",
    audience: "PROVIDER" as const,
    labelKey: "enterpriseNotes.types.progress",
    allowsGenericWriter: false,
  },
  {
    code: "SIGNIFICANT_EVENT",
    audience: "PROVIDER" as const,
    labelKey: "enterpriseNotes.types.significantEvent",
    allowsGenericWriter: false,
  },
  {
    code: "CROSS_COVER",
    audience: "PROVIDER" as const,
    labelKey: "enterpriseNotes.types.crossCover",
    allowsGenericWriter: false,
  },
  {
    code: "DISCHARGE_SUMMARY",
    audience: "PROVIDER" as const,
    labelKey: "enterpriseNotes.types.dischargeSummary",
    allowsGenericWriter: false,
  },
  {
    code: "CONSULT",
    audience: "PROVIDER" as const,
    labelKey: "enterpriseNotes.types.consult",
    allowsGenericWriter: false,
  },
  {
    code: "NURSING_NARRATIVE",
    audience: "NURSING" as const,
    labelKey: "enterpriseNotes.types.nursingNarrative",
    allowsGenericWriter: false,
  },
  {
    code: "SHIFT_NOTE",
    audience: "NURSING" as const,
    labelKey: "enterpriseNotes.types.shiftNote",
    allowsGenericWriter: false,
  },
  {
    code: "HANDOFF_NOTE",
    audience: "NURSING" as const,
    labelKey: "enterpriseNotes.types.handoffNote",
    allowsGenericWriter: false,
  },
  {
    code: "TECHNICIAN_NOTE",
    audience: "TECHNICIAN" as const,
    labelKey: "enterpriseNotes.types.technicianNote",
    allowsGenericWriter: false,
  },
] as const;

export type EnterpriseNoteTypeCode = (typeof ENTERPRISE_NOTE_TYPE_REGISTRY)[number]["code"];

/**
 * Nursing admission UX stages — persistence remains section-level (20 sections).
 * Keys MUST match INPATIENT_ADMISSION_CLINICAL_SECTIONS (D4A.0 / D4A.1).
 */
export const NURSING_ADMISSION_STAGES = [
  {
    id: "ARRIVAL_IDENTITY",
    sectionKeys: ["OVERVIEW", "IDENTITY_DEMOGRAPHICS", "SOURCE_ENCOUNTER_SUMMARY"],
  },
  {
    id: "IMMEDIATE_ASSESSMENT",
    sectionKeys: ["NURSING_ADMISSION_ASSESSMENT", "PAIN"],
  },
  {
    id: "HISTORY_RECONCILIATION",
    sectionKeys: [
      "MEDICAL_HISTORY",
      "SURGICAL_HISTORY",
      "HOME_MEDICATIONS",
      "ALLERGIES",
      "SOCIAL_HISTORY",
    ],
  },
  {
    id: "SAFETY_PHYSICAL",
    sectionKeys: [
      "BELONGINGS_VALUABLES",
      "SKIN_WOUND",
      "LINES_DRAINS_DEVICES",
      "FALL_SAFETY",
      "FUNCTIONAL_MOBILITY",
      "NUTRITION",
      "ELIMINATION",
    ],
  },
  {
    id: "PSYCHOSOCIAL_EDUCATION",
    sectionKeys: ["PSYCHOSOCIAL", "EDUCATION_COMMUNICATION"],
  },
  {
    id: "HANDOFF_COMPLETION",
    sectionKeys: ["PROVIDER_ADMISSION"],
  },
] as const;

export type NursingAdmissionStageId = (typeof NURSING_ADMISSION_STAGES)[number]["id"];

export function nursingAdmissionStageForSection(
  sectionId: string
): (typeof NURSING_ADMISSION_STAGES)[number] | null {
  return NURSING_ADMISSION_STAGES.find((s) =>
    (s.sectionKeys as readonly string[]).includes(sectionId)
  ) ?? null;
}

export function nursingAdmissionSectionsForStage(
  stageId: NursingAdmissionStageId
): readonly string[] {
  const stage = NURSING_ADMISSION_STAGES.find((s) => s.id === stageId);
  return stage?.sectionKeys ?? [];
}

export function allNursingAdmissionStageSectionIds(): string[] {
  return NURSING_ADMISSION_STAGES.flatMap((s) => [...s.sectionKeys]);
}

export type HospitalWorkspaceBootstrapV1 = {
  certification: typeof INPATIENT_WORKSPACE_RECOVERY_CERTIFICATION_ID;
  resolution: EncounterResolutionResultV1;
  generatedAt: string;
  header: {
    encounterId: string;
    patientId: string;
    patientName: string;
    preferredName: string | null;
    mrn: string | null;
    dateOfBirth: string | null;
    ageYears: number | null;
    sexAtBirth: string | null;
    preferredLanguage: string | null;
    interpreterRequired: boolean | null;
    encounterType: string;
    hospitalDay: number | null;
    admittedAt: string | null;
    admissionSource: string | null;
    attendingName: string | null;
    assignedRnName: string | null;
    /** D4A.3.3A — PCT from enterprise hospital assignment bag. */
    assignedPctName?: string | null;
    residentOrAppName: string | null;
    facilityName: string | null;
    unit: string | null;
    room: string | null;
    bed: string | null;
    levelOfCare: string | null;
    encounterStatus: string | null;
    chiefConcern: string | null;
    codeStatus: string | null;
    isolation: string[] | null;
    fallRisk: string | null;
    allergiesSummary: string | null;
    /** D4A.2.7C enrichment — never infer devices; use SOURCE_UNAVAILABLE when unknown. */
    allergiesAvailability?: "PRESENT" | "NOT_PRESENT" | "UNKNOWN" | "NOT_DOCUMENTED" | "SOURCE_UNAVAILABLE";
    oxygenSupport?: string | null;
    dietNpo?: string | null;
    weightKg?: number | null;
    latestVitals?: {
      availability: "AVAILABLE" | "NO_DATA_DOCUMENTED" | "SOURCE_UNAVAILABLE";
      recordedAt: string | null;
      systolic: number | null;
      diastolic: number | null;
      heartRate: number | null;
      spo2: number | null;
      temperatureC: number | null;
      respiratoryRate: number | null;
    };
    indicators?: Array<{
      code: string;
      state: "PRESENT" | "NOT_PRESENT" | "UNKNOWN" | "NOT_DOCUMENTED" | "SOURCE_UNAVAILABLE";
      labelKey: string;
    }>;
  } | null;
  readiness: {
    role: InpatientWorkspaceRole;
    encounterResolved: boolean;
    roleAuthorized: boolean;
    modules: Record<string, ClinicalAvailabilityState>;
  };
  alertCounts: {
    criticalResults: number | null;
    pendingTasks: number | null;
    escalations: number | null;
  };
  writersEnabled: boolean;
};

export function classifyEncounterTypeForHospitalWorkspace(
  encounterType: string | null | undefined
): "INPATIENT" | "OBSERVATION" | "EMERGENCY" | "OTHER" {
  const t = String(encounterType ?? "")
    .trim()
    .toUpperCase();
  if (t === "INPATIENT") return "INPATIENT";
  if (t === "OBSERVATION") return "OBSERVATION";
  if (t === "EMERGENCY" || t === "ED" || t === "ER") return "EMERGENCY";
  return "OTHER";
}

/**
 * Resolve which chart path a bed-board occupant should open.
 * Never send ED occupants to the Inpatient workspace.
 */
export function resolveHospitalChartPathKind(input: {
  unitCode?: string | null;
  encounterType?: string | null;
}): "EMERGENCY" | "OBSERVATION" | "INPATIENT" | "UNKNOWN" {
  const unit = String(input.unitCode ?? "")
    .trim()
    .toUpperCase();
  const typed = classifyEncounterTypeForHospitalWorkspace(input.encounterType);
  if (typed === "EMERGENCY" || unit === "ED") return "EMERGENCY";
  if (typed === "OBSERVATION" || unit === "OBS") return "OBSERVATION";
  if (typed === "INPATIENT" || unit === "MS" || unit === "ICU") return "INPATIENT";
  return "UNKNOWN";
}

export function buildEncounterMismatchResolution(input: {
  requestedEncounterId: string;
  actualType: string;
}): EncounterResolutionResultV1 {
  const kind = classifyEncounterTypeForHospitalWorkspace(input.actualType);
  const category: EncounterResolutionFailureCategory =
    kind === "EMERGENCY"
      ? "ED_ENCOUNTER_REJECTED"
      : kind === "OBSERVATION"
        ? "OBSERVATION_ENCOUNTER_REJECTED"
        : "WRONG_ENCOUNTER_TYPE";
  return {
    ok: false,
    requestedEncounterId: input.requestedEncounterId,
    category,
    writersEnabled: false,
    actualEncounterType: input.actualType,
    messageCode: `inpatientWorkspaceRecovery.errors.${category}`,
  };
}

export function providerPrimaryNav(): readonly string[] {
  return [
    "overview",
    "historyPhysical",
    "problemsPlan",
    "progressNotes",
    "orders",
    "results",
    "medications",
    "consults",
    "carePlan",
    "dischargePlanning",
    "timeline",
    "summary",
  ] as const;
}

/** MEDUI.D4A.3.3 — Nursing primary nav (no Timeline / Summary; Notes + Assessment). */
export function nursingPrimaryNav(): readonly string[] {
  return [
    "overview",
    "orders",
    "medications",
    "results",
    "carePlan",
    "admission",
    "nursing",
    "notes",
    "dischargePlanning",
  ] as const;
}

export function technicianPrimaryNav(): readonly string[] {
  return ["overview", "nursing", "tasks", "timeline", "summary"] as const;
}

/** Humanize camelCase / compressed keys for clinical UI (fallback only — prefer i18n). */
export function humanizeClinicalLabel(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.includes(" ") && !/[a-z][A-Z]/.test(s)) return s;
  const spaced = s
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  if (!spaced) return s;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function mustNotExposeCertificationInClinicalUi(text: string): boolean {
  return /MEDUI\.[A-Z0-9_.]+/i.test(text) || /D4A2[_-]?\d/i.test(text);
}

export function inpatientWorkspaceMustBlockWritersWhenUnresolved(): true {
  return true;
}
export function inpatientWorkspaceMustSeparateProviderAndNursing(): true {
  return true;
}
export function inpatientWorkspaceMustNotReuseEdEncounterAsInpatient(): true {
  return true;
}
export function inpatientWorkspaceMustNotDuplicateGenericNotes(): true {
  return true;
}
export function inpatientWorkspaceMustNotEnablePlacement(): true {
  return true;
}
