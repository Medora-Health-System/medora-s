/**
 * Discharge documentation signals for closure / disposition safety readiness.
 * Reads legacy flat fields and provider discharge JSON (19Y) without schema migration.
 */

export type ClosureDischargeSummary = Record<string, unknown> | null | undefined;

function readStr(summary: ClosureDischargeSummary, key: string): string {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return "";
  const v = summary[key];
  return typeof v === "string" ? v.trim() : "";
}

function readBool(summary: ClosureDischargeSummary, key: string): boolean {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return false;
  const v = summary[key];
  if (v === true) return true;
  if (v === "true" || v === "1") return true;
  return false;
}

function readObjectArray(summary: ClosureDischargeSummary, key: string): Record<string, unknown>[] {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return [];
  const raw = summary[key];
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
}

function readProviderDiagnosisDocs(summary: ClosureDischargeSummary): Record<string, unknown>[] {
  return readObjectArray(summary, "providerDischargeDiagnosisDocs");
}

function docStr(doc: Record<string, unknown>, key: string): string {
  const v = doc[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Structured follow-up row completeness — shared by closure readiness and provider UI validation. */
export function isClosureFollowUpRowComplete(row: Record<string, unknown>): boolean {
  const specialty = docStr(row, "specialty");
  const provider = docStr(row, "providerOrFacility") || docStr(row, "name");
  const timing = docStr(row, "timing");
  const phone = docStr(row, "phone");
  const address = docStr(row, "address");
  const comments = docStr(row, "comments");
  const hasProvider = Boolean(specialty || provider);
  const hasScheduling = Boolean(timing || phone || address || comments);
  return hasProvider && hasScheduling;
}

function followUpRowHasContent(row: Record<string, unknown>): boolean {
  return isClosureFollowUpRowComplete(row);
}

/** Follow-up documented via narrative fields or structured provider rows. */
export function hasClosureFollowUpDocumented(summary: ClosureDischargeSummary): boolean {
  if (!summary) return false;
  if (readStr(summary, "followUpInstructions")) return true;
  if (readStr(summary, "followUp")) return true;
  if (readObjectArray(summary, "providerDischargeFollowUps").some(followUpRowHasContent)) return true;
  for (const doc of readProviderDiagnosisDocs(summary)) {
    if (readObjectArray(doc, "followUps").some(followUpRowHasContent)) return true;
  }
  return false;
}

/** Return precautions / warning signs documented. */
export function hasClosureReturnPrecautionsDocumented(summary: ClosureDischargeSummary): boolean {
  if (!summary) return false;
  if (readStr(summary, "returnPrecautions")) return true;
  if (readStr(summary, "providerDischargeReturnPrecautions")) return true;
  if (readStr(summary, "returnIfWorse")) return true;
  for (const doc of readProviderDiagnosisDocs(summary)) {
    if (docStr(doc, "returnPrecautions")) return true;
  }
  return false;
}

function hasDiagnosisOrDescription(summary: ClosureDischargeSummary): boolean {
  if (readStr(summary, "dischargeDiagnosisSummary")) return true;
  if (readStr(summary, "disposition")) return true;
  for (const doc of readProviderDiagnosisDocs(summary)) {
    if (docStr(doc, "description")) return true;
  }
  return false;
}

function hasClinicalInstructions(summary: ClosureDischargeSummary): boolean {
  if (readStr(summary, "dischargeInstructions")) return true;
  for (const doc of readProviderDiagnosisDocs(summary)) {
    if (docStr(doc, "diagnosisInstructions")) return true;
  }
  return false;
}

function hasMedicationInstructions(summary: ClosureDischargeSummary, hasMedicationOrders: boolean): boolean {
  if (readStr(summary, "medicationInstructions")) return true;
  if (readStr(summary, "medicationsGiven")) return true;
  for (const doc of readProviderDiagnosisDocs(summary)) {
    if (docStr(doc, "medicationTreatment") || docStr(doc, "treatment")) return true;
    if (readObjectArray(doc, "medicationLines").length > 0) return true;
  }
  if (!hasMedicationOrders) return false;
  return false;
}

function hasActivityOrWorkSchool(summary: ClosureDischargeSummary): boolean {
  if (readStr(summary, "activityInstructions")) return true;
  if (readStr(summary, "workSchoolNote")) return true;
  if (readStr(summary, "providerDischargeReturnWorkSchool")) return true;
  for (const doc of readProviderDiagnosisDocs(summary)) {
    if (docStr(doc, "returnWorkSchool")) return true;
  }
  return false;
}

/**
 * Home / AMA discharge requires at least two instruction sections (diagnosis, instructions,
 * medications when orders exist, activity/work-school).
 */
export function countClosureDischargeInstructionSections(
  summary: ClosureDischargeSummary,
  hasMedicationOrders: boolean
): number {
  let n = 0;
  if (hasDiagnosisOrDescription(summary)) n += 1;
  if (hasClinicalInstructions(summary)) n += 1;
  if (hasMedicationInstructions(summary, hasMedicationOrders)) n += 1;
  if (hasActivityOrWorkSchool(summary)) n += 1;
  return n;
}

export function hasClosureAdequateDischargeInstructions(
  summary: ClosureDischargeSummary,
  hasMedicationOrders: boolean
): boolean {
  return countClosureDischargeInstructionSections(summary, hasMedicationOrders) >= 2;
}

/** Patient / representative instruction acknowledgment checkbox. */
export function hasClosurePatientInstructionsExplained(summary: ClosureDischargeSummary): boolean {
  return readBool(summary, "patientInstructionsGiven");
}
