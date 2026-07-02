/**
 * Dev-only parity metadata between legacy ER Summary model and EncounterClinicalRecord.
 * Logs counts/booleans only — no PHI.
 */

import type { EncounterClinicalRecord } from "@medora/shared";
import type { EmergencyVisitSummaryModel } from "./emergencyVisitSummaryModel";

export type ClinicalRecordParitySnapshot = {
  encounterId: string;
  legacy: {
    hasProviderNote: boolean;
    hasNursingNote: boolean;
    vitalsLineCount: number;
    orderItemCount: number;
    labResultPreviewCount: number;
    imagingResultPreviewCount: number;
    marCount: number;
    procedureCount: number;
    clinicalTimelineCount: number;
    metadataTimelineCount: number;
    documentationEventCount: number;
    providerMseHistoryCount: number;
    nursingReassessmentHistoryCount: number;
  };
  clinicalRecord: {
    hasProviderAssessment: boolean;
    hasNursingAssessment: boolean;
    vitalsCount: number;
    ordersCount: number;
    laboratoryResultsCount: number;
    imagingResultsCount: number;
    marCount: number;
    proceduresCount: number;
    clinicalTimelineCount: number;
    auditTimelineCount: number;
    providerHistoryCount: number;
    nursingHistoryCount: number;
  };
};

export function buildClinicalRecordParitySnapshot(input: {
  encounterId: string;
  summaryModel: EmergencyVisitSummaryModel;
  clinicalRecord: EncounterClinicalRecord;
  clinicalTimelineLegacyCount: number;
  orderItemCount: number;
  marCount: number;
  procedureCount: number;
  documentationEventCount: number;
  labResultPreviewCount?: number;
  imagingResultPreviewCount?: number;
}): ClinicalRecordParitySnapshot {
  const model = input.summaryModel;
  const record = input.clinicalRecord;

  return {
    encounterId: input.encounterId,
    legacy: {
      hasProviderNote: Boolean(model.evaluationMedicale || model.providerDocumentation),
      hasNursingNote: Boolean(
        model.resumeInfirmier || model.initialNursingAssessment || model.nursingReassessmentHistory.length > 0
      ),
      vitalsLineCount: model.triageResume?.lines.length ?? 0,
      orderItemCount: input.orderItemCount,
      labResultPreviewCount: input.labResultPreviewCount ?? 0,
      imagingResultPreviewCount: input.imagingResultPreviewCount ?? 0,
      marCount: input.marCount,
      procedureCount: input.procedureCount,
      clinicalTimelineCount: input.clinicalTimelineLegacyCount,
      metadataTimelineCount: model.timeline.length,
      documentationEventCount: input.documentationEventCount,
      providerMseHistoryCount: model.providerMseHistory.length,
      nursingReassessmentHistoryCount: model.nursingReassessmentHistory.length,
    },
    clinicalRecord: {
      hasProviderAssessment: record.providerAssessment !== null,
      hasNursingAssessment: record.nursingAssessment !== null,
      vitalsCount: record.vitals.length,
      ordersCount: record.orders.length,
      laboratoryResultsCount: record.laboratoryResults.length,
      imagingResultsCount: record.imagingResults.length,
      marCount: record.medicationAdministration.length,
      proceduresCount: record.procedures.length,
      clinicalTimelineCount: record.clinicalTimeline.length,
      auditTimelineCount: record.auditTimeline.length,
      providerHistoryCount: record.providerAssessmentHistory.length,
      nursingHistoryCount: record.nursingAssessmentHistory.length,
    },
  };
}

export function logEncounterClinicalRecordParityDev(snapshot: ClinicalRecordParitySnapshot): void {
  if (process.env.NODE_ENV === "production") return;
  console.info("[EncounterClinicalRecord parity]", {
    encounterId: snapshot.encounterId,
    legacy: snapshot.legacy,
    clinicalRecord: snapshot.clinicalRecord,
  });
}
