/**
 * D4A.2 / D4A.2.1 — Smart physician admission packet provenance (nested in admissionSummaryJson).
 * No migration: OPTION A JSON on Encounter.admissionSummaryJson.admissionPacketV1.
 */

import {
  HOSPITAL_ADMITTING_SERVICES,
  HOSPITAL_REQUESTED_LEVELS_OF_CARE,
  isHospitalAdmittingService,
  isHospitalRequestedLevelOfCare,
  isLevelOfCareCompatibleWithUnit,
  type HospitalAdmittingService,
  type HospitalRequestedLevelOfCare,
} from "./hospitalAdmissionIntakeVocabV1.js";
import { asAdmissionSummaryRecord } from "./admissionSummaryMerge.js";

export const ADMISSION_PACKET_V1_KEY = "admissionPacketV1" as const;
export const SMART_ADMISSION_D4A2_CERTIFICATION =
  "MEDUI.SMART_ADMISSION_ADAPTIVE_NURSING.D4A2" as const;

/** How a final field value was produced. */
export const ADMISSION_FIELD_ORIGINS = [
  "IMPORTED_CHART_FACT",
  "SYSTEM_PROPOSAL",
  "PHYSICIAN_EDITED",
] as const;
export type AdmissionFieldOrigin = (typeof ADMISSION_FIELD_ORIGINS)[number];

export const ADMISSION_PROPOSAL_METHODS = ["RULE_BASED", "AI_ASSISTED"] as const;
export type AdmissionProposalMethod = (typeof ADMISSION_PROPOSAL_METHODS)[number];

export const ADMISSION_CONDITION_STATUSES = [
  "STABLE",
  "GUARDED",
  "SERIOUS",
  "CRITICAL",
  "IMPROVED",
  "UNCHANGED",
  "OTHER",
] as const;
export type AdmissionConditionStatus = (typeof ADMISSION_CONDITION_STATUSES)[number];

export function isAdmissionConditionStatus(raw: unknown): raw is AdmissionConditionStatus {
  return (
    typeof raw === "string" &&
    (ADMISSION_CONDITION_STATUSES as readonly string[]).includes(raw.trim().toUpperCase())
  );
}

/**
 * Documented chart fact reference for a proposal.
 * Prefer stable sourceId + safe label; do not embed full clinical records.
 * `kind` retained for D4A.2 backward compatibility (= sourceType).
 */
export type AdmissionProposalSourceRef = {
  /** @deprecated Prefer sourceType; kept for D4A.2 packets. */
  kind: string;
  sourceType: string;
  sourceId?: string | null;
  label: string;
  displayText?: string | null;
  /** Alias of displayText for D4A.2 readers. */
  excerpt?: string | null;
  recordedAt?: string | null;
};

export type AdmissionProvenancedFieldV1 = {
  value: string;
  provenance?: AdmissionFieldOrigin;
  /** Canonical origin (D4A.2); mirrored to provenance for D4A.2.1. */
  origin: AdmissionFieldOrigin;
  proposalMethod?: AdmissionProposalMethod | null;
  sources: AdmissionProposalSourceRef[];
  proposedValue?: string | null;
  physicianConfirmed?: boolean;
  physicianAcceptedAt?: string | null;
  generatedAt?: string | null;
  lastEditedAt?: string | null;
  lastEditedBy?: string | null;
  /** Prior physician text when an updated proposal is reviewed/replaced. */
  priorPhysicianValue?: string | null;
};

export const INITIAL_PLAN_ITEM_CATEGORIES = [
  "DIET",
  "IV_FLUID",
  "MEDICATION",
  "MONITORING",
  "LAB",
  "IMAGING",
  "CONSULT",
  "PROCEDURE",
  "PRECAUTION",
  "OTHER",
] as const;
export type InitialPlanItemCategory = (typeof INITIAL_PLAN_ITEM_CATEGORIES)[number];

export const INITIAL_PLAN_ITEM_SOURCE_TYPES = [
  "ACTIVE_ORDER",
  "CONSULT_RECOMMENDATION",
  "PROVIDER_PLAN",
  "SYSTEM_PROPOSAL",
] as const;
export type InitialPlanItemSourceType = (typeof INITIAL_PLAN_ITEM_SOURCE_TYPES)[number];

export const INITIAL_PLAN_ITEM_STATUSES = [
  "ACTIVE_ORDER",
  "PLANNED",
  "DISCONTINUED",
  "COMPLETED",
] as const;
export type InitialPlanItemStatus = (typeof INITIAL_PLAN_ITEM_STATUSES)[number];

export type StructuredInitialPlanItemV1 = {
  id: string;
  category: InitialPlanItemCategory;
  sourceType: InitialPlanItemSourceType;
  sourceId?: string | null;
  display: string;
  status: InitialPlanItemStatus;
  selectedForNarrative: boolean;
};

export type StructuredInitialPlanV1 = {
  items: StructuredInitialPlanItemV1[];
};

export type AdmissionPacketV1 = {
  version: 1;
  certification: typeof SMART_ADMISSION_D4A2_CERTIFICATION;
  admittingServiceCode?: HospitalAdmittingService | null;
  admittingServiceOtherClarification?: string | null;
  levelOfCareCode?: HospitalRequestedLevelOfCare | null;
  levelOfCareOtherClarification?: string | null;
  requestedUnitCode?: string | null;
  conditionStatus?: AdmissionConditionStatus | null;
  fields: {
    admissionReason?: AdmissionProvenancedFieldV1;
    serviceUnit?: AdmissionProvenancedFieldV1;
    careLevel?: AdmissionProvenancedFieldV1;
    conditionAtAdmission?: AdmissionProvenancedFieldV1;
    initialPlan?: AdmissionProvenancedFieldV1;
  };
  /** D4A.2.1 structured plan items (narrative remains in fields.initialPlan). */
  structuredInitialPlan?: StructuredInitialPlanV1 | null;
};

export function emptyAdmissionPacketV1(): AdmissionPacketV1 {
  return {
    version: 1,
    certification: SMART_ADMISSION_D4A2_CERTIFICATION,
    admittingServiceCode: null,
    admittingServiceOtherClarification: null,
    levelOfCareCode: null,
    levelOfCareOtherClarification: null,
    requestedUnitCode: null,
    conditionStatus: null,
    fields: {},
    structuredInitialPlan: { items: [] },
  };
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return null;
}

function readSourceRef(raw: unknown): AdmissionProposalSourceRef | null {
  const r = asRecord(raw);
  if (!r) return null;
  const label = typeof r.label === "string" ? r.label : "";
  const sourceType =
    typeof r.sourceType === "string"
      ? r.sourceType
      : typeof r.kind === "string"
        ? r.kind
        : "";
  const kind = typeof r.kind === "string" ? r.kind : sourceType;
  if (!label.trim() && !sourceType.trim()) return null;
  const displayText =
    typeof r.displayText === "string"
      ? r.displayText
      : typeof r.excerpt === "string"
        ? r.excerpt
        : null;
  return {
    kind: kind || sourceType || "UNKNOWN",
    sourceType: sourceType || kind || "UNKNOWN",
    sourceId: typeof r.sourceId === "string" ? r.sourceId : null,
    label: label || sourceType || kind,
    displayText,
    excerpt: displayText,
    recordedAt: typeof r.recordedAt === "string" ? r.recordedAt : null,
  };
}

function readProvenancedField(raw: unknown): AdmissionProvenancedFieldV1 | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;
  const value = typeof o.value === "string" ? o.value : "";
  const originRaw =
    typeof o.origin === "string"
      ? o.origin
      : typeof o.provenance === "string"
        ? o.provenance
        : "PHYSICIAN_EDITED";
  const origin = (ADMISSION_FIELD_ORIGINS as readonly string[]).includes(originRaw)
    ? (originRaw as AdmissionFieldOrigin)
    : "PHYSICIAN_EDITED";
  const sources: AdmissionProposalSourceRef[] = [];
  if (Array.isArray(o.sources)) {
    for (const s of o.sources) {
      const ref = readSourceRef(s);
      if (ref) sources.push(ref);
    }
  }
  const methodRaw = typeof o.proposalMethod === "string" ? o.proposalMethod : null;
  const proposalMethod =
    methodRaw && (ADMISSION_PROPOSAL_METHODS as readonly string[]).includes(methodRaw)
      ? (methodRaw as AdmissionProposalMethod)
      : origin === "SYSTEM_PROPOSAL"
        ? "RULE_BASED"
        : null;
  return {
    value,
    origin,
    provenance: origin,
    proposalMethod,
    sources,
    proposedValue: typeof o.proposedValue === "string" ? o.proposedValue : null,
    physicianConfirmed: o.physicianConfirmed === true,
    physicianAcceptedAt: typeof o.physicianAcceptedAt === "string" ? o.physicianAcceptedAt : null,
    generatedAt: typeof o.generatedAt === "string" ? o.generatedAt : null,
    lastEditedAt: typeof o.lastEditedAt === "string" ? o.lastEditedAt : null,
    lastEditedBy: typeof o.lastEditedBy === "string" ? o.lastEditedBy : null,
    priorPhysicianValue: typeof o.priorPhysicianValue === "string" ? o.priorPhysicianValue : null,
  };
}

function readStructuredPlan(raw: unknown): StructuredInitialPlanV1 | null {
  const o = asRecord(raw);
  if (!o) return null;
  const items: StructuredInitialPlanItemV1[] = [];
  if (Array.isArray(o.items)) {
    for (const row of o.items) {
      const r = asRecord(row);
      if (!r) continue;
      const id = typeof r.id === "string" ? r.id : "";
      const display = typeof r.display === "string" ? r.display.trim() : "";
      const category = String(r.category ?? "").toUpperCase();
      const sourceType = String(r.sourceType ?? "").toUpperCase();
      const status = String(r.status ?? "").toUpperCase();
      if (!id || !display) continue;
      if (!(INITIAL_PLAN_ITEM_CATEGORIES as readonly string[]).includes(category)) continue;
      if (!(INITIAL_PLAN_ITEM_SOURCE_TYPES as readonly string[]).includes(sourceType)) continue;
      if (!(INITIAL_PLAN_ITEM_STATUSES as readonly string[]).includes(status)) continue;
      items.push({
        id,
        category: category as InitialPlanItemCategory,
        sourceType: sourceType as InitialPlanItemSourceType,
        sourceId: typeof r.sourceId === "string" ? r.sourceId : null,
        display,
        status: status as InitialPlanItemStatus,
        selectedForNarrative: r.selectedForNarrative !== false,
      });
    }
  }
  return { items };
}

export function readAdmissionPacketV1(admissionSummaryJson: unknown): AdmissionPacketV1 {
  const root = asAdmissionSummaryRecord(admissionSummaryJson);
  const raw = asRecord(root[ADMISSION_PACKET_V1_KEY]);
  const base = emptyAdmissionPacketV1();
  if (!raw) return base;
  const fieldsRaw = asRecord(raw.fields) ?? {};
  const service =
    typeof raw.admittingServiceCode === "string" && isHospitalAdmittingService(raw.admittingServiceCode)
      ? (raw.admittingServiceCode.trim().toUpperCase() as HospitalAdmittingService)
      : null;
  const loc =
    typeof raw.levelOfCareCode === "string" && isHospitalRequestedLevelOfCare(raw.levelOfCareCode)
      ? (raw.levelOfCareCode.trim().toUpperCase() as HospitalRequestedLevelOfCare)
      : null;
  const condition =
    typeof raw.conditionStatus === "string" && isAdmissionConditionStatus(raw.conditionStatus)
      ? (raw.conditionStatus.trim().toUpperCase() as AdmissionConditionStatus)
      : null;
  return {
    version: 1,
    certification: SMART_ADMISSION_D4A2_CERTIFICATION,
    admittingServiceCode: service,
    admittingServiceOtherClarification:
      typeof raw.admittingServiceOtherClarification === "string"
        ? raw.admittingServiceOtherClarification
        : null,
    levelOfCareCode: loc,
    levelOfCareOtherClarification:
      typeof raw.levelOfCareOtherClarification === "string"
        ? raw.levelOfCareOtherClarification
        : null,
    requestedUnitCode:
      typeof raw.requestedUnitCode === "string" ? raw.requestedUnitCode.trim() || null : null,
    conditionStatus: condition,
    fields: {
      admissionReason: readProvenancedField(fieldsRaw.admissionReason),
      serviceUnit: readProvenancedField(fieldsRaw.serviceUnit),
      careLevel: readProvenancedField(fieldsRaw.careLevel),
      conditionAtAdmission: readProvenancedField(fieldsRaw.conditionAtAdmission),
      initialPlan: readProvenancedField(fieldsRaw.initialPlan),
    },
    structuredInitialPlan: readStructuredPlan(raw.structuredInitialPlan) ?? { items: [] },
  };
}

export function mergeAdmissionPacketV1IntoSummary(
  prior: unknown,
  packet: AdmissionPacketV1
): Record<string, unknown> {
  const next = asAdmissionSummaryRecord(prior);
  next[ADMISSION_PACKET_V1_KEY] = packet;
  return next;
}

/** ED admission LOC picker — enterprise codes (subset order for UI). */
export const ED_ADMISSION_LEVEL_OF_CARE_OPTIONS: readonly HospitalRequestedLevelOfCare[] = [
  "OBSERVATION",
  "MEDICAL_SURGICAL",
  "TELEMETRY",
  "STEPDOWN",
  "INTERMEDIATE_CARE",
  "INTENSIVE_CARE",
  "PEDIATRIC_ACUTE_CARE",
  "LABOR_AND_DELIVERY",
  "BEHAVIORAL_HEALTH",
  "OTHER",
];

export { HOSPITAL_ADMITTING_SERVICES, HOSPITAL_REQUESTED_LEVELS_OF_CARE };

export type SmartAdmissionCompatibilityResult = {
  ok: boolean;
  errors: string[];
};

/**
 * Service ↔ LOC matrix (enterprise). Incomplete drafts (missing service or LOC) are not blocked here.
 */
export const SERVICE_LEVEL_OF_CARE_COMPATIBILITY: Record<
  HospitalAdmittingService,
  readonly HospitalRequestedLevelOfCare[]
> = {
  HOSPITAL_MEDICINE: [
    "OBSERVATION",
    "MEDICAL_SURGICAL",
    "TELEMETRY",
    "STEPDOWN",
    "INTERMEDIATE_CARE",
    "INTENSIVE_CARE",
    "OTHER",
  ],
  INTERNAL_MEDICINE: [
    "OBSERVATION",
    "MEDICAL_SURGICAL",
    "TELEMETRY",
    "STEPDOWN",
    "INTERMEDIATE_CARE",
    "INTENSIVE_CARE",
    "OTHER",
  ],
  FAMILY_MEDICINE: [
    "OBSERVATION",
    "MEDICAL_SURGICAL",
    "TELEMETRY",
    "STEPDOWN",
    "INTERMEDIATE_CARE",
    "OTHER",
  ],
  GENERAL_SURGERY: [
    "MEDICAL_SURGICAL",
    "TELEMETRY",
    "STEPDOWN",
    "INTERMEDIATE_CARE",
    "INTENSIVE_CARE",
    "POSTOPERATIVE",
    "OTHER",
  ],
  ORTHOPEDIC_SURGERY: [
    "MEDICAL_SURGICAL",
    "TELEMETRY",
    "STEPDOWN",
    "POSTOPERATIVE",
    "INTENSIVE_CARE",
    "OTHER",
  ],
  CARDIOLOGY: ["OBSERVATION", "TELEMETRY", "STEPDOWN", "INTENSIVE_CARE", "MEDICAL_SURGICAL", "OTHER"],
  PULMONOLOGY: [
    "OBSERVATION",
    "MEDICAL_SURGICAL",
    "TELEMETRY",
    "STEPDOWN",
    "INTENSIVE_CARE",
    "OTHER",
  ],
  NEUROLOGY: [
    "OBSERVATION",
    "MEDICAL_SURGICAL",
    "TELEMETRY",
    "STEPDOWN",
    "INTENSIVE_CARE",
    "OTHER",
  ],
  NEPHROLOGY: ["MEDICAL_SURGICAL", "TELEMETRY", "STEPDOWN", "INTENSIVE_CARE", "OTHER"],
  GASTROENTEROLOGY: [
    "OBSERVATION",
    "MEDICAL_SURGICAL",
    "TELEMETRY",
    "STEPDOWN",
    "INTENSIVE_CARE",
    "OTHER",
  ],
  PEDIATRICS: ["PEDIATRIC_ACUTE_CARE", "OBSERVATION", "MEDICAL_SURGICAL", "INTENSIVE_CARE", "OTHER"],
  OBSTETRICS: ["LABOR_AND_DELIVERY", "POSTPARTUM", "OBSERVATION", "INTENSIVE_CARE", "OTHER"],
  CRITICAL_CARE: ["INTENSIVE_CARE", "STEPDOWN", "OTHER"],
  OTHER: [
    "OBSERVATION",
    "MEDICAL_SURGICAL",
    "TELEMETRY",
    "STEPDOWN",
    "INTERMEDIATE_CARE",
    "INTENSIVE_CARE",
    "PEDIATRIC_ACUTE_CARE",
    "LABOR_AND_DELIVERY",
    "BEHAVIORAL_HEALTH",
    "OTHER",
  ],
};

export function isServiceLevelOfCareCompatible(
  service: string | null | undefined,
  level: string | null | undefined
): boolean {
  const s = String(service ?? "")
    .trim()
    .toUpperCase();
  const loc = String(level ?? "")
    .trim()
    .toUpperCase();
  if (!s || !loc) return true;
  if (!isHospitalAdmittingService(s) || !isHospitalRequestedLevelOfCare(loc)) return false;
  return (SERVICE_LEVEL_OF_CARE_COMPATIBILITY[s] as readonly string[]).includes(loc);
}

export function validateSmartAdmissionServiceLocCompatibility(input: {
  admittingServiceCode?: string | null;
  admittingServiceOtherClarification?: string | null;
  levelOfCareCode?: string | null;
  levelOfCareOtherClarification?: string | null;
  requestedUnitCode?: string | null;
}): SmartAdmissionCompatibilityResult {
  const errors: string[] = [];
  const service = String(input.admittingServiceCode ?? "")
    .trim()
    .toUpperCase();
  const loc = String(input.levelOfCareCode ?? "")
    .trim()
    .toUpperCase();
  if (service && !isHospitalAdmittingService(service)) {
    errors.push("ADMITTING_SERVICE_INVALID");
  }
  if (service === "OTHER" && !String(input.admittingServiceOtherClarification ?? "").trim()) {
    errors.push("ADMITTING_SERVICE_OTHER_CLARIFICATION_REQUIRED");
  }
  if (loc && !isHospitalRequestedLevelOfCare(loc)) {
    errors.push("LEVEL_OF_CARE_INVALID");
  }
  if (loc === "OTHER" && !String(input.levelOfCareOtherClarification ?? "").trim()) {
    errors.push("LEVEL_OF_CARE_OTHER_CLARIFICATION_REQUIRED");
  }
  if (
    loc &&
    input.requestedUnitCode &&
    !isLevelOfCareCompatibleWithUnit(loc, input.requestedUnitCode)
  ) {
    errors.push("LEVEL_OF_CARE_UNIT_INCOMPATIBLE");
  }
  if (service && loc && !isServiceLevelOfCareCompatible(service, loc)) {
    errors.push("INVALID_SERVICE_LEVEL_OF_CARE_COMBINATION");
    errors.push("SERVICE_LOC_INCOMPATIBLE");
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Physician edits → PHYSICIAN_EDITED.
 * Accepting an unchanged SYSTEM_PROPOSAL keeps SYSTEM_PROPOSAL + acceptance metadata.
 */
export function markFieldPhysicianEdited(
  prior: AdmissionProvenancedFieldV1 | undefined,
  value: string,
  meta?: { editedBy?: string | null; editedAt?: string | null }
): AdmissionProvenancedFieldV1 {
  const v = value.trim();
  const proposed = prior?.proposedValue ?? (prior?.origin === "SYSTEM_PROPOSAL" ? prior.value : null);
  const sameAsProposal = proposed != null && proposed.trim() === v;
  if (sameAsProposal && prior?.origin === "SYSTEM_PROPOSAL") {
    return {
      ...prior,
      value: v,
      origin: "SYSTEM_PROPOSAL",
      provenance: "SYSTEM_PROPOSAL",
      sources: prior.sources ?? [],
      proposedValue: proposed,
      proposalMethod: prior.proposalMethod ?? "RULE_BASED",
      physicianConfirmed: true,
      physicianAcceptedAt: meta?.editedAt ?? prior.physicianAcceptedAt ?? new Date().toISOString(),
      lastEditedAt: meta?.editedAt ?? prior.lastEditedAt ?? null,
      lastEditedBy: meta?.editedBy ?? prior.lastEditedBy ?? null,
    };
  }
  return {
    value: v,
    origin: "PHYSICIAN_EDITED",
    provenance: "PHYSICIAN_EDITED",
    sources: prior?.sources ?? [],
    proposedValue: proposed,
    proposalMethod: prior?.proposalMethod ?? null,
    physicianConfirmed: true,
    generatedAt: prior?.generatedAt ?? null,
    lastEditedAt: meta?.editedAt ?? new Date().toISOString(),
    lastEditedBy: meta?.editedBy ?? null,
    physicianAcceptedAt: prior?.physicianAcceptedAt ?? null,
    priorPhysicianValue:
      prior?.origin === "PHYSICIAN_EDITED" ? prior.value : prior?.priorPhysicianValue,
  };
}

/** Never overwrite PHYSICIAN_EDITED on automatic proposal refresh. */
export function mergeProposalFieldWithoutOverwrite(
  current: AdmissionProvenancedFieldV1 | undefined,
  proposal: AdmissionProvenancedFieldV1 | undefined
): {
  field: AdmissionProvenancedFieldV1 | undefined;
  newerProposalAvailable: boolean;
} {
  if (!proposal) return { field: current, newerProposalAvailable: false };
  if (!current) return { field: proposal, newerProposalAvailable: false };
  if (current.origin === "PHYSICIAN_EDITED") {
    const fresh = String(proposal.proposedValue ?? proposal.value ?? "").trim();
    const priorProposed = String(current.proposedValue ?? "").trim();
    const newer = Boolean(fresh) && fresh !== priorProposed && fresh !== current.value.trim();
    return {
      field: {
        ...current,
        proposedValue: newer ? fresh : current.proposedValue,
      },
      newerProposalAvailable: newer,
    };
  }
  return { field: proposal, newerProposalAvailable: false };
}

export function replaceFieldWithUpdatedProposal(
  current: AdmissionProvenancedFieldV1 | undefined,
  freshProposal: AdmissionProvenancedFieldV1
): AdmissionProvenancedFieldV1 {
  const v = String(freshProposal.proposedValue ?? freshProposal.value ?? "").trim();
  return {
    value: v,
    origin: "SYSTEM_PROPOSAL",
    provenance: "SYSTEM_PROPOSAL",
    sources: freshProposal.sources ?? [],
    proposedValue: v,
    proposalMethod: freshProposal.proposalMethod ?? "RULE_BASED",
    physicianConfirmed: false,
    generatedAt: freshProposal.generatedAt ?? new Date().toISOString(),
    lastEditedAt: null,
    lastEditedBy: null,
    physicianAcceptedAt: null,
    priorPhysicianValue:
      current?.origin === "PHYSICIAN_EDITED" ? current.value : current?.priorPhysicianValue,
  };
}
