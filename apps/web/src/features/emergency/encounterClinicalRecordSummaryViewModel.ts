import type { EncounterClinicalRecord, EncounterClinicalRecordProviderStatus } from "@medora/shared";

export const CLINICAL_RECORD_SUMMARY_TIMELINE_COLLAPSE = 10;

export function providerStatusI18nKey(
  status: EncounterClinicalRecordProviderStatus
): string {
  switch (status) {
    case "SIGNED":
      return "encounterClinicalRecordSummary.providerStatusSigned";
    case "SAVED":
      return "encounterClinicalRecordSummary.providerStatusSaved";
    default:
      return "encounterClinicalRecordSummary.providerStatusDraft";
  }
}

export function clinicalMilestoneI18nKey(milestone: string): string {
  return `encounterClinicalRecordSummary.milestone.${milestone}`;
}

export function encounterClinicalRecordHasPrimaryContent(record: EncounterClinicalRecord): boolean {
  return Boolean(
    record.chiefComplaint?.lines.length ||
      record.presentation?.lines.length ||
      record.vitals.length ||
      record.providerAssessment ||
      record.nursingAssessment ||
      record.orders.length ||
      record.laboratoryResults.length ||
      record.imagingResults.length ||
      record.medicationAdministration.length ||
      record.procedures.length ||
      record.diagnoses.length ||
      record.disposition?.summaryLines.length ||
      record.signatures.length ||
      record.clinicalTimeline.length
  );
}

export function countPrimaryProviderNotes(record: EncounterClinicalRecord): number {
  return record.providerAssessment ? 1 : 0;
}

export function countAuditWorkflowEntriesInClinicalSections(record: EncounterClinicalRecord): number {
  let count = 0;
  for (const order of record.orders) {
    const status = order.status.toUpperCase();
    if (
      status === "ACKNOWLEDGED" ||
      status === "STARTED" ||
      status === "IN_PROGRESS" ||
      status === "REVIEWED"
    ) {
      count += 1;
    }
  }
  return count;
}

export function summarizeClinicalRecordForDisplay(record: EncounterClinicalRecord): {
  providerNoteCount: number;
  providerHistoryCount: number;
  labResultCount: number;
  imagingResultCount: number;
  orderCount: number;
  marCount: number;
  clinicalTimelineCount: number;
  auditTimelineCount: number;
} {
  return {
    providerNoteCount: countPrimaryProviderNotes(record),
    providerHistoryCount: record.providerAssessmentHistory.length,
    labResultCount: record.laboratoryResults.length,
    imagingResultCount: record.imagingResults.length,
    orderCount: record.orders.length,
    marCount: record.medicationAdministration.length,
    clinicalTimelineCount: record.clinicalTimeline.length,
    auditTimelineCount: record.auditTimeline.length,
  };
}
