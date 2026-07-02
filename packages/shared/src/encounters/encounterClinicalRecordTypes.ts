/**
 * Encounter Clinical Record — enterprise read-model types (projection only).
 * Pure data shapes; no UI, API, or persistence coupling.
 */

export type EncounterClinicalRecordLocale = "en" | "fr";

export type EncounterClinicalRecordProviderStatus = "SIGNED" | "SAVED" | "DRAFT";

export type EncounterClinicalRecordHeader = {
  encounterId: string;
  facilityId: string | null;
  patientId: string | null;
  encounterType: string | null;
  encounterStatus: string | null;
  arrivedAt: string | null;
  closedAt: string | null;
  patientDisplayName: string | null;
  patientMrn: string | null;
  patientDateOfBirth: string | null;
  patientSex: string | null;
  attendingProviderDisplayName: string | null;
  roomLabel: string | null;
};

export type EncounterClinicalRecordTextBlock = {
  title: string | null;
  lines: string[];
};

export type EncounterClinicalRecordVitalPoint = {
  id: string;
  recordedAt: string;
  source: string | null;
  summary: string;
};

export type EncounterClinicalRecordProviderAssessment = {
  status: EncounterClinicalRecordProviderStatus;
  documentedAt: string | null;
  performerDisplayName: string | null;
  performerRoleTitle: string | null;
  sections: Array<{ label: string; text: string }>;
  narrativeSummary: string | null;
  signedAt: string | null;
  signedByDisplayName: string | null;
};

export type EncounterClinicalRecordProviderAssessmentHistoryEntry = {
  id: string;
  savedAt: string;
  documentedAt: string | null;
  performerDisplayName: string | null;
  performerRoleTitle: string | null;
  sections: Array<{ label: string; text: string }>;
  narrativeSummary: string | null;
  status: "SAVED" | "DRAFT";
};

export type EncounterClinicalRecordNursingAssessment = {
  id: string;
  documentedAt: string | null;
  savedAt: string;
  performerDisplayName: string | null;
  performerRoleTitle: string | null;
  structuredLines: string[];
  narrativeSummary: string | null;
  isInitial: boolean;
};

export type EncounterClinicalRecordNursingAssessmentHistoryEntry = {
  id: string;
  documentedAt: string | null;
  savedAt: string;
  performerDisplayName: string | null;
  performerRoleTitle: string | null;
  structuredLines: string[];
  narrativeSummary: string | null;
};

export type EncounterClinicalRecordOrderRow = {
  orderId: string;
  orderItemId: string;
  orderType: string;
  priority: string | null;
  status: string;
  label: string;
  orderedAt: string | null;
  orderedByDisplayName: string | null;
};

export type EncounterClinicalRecordLaboratoryResult = {
  orderId: string;
  orderItemId: string;
  label: string;
  resultText: string;
  verifiedAt: string;
  criticalValue: boolean;
  acknowledgedAt: string | null;
};

export type EncounterClinicalRecordImagingResult = {
  orderId: string;
  orderItemId: string;
  label: string;
  resultText: string;
  verifiedAt: string;
  criticalValue: boolean;
  acknowledgedAt: string | null;
};

export type EncounterClinicalRecordMedicationAdministration = {
  id: string;
  medicationName: string;
  dose: string | null;
  route: string | null;
  action: string;
  administeredAt: string | null;
  administeredByDisplayName: string | null;
  orderItemId: string | null;
};

export type EncounterClinicalRecordProcedure = {
  id: string;
  label: string;
  clinicalSummary: string;
  documentedAt: string | null;
  documentedByDisplayName: string | null;
  documentationRole: string | null;
};

export type EncounterClinicalRecordDiagnosis = {
  id: string;
  code: string | null;
  displayLabel: string;
  diagnosisType: string | null;
  isPrimary: boolean;
  documentedAt: string | null;
};

export type EncounterClinicalRecordDisposition = {
  dischargeMode: string | null;
  destination: string | null;
  summaryLines: string[];
  dispositionAt: string | null;
};

export type EncounterClinicalRecordSignature = {
  domain: string;
  signerDisplayName: string;
  signerRoleTitle: string | null;
  signedAt: string;
};

export type EncounterClinicalRecordClinicalMilestone =
  | "ARRIVAL"
  | "TRIAGE_COMPLETE"
  | "PROVIDER_ASSESSMENT_SIGNED"
  | "LABORATORY_COLLECTED"
  | "LABORATORY_RESULTED"
  | "IMAGING_RESULTED"
  | "MEDICATION_ADMINISTERED"
  | "PROCEDURE_COMPLETED"
  | "DISPOSITION"
  | "DISCHARGED";

export type EncounterClinicalRecordClinicalTimelineEntry = {
  id: string;
  milestone: EncounterClinicalRecordClinicalMilestone;
  timestampIso: string | null;
  actorDisplayName: string | null;
  actorRoleTitle: string | null;
  summary: string;
  sourceType: string;
  sourceId: string;
};

export type EncounterClinicalRecordAuditClassification =
  | "CLINICAL_MILESTONE"
  | "CLINICAL_DOCUMENTATION"
  | "ORDER_WORKFLOW"
  | "RESULT_WORKFLOW"
  | "MAR"
  | "PROCEDURE"
  | "DISPOSITION"
  | "METADATA"
  | "SYSTEM"
  | "OTHER";

export type EncounterClinicalRecordAuditTimelineEntry = {
  id: string;
  sourceKind: string;
  sourceId: string;
  eventType: string;
  documentedAtIso: string;
  classification: EncounterClinicalRecordAuditClassification;
  actorDisplayName: string | null;
  actorRoleTitle: string | null;
  summary: string;
  orderId: string | null;
  orderItemId: string | null;
};

export type EncounterClinicalRecord = {
  header: EncounterClinicalRecordHeader;
  chiefComplaint: EncounterClinicalRecordTextBlock | null;
  presentation: EncounterClinicalRecordTextBlock | null;
  vitals: EncounterClinicalRecordVitalPoint[];
  providerAssessment: EncounterClinicalRecordProviderAssessment | null;
  providerAssessmentHistory: EncounterClinicalRecordProviderAssessmentHistoryEntry[];
  nursingAssessment: EncounterClinicalRecordNursingAssessment | null;
  nursingAssessmentHistory: EncounterClinicalRecordNursingAssessmentHistoryEntry[];
  orders: EncounterClinicalRecordOrderRow[];
  laboratoryResults: EncounterClinicalRecordLaboratoryResult[];
  imagingResults: EncounterClinicalRecordImagingResult[];
  medicationAdministration: EncounterClinicalRecordMedicationAdministration[];
  procedures: EncounterClinicalRecordProcedure[];
  diagnoses: EncounterClinicalRecordDiagnosis[];
  disposition: EncounterClinicalRecordDisposition | null;
  signatures: EncounterClinicalRecordSignature[];
  clinicalTimeline: EncounterClinicalRecordClinicalTimelineEntry[];
  auditTimeline: EncounterClinicalRecordAuditTimelineEntry[];
};

/** Loose input shapes — callers map API/encounter payloads before projection. */
export type BuildEncounterClinicalRecordInput = {
  locale?: EncounterClinicalRecordLocale;
  encounter: {
    id: string;
    facilityId?: string | null;
    patientId?: string | null;
    type?: string | null;
    status?: string | null;
    createdAt?: string | null;
    closedAt?: string | null;
    chiefComplaint?: string | null;
    presentationSummary?: string | null;
    nursingAssessment?: unknown;
    dischargeSummaryJson?: unknown;
    admissionSummaryJson?: unknown;
    providerDocumentationStatus?: string | null;
    providerDocumentationSignedAt?: string | null;
    providerDocumentationSignedByDisplayFr?: string | null;
    triageCompleteAt?: string | null;
    diagnoses?: Array<{
      id?: string;
      code?: string | null;
      displayLabel?: string | null;
      label?: string | null;
      diagnosisType?: string | null;
      isPrimary?: boolean;
      documentedAt?: string | null;
      createdAt?: string | null;
    }>;
  };
  patient?: {
    displayName?: string | null;
    mrn?: string | null;
    dateOfBirth?: string | null;
    sex?: string | null;
  } | null;
  attendingProviderDisplayName?: string | null;
  roomLabel?: string | null;
  chiefComplaintLines?: string[];
  presentationLines?: string[];
  vitals?: Array<{
    id?: string;
    recordedAt?: string;
    source?: string | null;
    summary?: string;
  }>;
  providerAssessment?: {
    documentationStatus?: string | null;
    signedAt?: string | null;
    signedByDisplayName?: string | null;
    savedAt?: string | null;
    savedByDisplayName?: string | null;
    performerRoleTitle?: string | null;
    sections?: Array<{ label?: string; text?: string }>;
    narrativeSummary?: string | null;
  } | null;
  providerAssessmentSaveHistory?: Array<{
    id: string;
    savedAt: string;
    documentedAt?: string | null;
    performerDisplayName?: string | null;
    performerRoleTitle?: string | null;
    sections?: Array<{ label?: string; text?: string }>;
    narrativeSummary?: string | null;
    isDraft?: boolean;
  }>;
  nursingAssessmentInitial?: {
    id?: string;
    documentedAt?: string | null;
    savedAt?: string;
    performerDisplayName?: string | null;
    performerRoleTitle?: string | null;
    structuredLines?: string[];
    narrativeSummary?: string | null;
  } | null;
  nursingReassessmentHistory?: Array<{
    id: string;
    documentedAt?: string | null;
    savedAt: string;
    performerDisplayName?: string | null;
    performerRoleTitle?: string | null;
    structuredLines?: string[];
    narrativeSummary?: string | null;
  }>;
  orders?: Array<{
    id?: string;
    type?: string;
    priority?: string | null;
    status?: string | null;
    createdAt?: string | null;
    orderedByDisplayName?: string | null;
    items?: Array<{
      id?: string;
      displayLabel?: string | null;
      manualLabel?: string | null;
      catalogItemType?: string | null;
      status?: string | null;
      result?: {
        resultText?: string | null;
        verifiedAt?: string | null;
        criticalValue?: boolean;
        acknowledgedAt?: string | null;
      } | null;
    }>;
  }>;
  medicationAdministrations?: Array<{
    id?: string;
    medicationName?: string | null;
    dose?: string | null;
    route?: string | null;
    marAction?: string | null;
    action?: string | null;
    administeredAt?: string | null;
    administeredByDisplayName?: string | null;
    orderItemId?: string | null;
  }>;
  procedures?: Array<{
    id?: string;
    label?: string | null;
    clinicalSummary?: string | null;
    documentedAt?: string | null;
    createdAt?: string | null;
    documentedByDisplayName?: string | null;
    documentationRole?: string | null;
  }>;
  disposition?: {
    dischargeMode?: string | null;
    destination?: string | null;
    summaryLines?: string[];
    dispositionAt?: string | null;
  } | null;
  signatures?: EncounterClinicalRecordSignature[];
  auditSourceRows?: Array<{
    sourceKind: string;
    sourceId: string;
    storedEventType: string;
    documentedAtIso: string;
    actorDisplayName?: string | null;
    actorRole?: string | null;
    summaryFr?: string | null;
    summaryEn?: string | null;
    orderId?: string | null;
    orderItemId?: string | null;
    orderType?: string | null;
    payloadJson?: unknown;
  }>;
};
