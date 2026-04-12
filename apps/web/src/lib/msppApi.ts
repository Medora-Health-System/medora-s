import { apiFetch } from "./apiClient";
import type { MsppDiseaseReportFeedbackItem } from "./publicHealthApi";

/** Backend-relative prefix. `apiFetch` prepends the shared proxy base (not `/api/backend` in this string). */
const BASE = "/mspp";

/** Corps POST pour approbation / rejet MSPP (département ou central). */
export type MsppReviewActionBody = {
  comment: string;
  fever: boolean;
  duration: string;
  labConfirmed: boolean;
  exposureRisk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  caseClassification: "SUSPECT" | "PROBABLE" | "CONFIRMED" | "NOT_A_CASE";
  inclusionCriteriaSummary: string;
  exclusionCriteriaSummary: string;
  /** AAAA-MM-JJ si connue ; sinon omettre la clé. */
  symptomOnsetDate?: string;
  hospitalized: boolean;
  outcomeStatus: string;
  labEvidenceType: "NONE" | "PCR" | "RAPID_ANTIGEN" | "CULTURE" | "SEROLOGY" | "OTHER";
  epiLinkedCase: boolean;
  travelOrExposureContext: string;
  finalDecisionRationale: string;
};

/** Dossier tel que saisi à l’établissement (liste `/mspp/reviews`, champ `facilityDossier`). */
/** Revue structurée enregistrée sur `DiseaseCaseReview` (liste `/mspp/reviews`, champ `departmentReview`). */
export type MsppDepartmentReviewSnapshot = {
  validationFever: boolean | null;
  validationDuration: string | null;
  validationLabConfirmed: boolean | null;
  validationExposureRisk: string | null;
  caseClassification: string | null;
  inclusionCriteriaSummary: string | null;
  exclusionCriteriaSummary: string | null;
  symptomOnsetDate: string | null;
  hospitalized: boolean | null;
  outcomeStatus: string | null;
  labEvidenceType: string | null;
  epiLinkedCase: boolean | null;
  travelOrExposureContext: string | null;
  finalDecisionRationale: string | null;
  reviewerLevel: string;
  reviewStatus: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MsppFacilityDossier = {
  diseaseCaseReportId: string;
  reportCaseStatus: string;
  diseaseCode: string;
  diseaseName: string;
  reportedAt: string;
  onsetDate: string | null;
  department: string | null;
  commune: string | null;
  geoCommuneId: string | null;
  notes: string | null;
  clinicalSummary: string | null;
  feverReported: boolean | null;
  symptomDuration: string | null;
  hospitalized: boolean | null;
  outcomeStatus: string | null;
  labConfirmed: boolean | null;
  labEvidenceType: string | null;
  epiLinkedCase: boolean | null;
  travelOrExposureContext: string | null;
  provisionalCaseClassification: string | null;
  facilityName: string;
  patientFullName: string | null;
  patientPrimaryIdentifier: string | null;
  reporterName: string | null;
  reporterRole: string | null;
  patientSex: string | null;
  patientAgeYears: number | null;
  reportEncounterRoomLabel: string | null;
};

/** Événement d’audit immuable (backend `MsppReviewAuditEvent`). */
export type MsppReviewAuditTrailItem = {
  id: string;
  action: string;
  reviewerUserId: string;
  reviewerDisplayName: string;
  reviewerLevel: string;
  statusBefore: string | null;
  statusAfter: string | null;
  requeued: boolean;
  criteriaSnapshot: Record<string, unknown> | null;
  createdAt: string;
};

/** Aide à la validation (lecture seule, profil selon le code maladie). */
export type MsppReviewGuidancePayload = {
  reviewGuidanceProfile: string;
  reviewGuidanceReason: string;
};

export type MsppReviewRow = {
  id: string;
  diseaseCaseReportId: string | null;
  status: string;
  reviewerLevel: string;
  departmentId: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  validationFever?: boolean | null;
  validationDuration?: string | null;
  validationLabConfirmed?: boolean | null;
  validationExposureRisk?: string | null;
  caseClassification?: string | null;
  inclusionCriteriaSummary?: string | null;
  exclusionCriteriaSummary?: string | null;
  symptomOnsetDate?: string | null;
  hospitalized?: boolean | null;
  outcomeStatus?: string | null;
  labEvidenceType?: string | null;
  epiLinkedCase?: boolean | null;
  travelOrExposureContext?: string | null;
  finalDecisionRationale?: string | null;
  /** Département géographique national (GeoDepartment), libellé lisible. */
  departmentName?: string | null;
  facilityName?: string | null;
  reporterName?: string | null;
  reporterRole?: string | null;
  reportDepartment?: string | null;
  reportCommune?: string | null;
  reportDiseaseCode?: string | null;
  reportDiseaseName?: string | null;
  patientFullName?: string | null;
  /** NIN si présent, sinon MRN local, sinon numéro de dossier global. */
  patientPrimaryIdentifier?: string | null;
  patientSex?: string | null;
  patientAgeYears?: number | null;
  /** Salle / lieu de visite lorsque la déclaration est liée à une rencontre. */
  reportEncounterRoomLabel?: string | null;
  /** Horodatage de la déclaration (ISO 8601). */
  reportedAt?: string | null;
  /** Dossier établissement complet pour affichage lecture seule (revue départementale). */
  facilityDossier?: MsppFacilityDossier | null;
  /** Champs de revue structurée (chaîne département → central). */
  departmentReview?: MsppDepartmentReviewSnapshot | null;
  dataQuality?: {
    geoIncomplete: boolean;
    geoCommuneLinked: boolean;
  };
  /** Présent lorsque `includeAuditEvents` est demandé sur la liste. */
  auditTrail?: MsppReviewAuditTrailItem[];
  /** Décision d’aide à la revue (profil indicatif selon code maladie). */
  reviewGuidance?: MsppReviewGuidancePayload;
};

export async function fetchMsppReviews(opts?: { includeAuditEvents?: boolean }) {
  const q =
    opts?.includeAuditEvents === true ? "?includeAuditEvents=true" : "";
  return apiFetch(`${BASE}/reviews${q}`, {}) as Promise<{ reviews: MsppReviewRow[] }>;
}

export type MsppSummaryResponse = {
  totalApproved: number;
  byDepartment: Array<{
    departmentId: string;
    departmentCode: string | null;
    departmentName: string | null;
    count: number;
  }>;
};

export async function fetchMsppSummary() {
  return apiFetch(`${BASE}/summary`, {}) as Promise<MsppSummaryResponse>;
}

export type MsppDiseasesResponse = {
  diseases: Array<{ diseaseCode: string; diseaseName: string; count: number }>;
};

export async function fetchMsppDiseases() {
  return apiFetch(`${BASE}/diseases`, {}) as Promise<MsppDiseasesResponse>;
}

export type MsppGeographyResponse = {
  regions: Array<{
    departmentId: string;
    departmentCode: string | null;
    departmentName: string | null;
    approvedCount: number;
  }>;
};

export async function fetchMsppGeography() {
  return apiFetch(`${BASE}/geography`, {}) as Promise<MsppGeographyResponse>;
}

export type MsppTrendsResponse = {
  buckets: Array<{ month: string; count: number }>;
};

export async function fetchMsppTrends() {
  return apiFetch(`${BASE}/trends`, {}) as Promise<MsppTrendsResponse>;
}

export type MsppSignalLevel = "LOW" | "MEDIUM" | "HIGH";

export type MsppSanitarySignalRow = {
  diseaseCode: string;
  diseaseName: string;
  departmentId: string;
  departmentCode: string | null;
  departmentName: string | null;
  currentCount: number;
  previousCount: number;
  delta: number;
  percentChange: number | null;
  signalLevel: MsppSignalLevel;
  thresholdProfileUsed: string;
  thresholdReason: string;
};

export type MsppSanitarySignalsResponse = {
  generatedAt: string;
  window: {
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
  };
  signals: MsppSanitarySignalRow[];
};

/** Lecture seule : signaux 7+7 jours (revues centrales approuvées). */
export async function fetchMsppSanitarySignals() {
  return apiFetch(`${BASE}/alerts/signals`, {}) as Promise<MsppSanitarySignalsResponse>;
}

export type MsppCommuneSanitarySignalRow = {
  departmentId: string;
  departmentCode: string | null;
  departmentName: string | null;
  geoCommuneId: string;
  communeName: string;
  diseaseCode: string;
  diseaseName: string;
  currentCount: number;
  previousCount: number;
  delta: number;
  percentChange: number | null;
  signalLevel: MsppSignalLevel;
  thresholdProfileUsed: string;
  thresholdReason: string;
};

export type MsppCommuneSanitarySignalsResponse = {
  generatedAt: string;
  window: {
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
  };
  excludedUnlinkedOrMismatchCount: number;
  truncated: boolean;
  signalsTotalBeforeCap: number;
  signals: MsppCommuneSanitarySignalRow[];
};

/** Signaux par commune (référentiel + revues centrales). `departmentId` optionnel = filtre département géographique. */
export async function fetchMsppCommuneSanitarySignals(opts?: { departmentId?: string }) {
  const q =
    opts?.departmentId && opts.departmentId.trim()
      ? `?departmentId=${encodeURIComponent(opts.departmentId.trim())}`
      : "";
  return apiFetch(`${BASE}/alerts/communes${q}`, {}) as Promise<MsppCommuneSanitarySignalsResponse>;
}

export type MsppEscalationLevel = "NONE" | "WATCH" | "PRIORITY" | "URGENT";

export type MsppEscalationReasonCode =
  | "ROUTINE_LOW_SIGNAL"
  | "ROUTINE_MEDIUM_SIGNAL"
  | "ROUTINE_HIGH_SIGNAL"
  | "IMMEDIATE_HIGH_SIGNAL"
  | "IMMEDIATE_MEDIUM_SIGNAL"
  | "IMMEDIATE_LOW_SIGNAL"
  | "WEEKLY_HIGH_PRIORITY_DISEASE"
  | "WEEKLY_HIGH_SIGNAL"
  | "WEEKLY_MEDIUM_SIGNAL"
  | "WEEKLY_LOW_SIGNAL";

export type MsppReportingCategory = "IMMEDIATE" | "WEEKLY" | "ROUTINE";

export type MsppSurveillancePriority = "HIGH" | "MEDIUM" | "LOW";

export type MsppAlertEscalationRow = {
  alertKey: string;
  scope: "DEPARTMENT" | "COMMUNE";
  diseaseCode: string;
  diseaseName: string;
  departmentId: string;
  departmentCode: string | null;
  departmentName: string | null;
  geoCommuneId: string | null;
  communeName: string | null;
  currentCount: number;
  previousCount: number;
  delta: number;
  signalLevel: MsppSignalLevel;
  thresholdProfileUsed: string;
  thresholdReason: string;
  reportingCategory: MsppReportingCategory | null;
  surveillancePriority: MsppSurveillancePriority | null;
  catalogMatched: boolean;
  escalationLevel: MsppEscalationLevel;
  escalationReasonCode: MsppEscalationReasonCode;
};

export type MsppAlertEscalationsResponse = {
  generatedAt: string;
  window: MsppSanitarySignalsResponse["window"];
  scopeNote: string;
  disclaimer: string;
  truncated: boolean;
  totalMatchedBeforeCap: number;
  escalations: MsppAlertEscalationRow[];
  notificationFeed: {
    schemaVersion: 1;
    kind: "mspp_escalation_v1";
    generatedAt: string;
    window: MsppSanitarySignalsResponse["window"];
    items: Array<{
      scope: MsppAlertEscalationRow["scope"];
      diseaseCode: string;
      departmentId: string;
      geoCommuneId: string | null;
      escalationLevel: MsppEscalationLevel;
      escalationReasonCode: MsppEscalationReasonCode;
      signalLevel: MsppSignalLevel;
    }>;
  };
};

/** Escalations prioritaires (lecture seule, dérivée des signaux existants). */
export async function fetchMsppAlertEscalations() {
  return apiFetch(`${BASE}/alerts/escalations`, {}) as Promise<MsppAlertEscalationsResponse>;
}

export type MsppAlertTriageStatus =
  | "NEW"
  | "ACKNOWLEDGED"
  | "UNDER_REVIEW"
  | "ESCALATED_INTERNAL"
  | "CLOSED";

export type MsppAlertTriageOverlay = {
  id: string;
  triageStatus: MsppAlertTriageStatus;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  acknowledgedByDisplayName: string | null;
  assignedToUserId: string | null;
  assignedToDisplayName: string | null;
  triageNote: string | null;
  updatedAt: string;
};

export type MsppAlertTriageRow = MsppAlertEscalationRow & {
  triage: MsppAlertTriageOverlay | null;
};

export type MsppAlertTriageSnapshotResponse = {
  generatedAt: string;
  window: MsppSanitarySignalsResponse["window"];
  scopeNote: string;
  disclaimer: string;
  truncated: boolean;
  totalMatchedBeforeCap: number;
  escalations: MsppAlertTriageRow[];
};

export type MsppAlertTriageAssignee = {
  userId: string;
  displayName: string;
  email: string;
};

export type MsppAlertTriageVerifyBody = {
  alertKey: string;
  scope: "DEPARTMENT" | "COMMUNE";
  diseaseCode: string;
  departmentId: string;
  geoCommuneId: string | null;
  window: { currentStart: string; currentEnd: string };
  escalationLevel: MsppEscalationLevel;
};

/** Corps commun pour toutes les actions de triage (aligné sur le backend). */
export function buildMsppAlertTriageVerifyBody(
  row: MsppAlertEscalationRow,
  window: MsppSanitarySignalsResponse["window"]
): MsppAlertTriageVerifyBody {
  return {
    alertKey: row.alertKey,
    scope: row.scope,
    diseaseCode: row.diseaseCode,
    departmentId: row.departmentId,
    geoCommuneId: row.geoCommuneId,
    window: {
      currentStart: window.currentStart,
      currentEnd: window.currentEnd,
    },
    escalationLevel: row.escalationLevel,
  };
}

export async function fetchMsppAlertTriageSnapshot() {
  return apiFetch(`${BASE}/alerts/triage`, {}) as Promise<MsppAlertTriageSnapshotResponse>;
}

export async function fetchMsppAlertTriageAssignees() {
  return apiFetch(`${BASE}/alerts/triage/assignees`, {}) as Promise<MsppAlertTriageAssignee[]>;
}

export async function postMsppAlertTriageAcknowledge(body: MsppAlertTriageVerifyBody) {
  return apiFetch(`${BASE}/alerts/triage/acknowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as Promise<{ ok: true; id: string }>;
}

export async function postMsppAlertTriageStatus(body: MsppAlertTriageVerifyBody & { triageStatus: MsppAlertTriageStatus }) {
  return apiFetch(`${BASE}/alerts/triage/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as Promise<{ ok: true; id: string }>;
}

export async function postMsppAlertTriageNote(body: MsppAlertTriageVerifyBody & { triageNote: string }) {
  return apiFetch(`${BASE}/alerts/triage/note`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as Promise<{ ok: true; id: string }>;
}

export async function postMsppAlertTriageAssign(body: MsppAlertTriageVerifyBody & { assignedToUserId: string | null }) {
  return apiFetch(`${BASE}/alerts/triage/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as Promise<{ ok: true; id: string }>;
}

export type MsppValidationDeptAnalyticsRow = {
  departmentId: string;
  departmentCode: string | null;
  departmentName: string | null;
  pendingDepartment: number;
  pendingCentral: number;
  approvedCentral: number;
  rejectedDepartment: number;
  rejectedCentral: number;
  requeueEvents: number;
  backlogRisk: "LOW" | "ELEVATED";
  avgMsFullCycle: number | null;
  fullCycleSampleSize: number;
};

export type MsppValidationAnalyticsResponse = {
  generatedAt: string;
  scopeNote: string;
  timingLookbackDays: number;
  summary: {
    pendingDepartment: number;
    pendingCentral: number;
    approvedCentral: number;
    rejectedTotal: number;
    requeueEventsTotal: number;
  };
  statusCounts: Record<string, number>;
  reviewerLevelCounts: Record<string, number>;
  flow: {
    requeueEventsTotal: number;
    terminalDecisionEventsTotal: number;
    requeueShareOfVolume: number | null;
  };
  departments: MsppValidationDeptAnalyticsRow[];
  timing: {
    sampleSizeReportToFirstDept: number;
    avgMsReportToFirstDeptDecision: number | null;
    sampleSizeDeptApproveToCentral: number;
    avgMsDepartmentApprovalToCentralDecision: number | null;
    sampleSizeFullCycle: number;
    avgMsReportToCentralFinal: number | null;
  };
};

/** Analytique du pipeline de validation (lecture seule). */
export async function fetchMsppValidationAnalytics() {
  return apiFetch(`${BASE}/analytics/validation`, {}) as Promise<MsppValidationAnalyticsResponse>;
}

export async function msppDepartmentApprove(reviewId: string, body: MsppReviewActionBody) {
  return apiFetch(`${BASE}/reviews/${encodeURIComponent(reviewId)}/department-approve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function msppDepartmentReject(reviewId: string, body: MsppReviewActionBody) {
  return apiFetch(`${BASE}/reviews/${encodeURIComponent(reviewId)}/department-reject`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function msppCentralApprove(reviewId: string, body: MsppReviewActionBody) {
  return apiFetch(`${BASE}/reviews/${encodeURIComponent(reviewId)}/central-approve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function msppCentralReject(reviewId: string, body: MsppReviewActionBody) {
  return apiFetch(`${BASE}/reviews/${encodeURIComponent(reviewId)}/central-reject`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Remet en file départementale un dossier au statut DEPARTMENT_REJECTED (sans corps JSON). */
export async function msppDepartmentRequeue(reviewId: string) {
  return apiFetch(`${BASE}/reviews/${encodeURIComponent(reviewId)}/department-requeue`, {
    method: "POST",
  });
}

/** Remet en file centrale un dossier au statut CENTRAL_REJECTED (sans corps JSON). */
export async function msppCentralRequeue(reviewId: string) {
  return apiFetch(`${BASE}/reviews/${encodeURIComponent(reviewId)}/central-requeue`, {
    method: "POST",
  });
}

/** Corps POST — retour qualité structuré vers l’établissement (ne modifie pas la déclaration). */
export type MsppCreateDiseaseReportFeedbackBody = {
  diseaseCaseReportId: string;
  diseaseCaseReviewId?: string | null;
  category: string;
  severity: string;
  feedbackText: string;
};

/** Création d’un retour qualité (validateurs MSPP nationaux). */
export async function createMsppDiseaseReportFeedback(body: MsppCreateDiseaseReportFeedbackBody) {
  return apiFetch(`${BASE}/disease-reports/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as Promise<MsppDiseaseReportFeedbackItem>;
}

/** Liste des retours pour une déclaration (contexte MSPP national). */
export async function fetchMsppDiseaseReportFeedbackList(reportId: string) {
  return apiFetch(`${BASE}/disease-reports/${encodeURIComponent(reportId)}/feedback`, {}) as Promise<{
    items: MsppDiseaseReportFeedbackItem[];
  }>;
}
