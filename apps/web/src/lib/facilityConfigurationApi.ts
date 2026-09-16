import type {
  FacilityConfigurationSettings,
  FacilityRuntimeConfiguration,
} from "@medora/shared";
import { adminApiFetch } from "@/lib/adminUsersApi";
import { apiFetch } from "@/lib/apiClient";

export type FacilityConfigurationHistoryRow = {
  id: string;
  revision: number;
  reason: string | null;
  changedByUserId: string;
  changedByName: string | null;
  ip: string | null;
  createdAt: string;
};

export type FacilityConfigurationDocument = {
  facility: {
    id: string;
    name: string;
    code: string;
    timezone: string;
    country: string;
    language: string;
    facilityType: string;
    isActive: boolean;
  };
  revision: number;
  updatedAt: string;
  updatedBy: { id: string; name: string; email: string } | null;
  settings: FacilityConfigurationSettings;
  runtime: FacilityRuntimeConfiguration;
  history: FacilityConfigurationHistoryRow[];
};

export async function fetchFacilityConfiguration(facilityId: string) {
  return adminApiFetch("/facility/configuration", { facilityId }) as Promise<FacilityConfigurationDocument>;
}

export async function patchFacilityConfiguration(
  facilityId: string,
  body: { revision: number; reason?: string; settings: FacilityConfigurationSettings },
) {
  return adminApiFetch("/facility/configuration", {
    facilityId,
    method: "PATCH",
    body: JSON.stringify(body),
  }) as Promise<FacilityConfigurationDocument>;
}

export type FacilityConfigurationRevisionDocument = {
  facilityId: string;
  revision: number;
  reason: string | null;
  createdAt: string;
  changedBy: { id: string; name: string; email: string } | null;
  settings: FacilityConfigurationSettings;
  diffFromCurrent: Array<{ path: string; oldValue: unknown; newValue: unknown }>;
};

export async function fetchFacilityConfigurationRevision(facilityId: string, revision: number) {
  return adminApiFetch(`/facility/configuration/revisions/${revision}`, {
    facilityId,
  }) as Promise<FacilityConfigurationRevisionDocument>;
}

export async function restoreFacilityConfiguration(
  facilityId: string,
  body: { revision: number; restoreRevision: number; reason: string },
) {
  return adminApiFetch("/facility/configuration/restore", {
    facilityId,
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<FacilityConfigurationDocument>;
}

export async function fetchFacilityRuntimeConfiguration(facilityId: string) {
  return apiFetch("/facility/runtime-configuration", { facilityId }) as Promise<FacilityRuntimeConfiguration>;
}
