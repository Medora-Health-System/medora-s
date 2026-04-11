import { apiFetch } from "./apiClient";

/** Corps POST pour approbation / rejet MSPP (département ou central). */
export type MsppReviewActionBody = {
  comment: string;
  fever: boolean;
  duration: string;
  labConfirmed: boolean;
  exposureRisk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
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
  /** Département géographique national (GeoDepartment), libellé lisible. */
  departmentName?: string | null;
  facilityName?: string | null;
  reporterName?: string | null;
  reporterRole?: string | null;
  reportDepartment?: string | null;
  reportCommune?: string | null;
  reportDiseaseCode?: string | null;
  reportDiseaseName?: string | null;
  dataQuality?: {
    geoIncomplete: boolean;
    geoCommuneLinked: boolean;
  };
};

export async function fetchMsppReviews() {
  return apiFetch("/mspp/reviews", {}) as Promise<{ reviews: MsppReviewRow[] }>;
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
  return apiFetch("/mspp/summary", {}) as Promise<MsppSummaryResponse>;
}

export type MsppDiseasesResponse = {
  diseases: Array<{ diseaseCode: string; diseaseName: string; count: number }>;
};

export async function fetchMsppDiseases() {
  return apiFetch("/mspp/diseases", {}) as Promise<MsppDiseasesResponse>;
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
  return apiFetch("/mspp/geography", {}) as Promise<MsppGeographyResponse>;
}

export type MsppTrendsResponse = {
  buckets: Array<{ month: string; count: number }>;
};

export async function fetchMsppTrends() {
  return apiFetch("/mspp/trends", {}) as Promise<MsppTrendsResponse>;
}

export async function msppDepartmentApprove(reviewId: string, body: MsppReviewActionBody) {
  return apiFetch(`/mspp/reviews/${encodeURIComponent(reviewId)}/department-approve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function msppDepartmentReject(reviewId: string, body: MsppReviewActionBody) {
  return apiFetch(`/mspp/reviews/${encodeURIComponent(reviewId)}/department-reject`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function msppCentralApprove(reviewId: string, body: MsppReviewActionBody) {
  return apiFetch(`/mspp/reviews/${encodeURIComponent(reviewId)}/central-approve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function msppCentralReject(reviewId: string, body: MsppReviewActionBody) {
  return apiFetch(`/mspp/reviews/${encodeURIComponent(reviewId)}/central-reject`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
