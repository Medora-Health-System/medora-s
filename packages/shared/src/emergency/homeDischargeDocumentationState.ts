/**
 * Semantic model for home/AMA discharge documentation.
 * Separates instruction content, follow-up planning, and communication acknowledgment.
 */

import {
  countClosureDischargeInstructionSections,
  hasClosureAdequateDischargeInstructions,
  hasClosureFollowUpDocumented,
  hasClosurePatientInstructionsExplained,
  hasClosureReturnPrecautionsDocumented,
  type ClosureDischargeSummary,
} from "./closureDischargeReadiness.js";

export type HomeDischargeInstructionsCommunicated =
  | "YES"
  | "NO"
  | "REFUSED"
  | "UNABLE"
  | "UNKNOWN";

export type HomeDischargeUnderstandingDocumented =
  | "YES"
  | "NO"
  | "NOT_APPLICABLE"
  | "UNKNOWN";

export type HomeDischargeInterpreterStatus =
  | "USED"
  | "NOT_REQUIRED"
  | "DECLINED"
  | "UNKNOWN";

export type HomeDischargeDeliveryStatus =
  | "COMPLETE"
  | "NOT_MODELED"
  | "REFUSED"
  | "UNKNOWN";

export type HomeDischargeDocumentationState = {
  diagnosisDocumentation: {
    finalDiagnosisPresent: boolean;
    descriptionPresent: boolean;
    diagnosisInstructionsPresent: boolean;
    medicationTreatmentInstructionsPresent: boolean;
  };
  planning: {
    returnPrecautionsPresent: boolean;
    workSchoolInstructionsPresent: boolean | null;
    followUpPresent: boolean;
    followUpComponents: {
      typePresent: boolean;
      providerPresent: boolean;
      timeframePresent: boolean;
      contactPresent: boolean;
    };
  };
  communication: {
    instructionsCommunicated: HomeDischargeInstructionsCommunicated;
    understandingDocumented: HomeDischargeUnderstandingDocumented;
    interpreterStatus: HomeDischargeInterpreterStatus;
  };
  delivery: {
    printedOrElectronicDelivery: HomeDischargeDeliveryStatus;
  };
  /** Adequate instruction *content* per established closure policy (≥2 sections). */
  instructionContentAdequate: boolean;
  instructionSectionCount: number;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readStr(summary: ClosureDischargeSummary, key: string): string {
  const o = asObject(summary);
  if (!o) return "";
  const v = o[key];
  return typeof v === "string" ? v.trim() : "";
}

function readObjectArray(summary: ClosureDischargeSummary, key: string): Record<string, unknown>[] {
  const o = asObject(summary);
  if (!o) return [];
  const raw = o[key];
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
}

function docStr(doc: Record<string, unknown>, key: string): string {
  const v = doc[key];
  return typeof v === "string" ? v.trim() : "";
}

function followUpComponents(summary: ClosureDischargeSummary): HomeDischargeDocumentationState["planning"]["followUpComponents"] {
  const rows = [
    ...readObjectArray(summary, "providerDischargeFollowUps"),
    ...readObjectArray(summary, "providerDischargeDiagnosisDocs").flatMap((doc) =>
      readObjectArray(doc, "followUps")
    ),
  ];
  let typePresent = false;
  let providerPresent = false;
  let timeframePresent = false;
  let contactPresent = false;
  for (const row of rows) {
    if (docStr(row, "specialty")) typePresent = true;
    if (docStr(row, "providerOrFacility") || docStr(row, "name")) providerPresent = true;
    if (docStr(row, "timing")) timeframePresent = true;
    if (docStr(row, "phone") || docStr(row, "address")) contactPresent = true;
  }
  if (readStr(summary, "followUp") || readStr(summary, "followUpInstructions")) {
    // Legacy narrative counts as type+provider/timeframe aggregate signal.
    typePresent = true;
    providerPresent = true;
    timeframePresent = true;
  }
  return { typePresent, providerPresent, timeframePresent, contactPresent };
}

function resolveCommunication(summary: ClosureDischargeSummary): HomeDischargeInstructionsCommunicated {
  const o = asObject(summary);
  if (!o) return "UNKNOWN";
  if (o.patientInstructionsRefused === true || o.instructionsRefused === true) return "REFUSED";
  if (o.patientInstructionsUnable === true || o.instructionsUnable === true) return "UNABLE";
  if (hasClosurePatientInstructionsExplained(summary)) return "YES";
  if (o.patientInstructionsGiven === false) return "NO";
  // Missing checkbox is incomplete documentation, not an explicit "no".
  if (!("patientInstructionsGiven" in o)) return "UNKNOWN";
  return "NO";
}

/**
 * Normalize persisted discharge summary into content / planning / communication states.
 * Does not invent fields that are not durably modeled in Medora today.
 */
export function resolveHomeDischargeDocumentationState(
  summary: ClosureDischargeSummary,
  options?: { hasMedicationOrders?: boolean }
): HomeDischargeDocumentationState {
  const hasMeds = options?.hasMedicationOrders === true;
  const docs = readObjectArray(summary, "providerDischargeDiagnosisDocs");
  const descriptionPresent =
    Boolean(readStr(summary, "dischargeDiagnosisSummary")) ||
    Boolean(readStr(summary, "disposition")) ||
    docs.some((d) => Boolean(docStr(d, "description")));
  const diagnosisInstructionsPresent =
    Boolean(readStr(summary, "dischargeInstructions")) ||
    docs.some((d) => Boolean(docStr(d, "diagnosisInstructions")));
  const medicationTreatmentInstructionsPresent =
    Boolean(readStr(summary, "medicationInstructions")) ||
    Boolean(readStr(summary, "medicationsGiven")) ||
    docs.some(
      (d) =>
        Boolean(docStr(d, "medicationTreatment")) ||
        Boolean(docStr(d, "treatment")) ||
        readObjectArray(d, "medicationLines").length > 0
    );
  const workSchool =
    readStr(summary, "workSchoolNote") ||
    readStr(summary, "providerDischargeReturnWorkSchool") ||
    readStr(summary, "activityInstructions");
  const components = followUpComponents(summary);

  return {
    diagnosisDocumentation: {
      finalDiagnosisPresent: descriptionPresent || docs.some((d) => Boolean(docStr(d, "code"))),
      descriptionPresent,
      diagnosisInstructionsPresent,
      medicationTreatmentInstructionsPresent,
    },
    planning: {
      returnPrecautionsPresent: hasClosureReturnPrecautionsDocumented(summary),
      workSchoolInstructionsPresent: workSchool ? true : workSchool === "" ? false : null,
      followUpPresent: hasClosureFollowUpDocumented(summary),
      followUpComponents: components,
    },
    communication: {
      instructionsCommunicated: resolveCommunication(summary),
      understandingDocumented: "NOT_APPLICABLE",
      interpreterStatus: "UNKNOWN",
    },
    delivery: {
      printedOrElectronicDelivery: "NOT_MODELED",
    },
    instructionContentAdequate: hasClosureAdequateDischargeInstructions(summary, hasMeds),
    instructionSectionCount: countClosureDischargeInstructionSections(summary, hasMeds),
  };
}
