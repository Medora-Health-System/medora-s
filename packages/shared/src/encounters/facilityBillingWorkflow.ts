import { z } from "zod";
import type { BillingClassification, FacilityBillingSiteType } from "./billingClassification.js";
import { billingClassificationSchema } from "./billingClassification.js";

/** Phase 19UCED.2 — per-facility billing workflow mode (configurable; not all sites use UC/ED switching). */
export const facilityBillingClassificationModeSchema = z.enum([
  "CLINIC_ONLY",
  "URGENT_CARE_ONLY",
  "EMERGENCY_ONLY",
  "HYBRID_UC_ED",
  "HOSPITAL_ENTERPRISE",
]);
export type FacilityBillingClassificationMode = z.infer<typeof facilityBillingClassificationModeSchema>;

export type FacilityBillingWorkflowConfig = {
  billingClassificationMode: FacilityBillingClassificationMode | null;
  billingSiteType: FacilityBillingSiteType | null;
  allowedEncounterBillingClassifications: BillingClassification[];
  allowUrgentCareToEmergencyUpgrade: boolean;
  requireUcToEdPatientAcknowledgement: boolean;
  showEncounterBillingControls: boolean;
};

export type FacilityBillingWorkflowInput = {
  billingClassificationMode?: FacilityBillingClassificationMode | null;
  billingSiteType?: FacilityBillingSiteType | null;
  allowedEncounterBillingClassifications?: BillingClassification[] | null;
  allowUrgentCareToEmergencyUpgrade?: boolean;
  requireUcToEdPatientAcknowledgement?: boolean;
  showEncounterBillingControls?: boolean;
};

const ALL_CLASSIFICATIONS = billingClassificationSchema.options;

/** Default allowed classifications when mode is set and explicit list is empty. */
export function defaultAllowedClassificationsForMode(
  mode: FacilityBillingClassificationMode,
): BillingClassification[] {
  switch (mode) {
    case "CLINIC_ONLY":
      return ["CLINIC_VISIT", "TELEHEALTH", "PROCEDURE"];
    case "URGENT_CARE_ONLY":
      return ["URGENT_CARE", "CLINIC_VISIT", "TELEHEALTH"];
    case "EMERGENCY_ONLY":
      return ["EMERGENCY_DEPARTMENT", "OBSERVATION"];
    case "HYBRID_UC_ED":
      return ["URGENT_CARE", "EMERGENCY_DEPARTMENT", "CLINIC_VISIT", "TELEHEALTH"];
    case "HOSPITAL_ENTERPRISE":
      return [
        "CLINIC_VISIT",
        "URGENT_CARE",
        "EMERGENCY_DEPARTMENT",
        "OBSERVATION",
        "INPATIENT",
        "PROCEDURE",
        "TELEHEALTH",
      ];
    default:
      return [...ALL_CLASSIFICATIONS];
  }
}

export function inferBillingClassificationModeFromSiteType(
  siteType: FacilityBillingSiteType | null | undefined,
): FacilityBillingClassificationMode | null {
  if (!siteType) return null;
  switch (siteType) {
    case "CLINIC":
      return "CLINIC_ONLY";
    case "URGENT_CARE":
      return "URGENT_CARE_ONLY";
    case "FREESTANDING_ER":
      return "EMERGENCY_ONLY";
    case "HYBRID":
      return "HYBRID_UC_ED";
    case "HOSPITAL":
      return "HOSPITAL_ENTERPRISE";
    default:
      return null;
  }
}

export function mapBillingClassificationModeToSiteType(
  mode: FacilityBillingClassificationMode,
): FacilityBillingSiteType {
  switch (mode) {
    case "CLINIC_ONLY":
      return "CLINIC";
    case "URGENT_CARE_ONLY":
      return "URGENT_CARE";
    case "EMERGENCY_ONLY":
      return "FREESTANDING_ER";
    case "HYBRID_UC_ED":
      return "HYBRID";
    case "HOSPITAL_ENTERPRISE":
      return "HOSPITAL";
    default:
      return "HYBRID";
  }
}

/** Resolve effective workflow config — existing facilities with null mode stay operational via site-type inference. */
export function resolveFacilityBillingWorkflowConfig(
  input: FacilityBillingWorkflowInput,
): FacilityBillingWorkflowConfig {
  const mode =
    input.billingClassificationMode ??
    inferBillingClassificationModeFromSiteType(input.billingSiteType ?? null);

  const allowedRaw = input.allowedEncounterBillingClassifications?.filter(Boolean) ?? [];
  const allowedEncounterBillingClassifications =
    allowedRaw.length > 0
      ? allowedRaw
      : mode
        ? defaultAllowedClassificationsForMode(mode)
        : [...ALL_CLASSIFICATIONS];

  const isHybridOrHospital = mode === "HYBRID_UC_ED" || mode === "HOSPITAL_ENTERPRISE";
  const hybridFlags = hybridOperationalFlags(input, isHybridOrHospital);

  // 19UCED.2A — pre-fix creates persisted HYBRID mode with both flags false and empty allowed list.
  const rawAllowedEmpty = (input.allowedEncounterBillingClassifications?.length ?? 0) === 0;
  if (
    mode === "HYBRID_UC_ED" &&
    rawAllowedEmpty &&
    input.allowUrgentCareToEmergencyUpgrade === false &&
    input.showEncounterBillingControls === false
  ) {
    hybridFlags.allowUrgentCareToEmergencyUpgrade = true;
    hybridFlags.showEncounterBillingControls = true;
  }

  return {
    billingClassificationMode: mode,
    billingSiteType: input.billingSiteType ?? (mode ? mapBillingClassificationModeToSiteType(mode) : null),
    allowedEncounterBillingClassifications,
    allowUrgentCareToEmergencyUpgrade: hybridFlags.allowUrgentCareToEmergencyUpgrade,
    requireUcToEdPatientAcknowledgement: input.requireUcToEdPatientAcknowledgement ?? true,
    showEncounterBillingControls: hybridFlags.showEncounterBillingControls,
  };
}

/** Explicit operational transitions — never complaint/ESI driven. */
const OPERATIONAL_TRANSITIONS: Partial<Record<BillingClassification, BillingClassification[]>> = {
  CLINIC_VISIT: ["URGENT_CARE", "EMERGENCY_DEPARTMENT"],
  URGENT_CARE: ["EMERGENCY_DEPARTMENT"],
  EMERGENCY_DEPARTMENT: ["OBSERVATION", "INPATIENT"],
  OBSERVATION: ["INPATIENT"],
};

/** Hybrid UC+ED sites: bidirectional UC ↔ ED only (not observation/inpatient on trackboard). */
function operationalTransitionCandidates(
  from: BillingClassification,
  mode: FacilityBillingClassificationMode | null,
): BillingClassification[] {
  if (mode === "HYBRID_UC_ED") {
    if (from === "URGENT_CARE") return ["EMERGENCY_DEPARTMENT"];
    if (from === "EMERGENCY_DEPARTMENT") return ["URGENT_CARE"];
    return [];
  }
  return OPERATIONAL_TRANSITIONS[from] ?? [];
}

function hybridOperationalFlags(input: FacilityBillingWorkflowInput, isHybridOrHospital: boolean) {
  return {
    allowUrgentCareToEmergencyUpgrade: isHybridOrHospital
      ? (input.allowUrgentCareToEmergencyUpgrade ?? true)
      : Boolean(input.allowUrgentCareToEmergencyUpgrade ?? false),
    showEncounterBillingControls: isHybridOrHospital
      ? (input.showEncounterBillingControls ?? true)
      : Boolean(input.showEncounterBillingControls ?? false),
  };
}

export type AllowedTransitionResult = {
  allowed: boolean;
  requiresAcknowledgment: boolean;
  requiresElevatedPermission: boolean;
  code?: string;
};

export function resolveAllowedTargetClassifications(params: {
  from: BillingClassification;
  facilityConfig: FacilityBillingWorkflowConfig;
  isAdmin: boolean;
}): BillingClassification[] {
  const { from, facilityConfig, isAdmin } = params;
  const mode = facilityConfig.billingClassificationMode;
  const allowedSet = new Set(facilityConfig.allowedEncounterBillingClassifications);
  const candidates = operationalTransitionCandidates(from, mode);

  return candidates.filter((to) => {
    if (to === from || !allowedSet.has(to)) return false;
    const check = validateFacilityBillingTransition({
      from,
      to,
      facilityConfig,
      isAdmin,
    });
    return check.allowed;
  });
}

export function validateFacilityBillingTransition(params: {
  from: BillingClassification;
  to: BillingClassification;
  facilityConfig: FacilityBillingWorkflowConfig;
  isAdmin: boolean;
}): AllowedTransitionResult {
  const { from, to, facilityConfig, isAdmin } = params;

  if (from === to) {
    return { allowed: false, requiresAcknowledgment: false, requiresElevatedPermission: false, code: "NO_OP" };
  }

  const mode = facilityConfig.billingClassificationMode;

  if (from === "URGENT_CARE" && to === "EMERGENCY_DEPARTMENT") {
    if (mode === "CLINIC_ONLY" || mode === "URGENT_CARE_ONLY" || mode === "EMERGENCY_ONLY") {
      return {
        allowed: false,
        requiresAcknowledgment: false,
        requiresElevatedPermission: false,
        code: "UC_TO_ED_DISABLED_FOR_FACILITY",
      };
    }
    if (!facilityConfig.allowUrgentCareToEmergencyUpgrade) {
      return {
        allowed: false,
        requiresAcknowledgment: false,
        requiresElevatedPermission: false,
        code: "UC_TO_ED_UPGRADE_DISABLED",
      };
    }
    if (!facilityConfig.allowedEncounterBillingClassifications.includes(to)) {
      return {
        allowed: false,
        requiresAcknowledgment: false,
        requiresElevatedPermission: false,
        code: "CLASSIFICATION_NOT_ALLOWED_FOR_FACILITY",
      };
    }
    return {
      allowed: true,
      requiresAcknowledgment: facilityConfig.requireUcToEdPatientAcknowledgement,
      requiresElevatedPermission: false,
    };
  }

  if (!facilityConfig.allowedEncounterBillingClassifications.includes(to)) {
    return {
      allowed: false,
      requiresAcknowledgment: false,
      requiresElevatedPermission: false,
      code: "CLASSIFICATION_NOT_ALLOWED_FOR_FACILITY",
    };
  }

  if (from === "EMERGENCY_DEPARTMENT" && to === "URGENT_CARE") {
    if (mode === "HYBRID_UC_ED") {
      if (!facilityConfig.showEncounterBillingControls) {
        return {
          allowed: false,
          requiresAcknowledgment: false,
          requiresElevatedPermission: false,
          code: "BILLING_CONTROLS_DISABLED_FOR_FACILITY",
        };
      }
      if (!facilityConfig.allowedEncounterBillingClassifications.includes(to)) {
        return {
          allowed: false,
          requiresAcknowledgment: false,
          requiresElevatedPermission: false,
          code: "CLASSIFICATION_NOT_ALLOWED_FOR_FACILITY",
        };
      }
      return {
        allowed: true,
        requiresAcknowledgment: false,
        requiresElevatedPermission: false,
      };
    }
    return {
      allowed: isAdmin,
      requiresAcknowledgment: true,
      requiresElevatedPermission: true,
      code: isAdmin ? undefined : "ED_DOWNGRADE_REQUIRES_ADMIN",
    };
  }

  const modeAllowsOperational =
    mode === "HYBRID_UC_ED" || mode === "HOSPITAL_ENTERPRISE" || mode === null;

  if (!modeAllowsOperational && !isAdmin) {
    return {
      allowed: false,
      requiresAcknowledgment: false,
      requiresElevatedPermission: true,
      code: "TRANSITION_REQUIRES_ADMIN",
    };
  }

  const candidates = operationalTransitionCandidates(from, mode);
  if (!candidates.includes(to) && !isAdmin) {
    return {
      allowed: false,
      requiresAcknowledgment: false,
      requiresElevatedPermission: true,
      code: "TRANSITION_REQUIRES_ADMIN",
    };
  }

  if (isAdmin || candidates.includes(to)) {
    return {
      allowed: true,
      requiresAcknowledgment: to === "EMERGENCY_DEPARTMENT" && from === "URGENT_CARE",
      requiresElevatedPermission: false,
    };
  }

  return {
    allowed: false,
    requiresAcknowledgment: false,
    requiresElevatedPermission: true,
    code: "TRANSITION_NOT_ALLOWED",
  };
}

export const facilityBillingWorkflowPatchDtoSchema = z.object({
  billingClassificationMode: facilityBillingClassificationModeSchema.nullable().optional(),
  allowedEncounterBillingClassifications: z.array(billingClassificationSchema).optional(),
  allowUrgentCareToEmergencyUpgrade: z.boolean().optional(),
  requireUcToEdPatientAcknowledgement: z.boolean().optional(),
  showEncounterBillingControls: z.boolean().optional(),
});

export type FacilityBillingWorkflowPatchDto = z.infer<typeof facilityBillingWorkflowPatchDtoSchema>;

/** UI presets for UC→ED modal — maps to existing reason codes (no PHI). */
export const UC_TO_ED_OPERATIONAL_REASON_PRESETS = [
  { presetKey: "CHEST_PAIN_WORKUP", reasonCode: "HIGHER_ACUITY_WORKUP_REQUIRED" as const },
  { presetKey: "ABDOMINAL_PAIN_EVAL", reasonCode: "HIGHER_ACUITY_WORKUP_REQUIRED" as const },
  { presetKey: "CARDIAC_MONITORING", reasonCode: "PROVIDER_DIRECTED_ED_EVALUATION" as const },
  { presetKey: "ADVANCED_IMAGING", reasonCode: "HIGHER_ACUITY_WORKUP_REQUIRED" as const },
  { presetKey: "IV_MEDS_OBSERVATION", reasonCode: "PROVIDER_DIRECTED_ED_EVALUATION" as const },
  { presetKey: "PROVIDER_ESCALATION", reasonCode: "PROVIDER_DIRECTED_ED_EVALUATION" as const },
  { presetKey: "OTHER", reasonCode: "OTHER" as const },
] as const;
