/**
 * D4A.2.1 — Clinical hardening: SIGN validation, provenance display, structured plan helpers.
 */

import {
  isAdmissionConditionStatus,
  isServiceLevelOfCareCompatible,
  validateSmartAdmissionServiceLocCompatibility,
  type AdmissionFieldOrigin,
  type AdmissionPacketV1,
  type AdmissionProposalSourceRef,
  type StructuredInitialPlanItemV1,
} from "./smartAdmissionPacketD4a2.js";
import {
  isHospitalAdmittingService,
  isHospitalRequestedLevelOfCare,
} from "./hospitalAdmissionIntakeVocabV1.js";

export const SMART_ADMISSION_D4A21_CERTIFICATION =
  "MEDUI.SMART_ADMISSION_CLINICAL_HARDENING.D4A2_1" as const;

export type AdmissionProvenanceDisplayKey =
  | "IMPORTED_FROM_CHART"
  | "SUGGESTED_FROM_DOCUMENTED_CHART"
  | "EDITED_BY_PHYSICIAN";

export function provenanceDisplayKey(origin: AdmissionFieldOrigin): AdmissionProvenanceDisplayKey {
  switch (origin) {
    case "IMPORTED_CHART_FACT":
      return "IMPORTED_FROM_CHART";
    case "SYSTEM_PROPOSAL":
      return "SUGGESTED_FROM_DOCUMENTED_CHART";
    case "PHYSICIAN_EDITED":
    default:
      return "EDITED_BY_PHYSICIAN";
  }
}

export function sourceDisplayLabel(source: AdmissionProposalSourceRef): string {
  return String(source.label || source.sourceType || source.kind || "").trim();
}

export function sourceDisplayText(source: AdmissionProposalSourceRef): string | null {
  const text = source.displayText ?? source.excerpt ?? null;
  return text && String(text).trim() ? String(text).trim() : null;
}

export type AdmissionSignValidationInput = {
  mode: "DRAFT" | "SIGN";
  dispositionOutcome?: string | null;
  primaryDiagnosisId?: string | null;
  secondaryDiagnosisIds?: string[] | null;
  resolvedDiagnosisIds?: Set<string> | null;
  admittingServiceCode?: string | null;
  admittingServiceOtherClarification?: string | null;
  levelOfCareCode?: string | null;
  levelOfCareOtherClarification?: string | null;
  requestedUnitCode?: string | null;
  conditionStatus?: string | null;
  reasonForAdmission?: string | null;
  initialPlanNarrative?: string | null;
  structuredPlanItemCount?: number;
  responsiblePhysicianName?: string | null;
  encounterEditable?: boolean;
  actorAuthorized?: boolean;
};

export type AdmissionSignValidationResult = {
  ok: boolean;
  errors: string[];
};

export function evaluateAdmissionSignRequirements(
  input: AdmissionSignValidationInput
): AdmissionSignValidationResult {
  if (input.mode !== "SIGN") return { ok: true, errors: [] };
  const errors: string[] = [];

  if (input.encounterEditable === false) {
    errors.push("ENCOUNTER_NOT_EDITABLE");
  }
  if (input.actorAuthorized === false) {
    errors.push("ADMISSION_PROVIDER_NOT_AUTHORIZED");
  }

  const outcome = String(input.dispositionOutcome ?? "ADMISSION")
    .trim()
    .toUpperCase();
  if (outcome && outcome !== "ADMISSION" && outcome !== "OBSERVATION") {
    errors.push("ADMISSION_DISPOSITION_REQUIRED");
  }

  const primaryId = String(input.primaryDiagnosisId ?? "").trim();
  if (!primaryId) {
    errors.push("ADMISSION_PRIMARY_DIAGNOSIS_REQUIRED");
  } else if (input.resolvedDiagnosisIds && !input.resolvedDiagnosisIds.has(primaryId)) {
    errors.push("ADMISSION_DIAGNOSIS_NOT_ON_ENCOUNTER");
  }

  const secondaries = (input.secondaryDiagnosisIds ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean);
  if (primaryId && secondaries.includes(primaryId)) {
    errors.push("ADMISSION_DUPLICATE_DIAGNOSIS_SELECTION");
  }
  if (input.resolvedDiagnosisIds) {
    for (const id of secondaries) {
      if (!input.resolvedDiagnosisIds.has(id)) {
        errors.push("ADMISSION_DIAGNOSIS_NOT_ON_ENCOUNTER");
        break;
      }
    }
  }

  const service = String(input.admittingServiceCode ?? "").trim();
  if (!service) {
    errors.push("ADMITTING_SERVICE_REQUIRED");
  } else if (!isHospitalAdmittingService(service)) {
    errors.push("ADMITTING_SERVICE_INVALID");
  }

  const loc = String(input.levelOfCareCode ?? "").trim();
  if (!loc) {
    errors.push("LEVEL_OF_CARE_REQUIRED");
  } else if (!isHospitalRequestedLevelOfCare(loc)) {
    errors.push("LEVEL_OF_CARE_INVALID");
  }

  const compat = validateSmartAdmissionServiceLocCompatibility({
    admittingServiceCode: service,
    admittingServiceOtherClarification: input.admittingServiceOtherClarification,
    levelOfCareCode: loc,
    levelOfCareOtherClarification: input.levelOfCareOtherClarification,
    requestedUnitCode: input.requestedUnitCode,
  });
  for (const e of compat.errors) {
    if (!errors.includes(e)) errors.push(e);
  }
  if (service && loc && !isServiceLevelOfCareCompatible(service, loc)) {
    if (!errors.includes("INVALID_SERVICE_LEVEL_OF_CARE_COMBINATION")) {
      errors.push("INVALID_SERVICE_LEVEL_OF_CARE_COMBINATION");
    }
  }

  if (!String(input.reasonForAdmission ?? "").trim()) {
    errors.push("REASON_FOR_ADMISSION_REQUIRED");
  }

  const condition = String(input.conditionStatus ?? "").trim();
  if (!condition || !isAdmissionConditionStatus(condition)) {
    errors.push("CONDITION_ON_ADMISSION_REQUIRED");
  }

  const hasPlanNarrative = Boolean(String(input.initialPlanNarrative ?? "").trim());
  const hasPlanItems = (input.structuredPlanItemCount ?? 0) > 0;
  if (!hasPlanNarrative && !hasPlanItems) {
    errors.push("INITIAL_PLAN_REQUIRED");
  }

  if (!String(input.responsiblePhysicianName ?? "").trim()) {
    errors.push("ADMISSION_SIGNATURE_METADATA_REQUIRED");
  }

  return { ok: errors.length === 0, errors };
}

export function buildNarrativeFromStructuredPlanItems(
  items: StructuredInitialPlanItemV1[]
): string {
  const selected = items.filter((i) => i.selectedForNarrative && i.display.trim());
  return selected
    .map((item) => {
      const badge =
        item.status === "ACTIVE_ORDER"
          ? "Active order"
          : item.status === "DISCONTINUED"
            ? "Discontinued"
            : item.status === "COMPLETED"
              ? "Completed"
              : "Plan only";
      return `[${badge}] ${item.display.trim()}`;
    })
    .join("\n");
}

export function packetStructuredPlanItemCount(
  packet: AdmissionPacketV1 | null | undefined
): number {
  return packet?.structuredInitialPlan?.items?.length ?? 0;
}
