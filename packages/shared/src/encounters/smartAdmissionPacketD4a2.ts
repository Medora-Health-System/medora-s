/**
 * D4A.2 — Smart physician admission packet provenance (nested in admissionSummaryJson).
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

export type AdmissionProposalSourceRef = {
  kind: string;
  label: string;
  excerpt?: string | null;
};

export type AdmissionProvenancedFieldV1 = {
  value: string;
  origin: AdmissionFieldOrigin;
  sources: AdmissionProposalSourceRef[];
  proposedValue?: string | null;
  physicianConfirmed?: boolean;
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
  };
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return null;
}

function readProvenancedField(raw: unknown): AdmissionProvenancedFieldV1 | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;
  const value = typeof o.value === "string" ? o.value : "";
  const originRaw = typeof o.origin === "string" ? o.origin : "PHYSICIAN_EDITED";
  const origin = (ADMISSION_FIELD_ORIGINS as readonly string[]).includes(originRaw)
    ? (originRaw as AdmissionFieldOrigin)
    : "PHYSICIAN_EDITED";
  const sources: AdmissionProposalSourceRef[] = [];
  if (Array.isArray(o.sources)) {
    for (const s of o.sources) {
      const r = asRecord(s);
      if (!r || typeof r.kind !== "string" || typeof r.label !== "string") continue;
      sources.push({
        kind: r.kind,
        label: r.label,
        excerpt: typeof r.excerpt === "string" ? r.excerpt : null,
      });
    }
  }
  return {
    value,
    origin,
    sources,
    proposedValue: typeof o.proposedValue === "string" ? o.proposedValue : null,
    physicianConfirmed: o.physicianConfirmed === true,
  };
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

export function validateSmartAdmissionServiceLocCompatibility(input: {
  admittingServiceCode?: string | null;
  admittingServiceOtherClarification?: string | null;
  levelOfCareCode?: string | null;
  levelOfCareOtherClarification?: string | null;
  requestedUnitCode?: string | null;
}): SmartAdmissionCompatibilityResult {
  const errors: string[] = [];
  const service = String(input.admittingServiceCode ?? "").trim().toUpperCase();
  const loc = String(input.levelOfCareCode ?? "").trim().toUpperCase();
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
  if (service === "CRITICAL_CARE" && loc && loc !== "INTENSIVE_CARE" && loc !== "STEPDOWN") {
    errors.push("SERVICE_LOC_INCOMPATIBLE");
  }
  if (service === "PEDIATRICS" && loc === "LABOR_AND_DELIVERY") {
    errors.push("SERVICE_LOC_INCOMPATIBLE");
  }
  if (service === "OBSTETRICS" && loc === "BEHAVIORAL_HEALTH") {
    errors.push("SERVICE_LOC_INCOMPATIBLE");
  }
  return { ok: errors.length === 0, errors };
}

export function markFieldPhysicianEdited(
  prior: AdmissionProvenancedFieldV1 | undefined,
  value: string
): AdmissionProvenancedFieldV1 {
  const v = value.trim();
  const proposed = prior?.proposedValue ?? prior?.value ?? null;
  const sameAsProposal = proposed != null && proposed.trim() === v;
  return {
    value: v,
    origin: sameAsProposal && prior?.origin === "SYSTEM_PROPOSAL" ? "SYSTEM_PROPOSAL" : "PHYSICIAN_EDITED",
    sources: prior?.sources ?? [],
    proposedValue: proposed,
    physicianConfirmed: true,
  };
}
