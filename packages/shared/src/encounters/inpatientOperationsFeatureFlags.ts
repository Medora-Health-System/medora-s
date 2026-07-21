/**
 * D3E.7 — Inpatient clinical operations feature flags (production defaults OFF).
 */

function isTruthyFlag(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type InpatientOperationsFlagEnv = {
  INPATIENT_WORKSPACE_ENABLED?: string | null;
  NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED?: string | null;
  INPATIENT_DOCUMENTATION_ENABLED?: string | null;
  NEXT_PUBLIC_INPATIENT_DOCUMENTATION_ENABLED?: string | null;
  INPATIENT_NURSING_ENABLED?: string | null;
  NEXT_PUBLIC_INPATIENT_NURSING_ENABLED?: string | null;
  INPATIENT_CONSULTS_ENABLED?: string | null;
  NEXT_PUBLIC_INPATIENT_CONSULTS_ENABLED?: string | null;
  INPATIENT_CARE_PLAN_ENABLED?: string | null;
  NEXT_PUBLIC_INPATIENT_CARE_PLAN_ENABLED?: string | null;
  INPATIENT_DISCHARGE_PLANNING_ENABLED?: string | null;
  NEXT_PUBLIC_INPATIENT_DISCHARGE_PLANNING_ENABLED?: string | null;
  DIRECT_INPATIENT_ADMISSION_ENABLED?: string | null;
  NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED?: string | null;
  PLACEMENT_ACTIONS_ENABLED?: string | null;
  NEXT_PUBLIC_PLACEMENT_ACTIONS_ENABLED?: string | null;
};

export function inpatientOperationsFlagsFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): InpatientOperationsFlagEnv {
  return {
    INPATIENT_WORKSPACE_ENABLED: processEnv.INPATIENT_WORKSPACE_ENABLED,
    NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED: processEnv.NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED,
    INPATIENT_DOCUMENTATION_ENABLED: processEnv.INPATIENT_DOCUMENTATION_ENABLED,
    NEXT_PUBLIC_INPATIENT_DOCUMENTATION_ENABLED:
      processEnv.NEXT_PUBLIC_INPATIENT_DOCUMENTATION_ENABLED,
    INPATIENT_NURSING_ENABLED: processEnv.INPATIENT_NURSING_ENABLED,
    NEXT_PUBLIC_INPATIENT_NURSING_ENABLED: processEnv.NEXT_PUBLIC_INPATIENT_NURSING_ENABLED,
    INPATIENT_CONSULTS_ENABLED: processEnv.INPATIENT_CONSULTS_ENABLED,
    NEXT_PUBLIC_INPATIENT_CONSULTS_ENABLED: processEnv.NEXT_PUBLIC_INPATIENT_CONSULTS_ENABLED,
    INPATIENT_CARE_PLAN_ENABLED: processEnv.INPATIENT_CARE_PLAN_ENABLED,
    NEXT_PUBLIC_INPATIENT_CARE_PLAN_ENABLED: processEnv.NEXT_PUBLIC_INPATIENT_CARE_PLAN_ENABLED,
    INPATIENT_DISCHARGE_PLANNING_ENABLED: processEnv.INPATIENT_DISCHARGE_PLANNING_ENABLED,
    NEXT_PUBLIC_INPATIENT_DISCHARGE_PLANNING_ENABLED:
      processEnv.NEXT_PUBLIC_INPATIENT_DISCHARGE_PLANNING_ENABLED,
    DIRECT_INPATIENT_ADMISSION_ENABLED: processEnv.DIRECT_INPATIENT_ADMISSION_ENABLED,
    NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED:
      processEnv.NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED,
    PLACEMENT_ACTIONS_ENABLED: processEnv.PLACEMENT_ACTIONS_ENABLED,
    NEXT_PUBLIC_PLACEMENT_ACTIONS_ENABLED: processEnv.NEXT_PUBLIC_PLACEMENT_ACTIONS_ENABLED,
  };
}

function flagOn(
  env: InpatientOperationsFlagEnv | null | undefined,
  serverKey: keyof InpatientOperationsFlagEnv,
  publicKey: keyof InpatientOperationsFlagEnv
): boolean {
  if (!env) return false;
  return isTruthyFlag(env[serverKey] as string) || isTruthyFlag(env[publicKey] as string);
}

export function inpatientNursingOpsEnabled(env?: InpatientOperationsFlagEnv | null): boolean {
  return flagOn(env, "INPATIENT_NURSING_ENABLED", "NEXT_PUBLIC_INPATIENT_NURSING_ENABLED");
}

export function inpatientConsultsOpsEnabled(env?: InpatientOperationsFlagEnv | null): boolean {
  return flagOn(env, "INPATIENT_CONSULTS_ENABLED", "NEXT_PUBLIC_INPATIENT_CONSULTS_ENABLED");
}

export function inpatientCarePlanOpsEnabled(env?: InpatientOperationsFlagEnv | null): boolean {
  return flagOn(env, "INPATIENT_CARE_PLAN_ENABLED", "NEXT_PUBLIC_INPATIENT_CARE_PLAN_ENABLED");
}

export function inpatientDischargePlanningOpsEnabled(
  env?: InpatientOperationsFlagEnv | null
): boolean {
  return flagOn(
    env,
    "INPATIENT_DISCHARGE_PLANNING_ENABLED",
    "NEXT_PUBLIC_INPATIENT_DISCHARGE_PLANNING_ENABLED"
  );
}

export function placementActionsEnabled(env?: InpatientOperationsFlagEnv | null): boolean {
  // Soft-enable with placement workflow public flag when dedicated flag unset.
  if (!env) return false;
  if (flagOn(env, "PLACEMENT_ACTIONS_ENABLED", "NEXT_PUBLIC_PLACEMENT_ACTIONS_ENABLED")) {
    return true;
  }
  return false;
}

export const INPATIENT_OPS_DEV_ACTIVATION_PROFILE = {
  INPATIENT_WORKSPACE_ENABLED: "true",
  NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED: "true",
  INPATIENT_DOCUMENTATION_ENABLED: "true",
  NEXT_PUBLIC_INPATIENT_DOCUMENTATION_ENABLED: "true",
  INPATIENT_NURSING_ENABLED: "true",
  NEXT_PUBLIC_INPATIENT_NURSING_ENABLED: "true",
  INPATIENT_CONSULTS_ENABLED: "true",
  NEXT_PUBLIC_INPATIENT_CONSULTS_ENABLED: "true",
  INPATIENT_CARE_PLAN_ENABLED: "true",
  NEXT_PUBLIC_INPATIENT_CARE_PLAN_ENABLED: "true",
  INPATIENT_DISCHARGE_PLANNING_ENABLED: "true",
  NEXT_PUBLIC_INPATIENT_DISCHARGE_PLANNING_ENABLED: "true",
  DIRECT_INPATIENT_ADMISSION_ENABLED: "true",
  NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED: "true",
  PLACEMENT_ACTIONS_ENABLED: "true",
  NEXT_PUBLIC_PLACEMENT_ACTIONS_ENABLED: "true",
  INTERNAL_PLACEMENT_WORKFLOW_ENABLED: "true",
  NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED: "true",
  RECEIVING_ENCOUNTER_FOUNDATION_ENABLED: "true",
  NEXT_PUBLIC_RECEIVING_ENCOUNTER_FOUNDATION_ENABLED: "true",
} as const;

export function inpatientOpsProductionDefaultsAreOff(): boolean {
  return true; // empty env ⇒ all OFF
}
