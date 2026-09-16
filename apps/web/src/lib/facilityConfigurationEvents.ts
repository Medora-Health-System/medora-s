export const FACILITY_CONFIGURATION_UPDATED_EVENT = "FacilityConfigurationUpdated";

export type FacilityConfigurationUpdatedDetail = {
  facilityId: string;
  revision: number;
};

export function broadcastFacilityConfigurationUpdated(detail: FacilityConfigurationUpdatedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FACILITY_CONFIGURATION_UPDATED_EVENT, { detail }));
}

export function subscribeFacilityConfigurationUpdated(
  listener: (detail: FacilityConfigurationUpdatedDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<FacilityConfigurationUpdatedDetail>).detail;
    if (!detail?.facilityId) return;
    listener(detail);
  };
  window.addEventListener(FACILITY_CONFIGURATION_UPDATED_EVENT, handler);
  return () => window.removeEventListener(FACILITY_CONFIGURATION_UPDATED_EVENT, handler);
}
