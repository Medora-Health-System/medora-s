import type {
  FacilityConfigurationSettings,
  FacilityModuleKey,
} from "./facilityConfiguration.js";

/**
 * Phase 2 — canonical country policy authority.
 *
 * Country policy is an upstream eligibility / mandatory-policy layer.
 * It does NOT replace FacilityConfiguration and it never creates a country-specific
 * clinical engine. Facility.country remains the jurisdiction source of truth.
 */
export const MEDORA_COUNTRY_CODES = ["US", "DO", "HT"] as const;
export type MedoraCountryCode = (typeof MEDORA_COUNTRY_CODES)[number];

export type CountryCapabilityDecision = "ALLOWED" | "PROHIBITED";

export type CountryCapabilityPolicy = Readonly<{
  decision: CountryCapabilityDecision;
  reason: string;
}>;

export type CountryPolicy = Readonly<{
  country: MedoraCountryCode;
  defaultLanguage: "en" | "es" | "fr";
  modules: Readonly<Record<FacilityModuleKey, CountryCapabilityPolicy>>;
}>;

const allowed = (reason: string): CountryCapabilityPolicy => ({
  decision: "ALLOWED",
  reason,
});

const allModulesAllowed = (countryLabel: string): Readonly<Record<FacilityModuleKey, CountryCapabilityPolicy>> => ({
  emergency: allowed(`${countryLabel}: facility/service-line configuration controls Emergency availability.`),
  urgentCare: allowed(`${countryLabel}: facility/service-line configuration controls Urgent Care availability.`),
  clinic: allowed(`${countryLabel}: facility/service-line configuration controls Clinic availability.`),
  observation: allowed(`${countryLabel}: facility/service-line configuration controls Observation availability.`),
  hospital: allowed(`${countryLabel}: facility/service-line configuration controls Hospital availability.`),
  laboratory: allowed(`${countryLabel}: facility configuration controls Laboratory availability.`),
  radiology: allowed(`${countryLabel}: facility configuration controls Radiology availability.`),
  pharmacy: allowed(`${countryLabel}: facility configuration controls Pharmacy availability.`),
  billing: allowed(`${countryLabel}: facility configuration controls Billing availability.`),
  scheduling: allowed(`${countryLabel}: facility configuration controls Scheduling availability.`),
  digitalCare: allowed(`${countryLabel}: facility configuration controls Digital Care availability.`),
  patientPortal: allowed(`${countryLabel}: facility configuration controls Patient Portal availability.`),
  telemedicine: allowed(`${countryLabel}: facility configuration controls Telemedicine availability.`),
  ai: allowed(`${countryLabel}: facility configuration controls AI availability.`),
});

/**
 * Conservative Phase-2 registry:
 * no clinical module is prohibited until a documented legal/regulatory/product
 * requirement establishes that prohibition. This prevents guessed jurisdiction
 * rules from silently disabling clinical care.
 */
export const COUNTRY_POLICY_REGISTRY: Readonly<Record<MedoraCountryCode, CountryPolicy>> = {
  US: {
    country: "US",
    defaultLanguage: "en",
    modules: allModulesAllowed("United States"),
  },
  DO: {
    country: "DO",
    defaultLanguage: "es",
    modules: allModulesAllowed("Dominican Republic"),
  },
  HT: {
    country: "HT",
    defaultLanguage: "fr",
    modules: allModulesAllowed("Haiti"),
  },
};

const COUNTRY_ALIASES: Readonly<Record<string, MedoraCountryCode>> = {
  US: "US",
  USA: "US",
  "UNITED STATES": "US",
  "UNITED STATES OF AMERICA": "US",
  DO: "DO",
  DOM: "DO",
  DR: "DO",
  "DOMINICAN REPUBLIC": "DO",
  "REPÚBLICA DOMINICANA": "DO",
  "REPUBLICA DOMINICANA": "DO",
  HT: "HT",
  HTI: "HT",
  HAITI: "HT",
  "HAÏTI": "HT",
};

export function normalizeMedoraCountryCode(value: string | null | undefined): MedoraCountryCode | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  return COUNTRY_ALIASES[normalized] ?? null;
}

export function resolveCountryPolicy(value: string | null | undefined): CountryPolicy | null {
  const code = normalizeMedoraCountryCode(value);
  return code ? COUNTRY_POLICY_REGISTRY[code] : null;
}

export type EffectiveFacilityModuleCapability = Readonly<{
  country: MedoraCountryCode | null;
  module: FacilityModuleKey;
  countryDecision: CountryCapabilityDecision | "UNCONFIGURED_COUNTRY";
  facilityEnabled: boolean;
  effectiveEnabled: boolean;
  reason: string;
}>;

/**
 * Effective capability is fail-closed for a country policy that explicitly
 * prohibits the module. Unknown/legacy country values preserve the existing
 * FacilityConfiguration behavior for backwards compatibility, while surfacing
 * UNCONFIGURED_COUNTRY for certification/telemetry.
 *
 * A facility can always narrow an ALLOWED country capability by disabling it.
 * A facility can never resurrect a PROHIBITED country capability.
 */
export function resolveEffectiveFacilityModuleCapability(input: {
  country: string | null | undefined;
  module: FacilityModuleKey;
  facilitySettings: Pick<FacilityConfigurationSettings, "modules">;
}): EffectiveFacilityModuleCapability {
  const policy = resolveCountryPolicy(input.country);
  const facilityEnabled = input.facilitySettings.modules[input.module].enabled;

  if (!policy) {
    return {
      country: null,
      module: input.module,
      countryDecision: "UNCONFIGURED_COUNTRY",
      facilityEnabled,
      effectiveEnabled: facilityEnabled,
      reason: "Country is not yet registered in the Medora country policy registry; existing facility configuration is preserved.",
    };
  }

  const countryCapability = policy.modules[input.module];
  const effectiveEnabled = countryCapability.decision === "ALLOWED" && facilityEnabled;
  return {
    country: policy.country,
    module: input.module,
    countryDecision: countryCapability.decision,
    facilityEnabled,
    effectiveEnabled,
    reason: countryCapability.reason,
  };
}

/**
 * Applies only country prohibitions to a cloned facility configuration.
 * FacilityConfiguration remains the canonical facility-owned document.
 */
export function applyCountryPolicyToFacilityConfiguration(
  country: string | null | undefined,
  settings: FacilityConfigurationSettings,
): FacilityConfigurationSettings {
  const policy = resolveCountryPolicy(country);
  if (!policy) return structuredClone(settings);

  const next = structuredClone(settings);
  for (const module of Object.keys(policy.modules) as FacilityModuleKey[]) {
    if (policy.modules[module].decision !== "PROHIBITED") continue;
    next.modules[module] = {
      ...next.modules[module],
      enabled: false,
      visible: false,
      hidden: true,
      readOnly: false,
      maintenance: false,
    };
  }
  return next;
}


export type EffectiveFacilityFeatureCapability = Readonly<{
  country: MedoraCountryCode | null;
  feature: "carePlans";
  parentModule: FacilityModuleKey;
  countryDecision: CountryCapabilityDecision | "UNCONFIGURED_COUNTRY";
  facilityEnabled: boolean;
  effectiveEnabled: boolean;
  reason: string;
}>;

/**
 * Phase 3 granular clinical capability resolver.
 *
 * Granular features inherit the effective state of their parent module and may
 * then be narrowed by their own facility setting. This prevents a child feature
 * from resurrecting a disabled country/facility module.
 */
export function resolveEffectiveCarePlansCapability(input: {
  country: string | null | undefined;
  facilitySettings: FacilityConfigurationSettings;
}): EffectiveFacilityFeatureCapability {
  const hospital = resolveEffectiveFacilityModuleCapability({
    country: input.country,
    module: "hospital",
    facilitySettings: input.facilitySettings,
  });
  const facilityEnabled = input.facilitySettings.digitalCare.carePlans;
  return {
    country: hospital.country,
    feature: "carePlans",
    parentModule: "hospital",
    countryDecision: hospital.countryDecision,
    facilityEnabled,
    effectiveEnabled: hospital.effectiveEnabled && facilityEnabled,
    reason: hospital.effectiveEnabled
      ? "Care Plans are controlled by this facility after country and Hospital eligibility."
      : "Care Plans are unavailable because the effective Hospital capability is disabled.",
  };
}
