import { apiFetch } from "./apiClient";

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
};

export async function fetchMsppReviews() {
  return apiFetch(`${BASE}/reviews`, {}) as Promise<{ reviews: MsppReviewRow[] }>;
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
