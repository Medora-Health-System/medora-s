/**
 * D3E.6 — Hospital Care development activation flags (production defaults OFF).
 */

function isTruthyFlag(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type HospitalCareActivationFlagEnv = {
  INTERNAL_PLACEMENT_WORKFLOW_ENABLED?: string | null;
  NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED?: string | null;
  RECEIVING_ENCOUNTER_FOUNDATION_ENABLED?: string | null;
  NEXT_PUBLIC_RECEIVING_ENCOUNTER_FOUNDATION_ENABLED?: string | null;
  OBSERVATION_WORKSPACE_ENABLED?: string | null;
  NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED?: string | null;
  INPATIENT_WORKSPACE_ENABLED?: string | null;
  NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED?: string | null;
  INPATIENT_DEPARTMENTAL_ORDERS_ENABLED?: string | null;
  NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED?: string | null;
  DIRECT_INPATIENT_ADMISSION_ENABLED?: string | null;
  NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED?: string | null;
  HOSPITAL_CARE_DASHBOARD_ENABLED?: string | null;
  NEXT_PUBLIC_HOSPITAL_CARE_DASHBOARD_ENABLED?: string | null;
  NODE_ENV?: string | null;
};

export type HospitalCareFlagPairStatus = {
  name: string;
  serverEnabled: boolean;
  clientEnabled: boolean;
  mismatch: boolean;
};

export function hospitalCareActivationFlagsFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): HospitalCareActivationFlagEnv {
  return {
    INTERNAL_PLACEMENT_WORKFLOW_ENABLED: processEnv.INTERNAL_PLACEMENT_WORKFLOW_ENABLED,
    NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED:
      processEnv.NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED,
    RECEIVING_ENCOUNTER_FOUNDATION_ENABLED: processEnv.RECEIVING_ENCOUNTER_FOUNDATION_ENABLED,
    NEXT_PUBLIC_RECEIVING_ENCOUNTER_FOUNDATION_ENABLED:
      processEnv.NEXT_PUBLIC_RECEIVING_ENCOUNTER_FOUNDATION_ENABLED,
    OBSERVATION_WORKSPACE_ENABLED: processEnv.OBSERVATION_WORKSPACE_ENABLED,
    NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED:
      processEnv.NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED,
    INPATIENT_WORKSPACE_ENABLED: processEnv.INPATIENT_WORKSPACE_ENABLED,
    NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED: processEnv.NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED,
    INPATIENT_DEPARTMENTAL_ORDERS_ENABLED: processEnv.INPATIENT_DEPARTMENTAL_ORDERS_ENABLED,
    NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED:
      processEnv.NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED,
    DIRECT_INPATIENT_ADMISSION_ENABLED: processEnv.DIRECT_INPATIENT_ADMISSION_ENABLED,
    NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED:
      processEnv.NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED,
    HOSPITAL_CARE_DASHBOARD_ENABLED: processEnv.HOSPITAL_CARE_DASHBOARD_ENABLED,
    NEXT_PUBLIC_HOSPITAL_CARE_DASHBOARD_ENABLED:
      processEnv.NEXT_PUBLIC_HOSPITAL_CARE_DASHBOARD_ENABLED,
    NODE_ENV: processEnv.NODE_ENV,
  };
}

export function evaluateHospitalCareFlagPairs(
  env: HospitalCareActivationFlagEnv
): HospitalCareFlagPairStatus[] {
  const pairs: Array<[string, string | null | undefined, string | null | undefined]> = [
    [
      "INTERNAL_PLACEMENT_WORKFLOW",
      env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED,
      env.NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED,
    ],
    [
      "RECEIVING_ENCOUNTER_FOUNDATION",
      env.RECEIVING_ENCOUNTER_FOUNDATION_ENABLED,
      env.NEXT_PUBLIC_RECEIVING_ENCOUNTER_FOUNDATION_ENABLED,
    ],
    [
      "OBSERVATION_WORKSPACE",
      env.OBSERVATION_WORKSPACE_ENABLED,
      env.NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED,
    ],
    [
      "INPATIENT_WORKSPACE",
      env.INPATIENT_WORKSPACE_ENABLED,
      env.NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED,
    ],
    [
      "INPATIENT_DEPARTMENTAL_ORDERS",
      env.INPATIENT_DEPARTMENTAL_ORDERS_ENABLED,
      env.NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED,
    ],
    [
      "DIRECT_INPATIENT_ADMISSION",
      env.DIRECT_INPATIENT_ADMISSION_ENABLED,
      env.NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED,
    ],
    [
      "HOSPITAL_CARE_DASHBOARD",
      env.HOSPITAL_CARE_DASHBOARD_ENABLED,
      env.NEXT_PUBLIC_HOSPITAL_CARE_DASHBOARD_ENABLED,
    ],
  ];
  return pairs.map(([name, server, client]) => {
    const serverEnabled = isTruthyFlag(server);
    const clientEnabled = isTruthyFlag(client);
    return {
      name,
      serverEnabled,
      clientEnabled,
      mismatch: serverEnabled !== clientEnabled,
    };
  });
}

export function directInpatientAdmissionEnabled(
  env?: HospitalCareActivationFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.DIRECT_INPATIENT_ADMISSION_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED)
  );
}

export function hospitalCareDashboardEnabled(
  env?: HospitalCareActivationFlagEnv | null
): boolean {
  if (!env) return false;
  // Dashboard summary is safe to compute whenever placement exists; optional gate defaults OFF.
  return (
    isTruthyFlag(env.HOSPITAL_CARE_DASHBOARD_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_HOSPITAL_CARE_DASHBOARD_ENABLED) ||
    // Soft-enable when placement workflow is ON so ops landing works with one flag flip.
    isTruthyFlag(env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED)
  );
}

/** Production defaults: all activation flags OFF. */
export function hospitalCareProductionDefaultsAreOff(
  env: HospitalCareActivationFlagEnv = {}
): boolean {
  return evaluateHospitalCareFlagPairs(env).every((p) => !p.serverEnabled && !p.clientEnabled);
}

/**
 * Recommended local/dev activation profile (document only — never auto-applied).
 */
export const HOSPITAL_CARE_DEV_ACTIVATION_PROFILE = {
  INTERNAL_PLACEMENT_WORKFLOW_ENABLED: "true",
  NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED: "true",
  RECEIVING_ENCOUNTER_FOUNDATION_ENABLED: "true",
  NEXT_PUBLIC_RECEIVING_ENCOUNTER_FOUNDATION_ENABLED: "true",
  OBSERVATION_WORKSPACE_ENABLED: "true",
  NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED: "true",
  INPATIENT_WORKSPACE_ENABLED: "true",
  NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED: "true",
  INPATIENT_DEPARTMENTAL_ORDERS_ENABLED: "true",
  NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED: "true",
  DIRECT_INPATIENT_ADMISSION_ENABLED: "true",
  NEXT_PUBLIC_DIRECT_INPATIENT_ADMISSION_ENABLED: "true",
  HOSPITAL_CARE_DASHBOARD_ENABLED: "true",
  NEXT_PUBLIC_HOSPITAL_CARE_DASHBOARD_ENABLED: "true",
} as const;

export function isDevelopmentRuntime(env?: HospitalCareActivationFlagEnv | null): boolean {
  const n = String(env?.NODE_ENV ?? "")
    .trim()
    .toLowerCase();
  return n === "development" || n === "test" || n === "";
}
