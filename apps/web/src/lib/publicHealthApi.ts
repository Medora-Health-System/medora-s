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
  geoCommuneId?: string | null;
  notes?: string | null;
  patient?: { id: string; firstName: string; lastName: string; mrn?: string | null } | null;
  reportedBy?: { id: string; firstName: string; lastName: string } | null;
  dataQuality?: {
    geoCommuneLinked: boolean;
    geoIncomplete: boolean;
  };
  /** Revue MSPP liée (circuit national), si le département géographique a pu être résolu. */
  msppReview?: { id: string; status: string } | null;
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

export type HaitiGeoDepartment = { id: string; code: string; name: string };
export type HaitiGeoCommune = { id: string; code: string | null; name: string };

/** Référentiel départements / communes (Haïti) pour saisie alignée sur GeoDepartment / GeoCommune. */
export async function fetchHaitiGeoReference(facilityId: string) {
  return apiFetch("/public-health/haiti-geo", {
    facilityId,
  }) as Promise<{
    departments: HaitiGeoDepartment[];
    communesByDepartmentId: Record<string, HaitiGeoCommune[]>;
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
  /** Supports status, commune, department, diseaseCode, diseaseName, reportedFrom, reportedTo, limit, offset */
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
