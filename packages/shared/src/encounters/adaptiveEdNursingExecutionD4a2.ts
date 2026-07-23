/**
 * D4A.2 / D4A.2.1 — Disposition-specific ED nursing execution under nursingAssessment.
 * Storage key: erAdaptiveNursingExecutionV1 (sibling of erDispositionExecutionV1).
 */

export const ER_ADAPTIVE_NURSING_EXECUTION_V1_KEY = "erAdaptiveNursingExecutionV1" as const;

export type AdaptiveNursingPathway =
  | "HOME"
  | "ADMISSION"
  | "OBSERVATION"
  | "TRANSFER"
  | "AMA"
  | "LWBS"
  | "ELOPEMENT"
  | "OTHER";

export const ADMISSION_NURSING_SECTION_IDS = [
  "receivingUnit",
  "assignedBed",
  "receivingNurse",
  "handoff",
  "admissionOrderAck",
  "ivAccess",
  "oxygen",
  "infusions",
  "fallRisk",
  "skinWounds",
  "belongingsValuables",
  "transportMethod",
  "conditionLeavingEd",
  "edDepartureAt",
] as const;

export const TRANSFER_NURSING_SECTION_IDS = [
  "acceptingFacility",
  "acceptingPhysician",
  "emtala",
  "mseStatus",
  "stabilization",
  "risksBenefits",
  "consent",
  "transport",
  "documentationSent",
  "handoff",
  "departureTime",
  "departureCondition",
] as const;

export const AMA_NURSING_SECTION_IDS = [
  "decisionMakingCapacity",
  "risksExplained",
  "alternatives",
  "providerNotification",
  "refusal",
  "signatureOrRefusalToSign",
  "returnPrecautions",
  "departureTime",
] as const;

export const LWBS_ELOPEMENT_NURSING_SECTION_IDS = [
  "pathwayClassification",
  "lastKnownStatus",
  "attemptsToLocate",
  "notifications",
  "departureTime",
] as const;

export const HOME_NURSING_SECTION_IDS = [
  "dischargeVitals",
  "painReassessment",
  "ivAccessDisposition",
  "instructionsReviewed",
  "followUp",
  "returnPrecautions",
  "transportation",
  "belongings",
  "understanding",
] as const;

export type AdaptiveNursingSectionValues = Record<string, string | boolean | null | undefined>;

export type AdaptiveEdNursingExecutionV1 = {
  version: 1;
  pathway: AdaptiveNursingPathway;
  sections: AdaptiveNursingSectionValues;
  completedAt?: string | null;
  completedByDisplayName?: string | null;
  /** Client/server revision for stale-write detection (optional). */
  revision?: number | null;
};

export function emptyAdaptiveEdNursingExecution(
  pathway: AdaptiveNursingPathway
): AdaptiveEdNursingExecutionV1 {
  return {
    version: 1,
    pathway,
    sections: {},
    completedAt: null,
    completedByDisplayName: null,
    revision: 0,
  };
}

export function nursingSectionsForPathway(pathway: AdaptiveNursingPathway): readonly string[] {
  switch (pathway) {
    case "ADMISSION":
    case "OBSERVATION":
      return ADMISSION_NURSING_SECTION_IDS;
    case "TRANSFER":
      return TRANSFER_NURSING_SECTION_IDS;
    case "AMA":
      return AMA_NURSING_SECTION_IDS;
    case "LWBS":
    case "ELOPEMENT":
      return LWBS_ELOPEMENT_NURSING_SECTION_IDS;
    case "HOME":
      return HOME_NURSING_SECTION_IDS;
    case "OTHER":
    default:
      return [];
  }
}

/** HOME nursing UI must not mount for these pathways. */
export function isHomeNursingForbiddenForPathway(pathway: AdaptiveNursingPathway): boolean {
  return (
    pathway === "ADMISSION" ||
    pathway === "OBSERVATION" ||
    pathway === "TRANSFER" ||
    pathway === "AMA" ||
    pathway === "LWBS" ||
    pathway === "ELOPEMENT"
  );
}

export function pathwayFromDispositionOutcomeUi(
  outcome: string | null | undefined
): AdaptiveNursingPathway {
  const o = String(outcome ?? "").trim().toUpperCase();
  if (o === "HOME") return "HOME";
  if (o === "ADMISSION") return "ADMISSION";
  if (o === "TRANSFER") return "TRANSFER";
  if (o === "AMA") return "AMA";
  if (o === "LWBS") return "LWBS";
  if (o === "ELOPEMENT") return "ELOPEMENT";
  if (o === "OTHER" || o === "DECEASED") return "OTHER";
  return "HOME";
}

export function pathwayFromDispositionBadgeVariant(
  variant: string | null | undefined
): AdaptiveNursingPathway {
  switch (String(variant ?? "").trim().toLowerCase()) {
    case "discharge":
      return "HOME";
    case "admit":
      return "ADMISSION";
    case "observe":
      return "OBSERVATION";
    case "transfer":
      return "TRANSFER";
    case "ama":
      return "AMA";
    case "lwbs":
      return "LWBS";
    case "elopement":
      return "ELOPEMENT";
    default:
      return "HOME";
  }
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return null;
}

export function readAdaptiveEdNursingExecution(
  nursingAssessment: unknown
): AdaptiveEdNursingExecutionV1 | null {
  const root = asRecord(nursingAssessment);
  if (!root) return null;
  const raw = asRecord(root[ER_ADAPTIVE_NURSING_EXECUTION_V1_KEY]);
  if (!raw) return null;
  const pathwayRaw = String(raw.pathway ?? "HOME").toUpperCase();
  const pathway = (
    [
      "HOME",
      "ADMISSION",
      "OBSERVATION",
      "TRANSFER",
      "AMA",
      "LWBS",
      "ELOPEMENT",
      "OTHER",
    ] as const
  ).includes(pathwayRaw as AdaptiveNursingPathway)
    ? (pathwayRaw as AdaptiveNursingPathway)
    : pathwayFromDispositionOutcomeUi(pathwayRaw);
  const sectionsRaw = asRecord(raw.sections) ?? {};
  const sections: AdaptiveNursingSectionValues = {};
  for (const [k, v] of Object.entries(sectionsRaw)) {
    if (typeof v === "string" || typeof v === "boolean" || v == null) sections[k] = v;
  }
  return {
    version: 1,
    pathway,
    sections,
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : null,
    completedByDisplayName:
      typeof raw.completedByDisplayName === "string" ? raw.completedByDisplayName : null,
    revision: typeof raw.revision === "number" ? raw.revision : 0,
  };
}

export function mergeAdaptiveEdNursingIntoNursingAssessment(
  previous: unknown,
  next: AdaptiveEdNursingExecutionV1
): Record<string, unknown> {
  const base = asRecord(previous) ? { ...(previous as Record<string, unknown>) } : {};
  base[ER_ADAPTIVE_NURSING_EXECUTION_V1_KEY] = next;
  return base;
}

export type AdaptiveNursingSafetyResult = {
  ok: boolean;
  errors: string[];
};

function pathwaysCompatible(
  physician: AdaptiveNursingPathway,
  nursing: AdaptiveNursingPathway
): boolean {
  if (physician === "OTHER" || nursing === "OTHER") return true;
  if (physician === nursing) return true;
  if (
    (physician === "ADMISSION" || physician === "OBSERVATION") &&
    (nursing === "ADMISSION" || nursing === "OBSERVATION")
  ) {
    return true;
  }
  return false;
}

/** Contradictory-state guards for nursing vs physician disposition. */
export function validateAdaptiveNursingAgainstDisposition(input: {
  physicianPathway: AdaptiveNursingPathway;
  nursingPathway: AdaptiveNursingPathway;
  admissionDecisionSigned: boolean;
  acceptingFacility?: string | null;
  homeNursingPresent?: boolean;
}): AdaptiveNursingSafetyResult {
  const errors: string[] = [];
  if (input.homeNursingPresent && isHomeNursingForbiddenForPathway(input.physicianPathway)) {
    errors.push("HOME_NURSING_WITH_NON_HOME_DISPOSITION");
  }
  if (
    (input.nursingPathway === "ADMISSION" || input.nursingPathway === "OBSERVATION") &&
    !input.admissionDecisionSigned
  ) {
    errors.push("ADMISSION_NURSING_WITHOUT_SIGNED_DECISION");
  }
  if (input.nursingPathway === "TRANSFER" && !String(input.acceptingFacility ?? "").trim()) {
    errors.push("TRANSFER_WITHOUT_ACCEPTING_FACILITY");
  }
  if (input.nursingPathway === "TRANSFER" && input.physicianPathway === "AMA") {
    errors.push("TRANSFER_UNDER_AMA_DECISION");
  }
  if (!pathwaysCompatible(input.physicianPathway, input.nursingPathway)) {
    errors.push("NURSING_PATHWAY_MISMATCH");
  }
  return { ok: errors.length === 0, errors };
}

/** Required field keys by pathway for departure/completion. */
export function requiredCompletionFieldsForPathway(
  pathway: AdaptiveNursingPathway
): readonly string[] {
  switch (pathway) {
    case "HOME":
      return [
        "dischargeVitals",
        "ivAccessDisposition",
        "instructionsReviewed",
        "followUp",
        "returnPrecautions",
        "transportation",
        "belongings",
        "understanding",
      ];
    case "ADMISSION":
    case "OBSERVATION":
      return [
        "receivingUnit",
        "receivingNurse",
        "handoff",
        "ivAccess",
        "oxygen",
        "infusions",
        "fallRisk",
        "skinWounds",
        "belongingsValuables",
        "transportMethod",
        "conditionLeavingEd",
        "edDepartureAt",
      ];
    case "TRANSFER":
      return [
        "acceptingFacility",
        "acceptingPhysician",
        "emtala",
        "mseStatus",
        "stabilization",
        "risksBenefits",
        "consent",
        "transport",
        "documentationSent",
        "handoff",
        "departureCondition",
        "departureTime",
      ];
    case "AMA":
      return [
        "decisionMakingCapacity",
        "risksExplained",
        "alternatives",
        "providerNotification",
        "refusal",
        "signatureOrRefusalToSign",
        "returnPrecautions",
        "departureTime",
      ];
    case "LWBS":
    case "ELOPEMENT":
      return ["pathwayClassification", "lastKnownStatus", "attemptsToLocate", "notifications", "departureTime"];
    default:
      return [];
  }
}

export type NursingCompletionItemStatus =
  | "COMPLETE"
  | "INCOMPLETE"
  | "NOT_APPLICABLE"
  | "UNABLE_TO_VERIFY"
  | "REQUIRED_BEFORE_DEPARTURE";

export type NursingCompletionItem = {
  fieldId: string;
  status: NursingCompletionItemStatus;
  required: boolean;
};

export type NursingCompletionEvaluation = {
  ok: boolean;
  complete: boolean;
  missingCodes: string[];
  items: NursingCompletionItem[];
  errors: string[];
};

function fieldFilled(sections: AdaptiveNursingSectionValues, key: string): boolean {
  const v = sections[key];
  if (typeof v === "boolean") return v;
  return String(v ?? "").trim().length > 0;
}

/**
 * Shared completion contract evaluator (client + server).
 * Draft saves may be incomplete; completion/departure must pass.
 */
export function evaluateAdaptiveNursingCompletion(input: {
  pathway: AdaptiveNursingPathway;
  sections: AdaptiveNursingSectionValues;
  physicianPathway: AdaptiveNursingPathway;
  admissionDecisionSigned: boolean;
  completing: boolean;
}): NursingCompletionEvaluation {
  const safety = validateAdaptiveNursingAgainstDisposition({
    physicianPathway: input.physicianPathway,
    nursingPathway: input.pathway,
    admissionDecisionSigned: input.admissionDecisionSigned,
    acceptingFacility: String(input.sections.acceptingFacility ?? ""),
    homeNursingPresent: input.pathway === "HOME",
  });

  const required = requiredCompletionFieldsForPathway(input.pathway);
  const items: NursingCompletionItem[] = [];
  const missingCodes: string[] = [];

  for (const fieldId of nursingSectionsForPathway(input.pathway)) {
    const isRequired = (required as readonly string[]).includes(fieldId);
    const filled = fieldFilled(input.sections, fieldId);
    let status: NursingCompletionItemStatus;
    if (filled) status = "COMPLETE";
    else if (isRequired) status = input.completing ? "REQUIRED_BEFORE_DEPARTURE" : "INCOMPLETE";
    else status = "INCOMPLETE";
    items.push({ fieldId, status, required: isRequired });
    if (isRequired && !filled && input.completing) {
      missingCodes.push(`NURSING_MISSING_${fieldId}`);
    }
  }

  const errors = [...safety.errors];
  if (input.completing && missingCodes.length > 0) {
    errors.push("NURSING_COMPLETION_INCOMPLETE");
  }

  const complete =
    safety.ok &&
    required.every((k) => fieldFilled(input.sections, k)) &&
    Boolean(input.sections) &&
    (input.pathway !== "ADMISSION" && input.pathway !== "OBSERVATION"
      ? true
      : input.admissionDecisionSigned);

  return {
    ok: input.completing ? safety.ok && missingCodes.length === 0 : safety.ok,
    complete,
    missingCodes,
    items,
    errors: [...new Set(errors)],
  };
}

/** Departure completion requirements for admission/observation pathway. */
export function admissionNursingDepartureRequirementsMet(
  sections: AdaptiveNursingSectionValues
): boolean {
  return evaluateAdaptiveNursingCompletion({
    pathway: "ADMISSION",
    sections,
    physicianPathway: "ADMISSION",
    admissionDecisionSigned: true,
    completing: true,
  }).ok;
}

/** True when adaptive nursing packet marks governed departure complete. */
export function adaptiveNursingDepartureSatisfied(nursingAssessment: unknown): boolean {
  const exec = readAdaptiveEdNursingExecution(nursingAssessment);
  if (!exec?.completedAt) return false;
  const evalResult = evaluateAdaptiveNursingCompletion({
    pathway: exec.pathway,
    sections: exec.sections,
    physicianPathway: exec.pathway,
    admissionDecisionSigned: true,
    completing: true,
  });
  return evalResult.ok && evalResult.complete;
}
