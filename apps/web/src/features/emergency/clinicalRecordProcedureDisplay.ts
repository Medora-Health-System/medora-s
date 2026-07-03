import type { EncounterClinicalRecordProcedure } from "@medora/shared";

export function formatClinicalRecordProcedureTitle(proc: EncounterClinicalRecordProcedure): string {
  const label = proc.label.trim();
  if (label) return label;
  const firstSegment = proc.clinicalSummary.split(" — ")[0]?.trim();
  return firstSegment || proc.clinicalSummary.trim();
}

export function formatClinicalRecordProcedureStatusLabel(
  status: string | null | undefined,
  t: (key: string) => string
): string {
  const normalized = (status ?? "COMPLETED").trim().toUpperCase();
  if (normalized === "COMPLETED") return t("encounterClinicalRecordSummary.procedureStatusCompleted");
  if (normalized === "IN_PROGRESS") return t("encounterClinicalRecordSummary.procedureStatusInProgress");
  if (normalized === "CANCELLED" || normalized === "CANCELED") {
    return t("encounterClinicalRecordSummary.procedureStatusCancelled");
  }
  return normalized;
}

export function formatClinicalRecordProcedureSectionLabel(
  documentationRole: string | null | undefined,
  t: (key: string) => string
): string | null {
  const role = (documentationRole ?? "").trim().toUpperCase();
  if (role === "NURSING") return t("encounterClinicalRecordSummary.procedureSectionNursing");
  if (role === "PROVIDER") return t("encounterClinicalRecordSummary.procedureSectionProvider");
  return null;
}

export function formatClinicalRecordProcedureStatusLine(
  proc: EncounterClinicalRecordProcedure,
  t: (key: string) => string
): string {
  return `${t("encounterClinicalRecordSummary.attrStatus")}: ${formatClinicalRecordProcedureStatusLabel(proc.status, t)}`;
}
