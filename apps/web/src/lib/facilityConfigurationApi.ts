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

export async function fetchFacilityRuntimeConfiguration(facilityId: string) {
  return apiFetch("/facility/runtime-configuration", { facilityId }) as Promise<FacilityRuntimeConfiguration>;
}
