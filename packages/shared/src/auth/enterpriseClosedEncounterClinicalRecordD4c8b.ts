/**
 * MEDUI.D4C.8B — Enterprise closed encounter clinical record composition contract.
 * Presentation / projection only. Domain authorities remain unchanged.
 */

export const D4C8B_CERTIFICATION_ID = "MEDUI.D4C.8B" as const;

export const ENTERPRISE_CLOSED_CLINICAL_RECORD_SECTIONS = [
  "overview",
  "vitals",
  "nursing",
  "provider",
  "diagnoses",
  "orders",
  "medicationsMar",
  "results",
  "procedures",
  "disposition",
  "addenda",
] as const;

export type EnterpriseClosedClinicalRecordSection =
  (typeof ENTERPRISE_CLOSED_CLINICAL_RECORD_SECTIONS)[number];

/** Guard: never treat patient-scoped chart-summary as closed legal-record authority. */
export function isForbiddenClosedRecordAggregatePath(path: string): boolean {
  const p = String(path ?? "").toLowerCase();
  return p.includes("/chart-summary") || p.includes("chartsummary");
}

export function assertNoRawJsonClinicalPresentation(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        JSON.parse(trimmed);
        return false;
      } catch {
        return true;
      }
    }
  }
  return typeof value !== "object";
}
