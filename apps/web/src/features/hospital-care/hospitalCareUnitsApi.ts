/**
 * D3E.6B — Hospital Care clinical unit registry client.
 */

import { apiFetch } from "@/lib/apiClient";

export type HospitalUnitBedNode = {
  id: string;
  bedKey: string;
  code: string;
  name: string;
  occupied: boolean;
  occupantEncounterId: string | null;
};

export type HospitalUnitRoomNode = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  beds: HospitalUnitBedNode[];
};

export type HospitalUnitRegistryUnit = {
  id: string;
  code: string;
  name: string;
  unitType: string;
  levelOfCare: string;
  specialty: string | null;
  active: boolean;
  acceptsInpatient: boolean;
  acceptsObservation: boolean;
  developmentOnly: boolean;
  patientCount: number;
  occupiedBedCount: number | null;
  availableBedCount: number | null;
  alertCount: number;
  rooms: HospitalUnitRoomNode[];
  physicalLocationHint: string | null;
};

export type HospitalUnitRegistryResponse = {
  facilityId: string;
  generatedAt: string;
  certification: string;
  placementAvailability: "ENABLED" | "FEATURE_DISABLED";
  units: HospitalUnitRegistryUnit[];
  awaitingAssignmentCount: number;
  configuration: {
    hasConfiguredUnits: boolean;
    adminConfigurationAvailable: boolean;
    developmentFixturesIncluded: boolean;
  };
};

export async function fetchHospitalUnitRegistry(options?: {
  facilityId?: string | null;
}): Promise<HospitalUnitRegistryResponse> {
  const facilityId = options?.facilityId?.trim() || undefined;
  return apiFetch("/hospital-care/units", { facilityId }) as Promise<HospitalUnitRegistryResponse>;
}
