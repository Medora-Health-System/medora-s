import { apiFetch } from "@/lib/apiClient";

const REVIEW_BASE = "/api/backend/medications/review";

export type ExpertReviewDashboard = {
  ProgramKey: string | null;
  BatchStatus: string | null;
  Wave1Families: string[];
  Wave1FamiliesReviewed: number;
  Wave1FamiliesApprovedForShadow: number;
  Wave1FamiliesDeferred: number;
  ClinicalDomainsReviewed: number;
  SafetyDomainsReviewed: number;
  QualityScoresCalculated: number;
  ShadowSnapshotsCreated: number;
  ReviewConflictsOpen: number;
  AuditEntriesCreated: number;
  ClinicalActivation: number;
  ProviderFacingAlerts: number;
  OrderingChanged: string;
  MARChanged: string;
  BillingChanged: string;
  KnowledgeControlsPatientCare: boolean;
  Qualifications: Array<{
    familyKey: string;
    status: string;
    shadowVersion: string | null;
    reason: string | null;
  }>;
  FamilyScores: Array<{
    familyKey: string;
    overallScore: number;
    clinicalScore: number;
    safetyScore: number;
    evidenceScore: number;
    consistencyScore: number;
    reviewScore: number;
  }>;
};

export async function fetchExpertReviewDashboard(facilityId: string) {
  return (await apiFetch(`${REVIEW_BASE}/dashboard`, {
    facilityId,
  })) as ExpertReviewDashboard;
}

export async function runExpertReviewPipeline(facilityId: string) {
  return (await apiFetch(`${REVIEW_BASE}/pipeline`, {
    facilityId,
    method: "POST",
    body: JSON.stringify({}),
  })) as Record<string, unknown>;
}
