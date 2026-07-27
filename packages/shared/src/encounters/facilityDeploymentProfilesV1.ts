/**
 * D3E.5 — Facility deployment profiles (module visibility only).
 * Profiles must never rewrite clinical encounter identity.
 * MEDUI.D4C.1 — adds Clinic / Urgent Care ambulatory profiles.
 */

export const FACILITY_DEPLOYMENT_PROFILES = [
  "FSER",
  "HOSPITAL",
  "HOSPITAL_WITHOUT_ED",
  "CLINIC",
  "URGENT_CARE",
  "CLINIC_AND_URGENT_CARE",
] as const;

export type FacilityDeploymentProfile = (typeof FACILITY_DEPLOYMENT_PROFILES)[number];

export type FacilityModuleCapabilities = {
  edEnabled: boolean;
  observationEnabled: boolean;
  inpatientEnabled: boolean;
  sharedLabRadPharmacyEnabled: boolean;
  externalTransferEnabled: boolean;
  directAdmissionEnabled: boolean;
  /** MEDUI.D4C.1 */
  clinicCareEnabled?: boolean;
  urgentCareEnabled?: boolean;
};

export function capabilitiesForDeploymentProfile(
  profile: FacilityDeploymentProfile
): FacilityModuleCapabilities {
  switch (profile) {
    case "FSER":
      return {
        edEnabled: true,
        observationEnabled: true,
        inpatientEnabled: false,
        sharedLabRadPharmacyEnabled: true,
        externalTransferEnabled: true,
        directAdmissionEnabled: false,
        clinicCareEnabled: false,
        urgentCareEnabled: false,
      };
    case "HOSPITAL":
      return {
        edEnabled: true,
        observationEnabled: true,
        inpatientEnabled: true,
        sharedLabRadPharmacyEnabled: true,
        externalTransferEnabled: true,
        directAdmissionEnabled: true,
        clinicCareEnabled: false,
        urgentCareEnabled: false,
      };
    case "HOSPITAL_WITHOUT_ED":
      return {
        edEnabled: false,
        observationEnabled: true,
        inpatientEnabled: true,
        sharedLabRadPharmacyEnabled: true,
        externalTransferEnabled: true,
        directAdmissionEnabled: true,
        clinicCareEnabled: false,
        urgentCareEnabled: false,
      };
    case "CLINIC":
      return {
        edEnabled: false,
        observationEnabled: false,
        inpatientEnabled: false,
        sharedLabRadPharmacyEnabled: true,
        externalTransferEnabled: false,
        directAdmissionEnabled: false,
        clinicCareEnabled: true,
        urgentCareEnabled: false,
      };
    case "URGENT_CARE":
      return {
        edEnabled: false,
        observationEnabled: false,
        inpatientEnabled: false,
        sharedLabRadPharmacyEnabled: true,
        externalTransferEnabled: true,
        directAdmissionEnabled: false,
        clinicCareEnabled: false,
        urgentCareEnabled: true,
      };
    case "CLINIC_AND_URGENT_CARE":
      return {
        edEnabled: false,
        observationEnabled: false,
        inpatientEnabled: false,
        sharedLabRadPharmacyEnabled: true,
        externalTransferEnabled: true,
        directAdmissionEnabled: false,
        clinicCareEnabled: true,
        urgentCareEnabled: true,
      };
  }
}

export function inpatientAdmissionUnavailableByConfiguration(input: {
  profile: FacilityDeploymentProfile;
}): { unavailable: boolean; reason: "INPATIENT_DISABLED_BY_PROFILE" | null } {
  const caps = capabilitiesForDeploymentProfile(input.profile);
  if (!caps.inpatientEnabled) {
    return { unavailable: true, reason: "INPATIENT_DISABLED_BY_PROFILE" };
  }
  return { unavailable: false, reason: null };
}

/** Profiles gate authorization/visibility — never reclassify encounters. */
export function deploymentProfileMustNotRewriteEncounterIdentity(): true {
  return true;
}

/** Map operational facility type → deployment profile (MEDUI.D4C.1). */
export function deploymentProfileForFacilityType(
  facilityType: string | null | undefined
): FacilityDeploymentProfile {
  const code = String(facilityType ?? "")
    .trim()
    .toUpperCase();
  switch (code) {
    case "FREESTANDING_ER":
      return "FSER";
    case "HOSPITAL":
      return "HOSPITAL";
    case "URGENT_CARE":
      return "URGENT_CARE";
    case "CLINIC":
      return "CLINIC";
    default:
      return "CLINIC";
  }
}
