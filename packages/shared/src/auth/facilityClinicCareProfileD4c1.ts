/**
 * MEDUI.D4C.1 — Clinic / Urgent Care facility profile and ambulatory care-setting foundation.
 *
 * Presentation authority for Clinic Care over the Medora One shared core.
 * Does not invent parallel clinical engines, facility taxonomies, or a full trackboard UI.
 */

import {
  normalizeFacilityType,
  type MedoraFacilityType,
} from "./facilityTypeRegistry.js";
import {
  resolveFacilityServiceLines,
  type ResolveFacilityServiceLinesInput,
} from "./facilityServiceLines.js";
import type { MedoraServiceLine } from "./facilityTypeRegistry.js";
import {
  getLandingRouteForNavigationProfile,
  getVisibleNavigationAreas,
  type NavigationArea,
  type NavigationProfileInput,
} from "./navigationAuthorization.js";
import type { ProfessionGroup } from "./professionResolver.js";

/** Ambulatory care-setting authority (not a Prisma enum; maps onto existing vocabularies). */
export const AMBULATORY_CARE_SETTING = "AMBULATORY" as const;
export type AmbulatoryCareSetting = typeof AMBULATORY_CARE_SETTING;

/** Operating modes under AMBULATORY. */
export const AMBULATORY_OPERATING_MODES = [
  "CLINIC",
  "URGENT_CARE",
  "CLINIC_AND_URGENT_CARE",
] as const;
export type AmbulatoryOperatingMode = (typeof AMBULATORY_OPERATING_MODES)[number];

/** Subtypes for documentation / reporting labels (config-driven; never facility names). */
export const AMBULATORY_CARE_SUBTYPES = [
  "PRIMARY_CARE_CLINIC",
  "SPECIALTY_CLINIC",
  "URGENT_CARE_CENTER",
  "HYBRID_CLINIC_UC",
] as const;
export type AmbulatoryCareSubtype = (typeof AMBULATORY_CARE_SUBTYPES)[number];

/**
 * Facility profile authority for Clinic/UC presentation.
 * Preserves ED / Hospital / FSER / outside-diagnostic profiles.
 */
export const FACILITY_CARE_PROFILES = [
  "CLINIC",
  "URGENT_CARE",
  "CLINIC_AND_URGENT_CARE",
  "FREESTANDING_ER",
  "HOSPITAL",
  "OUTSIDE_DIAGNOSTIC",
] as const;
export type FacilityCareProfile = (typeof FACILITY_CARE_PROFILES)[number];

/** Optional modules an admin may enable beyond type defaults (never hard-coded facility names). */
export type FacilityOptionalModules = {
  laboratory: boolean;
  radiology: boolean;
  pharmacy: boolean;
  publicHealth: boolean;
  billing: boolean;
};

/** Structured operational facility address (letterhead / print; distinct from billing identity). */
export type FacilityOperationalAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
};

/** Print-identity projection inputs (facility display name + operational address). */
export type FacilityPrintIdentity = {
  displayName: string | null;
  address: FacilityOperationalAddress;
};

/** Persisted additive JSON shape on `Facility.facilityCareProfileJson`. */
export type FacilityCareProfileJson = {
  schemaVersion: 1;
  careSetting?: AmbulatoryCareSetting | null;
  operatingMode?: AmbulatoryOperatingMode | null;
  subtype?: AmbulatoryCareSubtype | null;
  profile?: FacilityCareProfile | null;
  optionalModules?: Partial<FacilityOptionalModules> | null;
  address?: Partial<FacilityOperationalAddress> | null;
  printDisplayName?: string | null;
};

export type FacilityModuleCapabilitiesD4c1 = {
  clinicCareEnabled: boolean;
  urgentCareEnabled: boolean;
  edEnabled: boolean;
  observationEnabled: boolean;
  inpatientEnabled: boolean;
  laboratoryEnabled: boolean;
  radiologyEnabled: boolean;
  pharmacyEnabled: boolean;
  publicHealthEnabled: boolean;
  billingEnabled: boolean;
  registrationEnabled: boolean;
};

/**
 * Six mandatory primary KPI metric ids (D4C.2).
 * DISCHARGE_PENDING is required (not optional). READY_FOR_COMPLETION is not a
 * user-facing KPI — see private source-state helper in D4C.2 projection.
 */
export const CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS = [
  "TODAYS_VISITS",
  "WAITING",
  "IN_PROGRESS",
  "RESULTS_PENDING",
  "DISCHARGE_PENDING",
  "FOLLOW_UPS_DUE",
] as const;

/**
 * No user-facing secondary KPIs in D4C.2 final contract.
 * Kept as empty const so callers that imported the secondary list remain type-safe.
 */
export const CLINIC_CARE_SECONDARY_TRACKBOARD_METRIC_IDS = [] as const;

/** Full metric contract ids (six mandatory primaries). */
export const CLINIC_CARE_TRACKBOARD_METRIC_IDS = [
  "TODAYS_VISITS",
  "WAITING",
  "IN_PROGRESS",
  "RESULTS_PENDING",
  "DISCHARGE_PENDING",
  "FOLLOW_UPS_DUE",
] as const;
export type ClinicCareTrackboardMetricId = (typeof CLINIC_CARE_TRACKBOARD_METRIC_IDS)[number];
export type ClinicCarePrimaryTrackboardMetricId =
  (typeof CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS)[number];
export type ClinicCareSecondaryTrackboardMetricId =
  (typeof CLINIC_CARE_SECONDARY_TRACKBOARD_METRIC_IDS)[number];

/**
 * Maps D4C.2 summary tiles onto audited encounter / order / follow-up states.
 * Counts are computed in D4C.2; D4C.1 only defines the contract.
 */
export type ClinicCareTrackboardMetricContract = {
  id: ClinicCareTrackboardMetricId;
  labelKeyEn: string;
  labelKeyFr: string;
  /** Encounter workflow states that contribute (when applicable). */
  encounterWorkflowStates: readonly string[];
  /** Encounter status filter (OPEN vs any). */
  encounterStatuses: readonly ("OPEN" | "CLOSED" | "CANCELLED" | "ANY")[];
  /** When true, metric also considers open FollowUp rows due on/before facility-local today. */
  includeFollowUpsDue: boolean;
  /** When true, metric may include encounters with non-terminal lab/rad orders pending result. */
  includePendingDiagnosticOrders: boolean;
  /** Facility-local calendar day scope. */
  scope: "FACILITY_LOCAL_TODAY" | "FACILITY_OPEN_PIPELINE";
};

export const CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS: readonly ClinicCareTrackboardMetricContract[] =
  [
    {
      id: "TODAYS_VISITS",
      labelKeyEn: "Today's visits",
      labelKeyFr: "Visites du jour",
      encounterWorkflowStates: [
        "ARRIVED",
        "TRIAGE",
        "IN_TREATMENT",
        "RESULTS_PENDING",
        "DISPOSITION",
        "DISCHARGE_READY",
        "FINALIZED",
      ],
      encounterStatuses: ["OPEN", "CLOSED"],
      includeFollowUpsDue: false,
      includePendingDiagnosticOrders: false,
      scope: "FACILITY_LOCAL_TODAY",
    },
    {
      id: "WAITING",
      labelKeyEn: "Waiting",
      labelKeyFr: "En attente",
      encounterWorkflowStates: ["ARRIVED", "TRIAGE"],
      encounterStatuses: ["OPEN"],
      includeFollowUpsDue: false,
      includePendingDiagnosticOrders: false,
      scope: "FACILITY_OPEN_PIPELINE",
    },
    {
      id: "IN_PROGRESS",
      labelKeyEn: "In progress",
      labelKeyFr: "En cours",
      encounterWorkflowStates: ["IN_TREATMENT", "DISPOSITION"],
      encounterStatuses: ["OPEN"],
      includeFollowUpsDue: false,
      includePendingDiagnosticOrders: false,
      scope: "FACILITY_OPEN_PIPELINE",
    },
    {
      id: "RESULTS_PENDING",
      labelKeyEn: "Results pending",
      labelKeyFr: "Résultats en attente",
      encounterWorkflowStates: ["RESULTS_PENDING"],
      encounterStatuses: ["OPEN"],
      includeFollowUpsDue: false,
      includePendingDiagnosticOrders: true,
      scope: "FACILITY_OPEN_PIPELINE",
    },
    {
      id: "DISCHARGE_PENDING",
      labelKeyEn: "Discharge Pending",
      labelKeyFr: "Sorties en attente",
      /**
       * Reuses enterprise EncounterWorkflowState — no ClinicDischarge table.
       * Provider pathway advanced to DISCHARGE_READY / FINALIZED while still OPEN
       * (outstanding completion steps remain; leave KPI when CLOSED).
       */
      encounterWorkflowStates: ["DISCHARGE_READY", "FINALIZED"],
      encounterStatuses: ["OPEN"],
      includeFollowUpsDue: false,
      includePendingDiagnosticOrders: false,
      scope: "FACILITY_OPEN_PIPELINE",
    },
    {
      id: "FOLLOW_UPS_DUE",
      labelKeyEn: "Follow-ups due",
      labelKeyFr: "Suivis à faire",
      encounterWorkflowStates: [],
      encounterStatuses: ["ANY"],
      includeFollowUpsDue: true,
      includePendingDiagnosticOrders: false,
      scope: "FACILITY_LOCAL_TODAY",
    },
  ] as const;

/**
 * Haiti public-health jurisdiction tokens accepted on Facility.country.
 * Jurisdiction is regulatory destination — never inferred from UI language alone.
 */
export const HAITI_PUBLIC_HEALTH_JURISDICTION_TOKENS = ["HT", "HTI", "HAITI"] as const;

/**
 * True when facility country denotes Haiti MSPP jurisdiction.
 * Accepts ISO-ish codes (HT / HTI) and common country name "Haiti".
 * Language / locale alone must never return true.
 */
export function isHaitiPublicHealthJurisdiction(
  facilityCountry: string | null | undefined
): boolean {
  const n = String(facilityCountry ?? "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "");
  if (!n) return false;
  if ((HAITI_PUBLIC_HEALTH_JURISDICTION_TOKENS as readonly string[]).includes(n)) return true;
  // Explicit non-matches for common false friends (language ≠ jurisdiction).
  if (n === "FR" || n === "FRA" || n === "FRANCE" || n === "CA" || n === "CANADA") return false;
  return false;
}

/**
 * Language / locale is labels-only — never a regulatory jurisdiction signal.
 * Always returns false so callers cannot accidentally treat `fr` as Haiti MSPP.
 */
export function isHaitiJurisdictionFromLanguageAlone(
  _languageOrLocale: string | null | undefined
): boolean {
  return false;
}

export const EMPTY_FACILITY_OPERATIONAL_ADDRESS: FacilityOperationalAddress = {
  line1: null,
  line2: null,
  city: null,
  stateProvince: null,
  postalCode: null,
  country: null,
  phone: null,
};

export const DEFAULT_CLINIC_OPTIONAL_MODULES: FacilityOptionalModules = {
  laboratory: true,
  radiology: false,
  pharmacy: false,
  publicHealth: false,
  billing: true,
};

export const DEFAULT_URGENT_CARE_OPTIONAL_MODULES: FacilityOptionalModules = {
  laboratory: true,
  radiology: true,
  pharmacy: false,
  publicHealth: false,
  billing: true,
};

export const DEFAULT_HYBRID_CLINIC_UC_OPTIONAL_MODULES: FacilityOptionalModules = {
  laboratory: true,
  radiology: true,
  pharmacy: false,
  publicHealth: false,
  billing: true,
};

/** Ambulatory service-line tokens (MEDUI.D4C.1) — config-driven, never facility names. */
export const AMBULATORY_SERVICE_LINES = ["CLINIC", "URGENT_CARE"] as const;
export type AmbulatoryServiceLine = (typeof AMBULATORY_SERVICE_LINES)[number];

export function isAmbulatoryServiceLine(value: string | null | undefined): value is AmbulatoryServiceLine {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();
  return code === "CLINIC" || code === "URGENT_CARE";
}

export function parseFacilityCareProfileJson(raw: unknown): FacilityCareProfileJson | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const schemaVersion = obj.schemaVersion === 1 ? 1 : 1;
  return {
    schemaVersion,
    careSetting: obj.careSetting === "AMBULATORY" ? "AMBULATORY" : null,
    operatingMode: isAmbulatoryOperatingMode(obj.operatingMode) ? obj.operatingMode : null,
    subtype: isAmbulatoryCareSubtype(obj.subtype) ? obj.subtype : null,
    profile: isFacilityCareProfile(obj.profile) ? obj.profile : null,
    optionalModules:
      obj.optionalModules && typeof obj.optionalModules === "object" && !Array.isArray(obj.optionalModules)
        ? (obj.optionalModules as Partial<FacilityOptionalModules>)
        : null,
    address:
      obj.address && typeof obj.address === "object" && !Array.isArray(obj.address)
        ? (obj.address as Partial<FacilityOperationalAddress>)
        : null,
    printDisplayName:
      typeof obj.printDisplayName === "string" ? obj.printDisplayName.trim() || null : null,
  };
}

export function isAmbulatoryOperatingMode(value: unknown): value is AmbulatoryOperatingMode {
  return (
    typeof value === "string" &&
    (AMBULATORY_OPERATING_MODES as readonly string[]).includes(value.trim().toUpperCase())
  );
}

export function isAmbulatoryCareSubtype(value: unknown): value is AmbulatoryCareSubtype {
  return (
    typeof value === "string" &&
    (AMBULATORY_CARE_SUBTYPES as readonly string[]).includes(value.trim().toUpperCase())
  );
}

export function isFacilityCareProfile(value: unknown): value is FacilityCareProfile {
  return (
    typeof value === "string" &&
    (FACILITY_CARE_PROFILES as readonly string[]).includes(value.trim().toUpperCase())
  );
}

/**
 * Resolve facility care profile from type + optional stored JSON.
 * Never silently converts HOSPITAL / FREESTANDING_ER / outside diagnostics to Clinic.
 */
export function resolveFacilityCareProfile(input: {
  facilityType?: MedoraFacilityType | string | null;
  careProfileJson?: unknown;
  serviceLines?: readonly string[] | null;
}): FacilityCareProfile {
  const stored = parseFacilityCareProfileJson(input.careProfileJson);
  if (stored?.profile) return stored.profile;

  const facilityType = normalizeFacilityType(input.facilityType);
  if (facilityType === "HOSPITAL") return "HOSPITAL";
  if (facilityType === "FREESTANDING_ER") return "FREESTANDING_ER";
  if (
    facilityType === "OUTSIDE_LABORATORY" ||
    facilityType === "OUTSIDE_RADIOLOGY" ||
    facilityType === "OUTSIDE_PHARMACY"
  ) {
    return "OUTSIDE_DIAGNOSTIC";
  }

  const lines = resolveFacilityServiceLines({
    facilityType,
    configuredServiceLines: input.serviceLines ?? null,
  });
  const hasClinic = lines.includes("CLINIC");
  const hasUc = lines.includes("URGENT_CARE");
  if (facilityType === "CLINIC" && hasUc && hasClinic) return "CLINIC_AND_URGENT_CARE";
  if (facilityType === "CLINIC") return "CLINIC";
  if (facilityType === "URGENT_CARE" && hasClinic) return "CLINIC_AND_URGENT_CARE";
  if (facilityType === "URGENT_CARE") return "URGENT_CARE";
  return "CLINIC";
}

export function resolveAmbulatoryOperatingMode(input: {
  facilityType?: MedoraFacilityType | string | null;
  careProfileJson?: unknown;
  serviceLines?: readonly string[] | null;
}): AmbulatoryOperatingMode | null {
  const stored = parseFacilityCareProfileJson(input.careProfileJson);
  if (stored?.operatingMode) return stored.operatingMode;

  const profile = resolveFacilityCareProfile(input);
  switch (profile) {
    case "CLINIC":
      return "CLINIC";
    case "URGENT_CARE":
      return "URGENT_CARE";
    case "CLINIC_AND_URGENT_CARE":
      return "CLINIC_AND_URGENT_CARE";
    default:
      return null;
  }
}

export function isAmbulatoryFacilityProfile(profile: FacilityCareProfile): boolean {
  return (
    profile === "CLINIC" || profile === "URGENT_CARE" || profile === "CLINIC_AND_URGENT_CARE"
  );
}

/** Default ambulatory service lines for Clinic (D4C.1) — replaces Observation→Hospital mapping. */
export function getClinicDefaultServiceLines(): MedoraServiceLine[] {
  return ["CLINIC", "LABORATORY"];
}

/** Default ambulatory service lines for Urgent Care (D4C.1). */
export function getUrgentCareDefaultServiceLines(): MedoraServiceLine[] {
  return ["URGENT_CARE", "LABORATORY", "RADIOLOGY"];
}

/** Hybrid Clinic + UC defaults. */
export function getClinicAndUrgentCareDefaultServiceLines(): MedoraServiceLine[] {
  return ["CLINIC", "URGENT_CARE", "LABORATORY", "RADIOLOGY"];
}

export function getDefaultOptionalModulesForProfile(
  profile: FacilityCareProfile
): FacilityOptionalModules {
  switch (profile) {
    case "URGENT_CARE":
      return { ...DEFAULT_URGENT_CARE_OPTIONAL_MODULES };
    case "CLINIC_AND_URGENT_CARE":
      return { ...DEFAULT_HYBRID_CLINIC_UC_OPTIONAL_MODULES };
    case "CLINIC":
      return { ...DEFAULT_CLINIC_OPTIONAL_MODULES };
    default:
      return {
        laboratory: true,
        radiology: true,
        pharmacy: true,
        publicHealth: true,
        billing: true,
      };
  }
}

export function getDefaultBillingClassificationModeForProfile(
  profile: FacilityCareProfile
): "CLINIC_ONLY" | "URGENT_CARE_ONLY" | "HYBRID_UC_ED" | "EMERGENCY_ONLY" | "HOSPITAL_ENTERPRISE" | null {
  switch (profile) {
    case "CLINIC":
      return "CLINIC_ONLY";
    case "URGENT_CARE":
      return "URGENT_CARE_ONLY";
    case "CLINIC_AND_URGENT_CARE":
      return "URGENT_CARE_ONLY";
    case "FREESTANDING_ER":
      return "EMERGENCY_ONLY";
    case "HOSPITAL":
      return "HOSPITAL_ENTERPRISE";
    default:
      return null;
  }
}

export function resolveFacilityOptionalModules(input: {
  facilityType?: MedoraFacilityType | string | null;
  careProfileJson?: unknown;
  serviceLines?: readonly string[] | null;
  /** Facility.country — Haiti jurisdiction enables publicHealth preset when unset. */
  facilityCountry?: string | null;
}): FacilityOptionalModules {
  const profile = resolveFacilityCareProfile(input);
  const defaults = getDefaultOptionalModulesForProfile(profile);
  const stored = parseFacilityCareProfileJson(input.careProfileJson);
  const lines = resolveFacilityServiceLines({
    facilityType: input.facilityType,
    configuredServiceLines: input.serviceLines ?? null,
  });
  // Haiti Clinic Care preset: public health on by default when jurisdiction is Haiti
  // and optionalModules.publicHealth is not explicitly stored. Language alone never triggers this.
  const haitiPreset = isHaitiPublicHealthJurisdiction(input.facilityCountry);
  const publicHealthDefault = haitiPreset ? true : defaults.publicHealth;
  const fromLines: FacilityOptionalModules = {
    laboratory: lines.includes("LABORATORY"),
    radiology: lines.includes("RADIOLOGY"),
    pharmacy: lines.includes("PHARMACY"),
    publicHealth: publicHealthDefault,
    billing: defaults.billing,
  };
  return {
    laboratory: stored?.optionalModules?.laboratory ?? fromLines.laboratory,
    radiology: stored?.optionalModules?.radiology ?? fromLines.radiology,
    pharmacy: stored?.optionalModules?.pharmacy ?? fromLines.pharmacy,
    publicHealth: stored?.optionalModules?.publicHealth ?? publicHealthDefault,
    billing: stored?.optionalModules?.billing ?? defaults.billing,
  };
}

export function resolveFacilityModuleCapabilitiesD4c1(input: {
  facilityType?: MedoraFacilityType | string | null;
  careProfileJson?: unknown;
  serviceLines?: readonly string[] | null;
  facilityCountry?: string | null;
}): FacilityModuleCapabilitiesD4c1 {
  const profile = resolveFacilityCareProfile(input);
  const lines = resolveFacilityServiceLines({
    facilityType: input.facilityType,
    configuredServiceLines: input.serviceLines ?? null,
  });
  const modules = resolveFacilityOptionalModules(input);
  const ambulatory = isAmbulatoryFacilityProfile(profile);

  return {
    clinicCareEnabled: ambulatory && (lines.includes("CLINIC") || profile === "CLINIC" || profile === "CLINIC_AND_URGENT_CARE"),
    urgentCareEnabled:
      ambulatory &&
      (lines.includes("URGENT_CARE") || profile === "URGENT_CARE" || profile === "CLINIC_AND_URGENT_CARE"),
    edEnabled: lines.includes("EMERGENCY") || profile === "FREESTANDING_ER" || profile === "HOSPITAL",
    observationEnabled: lines.includes("OBSERVATION") || profile === "HOSPITAL" || profile === "FREESTANDING_ER",
    inpatientEnabled:
      profile === "HOSPITAL" &&
      (lines.includes("MEDSURG") || lines.includes("ICU") || lines.includes("TELEMETRY")),
    laboratoryEnabled: modules.laboratory,
    radiologyEnabled: modules.radiology,
    pharmacyEnabled: modules.pharmacy,
    publicHealthEnabled: modules.publicHealth,
    billingEnabled: modules.billing,
    registrationEnabled: ambulatory || profile === "FREESTANDING_ER" || profile === "HOSPITAL",
  };
}

export function normalizeFacilityOperationalAddress(
  partial?: Partial<FacilityOperationalAddress> | null
): FacilityOperationalAddress {
  return {
    line1: trimOrNull(partial?.line1),
    line2: trimOrNull(partial?.line2),
    city: trimOrNull(partial?.city),
    stateProvince: trimOrNull(partial?.stateProvince),
    postalCode: trimOrNull(partial?.postalCode),
    country: trimOrNull(partial?.country),
    phone: trimOrNull(partial?.phone),
  };
}

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Print-identity projection: display name + operational address.
 * Falls back to facility name; may fall back to billing address fields when operational address empty.
 */
export function projectFacilityPrintIdentity(input: {
  facilityName?: string | null;
  careProfileJson?: unknown;
  billingAddress?: Partial<FacilityOperationalAddress> | null;
}): FacilityPrintIdentity {
  const stored = parseFacilityCareProfileJson(input.careProfileJson);
  const operational = normalizeFacilityOperationalAddress(stored?.address);
  const billing = normalizeFacilityOperationalAddress(input.billingAddress);
  const addressHasContent = Boolean(
    operational.line1 ||
      operational.city ||
      operational.stateProvince ||
      operational.postalCode ||
      operational.phone
  );
  return {
    displayName: trimOrNull(stored?.printDisplayName) ?? trimOrNull(input.facilityName),
    address: addressHasContent ? operational : billing,
  };
}

export function buildFacilityCareProfileJson(input: {
  profile?: FacilityCareProfile | null;
  operatingMode?: AmbulatoryOperatingMode | null;
  subtype?: AmbulatoryCareSubtype | null;
  optionalModules?: Partial<FacilityOptionalModules> | null;
  address?: Partial<FacilityOperationalAddress> | null;
  printDisplayName?: string | null;
}): FacilityCareProfileJson {
  const ambulatory =
    input.profile != null && isAmbulatoryFacilityProfile(input.profile)
      ? ("AMBULATORY" as const)
      : input.operatingMode
        ? ("AMBULATORY" as const)
        : null;
  return {
    schemaVersion: 1,
    careSetting: ambulatory,
    operatingMode: input.operatingMode ?? null,
    subtype: input.subtype ?? null,
    profile: input.profile ?? null,
    optionalModules: input.optionalModules ?? null,
    address: input.address ? normalizeFacilityOperationalAddress(input.address) : null,
    printDisplayName: trimOrNull(input.printDisplayName),
  };
}

/** Apply optional-module toggles onto a service-line list (additive; never invent facility names). */
export function applyOptionalModulesToServiceLines(
  baseLines: readonly MedoraServiceLine[],
  modules: FacilityOptionalModules
): MedoraServiceLine[] {
  const set = new Set<MedoraServiceLine>(baseLines);
  if (modules.laboratory) set.add("LABORATORY");
  else set.delete("LABORATORY");
  if (modules.radiology) set.add("RADIOLOGY");
  else set.delete("RADIOLOGY");
  if (modules.pharmacy) set.add("PHARMACY");
  else set.delete("PHARMACY");
  return [...set];
}

export function getTypeDefaultServiceLinesForCareProfile(
  profile: FacilityCareProfile
): MedoraServiceLine[] {
  switch (profile) {
    case "CLINIC":
      return getClinicDefaultServiceLines();
    case "URGENT_CARE":
      return getUrgentCareDefaultServiceLines();
    case "CLINIC_AND_URGENT_CARE":
      return getClinicAndUrgentCareDefaultServiceLines();
    default:
      return [];
  }
}

/**
 * Role → Clinic Care workspace eligibility (facility capabilities still gate navigation).
 * Facility module eligibility ≠ user authorization.
 * Assignment ≠ authorization.
 * Projection ≠ source authority.
 */
export type ClinicCareWorkspaceRoleAccess = {
  canAccessClinicCareShell: boolean;
  /** Shared Clinic trackboard projection (D4C.2 UI deferred; visibility contract only). */
  canAccessClinicTrackboardProjection: boolean;
  /** Today's Visits projection when Clinic Care shell authorized. */
  canAccessTodaysVisitsProjection: boolean;
  /**
   * Nursing / MA operational dashboard visibility.
   * For TECHNICIAN this is the technician-safe projection only — never full nursing authorship.
   */
  canAccessNursingMa: boolean;
  /** Explicit technician-safe Nursing/MA projection (vitals, rooming, specimen, POC, ECG tasks, etc.). */
  canAccessTechnicianSafeNursingMaProjection: boolean;
  canAccessAssignedTechnicianTasks: boolean;
  canAccessProviderDocumentation: boolean;
  canAccessRegistration: boolean;
  /** Patients list / lookup when Clinic Care shell authorized. */
  canAccessPatients: boolean;
  /** Encounters list (operational; not clinical authorship). */
  canAccessEncounters: boolean;
  /** Follow-up module — only when separately authorized (Provider/RN/Admin). */
  canAccessFollowUps: boolean;
  /** Facility Lab module ON and user Lab-authorized. */
  canAccessLaboratory: boolean;
  /** Facility Rad module ON and user Radiology-authorized. */
  canAccessRadiology: boolean;
  /** Alias: laboratory or radiology worklist visibility. */
  canAccessDiagnosticsWorklists: boolean;
  canAccessPharmacy: boolean;
  canAccessBilling: boolean;
  canAccessAdministration: boolean;
  /**
   * Public Health shell links (existing /app/public-health/* routes).
   * Requires Clinic Care + publicHealth module (+ Haiti preset when applicable) + Provider/RN/Admin.
   * Does not invent ClinicVaccine; reuses VaccineAdministration / DiseaseCaseReport engines.
   */
  canAccessPublicHealth: boolean;
  /** Immunizations view/record per existing professional PH auth (Provider/RN/Admin). */
  canAccessPublicHealthImmunizations: boolean;
  /** Disease reporting view/create per existing professional PH auth. */
  canAccessPublicHealthDiseaseReporting: boolean;
  /**
   * Haiti MSPP pathway exposure (DiseaseCaseReport → MSPP review / export).
   * Jurisdiction by Facility.country — never language alone. Non-Haiti: false.
   */
  canAccessMsppHaitiPathway: boolean;
  /** Vaccine administration write — Provider/RN/Admin only; Front Desk/Billing/Pharmacy/Tech denied. */
  canAdministerVaccines: boolean;
  /** Source-authority denials (shell visibility must never flip these on for tech / front desk / billing). */
  canAuthorProviderDocumentation: boolean;
  canMutateDiagnosesOrProblemList: boolean;
  canIssueProviderOrders: boolean;
  canPrescribe: boolean;
  canAuthorIndependentNursingAssessment: boolean;
  canAdministerMedicationsUnrestricted: boolean;
  canCompleteDispositionOrEncounter: boolean;
  canSignAsNurseOrProvider: boolean;
};

const CLINIC_CARE_AUTHORITY_DENIED: Pick<
  ClinicCareWorkspaceRoleAccess,
  | "canAuthorProviderDocumentation"
  | "canMutateDiagnosesOrProblemList"
  | "canIssueProviderOrders"
  | "canPrescribe"
  | "canAuthorIndependentNursingAssessment"
  | "canAdministerMedicationsUnrestricted"
  | "canCompleteDispositionOrEncounter"
  | "canSignAsNurseOrProvider"
> = {
  canAuthorProviderDocumentation: false,
  canMutateDiagnosesOrProblemList: false,
  canIssueProviderOrders: false,
  canPrescribe: false,
  canAuthorIndependentNursingAssessment: false,
  canAdministerMedicationsUnrestricted: false,
  canCompleteDispositionOrEncounter: false,
  canSignAsNurseOrProvider: false,
};

const CLINIC_CARE_PH_DENIED: Pick<
  ClinicCareWorkspaceRoleAccess,
  | "canAccessPublicHealth"
  | "canAccessPublicHealthImmunizations"
  | "canAccessPublicHealthDiseaseReporting"
  | "canAccessMsppHaitiPathway"
  | "canAdministerVaccines"
> = {
  canAccessPublicHealth: false,
  canAccessPublicHealthImmunizations: false,
  canAccessPublicHealthDiseaseReporting: false,
  canAccessMsppHaitiPathway: false,
  canAdministerVaccines: false,
};

/**
 * Clinic Care Public Health exposure over existing PH engines.
 * - Jurisdiction = Facility.country (Haiti), not UI language.
 * - MSPP pathway only when Haiti jurisdiction.
 * - General immunizations/disease reporting when PH module on (Haiti preset or explicit).
 * - Does not auto-grant MSPP approver roles to Nurses.
 * - MA is not a silent RN substitute (no MA RoleCode → denied here).
 */
export function resolveClinicCarePublicHealthAccess(input: {
  professionGroup: ProfessionGroup | string;
  clinicOrUrgentCareEnabled: boolean;
  publicHealthEnabled: boolean;
  facilityCountry?: string | null;
}): Pick<
  ClinicCareWorkspaceRoleAccess,
  | "canAccessPublicHealth"
  | "canAccessPublicHealthImmunizations"
  | "canAccessPublicHealthDiseaseReporting"
  | "canAccessMsppHaitiPathway"
  | "canAdministerVaccines"
> {
  const p = String(input.professionGroup ?? "")
    .trim()
    .toUpperCase();
  const haiti = isHaitiPublicHealthJurisdiction(input.facilityCountry);
  const phOn = input.publicHealthEnabled === true;
  const clinicOn = input.clinicOrUrgentCareEnabled === true;
  const clinicalPhRole = p === "PROVIDER" || p === "RN" || p === "ADMIN";

  if (!clinicOn || !phOn || !clinicalPhRole) {
    return { ...CLINIC_CARE_PH_DENIED };
  }

  return {
    canAccessPublicHealth: true,
    canAccessPublicHealthImmunizations: true,
    canAccessPublicHealthDiseaseReporting: true,
    canAccessMsppHaitiPathway: haiti,
    canAdministerVaccines: true,
  };
}

const PROVIDER_CLINIC_AUTHORITY: typeof CLINIC_CARE_AUTHORITY_DENIED = {
  canAuthorProviderDocumentation: true,
  canMutateDiagnosesOrProblemList: true,
  canIssueProviderOrders: true,
  canPrescribe: true,
  canAuthorIndependentNursingAssessment: false,
  canAdministerMedicationsUnrestricted: false,
  canCompleteDispositionOrEncounter: true,
  canSignAsNurseOrProvider: true,
};

const RN_CLINIC_AUTHORITY: typeof CLINIC_CARE_AUTHORITY_DENIED = {
  canAuthorProviderDocumentation: false,
  canMutateDiagnosesOrProblemList: false,
  canIssueProviderOrders: false,
  canPrescribe: false,
  canAuthorIndependentNursingAssessment: true,
  canAdministerMedicationsUnrestricted: true,
  canCompleteDispositionOrEncounter: true,
  canSignAsNurseOrProvider: true,
};

function normalizeClinicCareRoleCodes(roleCodes: readonly string[] | undefined): string[] {
  return (roleCodes ?? []).map((code) => code.trim().toUpperCase()).filter(Boolean);
}

function technicianHasLabAuthorization(roleCodes: readonly string[]): boolean {
  return roleCodes.includes("LAB");
}

function technicianHasRadiologyAuthorization(roleCodes: readonly string[]): boolean {
  return roleCodes.includes("RADIOLOGY");
}

export function resolveClinicCareWorkspaceRoleAccess(input: {
  professionGroup: ProfessionGroup;
  moduleCapabilities: FacilityModuleCapabilitiesD4c1;
  /** Role codes used for Lab/Rad user authorization (facility module eligibility still required). */
  roleCodes?: readonly string[];
  /** Facility.country for Haiti PH jurisdiction (not language). */
  facilityCountry?: string | null;
}): ClinicCareWorkspaceRoleAccess {
  const { professionGroup: p, moduleCapabilities: caps } = input;
  const roles = normalizeClinicCareRoleCodes(input.roleCodes);
  const clinicOn = caps.clinicCareEnabled || caps.urgentCareEnabled;
  const labOn = caps.laboratoryEnabled;
  const radOn = caps.radiologyEnabled;
  const phAccess = resolveClinicCarePublicHealthAccess({
    professionGroup: p,
    clinicOrUrgentCareEnabled: clinicOn,
    publicHealthEnabled: caps.publicHealthEnabled,
    facilityCountry: input.facilityCountry,
  });

  if (p === "ADMIN") {
    return {
      canAccessClinicCareShell: clinicOn,
      canAccessClinicTrackboardProjection: clinicOn,
      canAccessTodaysVisitsProjection: clinicOn,
      canAccessNursingMa: clinicOn,
      canAccessTechnicianSafeNursingMaProjection: false,
      canAccessAssignedTechnicianTasks: clinicOn,
      canAccessProviderDocumentation: clinicOn,
      canAccessRegistration: caps.registrationEnabled,
      canAccessPatients: clinicOn,
      canAccessEncounters: clinicOn,
      canAccessFollowUps: clinicOn,
      canAccessLaboratory: labOn,
      canAccessRadiology: radOn,
      canAccessDiagnosticsWorklists: labOn || radOn,
      canAccessPharmacy: caps.pharmacyEnabled,
      canAccessBilling: caps.billingEnabled,
      canAccessAdministration: true,
      ...phAccess,
      ...PROVIDER_CLINIC_AUTHORITY,
      canAuthorIndependentNursingAssessment: true,
      canAdministerMedicationsUnrestricted: true,
    };
  }

  if (p === "PROVIDER") {
    return {
      canAccessClinicCareShell: clinicOn,
      canAccessClinicTrackboardProjection: clinicOn,
      canAccessTodaysVisitsProjection: clinicOn,
      canAccessNursingMa: false,
      canAccessTechnicianSafeNursingMaProjection: false,
      canAccessAssignedTechnicianTasks: false,
      canAccessProviderDocumentation: clinicOn,
      canAccessRegistration: false,
      canAccessPatients: clinicOn,
      canAccessEncounters: clinicOn,
      canAccessFollowUps: clinicOn,
      canAccessLaboratory: labOn,
      canAccessRadiology: radOn,
      canAccessDiagnosticsWorklists: labOn || radOn,
      canAccessPharmacy: false,
      canAccessBilling: false,
      canAccessAdministration: false,
      ...phAccess,
      ...PROVIDER_CLINIC_AUTHORITY,
    };
  }

  if (p === "RN") {
    return {
      canAccessClinicCareShell: clinicOn,
      canAccessClinicTrackboardProjection: clinicOn,
      canAccessTodaysVisitsProjection: clinicOn,
      canAccessNursingMa: clinicOn,
      canAccessTechnicianSafeNursingMaProjection: false,
      canAccessAssignedTechnicianTasks: false,
      canAccessProviderDocumentation: false,
      canAccessRegistration: caps.registrationEnabled,
      canAccessPatients: clinicOn,
      canAccessEncounters: clinicOn,
      canAccessFollowUps: clinicOn,
      canAccessLaboratory: labOn,
      canAccessRadiology: radOn && roles.includes("RADIOLOGY"),
      canAccessDiagnosticsWorklists: labOn || (radOn && roles.includes("RADIOLOGY")),
      canAccessPharmacy: false,
      canAccessBilling: false,
      canAccessAdministration: false,
      ...phAccess,
      ...RN_CLINIC_AUTHORITY,
    };
  }

  if (p === "FRONT_DESK") {
    // Authorized Front Desk / Registration at Clinic Care-enabled facility may use the shell +
    // operational trackboard. Clinical authorship remains denied.
    return {
      canAccessClinicCareShell: clinicOn,
      canAccessClinicTrackboardProjection: clinicOn,
      canAccessTodaysVisitsProjection: clinicOn,
      canAccessNursingMa: false,
      canAccessTechnicianSafeNursingMaProjection: false,
      canAccessAssignedTechnicianTasks: false,
      canAccessProviderDocumentation: false,
      canAccessRegistration: caps.registrationEnabled,
      canAccessPatients: clinicOn,
      canAccessEncounters: clinicOn,
      canAccessFollowUps: false,
      canAccessLaboratory: false,
      canAccessRadiology: false,
      canAccessDiagnosticsWorklists: false,
      canAccessPharmacy: false,
      canAccessBilling: caps.billingEnabled,
      canAccessAdministration: false,
      ...CLINIC_CARE_PH_DENIED,
      ...CLINIC_CARE_AUTHORITY_DENIED,
    };
  }

  if (p === "TECHNICIAN") {
    const labAuthorized = labOn && technicianHasLabAuthorization(roles);
    const radAuthorized = radOn && technicianHasRadiologyAuthorization(roles);
    // Patient-care techs and diagnostic techs are Clinic Care eligible when ambulatory modules on.
    // Lab/Rad worklists still require facility module + role authorization.
    const diagnosticsOnlyWithoutClinic =
      !clinicOn && (labAuthorized || radAuthorized);
    const shellOn = clinicOn;
    return {
      canAccessClinicCareShell: shellOn,
      canAccessClinicTrackboardProjection: shellOn,
      canAccessTodaysVisitsProjection: shellOn,
      canAccessNursingMa: shellOn,
      canAccessTechnicianSafeNursingMaProjection: shellOn,
      canAccessAssignedTechnicianTasks: shellOn || diagnosticsOnlyWithoutClinic,
      canAccessProviderDocumentation: false,
      canAccessRegistration: false,
      canAccessPatients: shellOn,
      canAccessEncounters: shellOn,
      canAccessFollowUps: false,
      canAccessLaboratory: labAuthorized,
      canAccessRadiology: radAuthorized,
      canAccessDiagnosticsWorklists: labAuthorized || radAuthorized,
      canAccessPharmacy: false,
      canAccessBilling: false,
      canAccessAdministration: false,
      ...CLINIC_CARE_PH_DENIED,
      ...CLINIC_CARE_AUTHORITY_DENIED,
    };
  }

  if (p === "PHARMACY") {
    // Clinic Care shell only when Clinic Care enabled AND Pharmacy module enabled
    // AND user has Pharmacy authorization (this profession branch).
    const pharmacyShell = clinicOn && caps.pharmacyEnabled;
    return {
      canAccessClinicCareShell: pharmacyShell,
      canAccessClinicTrackboardProjection: pharmacyShell,
      canAccessTodaysVisitsProjection: pharmacyShell,
      canAccessNursingMa: false,
      canAccessTechnicianSafeNursingMaProjection: false,
      canAccessAssignedTechnicianTasks: false,
      canAccessProviderDocumentation: false,
      canAccessRegistration: false,
      canAccessPatients: pharmacyShell,
      canAccessEncounters: pharmacyShell,
      canAccessFollowUps: false,
      canAccessLaboratory: false,
      canAccessRadiology: false,
      canAccessDiagnosticsWorklists: false,
      canAccessPharmacy: caps.pharmacyEnabled,
      canAccessBilling: false,
      canAccessAdministration: false,
      ...CLINIC_CARE_PH_DENIED,
      ...CLINIC_CARE_AUTHORITY_DENIED,
    };
  }

  if (p === "BILLING") {
    // Authorized Billing at Clinic Care-enabled facility may use the shell + operational trackboard
    // and billing/facture. Clinical authorship remains denied.
    return {
      canAccessClinicCareShell: clinicOn,
      canAccessClinicTrackboardProjection: clinicOn,
      canAccessTodaysVisitsProjection: clinicOn,
      canAccessNursingMa: false,
      canAccessTechnicianSafeNursingMaProjection: false,
      canAccessAssignedTechnicianTasks: false,
      canAccessProviderDocumentation: false,
      canAccessRegistration: false,
      canAccessPatients: clinicOn,
      canAccessEncounters: clinicOn,
      canAccessFollowUps: false,
      canAccessLaboratory: false,
      canAccessRadiology: false,
      canAccessDiagnosticsWorklists: false,
      canAccessPharmacy: false,
      canAccessBilling: caps.billingEnabled,
      canAccessAdministration: false,
      ...CLINIC_CARE_PH_DENIED,
      ...CLINIC_CARE_AUTHORITY_DENIED,
    };
  }

  return {
    canAccessClinicCareShell: false,
    canAccessClinicTrackboardProjection: false,
    canAccessTodaysVisitsProjection: false,
    canAccessNursingMa: false,
    canAccessTechnicianSafeNursingMaProjection: false,
    canAccessAssignedTechnicianTasks: false,
    canAccessProviderDocumentation: false,
    canAccessRegistration: false,
    canAccessPatients: false,
    canAccessEncounters: false,
    canAccessFollowUps: false,
    canAccessLaboratory: false,
    canAccessRadiology: false,
    canAccessDiagnosticsWorklists: false,
    canAccessPharmacy: false,
    canAccessBilling: false,
    canAccessAdministration: false,
    ...CLINIC_CARE_PH_DENIED,
    ...CLINIC_CARE_AUTHORITY_DENIED,
  };
}

export type ResolveFacilityNavigationInput = NavigationProfileInput & {
  careProfileJson?: unknown;
};

export type FacilityNavigationResolution = {
  profile: FacilityCareProfile;
  operatingMode: AmbulatoryOperatingMode | null;
  capabilities: FacilityModuleCapabilitiesD4c1;
  areas: NavigationArea[];
  landingPath: string;
  /** ED / Hospital / Obs presentation hidden for pure Clinic/UC unless hybrid lines present. */
  edVisible: boolean;
  hospitalVisible: boolean;
  clinicCareVisible: boolean;
};

/**
 * Server-authoritative facility navigation for Clinic/UC presentation.
 * Wraps existing navigation profile resolution; does not replace profession auth.
 */
export function resolveFacilityNavigation(
  input: ResolveFacilityNavigationInput
): FacilityNavigationResolution {
  const serviceLinesInput: ResolveFacilityServiceLinesInput = {
    facilityType: input.facilityType,
    configuredServiceLines: input.facilityServiceLines ?? null,
  };
  const lines = resolveFacilityServiceLines(serviceLinesInput);
  const profile = resolveFacilityCareProfile({
    facilityType: input.facilityType,
    careProfileJson: input.careProfileJson,
    serviceLines: lines,
  });
  const operatingMode = resolveAmbulatoryOperatingMode({
    facilityType: input.facilityType,
    careProfileJson: input.careProfileJson,
    serviceLines: lines,
  });
  const capabilities = resolveFacilityModuleCapabilitiesD4c1({
    facilityType: input.facilityType,
    careProfileJson: input.careProfileJson,
    serviceLines: lines,
  });

  let areas = getVisibleNavigationAreas({
    ...input,
    facilityServiceLines: lines,
  });

  const ambulatory = isAmbulatoryFacilityProfile(profile);
  if (ambulatory) {
    // Hide ED / Hospital / Obs presentation unless hybrid service lines explicitly enable them.
    if (!capabilities.edEnabled) {
      areas = areas.filter((a) => a !== "EMERGENCY");
    }
    if (!capabilities.observationEnabled && !capabilities.inpatientEnabled) {
      areas = areas.filter((a) => a !== "HOSPITAL");
    }
    if (!capabilities.laboratoryEnabled) {
      areas = areas.filter((a) => a !== "LABORATORY");
    }
    if (!capabilities.radiologyEnabled) {
      areas = areas.filter((a) => a !== "RADIOLOGY");
    }
    if (!capabilities.pharmacyEnabled) {
      areas = areas.filter((a) => a !== "PHARMACY");
    }
    if (!capabilities.billingEnabled) {
      areas = areas.filter((a) => a !== "BILLING");
    }
  }

  const clinicCareVisible = areas.includes("CLINIC_CARE");
  const edVisible = areas.includes("EMERGENCY");
  const hospitalVisible = areas.includes("HOSPITAL");

  const landingPath = ambulatory && clinicCareVisible
    ? "/app/clinic-care"
    : getLandingRouteForNavigationProfile({
        ...input,
        facilityServiceLines: lines,
      });

  return {
    profile,
    operatingMode,
    capabilities,
    areas,
    landingPath,
    edVisible,
    hospitalVisible,
    clinicCareVisible,
  };
}

export function clinicCareTrackboardMetricContractById(
  id: ClinicCareTrackboardMetricId
): ClinicCareTrackboardMetricContract | undefined {
  return CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS.find((c) => c.id === id);
}
