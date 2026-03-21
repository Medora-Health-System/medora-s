import { apiFetch } from "./apiClient";

export type VaccineCatalogItem = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  manufacturer?: string | null;
  isActive: boolean;
};

export type VaccineAdministrationRow = {
  id: string;
  patientId: string;
  facilityId: string;
  encounterId?: string | null;
  vaccineCatalogId: string;
  doseNumber?: number | null;
  lotNumber?: string | null;
  administeredAt: string;
  administeredByUserId?: string | null;
  nextDueAt?: string | null;
  notes?: string | null;
  patient?: { id: string; firstName: string; lastName: string; mrn?: string | null };
  vaccineCatalog?: { id: string; code: string; name: string };
  encounter?: { id: string; type: string; status: string } | null;
  administeredBy?: { id: string; firstName: string; lastName: string; email: string } | null;
};

export type DiseaseCaseReportRow = {
  id: string;
  patientId?: string | null;
  facilityId: string;
  encounterId?: string | null;
  diseaseCode: string;
  diseaseName: string;
  status: string;
  reportedAt: string;
  onsetDate?: string | null;
  commune?: string | null;
  department?: string | null;
  notes?: string | null;
  patient?: { id: string; firstName: string; lastName: string; mrn?: string | null } | null;
  reportedBy?: { id: string; firstName: string; lastName: string } | null;
};

export type DiseaseSummaryBreakdown = {
  diseaseName: string;
  status: string;
  commune: string | null;
  count: number;
};

export type DiseaseSummary = {
  facilityId: string;
  reportedFrom: string;
  reportedTo: string;
  totalReports: number;
  breakdown: DiseaseSummaryBreakdown[];
};

export async function fetchVaccineCatalog(
  facilityId: string,
  includeInactive?: boolean
) {
  const q = includeInactive ? "?includeInactive=true" : "";
  return apiFetch(`/public-health/vaccines/catalog${q}`, {
    facilityId,
  }) as Promise<VaccineCatalogItem[]>;
}

export async function createVaccineCatalogItem(
  facilityId: string,
  body: Record<string, unknown>
) {
  return apiFetch("/public-health/vaccines/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  });
}

export async function recordVaccination(
  facilityId: string,
  body: Record<string, unknown>
) {
  return apiFetch("/public-health/vaccinations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  }) as Promise<VaccineAdministrationRow>;
}

export async function fetchPatientVaccinations(
  facilityId: string,
  patientId: string,
  limit?: number
) {
  const q = limit != null ? `?limit=${limit}` : "";
  return apiFetch(`/patients/${patientId}/vaccinations${q}`, {
    facilityId,
  }) as Promise<VaccineAdministrationRow[]>;
}

export async function fetchVaccinationsDueSoon(facilityId: string) {
  return apiFetch("/public-health/vaccinations/due-soon", {
    facilityId,
  }) as Promise<{
    dueWithinDays: number;
    windowStart: string;
    windowEnd: string;
    items: VaccineAdministrationRow[];
  }>;
}

export async function createDiseaseReport(
  facilityId: string,
  body: Record<string, unknown>
) {
  return apiFetch("/public-health/disease-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    facilityId,
  }) as Promise<DiseaseCaseReportRow>;
}

export async function fetchDiseaseReports(
  facilityId: string,
  params: Record<string, string | undefined>
) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") q.set(k, v);
  });
  return apiFetch(`/public-health/disease-reports?${q.toString()}`, {
    facilityId,
  }) as Promise<{ items: DiseaseCaseReportRow[]; total: number }>;
}

export async function fetchDiseaseSummary(
  facilityId: string,
  reportedFrom?: string,
  reportedTo?: string
) {
  const q = new URLSearchParams();
  if (reportedFrom) q.set("reportedFrom", reportedFrom);
  if (reportedTo) q.set("reportedTo", reportedTo);
  return apiFetch(`/public-health/disease-summary?${q.toString()}`, {
    facilityId,
  }) as Promise<DiseaseSummary>;
}
