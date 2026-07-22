/**
 * D4A.2 — Disposition-specific ED nursing execution under nursingAssessment.
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
  "stabilization",
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
] as const;

export const LWBS_ELOPEMENT_NURSING_SECTION_IDS = [
  "lastKnownStatus",
  "attemptsToLocate",
  "notifications",
  "departureTime",
] as const;

export type AdaptiveNursingSectionValues = Record<string, string | boolean | null | undefined>;

export type AdaptiveEdNursingExecutionV1 = {
  version: 1;
  pathway: AdaptiveNursingPathway;
  sections: AdaptiveNursingSectionValues;
  completedAt?: string | null;
  completedByDisplayName?: string | null;
};

export function emptyAdaptiveEdNursingExecution(
  pathway: AdaptiveNursingPathway
): AdaptiveEdNursingExecutionV1 {
  return { version: 1, pathway, sections: {}, completedAt: null, completedByDisplayName: null };
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
  const pathway = pathwayFromDispositionOutcomeUi(String(raw.pathway ?? "HOME"));
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

/** Contradictory-state guards for nursing vs physician disposition. */
export function validateAdaptiveNursingAgainstDisposition(input: {
  physicianPathway: AdaptiveNursingPathway;
  nursingPathway: AdaptiveNursingPathway;
  admissionDecisionSigned: boolean;
  acceptingFacility?: string | null;
  homeNursingPresent?: boolean;
}): AdaptiveNursingSafetyResult {
  const errors: string[] = [];
  if (
    input.homeNursingPresent &&
    isHomeNursingForbiddenForPathway(input.physicianPathway)
  ) {
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
  if (
    input.physicianPathway !== "HOME" &&
    input.nursingPathway === "HOME" &&
    input.physicianPathway !== "OTHER"
  ) {
    errors.push("NURSING_PATHWAY_MISMATCH");
  }
  return { ok: errors.length === 0, errors };
}

/** Departure completion requirements for admission/observation pathway. */
export function admissionNursingDepartureRequirementsMet(
  sections: AdaptiveNursingSectionValues
): boolean {
  const required = [
    "handoff",
    "transportMethod",
    "receivingUnit",
    "conditionLeavingEd",
    "edDepartureAt",
  ] as const;
  return required.every((k) => String(sections[k] ?? "").trim().length > 0);
}
