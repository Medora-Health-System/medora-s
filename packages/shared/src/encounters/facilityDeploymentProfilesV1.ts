/**
 * D3E.5 — Facility deployment profiles (module visibility only).
 * Profiles must never rewrite clinical encounter identity.
 */

export const FACILITY_DEPLOYMENT_PROFILES = [
  "FSER",
  "HOSPITAL",
  "HOSPITAL_WITHOUT_ED",
] as const;

export type FacilityDeploymentProfile = (typeof FACILITY_DEPLOYMENT_PROFILES)[number];

export type FacilityModuleCapabilities = {
  edEnabled: boolean;
  observationEnabled: boolean;
  inpatientEnabled: boolean;
  sharedLabRadPharmacyEnabled: boolean;
  externalTransferEnabled: boolean;
  directAdmissionEnabled: boolean;
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
      };
    case "HOSPITAL":
      return {
        edEnabled: true,
        observationEnabled: true,
        inpatientEnabled: true,
        sharedLabRadPharmacyEnabled: true,
        externalTransferEnabled: true,
        directAdmissionEnabled: true,
      };
    case "HOSPITAL_WITHOUT_ED":
      return {
        edEnabled: false,
        observationEnabled: true,
        inpatientEnabled: true,
        sharedLabRadPharmacyEnabled: true,
        externalTransferEnabled: true,
        directAdmissionEnabled: true,
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
