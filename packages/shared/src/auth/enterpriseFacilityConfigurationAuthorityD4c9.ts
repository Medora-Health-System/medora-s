/**
 * MEDUI.D4C.9 — Enterprise Facility Configuration Authority projection.
 * ONE authoritative capability/readiness view for a facility — not a second feature matrix.
 */

import {
  resolveFacilityModuleCapabilitiesD4c1,
  resolveFacilityNavigation,
  resolveFacilityOptionalModules,
  type FacilityModuleCapabilitiesD4c1,
  type FacilityOptionalModules,
} from "./facilityClinicCareProfileD4c1.js";
import {
  parseStoredFacilityServiceLines,
  resolveFacilityServiceLines,
} from "./facilityServiceLines.js";
import type { MedoraFacilityType, MedoraServiceLine } from "./facilityTypeRegistry.js";
import {
  resolveDentalSpecialtiesFromCareProfile,
  type D5a2DentalSpecialty,
} from "./enterpriseDentalServiceLineNavigationD5a2.js";
import {
  resolveEffectiveFacilityBillingWorkflow,
  type FacilityBillingClassificationMode,
  type FacilityBillingWorkflowResolutionSource,
  type FacilityBillingWorkflowInput,
} from "../encounters/facilityBillingWorkflow.js";

export const D4C9_CERTIFICATION_ID = "MEDUI.D4C.9" as const;

/** Typed conflict when concurrent Admins overwrite facility configuration. */
export const FACILITY_CONFIGURATION_CONFLICT = "FACILITY_CONFIGURATION_CONFLICT" as const;

export type EnterpriseFacilityServiceLineReadiness =
  | "DISABLED"
  | "ENABLED_READY"
  | "ENABLED_ATTENTION";

export type EnterpriseFacilityCapabilitiesProjection = {
  certificationId: typeof D4C9_CERTIFICATION_ID;
  facilityId: string;
  facilityType: MedoraFacilityType | string | null;
  serviceLines: MedoraServiceLine[];
  dentalSpecialties: D5a2DentalSpecialty[];
  optionalModules: FacilityOptionalModules;
  moduleCapabilities: FacilityModuleCapabilitiesD4c1;
  navigationAreas: string[];
  billingWorkflow: {
    configuredMode: FacilityBillingClassificationMode | null;
    effectiveMode: FacilityBillingClassificationMode | null;
    source: FacilityBillingWorkflowResolutionSource;
  };
  /** Per service-line operational readiness (projection only). */
  serviceLineReadiness: Partial<Record<MedoraServiceLine, EnterpriseFacilityServiceLineReadiness>>;
  configurationUpdatedAt: string | null;
};

export type ProjectEnterpriseFacilityCapabilitiesInput = {
  facilityId: string;
  facilityType?: MedoraFacilityType | string | null;
  serviceLinesJson?: unknown;
  careProfileJson?: unknown;
  facilityCountry?: string | null;
  billing?: FacilityBillingWorkflowInput | null;
  updatedAt?: Date | string | null;
};

function readinessForLine(
  line: MedoraServiceLine,
  enabled: boolean,
  billingUnresolved: boolean
): EnterpriseFacilityServiceLineReadiness {
  if (!enabled) return "DISABLED";
  if (billingUnresolved && (line === "CLINIC" || line === "URGENT_CARE" || line === "EMERGENCY")) {
    return "ENABLED_ATTENTION";
  }
  return "ENABLED_READY";
}

/**
 * Canonical enterprise facility capability projection.
 * Reuses D4C.1 module caps, D5A.2 dental specialties, and D4C.9 effective billing resolver.
 */
export function projectEnterpriseFacilityCapabilities(
  input: ProjectEnterpriseFacilityCapabilitiesInput
): EnterpriseFacilityCapabilitiesProjection {
  const configured = parseStoredFacilityServiceLines(input.serviceLinesJson);
  const serviceLines = resolveFacilityServiceLines({
    facilityType: input.facilityType,
    configuredServiceLines: configured,
  });
  const moduleCapabilities = resolveFacilityModuleCapabilitiesD4c1({
    facilityType: input.facilityType,
    careProfileJson: input.careProfileJson,
    serviceLines,
    facilityCountry: input.facilityCountry,
  });
  const optionalModules = resolveFacilityOptionalModules({
    facilityType: input.facilityType,
    careProfileJson: input.careProfileJson,
    serviceLines,
    facilityCountry: input.facilityCountry,
  });
  const navigation = resolveFacilityNavigation({
    roleCodes: ["PROVIDER"],
    facilityType: input.facilityType,
    careProfileJson: input.careProfileJson,
    facilityServiceLines: serviceLines,
  });
  const billing = resolveEffectiveFacilityBillingWorkflow(input.billing ?? {});
  const dentalSpecialties = resolveDentalSpecialtiesFromCareProfile(input.careProfileJson);
  const billingUnresolved = billing.source === "UNRESOLVED";

  const serviceLineReadiness: Partial<Record<MedoraServiceLine, EnterpriseFacilityServiceLineReadiness>> =
    {};
  for (const line of serviceLines) {
    const enabled =
      line === "DENTAL"
        ? moduleCapabilities.dentalCareEnabled
        : line === "PHARMACY"
          ? moduleCapabilities.pharmacyEnabled
          : line === "LABORATORY"
            ? moduleCapabilities.laboratoryEnabled
            : line === "RADIOLOGY"
              ? moduleCapabilities.radiologyEnabled
              : true;
    serviceLineReadiness[line] = readinessForLine(line, enabled, billingUnresolved);
  }
  if (!moduleCapabilities.dentalCareEnabled) {
    serviceLineReadiness.DENTAL = "DISABLED";
  } else if (moduleCapabilities.dentalCareEnabled && dentalSpecialties.length === 0) {
    serviceLineReadiness.DENTAL = "ENABLED_ATTENTION";
  }

  const updatedAt =
    input.updatedAt == null
      ? null
      : input.updatedAt instanceof Date
        ? input.updatedAt.toISOString()
        : String(input.updatedAt);

  return {
    certificationId: D4C9_CERTIFICATION_ID,
    facilityId: input.facilityId,
    facilityType: input.facilityType ?? null,
    serviceLines,
    dentalSpecialties,
    optionalModules,
    moduleCapabilities,
    navigationAreas: navigation.areas.map(String),
    billingWorkflow: {
      configuredMode: billing.configuredMode,
      effectiveMode: billing.effectiveMode,
      source: billing.source,
    },
    serviceLineReadiness,
    configurationUpdatedAt: updatedAt,
  };
}

export type FacilityServiceLineDisablePreflight = {
  serviceLine: string;
  openEncounterCount: number;
  futureAppointmentCount: number;
  acknowledgementRequired: boolean;
  messageKey: "facilityServiceConfigD4c9.preflightWarning";
};

export function buildServiceLineDisablePreflight(input: {
  serviceLine: string;
  openEncounterCount: number;
  futureAppointmentCount: number;
}): FacilityServiceLineDisablePreflight {
  const open = Math.max(0, input.openEncounterCount);
  const future = Math.max(0, input.futureAppointmentCount);
  return {
    serviceLine: input.serviceLine,
    openEncounterCount: open,
    futureAppointmentCount: future,
    acknowledgementRequired: open > 0 || future > 0,
    messageKey: "facilityServiceConfigD4c9.preflightWarning",
  };
}
